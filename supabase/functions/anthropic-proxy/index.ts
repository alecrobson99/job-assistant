import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type ProxyPayload = {
  system?: string;
  userMsg?: string;
  maxTokens?: number;
  model?: string;
  jobId?: string;
  usageType?: "tailor" | "extract";
  messages?: Array<{ role: string; content: unknown }>;
};

function isPaidStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeMessages(payload: ProxyPayload) {
  if (Array.isArray(payload.messages) && payload.messages.length > 0) {
    return payload.messages;
  }
  const userMsg = payload.userMsg?.trim();
  if (!userMsg) return [];
  return [{ role: "user", content: userMsg }];
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

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const accessToken = tokenMatch?.[1]?.trim() || null;
    if (!accessToken) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userErr,
    } = await adminClient.auth.getUser(accessToken);
    if (userErr || !user) {
      return jsonResponse({ error: userErr?.message || "Unauthorized" }, 401);
    }

    if (!user.email_confirmed_at) {
      return jsonResponse({ error: "Email verification required" }, 403);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

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
    const body = (await req.json().catch(() => ({}))) as ProxyPayload;

    const usageType = body.usageType || "tailor";
    const shouldChargeUsage = usageType === "tailor";

    if (!isPaidStatus(subscription?.status ?? "inactive") && shouldChargeUsage) {
      const { error: quotaErr } = await userClient.rpc("consume_tailoring_use", {
        p_job_id: body.jobId || null,
      });
      if (quotaErr) {
        const msg = quotaErr.message || "";
        const status = msg.includes("WEEKLY_LIMIT_REACHED") ? 429 : 403;
        return jsonResponse(
          {
            error: msg.includes("WEEKLY_LIMIT_REACHED")
              ? "Free usage limit reached. Upgrade to continue."
              : `Usage check failed: ${msg}`,
          },
          status,
        );
      }
    }

    const model = body.model || "claude-sonnet-4-20250514";
    const maxTokens = body.maxTokens || 1500;
    const messages = normalizeMessages(body);
    if (messages.length === 0) {
      return jsonResponse({ error: "Missing prompt. Provide messages or userMsg." }, 400);
    }

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
      return jsonResponse(
        {
          error: `Anthropic request failed (${anthropicRes.status}). ${responseText}`,
        },
        500,
      );
    }

    return new Response(responseText, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
