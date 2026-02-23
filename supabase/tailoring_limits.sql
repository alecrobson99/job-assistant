-- Tailoring usage limits: 7 generations per user per week (fixed UTC week window)

create table if not exists public.tailoring_uses (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.saved_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tailoring_uses_user_created_idx
  on public.tailoring_uses(user_id, created_at desc);

alter table public.tailoring_uses enable row level security;

drop policy if exists "tailoring_uses_select_own" on public.tailoring_uses;
create policy "tailoring_uses_select_own"
  on public.tailoring_uses
  for select
  using (auth.uid() = user_id);

create or replace function public.get_tailoring_quota()
returns table (
  weekly_limit integer,
  used integer,
  remaining integer,
  resets_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  week_start timestamptz := date_trunc('week', now());
  week_end timestamptz := week_start + interval '1 week';
  use_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select count(*)::integer
    into use_count
  from public.tailoring_uses
  where user_id = auth.uid()
    and created_at >= week_start
    and created_at < week_end;

  return query
  select
    7,
    use_count,
    greatest(0, 7 - use_count),
    week_end;
end;
$$;

grant execute on function public.get_tailoring_quota() to authenticated;

create or replace function public.consume_tailoring_use(p_job_id uuid default null)
returns table (
  weekly_limit integer,
  used integer,
  remaining integer,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  week_start timestamptz := date_trunc('week', now());
  week_end timestamptz := week_start + interval '1 week';
  use_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select count(*)::integer
    into use_count
  from public.tailoring_uses
  where user_id = auth.uid()
    and created_at >= week_start
    and created_at < week_end;

  if use_count >= 7 then
    raise exception 'WEEKLY_LIMIT_REACHED';
  end if;

  insert into public.tailoring_uses (user_id, job_id)
  values (auth.uid(), p_job_id);

  use_count := use_count + 1;

  return query
  select
    7,
    use_count,
    greatest(0, 7 - use_count),
    week_end;
end;
$$;

grant execute on function public.consume_tailoring_use(uuid) to authenticated;
