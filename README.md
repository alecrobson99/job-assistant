# job-assistant

## Environment Variables

Create a `.env` file (or set in Vercel Project Settings):

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

You can also copy `.env.example`.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Supabase Notes

- The app now scopes `documents`, `saved_jobs`, and `profiles` queries to the authenticated user.
- `profiles` writes use `upsert` on `id = auth.uid()`.
- If signup returns `Database error saving new user`, the issue is usually in Supabase SQL (auth trigger or RLS), not in Vite/React build config.

## Supabase Setup

1. In Supabase, open `SQL Editor`.
2. Copy and run the SQL in `supabase/schema.sql`.
3. Copy and run `supabase/tailoring_limits.sql` (enforces 7 tailoring generations per user/week).
4. In Supabase Auth settings for development, you can disable email confirmation.

## AI Setup (Anthropic via Supabase Proxy)

Do not call Anthropic directly from browser code. This app uses a Supabase Edge Function proxy.

1. Set secret in Supabase:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

2. Deploy the proxy function:

```bash
supabase functions deploy anthropic-proxy
```

## Job Search API

- Set `VITE_JOB_SEARCH_API_URL` if you want real job board search results.
- Expected API behavior: accepts `?q=keyword` and returns array/object containing job records.
- Jobs are normalized in-app to:
  `title`, `company`, `location`, `description`, `apply_url`, `source`.
- If `VITE_JOB_SEARCH_API_URL` is not set, the app uses local placeholder results.

## Stripe Subscription Setup

1. In Supabase SQL Editor, run `supabase/billing.sql`.
2. In Stripe, create a Product + recurring Price and copy the `price_...` id.
3. Set Supabase Edge Function secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ID=price_...
supabase secrets set APP_URL=http://localhost:5173
```

4. Deploy Edge Functions:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

5. In Stripe Webhooks, add endpoint:
   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`

6. Subscribe to these Stripe events:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
