-- Documents dashboard + tweak usage limits
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.base_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('resume', 'cover_letter')),
  name text not null,
  storage_path text not null,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists base_documents_user_type_idx
  on public.base_documents(user_id, doc_type, updated_at desc);

create table if not exists public.tailored_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('tailored_resume', 'tailored_cover_letter')),
  name text not null,
  job_application_id uuid references public.saved_jobs(id) on delete set null,
  content_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tailored_documents_user_type_idx
  on public.tailored_documents(user_id, doc_type, updated_at desc);

create unique index if not exists tailored_documents_user_job_type_uidx
  on public.tailored_documents(user_id, coalesce(job_application_id::text, ''), doc_type);

create table if not exists public.tweak_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  period_start date not null,
  tweaks_used integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint tweak_usage_non_negative check (tweaks_used >= 0)
);

alter table public.base_documents enable row level security;
alter table public.tailored_documents enable row level security;
alter table public.tweak_usage enable row level security;

drop policy if exists "base_documents_select_own" on public.base_documents;
create policy "base_documents_select_own"
  on public.base_documents
  for select
  using (auth.uid() = user_id);

drop policy if exists "base_documents_insert_own" on public.base_documents;
create policy "base_documents_insert_own"
  on public.base_documents
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "base_documents_update_own" on public.base_documents;
create policy "base_documents_update_own"
  on public.base_documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "base_documents_delete_own" on public.base_documents;
create policy "base_documents_delete_own"
  on public.base_documents
  for delete
  using (auth.uid() = user_id);

drop policy if exists "tailored_documents_select_own" on public.tailored_documents;
create policy "tailored_documents_select_own"
  on public.tailored_documents
  for select
  using (auth.uid() = user_id);

drop policy if exists "tailored_documents_insert_own" on public.tailored_documents;
create policy "tailored_documents_insert_own"
  on public.tailored_documents
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "tailored_documents_update_own" on public.tailored_documents;
create policy "tailored_documents_update_own"
  on public.tailored_documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tailored_documents_delete_own" on public.tailored_documents;
create policy "tailored_documents_delete_own"
  on public.tailored_documents
  for delete
  using (auth.uid() = user_id);

drop policy if exists "tweak_usage_select_own" on public.tweak_usage;
create policy "tweak_usage_select_own"
  on public.tweak_usage
  for select
  using (auth.uid() = user_id);

drop policy if exists "tweak_usage_insert_own" on public.tweak_usage;
create policy "tweak_usage_insert_own"
  on public.tweak_usage
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "tweak_usage_update_own" on public.tweak_usage;
create policy "tweak_usage_update_own"
  on public.tweak_usage
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.base_documents to authenticated;
grant select, insert, update, delete on public.tailored_documents to authenticated;
grant select, insert, update on public.tweak_usage to authenticated;

create or replace function public.consume_tweak_usage(
  p_limit integer default 10,
  p_is_pro boolean default false
)
returns table (
  tweaks_used integer,
  tweak_limit integer,
  period_start date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start date := date_trunc('month', now() at time zone 'utc')::date;
  row_usage public.tweak_usage%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
    into row_usage
  from public.tweak_usage
  where user_id = auth.uid()
  for update;

  if row_usage.user_id is null then
    insert into public.tweak_usage (user_id, period_start, tweaks_used, updated_at)
    values (auth.uid(), month_start, 0, now())
    returning * into row_usage;
  elsif row_usage.period_start <> month_start then
    update public.tweak_usage
      set period_start = month_start,
          tweaks_used = 0,
          updated_at = now()
    where user_id = auth.uid()
    returning * into row_usage;
  end if;

  if not p_is_pro then
    if row_usage.tweaks_used >= p_limit then
      raise exception 'MONTHLY_TWEAK_LIMIT_REACHED';
    end if;
    update public.tweak_usage
      set tweaks_used = row_usage.tweaks_used + 1,
          updated_at = now()
    where user_id = auth.uid()
    returning * into row_usage;
  end if;

  return query
  select
    row_usage.tweaks_used,
    case when p_is_pro then null else p_limit end,
    row_usage.period_start;
end;
$$;

grant execute on function public.consume_tweak_usage(integer, boolean) to authenticated;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_bucket_select_own" on storage.objects;
create policy "documents_bucket_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_bucket_insert_own" on storage.objects;
create policy "documents_bucket_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_bucket_update_own" on storage.objects;
create policy "documents_bucket_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_bucket_delete_own" on storage.objects;
create policy "documents_bucket_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
