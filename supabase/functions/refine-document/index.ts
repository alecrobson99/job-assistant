import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type RefinePayload = {
  tailored_document_id?: string;
  tweak_prompt?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildPrompt(currentText: string, tweakPrompt: string) {
  return [
    "You are a professional resume and cover letter editor.",
    "Apply ONLY the requested tweak.",
    "Preserve factual content and maintain clear formatting with paragraph breaks.",
    "Keep ATS-friendly language and professional tone.",
    "Return plain text only. No markdown, no code fences.",
    "",
    "Current document:",
    currentText,
    "",
    "Requested tweak:",
    tweakPrompt,
  ].join("\n");
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

    const missing: string[] = [];
    if (!supabaseUrl) missing.push("SUPABASE_URL");
    if (!supabaseAnonKey) missing.push("SUPABASE_ANON_KEY");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!anthropicApiKey) missing.push("ANTHROPIC_API_KEY");
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const accessToken = tokenMatch?.[1]?.trim() || null;
    if (!accessToken) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const [{ data: userData, error: userErr }, { data: adminData, error: adminErr }] =
      await Promise.all([
        userClient.auth.getUser(accessToken),
        adminClient.auth.getUser(accessToken),
      ]);

    const user = userData.user ?? adminData.user ?? null;
    if (!user) {
      return jsonResponse({ error: userErr?.message || adminErr?.message || "Unauthorized" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as RefinePayload;
    const tailoredDocumentId = String(body.tailored_document_id || "").trim();
    const tweakPrompt = String(body.tweak_prompt || "").trim();

    if (!tailoredDocumentId || !tweakPrompt) {
      return jsonResponse({ error: "tailored_document_id and tweak_prompt are required" }, 400);
    }

    const { data: doc, error: docErr } = await userClient
      .from("tailored_documents")
      .select("id, user_id, content_text, name")
      .eq("id", tailoredDocumentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (docErr) throw docErr;
    if (!doc) {
      return jsonResponse({ error: "Tailored document not found" }, 404);
    }

    const { data: subscription, error: subErr } = await adminClient
      .from("billing_subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr && subErr.code !== "PGRST116" && subErr.code !== "42P01") {
      throw subErr;
    }

    const isPro = ["active", "trialing"].includes(String(subscription?.status || "").toLowerCase());
    const monthlyLimit = 10;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1800,
        messages: [{ role: "user", content: buildPrompt(doc.content_text || "", tweakPrompt) }],
      }),
    });

    const raw = await anthropicRes.text();
    if (!anthropicRes.ok) {
      return jsonResponse({ error: `AI refine request failed (${anthropicRes.status}). ${raw}` }, 500);
    }

    const parsed = JSON.parse(raw);
    const refined = Array.isArray(parsed?.content)
      ? parsed.content.map((c: { text?: string }) => c?.text || "").join("\n").trim()
      : "";

    if (!refined) {
      return jsonResponse({ error: "AI refine returned empty content" }, 500);
    }

    const { data: usageRows, error: usageErr } = await userClient.rpc("consume_tweak_usage", {
      p_limit: monthlyLimit,
      p_is_pro: isPro,
    });

    if (usageErr) {
      const msg = usageErr.message || "";
      if (msg.includes("MONTHLY_TWEAK_LIMIT_REACHED")) {
        return jsonResponse({ error: "Free plan tweak limit reached for this month. Upgrade to continue." }, 429);
      }
      throw usageErr;
    }

    const usage = Array.isArray(usageRows) ? usageRows[0] : usageRows;

    const { error: updateErr } = await userClient
      .from("tailored_documents")
      .update({ content_text: refined, updated_at: new Date().toISOString() })
      .eq("id", doc.id)
      .eq("user_id", user.id);

    if (updateErr) throw updateErr;

    return jsonResponse({
      content_text: refined,
      tweaks_used: usage?.tweaks_used ?? 0,
      limit: usage?.limit ?? null,
      period_start: usage?.period_start ?? null,
    });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
