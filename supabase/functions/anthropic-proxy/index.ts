import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type ProxyPayload = {
  system?: string;
  userMsg?: string;
  maxTokens?: number;
  model?: string;
  jobId?: string;
  messages?: Array<{ role: string; content: unknown }>;
};

function isPaidStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    const missingEnv: string[] = [];
    if (!supabaseUrl) missingEnv.push("SUPABASE_URL");
    if (!supabaseAnonKey) missingEnv.push("SUPABASE_ANON_KEY");
    if (!serviceRoleKey) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!anthropicApiKey) missingEnv.push("ANTHROPIC_API_KEY");
    if (missingEnv.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Always verify caller auth on server-side.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user.email_confirmed_at) {
      return new Response(JSON.stringify({ error: "Email verification required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: subscription, error: subErr } = await adminClient
      .from("billing_subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (subErr && subErr.code !== "PGRST116") {
      throw subErr;
    }

    // Plan enforcement:
    // - Pro (active/trialing): allow request
    // - Free/unpaid: consume quota atomically server-side before expensive call
    if (!isPaidStatus(subscription?.status ?? "inactive")) {
      const bodyForQuota = (await req.clone().json().catch(() => ({}))) as ProxyPayload;
      const { error: quotaErr } = await userClient.rpc("consume_tailoring_use", {
        p_job_id: bodyForQuota.jobId || null,
      });
      if (quotaErr) {
        const msg = quotaErr.message || "";
        const status = msg.includes("WEEKLY_LIMIT_REACHED") ? 429 : 403;
        return new Response(
          JSON.stringify({
            error: msg.includes("WEEKLY_LIMIT_REACHED")
              ? "Free usage limit reached. Upgrade to continue."
              : `Usage check failed: ${msg}`,
          }),
          {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const body = (await req.json().catch(() => ({}))) as ProxyPayload;
    const model = body.model || "claude-sonnet-4-20250514";
    const maxTokens = body.maxTokens || 1500;
    const messages = body.messages || [{ role: "user", content: body.userMsg || "" }];

    const anthropicPayload: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages,
    };

    if (body.system) {
      anthropicPayload.system = body.system;
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicPayload),
    });

    const responseText = await anthropicRes.text();

    if (!anthropicRes.ok) {
      return new Response(
        JSON.stringify({
          error: `Anthropic request failed (${anthropicRes.status}). ${responseText}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(responseText, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
