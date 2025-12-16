CREATE TABLE IF NOT EXISTS public.community_profile_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "discoverableInSearch" boolean NOT NULL DEFAULT true,
  "allowInterviewRequestsFrom" text NOT NULL DEFAULT 'MUTUAL_FOLLOWS',
  "showPostsToCommunity" boolean NOT NULL DEFAULT true,
  "showStoriesToCommunity" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_profile_settings_user_unique UNIQUE ("userId"),
  CONSTRAINT community_profile_settings_allow_interview_check CHECK (
    "allowInterviewRequestsFrom" IN ('MUTUAL_FOLLOWS','FOLLOWERS','ANYONE','NOBODY')
  )
);

CREATE INDEX IF NOT EXISTS community_profile_settings_user_id_idx ON public.community_profile_settings ("userId");

CREATE OR REPLACE FUNCTION public.set_community_profile_settings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_community_profile_settings_updated_at'
      AND tgrelid = 'public.community_profile_settings'::regclass
  ) THEN
    CREATE TRIGGER set_community_profile_settings_updated_at
    BEFORE UPDATE ON public.community_profile_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_community_profile_settings_updated_at();
  END IF;
END $$;

ALTER TABLE public.community_profile_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_profile_settings TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_profile_settings'
      AND policyname = 'community_profile_settings_select_own'
  ) THEN
    CREATE POLICY community_profile_settings_select_own
    ON public.community_profile_settings
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_profile_settings'
      AND policyname = 'community_profile_settings_insert_own'
  ) THEN
    CREATE POLICY community_profile_settings_insert_own
    ON public.community_profile_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_profile_settings'
      AND policyname = 'community_profile_settings_update_own'
  ) THEN
    CREATE POLICY community_profile_settings_update_own
    ON public.community_profile_settings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_profile_settings'
      AND policyname = 'community_profile_settings_delete_own'
  ) THEN
    CREATE POLICY community_profile_settings_delete_own
    ON public.community_profile_settings
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;
END $$;
