import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@16.12.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type CheckoutPayload = {
  priceId?: string;
};

const PREMIUM_PRICE_ID = "price_1T4I2sBWU2sVjaR70RXgIZv1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const appUrl = Deno.env.get("APP_URL");
    const envPremiumPriceId =
      Deno.env.get("STRIPE_PREMIUM_PRICE_ID") ||
      Deno.env.get("STRIPE_PRICE_ID") ||
      PREMIUM_PRICE_ID;

    const missingEnv: string[] = [];
    if (!supabaseUrl) missingEnv.push("SUPABASE_URL");
    if (!serviceRoleKey) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeSecretKey) missingEnv.push("STRIPE_SECRET_KEY");
    if (!appUrl) missingEnv.push("APP_URL");
    if (missingEnv.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: userErr,
    } = await adminClient.auth.getUser(accessToken);

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
    const requestedPriceId = body.priceId || envPremiumPriceId;
    if (envPremiumPriceId !== PREMIUM_PRICE_ID) {
      throw new Error("Server premium price configuration does not match expected premium price id");
    }

    if (requestedPriceId !== PREMIUM_PRICE_ID) {
      return new Response(JSON.stringify({ error: "Invalid price for this checkout session" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedAppUrl = appUrl.replace(/\/+$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
      success_url: `${normalizedAppUrl}/billing/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${normalizedAppUrl}/pricing?canceled=1`,
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
