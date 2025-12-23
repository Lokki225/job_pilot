alter table public.community_profile_settings
  add column if not exists "showOnLeaderboard" boolean not null default true;
