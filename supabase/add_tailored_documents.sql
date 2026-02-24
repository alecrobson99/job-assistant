-- Add tailored document attachments to each saved job.
alter table public.saved_jobs
  add column if not exists "tailoredDocuments" jsonb not null default '[]'::jsonb;
