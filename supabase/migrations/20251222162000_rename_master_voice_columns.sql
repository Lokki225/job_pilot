alter table public.interview_masters
  rename column voice_provider to "voiceProvider";

alter table public.interview_masters
  rename column voice_model to "voiceModel";

alter table public.interview_masters
  rename column voice_settings_json to "voiceSettingsJson";
