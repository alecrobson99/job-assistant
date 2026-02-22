-- Stripe subscription layer for Job Assistant
-- Run this after supabase/schema.sql

create table if not exists public.billing_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  stripe_product_id text,
  status text not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status in (
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused',
      'inactive'
    )
  )
);

create index if not exists billing_subscriptions_status_idx
  on public.billing_subscriptions(status);

create index if not exists billing_subscriptions_customer_idx
  on public.billing_subscriptions(stripe_customer_id);

alter table public.billing_subscriptions enable row level security;

drop policy if exists "billing_subscriptions_select_own" on public.billing_subscriptions;
create policy "billing_subscriptions_select_own"
  on public.billing_subscriptions
  for select
  using (auth.uid() = user_id);

-- Optional helper RPC for feature gating
create or replace function public.has_active_subscription(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.billing_subscriptions bs
    where bs.user_id = target_user
      and bs.status in ('active', 'trialing')
      and (bs.current_period_end is null or bs.current_period_end > now())
  );
$$;

grant execute on function public.has_active_subscription(uuid) to authenticated;
