-- Add voice configuration fields to interview_masters
alter table public.interview_masters
  add column if not exists voice_provider text default 'BROWSER',
  add column if not exists voice_model text,
  add column if not exists voice_settings_json jsonb default '{}'::jsonb;
