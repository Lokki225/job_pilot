CREATE TABLE IF NOT EXISTS public.saved_job_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  filters jsonb NOT NULL,
  "isEnabled" boolean NOT NULL DEFAULT true,
  frequency text NOT NULL DEFAULT 'daily',
  "notifyOnMatch" boolean NOT NULL DEFAULT true,
  "lastRunAt" timestamptz,
  "lastSeenJobKeys" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT saved_job_searches_user_name_unique UNIQUE ("userId", name)
);

CREATE INDEX IF NOT EXISTS saved_job_searches_user_id_idx ON public.saved_job_searches ("userId");

CREATE OR REPLACE FUNCTION public.set_saved_job_searches_updated_at()
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
    WHERE tgname = 'set_saved_job_searches_updated_at'
      AND tgrelid = 'public.saved_job_searches'::regclass
  ) THEN
    CREATE TRIGGER set_saved_job_searches_updated_at
    BEFORE UPDATE ON public.saved_job_searches
    FOR EACH ROW
    EXECUTE FUNCTION public.set_saved_job_searches_updated_at();
  END IF;
END $$;

ALTER TABLE public.saved_job_searches ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_job_searches TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_job_searches'
      AND policyname = 'saved_job_searches_select_own'
  ) THEN
    CREATE POLICY saved_job_searches_select_own
    ON public.saved_job_searches
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_job_searches'
      AND policyname = 'saved_job_searches_insert_own'
  ) THEN
    CREATE POLICY saved_job_searches_insert_own
    ON public.saved_job_searches
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_job_searches'
      AND policyname = 'saved_job_searches_update_own'
  ) THEN
    CREATE POLICY saved_job_searches_update_own
    ON public.saved_job_searches
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_job_searches'
      AND policyname = 'saved_job_searches_delete_own'
  ) THEN
    CREATE POLICY saved_job_searches_delete_own
    ON public.saved_job_searches
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;
END $$;
