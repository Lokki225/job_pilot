do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'interview_masters'
      and column_name = 'voice_provider'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'interview_masters'
      and column_name = 'voiceProvider'
  ) then
    execute 'alter table public.interview_masters rename column voice_provider to "voiceProvider"';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'interview_masters'
      and column_name = 'voice_model'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'interview_masters'
      and column_name = 'voiceModel'
  ) then
    execute 'alter table public.interview_masters rename column voice_model to "voiceModel"';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'interview_masters'
      and column_name = 'voice_settings_json'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'interview_masters'
      and column_name = 'voiceSettingsJson'
  ) then
    execute 'alter table public.interview_masters rename column voice_settings_json to "voiceSettingsJson"';
  end if;
end
$$;
