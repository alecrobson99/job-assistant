import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@16.12.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type CheckoutPayload = {
  plan?: "monthly" | "yearly";
  priceId?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const appUrl = Deno.env.get("APP_URL");
    const defaultPriceId = Deno.env.get("STRIPE_PRICE_ID");
    const monthlyPriceId = Deno.env.get("STRIPE_PRICE_MONTHLY");
    const yearlyPriceId = Deno.env.get("STRIPE_PRICE_YEARLY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !stripeSecretKey || !appUrl) {
      throw new Error("Missing required environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { data: existingSubscription } = await adminClient
      .from("billing_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

    let customerId = existingSubscription?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      await adminClient
        .from("billing_subscriptions")
        .upsert(
          {
            user_id: user.id,
            stripe_customer_id: customerId,
            status: "inactive",
          },
          { onConflict: "user_id" },
        );
    }

    const body = (await req.json().catch(() => ({}))) as CheckoutPayload;
    let priceId = body.priceId || defaultPriceId;

    if (body.plan === "monthly") priceId = monthlyPriceId || priceId;
    if (body.plan === "yearly") priceId = yearlyPriceId || priceId;

    if (!priceId) {
      throw new Error("Missing Stripe price id");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}?billing=success`,
      cancel_url: `${appUrl}?billing=cancel`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
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
