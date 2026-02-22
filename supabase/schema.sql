-- Job Assistant Supabase schema
-- Run this entire file in Supabase SQL Editor.

-- 1) Extensions
create extension if not exists pgcrypto;

-- 2) Utility functions
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Keep camelCase timestamps in sync with snake_case timestamps used by queries
create or replace function public.sync_app_timestamps()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'documents' then
    if new."createdAt" is null then
      new."createdAt" = coalesce(new.created_at, now());
    end if;
    if new.created_at is null then
      new.created_at = new."createdAt";
    end if;
  elsif tg_table_name = 'saved_jobs' then
    if new."savedAt" is null then
      new."savedAt" = coalesce(new.created_at, now());
    end if;
    if new.created_at is null then
      new.created_at = new."savedAt";
    end if;
  end if;

  return new;
end;
$$;

-- 3) Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  linkedin text,
  location text,
  phone text,
  "targetTitle" text,
  "targetLocation" text,
  seniority text,
  industry text,
  keywords text,
  "useCompanyPrefs" boolean not null default false,
  "targetCompanies" text,
  "lifestyleVibe" text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('resume', 'cover_letter')),
  tag text not null,
  content text not null,
  created_at timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  company text not null default '',
  location text not null default '',
  url text not null default '',
  description text not null default '',
  status text not null default 'saved'
    check (status in ('saved', 'applied', 'interview', 'offer', 'rejected')),
  notes text not null default '',
  "savedAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  "tailoredResume" text,
  "tailoredCover" text,
  keywords text[] not null default '{}',
  "matchScore" integer check ("matchScore" between 0 and 100),
  "resumeDocId" uuid references public.documents(id) on delete set null,
  "coverDocId" uuid references public.documents(id) on delete set null
);

-- 4) Triggers

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists trg_saved_jobs_updated_at on public.saved_jobs;
create trigger trg_saved_jobs_updated_at
before update on public.saved_jobs
for each row execute function public.set_updated_at();

drop trigger if exists trg_documents_sync_ts on public.documents;
create trigger trg_documents_sync_ts
before insert or update on public.documents
for each row execute function public.sync_app_timestamps();

drop trigger if exists trg_saved_jobs_sync_ts on public.saved_jobs;
create trigger trg_saved_jobs_sync_ts
before insert or update on public.saved_jobs
for each row execute function public.sync_app_timestamps();

-- 5) RLS
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.saved_jobs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "documents_select_own" on public.documents;
drop policy if exists "documents_insert_own" on public.documents;
drop policy if exists "documents_update_own" on public.documents;
drop policy if exists "documents_delete_own" on public.documents;

create policy "documents_select_own" on public.documents
for select using (auth.uid() = user_id);

create policy "documents_insert_own" on public.documents
for insert with check (auth.uid() = user_id);

create policy "documents_update_own" on public.documents
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "documents_delete_own" on public.documents
for delete using (auth.uid() = user_id);

drop policy if exists "saved_jobs_select_own" on public.saved_jobs;
drop policy if exists "saved_jobs_insert_own" on public.saved_jobs;
drop policy if exists "saved_jobs_update_own" on public.saved_jobs;
drop policy if exists "saved_jobs_delete_own" on public.saved_jobs;

create policy "saved_jobs_select_own" on public.saved_jobs
for select using (auth.uid() = user_id);

create policy "saved_jobs_insert_own" on public.saved_jobs
for insert with check (auth.uid() = user_id);

create policy "saved_jobs_update_own" on public.saved_jobs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "saved_jobs_delete_own" on public.saved_jobs
for delete using (auth.uid() = user_id);

-- 6) New user profile bootstrap
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
