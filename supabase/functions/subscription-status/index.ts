import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller identity from JWT in Authorization header.
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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: subscription, error: subErr } = await adminClient
      .from("billing_subscriptions")
      .select(
        "status, stripe_price_id, current_period_start, current_period_end, cancel_at_period_end, updated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr && subErr.code !== "PGRST116") {
      throw subErr;
    }

    const active = isPaidStatus(subscription?.status ?? "inactive");

    return new Response(
      JSON.stringify({
        active,
        status: subscription?.status ?? "inactive",
        stripe_price_id: subscription?.stripe_price_id ?? null,
        current_period_start: subscription?.current_period_start ?? null,
        current_period_end: subscription?.current_period_end ?? null,
        cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
        updated_at: subscription?.updated_at ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Subscription status lookup failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
