import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

type ProxyPayload = {
  system?: string;
  userMsg?: string;
  maxTokens?: number;
  model?: string;
  messages?: Array<{ role: string; content: unknown }>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) {
      throw new Error("Missing required environment variables");
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
