import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@16.12.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type StripeSubscription = Stripe.Subscription;

function toIso(ts?: number | null) {
  return ts ? new Date(ts * 1000).toISOString() : null;
}

async function upsertSubscription(
  adminClient: ReturnType<typeof createClient>,
  stripeSub: StripeSubscription,
  userId?: string,
) {
  const customerId =
    typeof stripeSub.customer === "string" ? stripeSub.customer : stripeSub.customer.id;

  let resolvedUserId = userId || stripeSub.metadata?.user_id || null;

  if (!resolvedUserId) {
    const { data: existing } = await adminClient
      .from("billing_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    resolvedUserId = existing?.user_id ?? null;
  }

  if (!resolvedUserId) {
    throw new Error("Could not resolve Supabase user for subscription event");
  }

  const item = stripeSub.items.data[0];

  const payload = {
    user_id: resolvedUserId,
    stripe_customer_id: customerId,
    stripe_subscription_id: stripeSub.id,
    stripe_price_id: item?.price?.id ?? null,
    stripe_product_id:
      typeof item?.price?.product === "string"
        ? item.price.product
        : item?.price?.product?.id ?? null,
    status: stripeSub.status,
    current_period_start: toIso(stripeSub.current_period_start),
    current_period_end: toIso(stripeSub.current_period_end),
    cancel_at_period_end: stripeSub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  const { error } = await adminClient
    .from("billing_subscriptions")
    .upsert(payload, { onConflict: "user_id" });

  if (error) throw error;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !webhookSecret) {
      throw new Error("Missing required environment variables");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing Stripe signature", { status: 400, headers: corsHeaders });
    }

    const body = await req.text();
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscription(adminClient, subscription, session.metadata?.user_id || undefined);
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscription(adminClient, subscription);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Webhook processing failed" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
