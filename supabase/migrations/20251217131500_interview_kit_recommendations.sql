ALTER TABLE public.interview_kits
ADD COLUMN IF NOT EXISTS "recommendCount" integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.set_interview_kits_updated_at()
RETURNS trigger AS $$
BEGIN
  IF (NEW.title IS DISTINCT FROM OLD.title)
     OR (NEW.description IS DISTINCT FROM OLD.description)
     OR (NEW.visibility IS DISTINCT FROM OLD.visibility)
     OR (NEW."blocksJson" IS DISTINCT FROM OLD."blocksJson")
     OR (NEW."prepBlocksJson" IS DISTINCT FROM OLD."prepBlocksJson")
     OR (NEW."isArchived" IS DISTINCT FROM OLD."isArchived") THEN
    NEW."updatedAt" = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.interview_kit_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "kitId" uuid NOT NULL REFERENCES public.interview_kits(id) ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT interview_kit_recommendations_unique UNIQUE ("kitId", "userId")
);

CREATE INDEX IF NOT EXISTS interview_kit_recommendations_kit_id_idx ON public.interview_kit_recommendations ("kitId");
CREATE INDEX IF NOT EXISTS interview_kit_recommendations_user_id_idx ON public.interview_kit_recommendations ("userId");

CREATE OR REPLACE FUNCTION public.interview_kit_recommendations_inc_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.interview_kits
  SET "recommendCount" = "recommendCount" + 1
  WHERE id = NEW."kitId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.interview_kit_recommendations_dec_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.interview_kits
  SET "recommendCount" = GREATEST("recommendCount" - 1, 0)
  WHERE id = OLD."kitId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'interview_kit_recommendations_inc_count'
      AND tgrelid = 'public.interview_kit_recommendations'::regclass
  ) THEN
    CREATE TRIGGER interview_kit_recommendations_inc_count
    AFTER INSERT ON public.interview_kit_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.interview_kit_recommendations_inc_count();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'interview_kit_recommendations_dec_count'
      AND tgrelid = 'public.interview_kit_recommendations'::regclass
  ) THEN
    CREATE TRIGGER interview_kit_recommendations_dec_count
    AFTER DELETE ON public.interview_kit_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.interview_kit_recommendations_dec_count();
  END IF;
END $$;

ALTER TABLE public.interview_kit_recommendations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.interview_kit_recommendations TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_recommendations'
      AND policyname = 'interview_kit_recommendations_select_own'
  ) THEN
    CREATE POLICY interview_kit_recommendations_select_own
    ON public.interview_kit_recommendations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_recommendations'
      AND policyname = 'interview_kit_recommendations_insert_own'
  ) THEN
    CREATE POLICY interview_kit_recommendations_insert_own
    ON public.interview_kit_recommendations
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = "userId"
      AND EXISTS (
        SELECT 1
        FROM public.interview_kits k
        WHERE k.id = interview_kit_recommendations."kitId"
          AND k.visibility = 'PUBLIC'
          AND k."isArchived" = false
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_recommendations'
      AND policyname = 'interview_kit_recommendations_delete_own'
  ) THEN
    CREATE POLICY interview_kit_recommendations_delete_own
    ON public.interview_kit_recommendations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;
END $$;
