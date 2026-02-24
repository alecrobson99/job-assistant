import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@16.12.0";
import { corsHeaders } from "../_shared/cors.ts";

function isPaidStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

function toIso(ts?: number | null) {
  return ts ? new Date(ts * 1000).toISOString() : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

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
        "status, stripe_price_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, updated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr && subErr.code !== "PGRST116") {
      throw subErr;
    }

    let effectiveSubscription = subscription;

    // Webhook reliability fallback:
    // if local state is stale and we have a Stripe subscription id, refresh from Stripe.
    if (stripeSecretKey && subscription?.stripe_subscription_id) {
      const staleMs = 2 * 60 * 1000;
      const updatedAtMs = subscription?.updated_at ? new Date(subscription.updated_at).getTime() : 0;
      const shouldRefresh = !updatedAtMs || (Date.now() - updatedAtMs > staleMs);

      if (shouldRefresh) {
        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
        const live = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        const firstItem = live.items.data[0];

        const refreshPayload = {
          status: live.status,
          stripe_price_id: firstItem?.price?.id ?? null,
          current_period_start: toIso(live.current_period_start),
          current_period_end: toIso(live.current_period_end),
          cancel_at_period_end: live.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        };

        const { data: refreshed, error: refreshErr } = await adminClient
          .from("billing_subscriptions")
          .update(refreshPayload)
          .eq("user_id", user.id)
          .select(
            "status, stripe_price_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, updated_at",
          )
          .maybeSingle();

        if (!refreshErr && refreshed) {
          effectiveSubscription = refreshed;
        }
      }
    }

    const active = isPaidStatus(effectiveSubscription?.status ?? "inactive");

    return new Response(
      JSON.stringify({
        active,
        status: effectiveSubscription?.status ?? "inactive",
        stripe_price_id: effectiveSubscription?.stripe_price_id ?? null,
        current_period_start: effectiveSubscription?.current_period_start ?? null,
        current_period_end: effectiveSubscription?.current_period_end ?? null,
        cancel_at_period_end: effectiveSubscription?.cancel_at_period_end ?? false,
        updated_at: effectiveSubscription?.updated_at ?? null,
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
