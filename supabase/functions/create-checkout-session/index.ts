import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@16.12.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type CheckoutPayload = {
  priceId?: string;
  billingCycle?: "monthly" | "annual";
};

const PREMIUM_MONTHLY_PRICE_ID = "price_1T4I2sBWU2sVjaR70RXgIZv1";

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
    const monthlyPriceId =
      Deno.env.get("STRIPE_PREMIUM_MONTHLY_PRICE_ID") ||
      Deno.env.get("STRIPE_PREMIUM_PRICE_ID") ||
      Deno.env.get("STRIPE_PRICE_ID") ||
      PREMIUM_MONTHLY_PRICE_ID;
    const annualPriceId =
      Deno.env.get("STRIPE_PREMIUM_ANNUAL_PRICE_ID") ||
      Deno.env.get("STRIPE_ANNUAL_PRICE_ID") ||
      "";

    const missingEnv: string[] = [];
    if (!supabaseUrl) missingEnv.push("SUPABASE_URL");
    if (!supabaseAnonKey) missingEnv.push("SUPABASE_ANON_KEY");
    if (!serviceRoleKey) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeSecretKey) missingEnv.push("STRIPE_SECRET_KEY");
    if (!appUrl) missingEnv.push("APP_URL");
    if (missingEnv.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const accessToken = tokenMatch?.[1]?.trim() || null;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: userFromAnon },
      error: anonErr,
    } = await userClient.auth.getUser();

    const {
      data: { user: userFromAdmin },
      error: adminErr,
    } = await adminClient.auth.getUser(accessToken);

    const user = userFromAnon ?? userFromAdmin ?? null;

    if (!user) {
      return new Response(
        JSON.stringify({
          error:
            anonErr?.message ||
            adminErr?.message ||
            "Unauthorized",
        }),
        {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
    const cycle = body.billingCycle === "annual" ? "annual" : "monthly";
    const fallbackPrice = cycle === "annual" && annualPriceId ? annualPriceId : monthlyPriceId;
    const requestedPriceId = (body.priceId || fallbackPrice || "").trim();
    const allowedPriceIds = [monthlyPriceId, annualPriceId].filter(Boolean);

    if (!requestedPriceId || !allowedPriceIds.includes(requestedPriceId)) {
      return new Response(JSON.stringify({ error: "Invalid price for this checkout session" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedAppUrl = appUrl.replace(/\/+$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: requestedPriceId, quantity: 1 }],
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
