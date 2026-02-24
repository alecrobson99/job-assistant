-- Allow "tailored" status used by the app in public.saved_jobs.

alter table public.saved_jobs
  drop constraint if exists saved_jobs_status_check;

alter table public.saved_jobs
  add constraint saved_jobs_status_check
  check (status in ('saved', 'tailored', 'applied', 'interview', 'offer', 'rejected'));
