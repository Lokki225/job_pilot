CREATE TABLE IF NOT EXISTS public.interview_kit_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "kitId" uuid NOT NULL REFERENCES public.interview_kits(id) ON DELETE CASCADE,
  "sessionId" uuid NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  "raterId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating int NOT NULL,
  review text,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT interview_kit_ratings_rating_check CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT interview_kit_ratings_unique UNIQUE ("kitId", "sessionId", "raterId")
);

CREATE INDEX IF NOT EXISTS interview_kit_ratings_kit_id_idx ON public.interview_kit_ratings ("kitId");
CREATE INDEX IF NOT EXISTS interview_kit_ratings_session_id_idx ON public.interview_kit_ratings ("sessionId");
CREATE INDEX IF NOT EXISTS interview_kit_ratings_rater_id_idx ON public.interview_kit_ratings ("raterId");

CREATE OR REPLACE FUNCTION public.set_interview_kit_ratings_updated_at()
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
    WHERE tgname = 'set_interview_kit_ratings_updated_at'
      AND tgrelid = 'public.interview_kit_ratings'::regclass
  ) THEN
    CREATE TRIGGER set_interview_kit_ratings_updated_at
    BEFORE UPDATE ON public.interview_kit_ratings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_interview_kit_ratings_updated_at();
  END IF;
END $$;

ALTER TABLE public.interview_kit_ratings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_kit_ratings TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_ratings'
      AND policyname = 'interview_kit_ratings_select_own'
  ) THEN
    CREATE POLICY interview_kit_ratings_select_own
    ON public.interview_kit_ratings
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "raterId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_ratings'
      AND policyname = 'interview_kit_ratings_select_public'
  ) THEN
    CREATE POLICY interview_kit_ratings_select_public
    ON public.interview_kit_ratings
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.interview_kits k
        WHERE k.id = interview_kit_ratings."kitId"
          AND k.visibility = 'PUBLIC'
          AND k."isArchived" = false
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_ratings'
      AND policyname = 'interview_kit_ratings_insert_gated'
  ) THEN
    CREATE POLICY interview_kit_ratings_insert_gated
    ON public.interview_kit_ratings
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = "raterId"
      AND EXISTS (
        SELECT 1
        FROM public.interview_kits k
        WHERE k.id = interview_kit_ratings."kitId"
          AND k.visibility = 'PUBLIC'
          AND k."isArchived" = false
      )
      AND EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = interview_kit_ratings."sessionId"
          AND s.status = 'COMPLETED'
          AND (auth.uid() = s."interviewerId" OR auth.uid() = s."candidateId")
          AND (s.metadata->>'kitId') = interview_kit_ratings."kitId"::text
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_ratings'
      AND policyname = 'interview_kit_ratings_update_own'
  ) THEN
    CREATE POLICY interview_kit_ratings_update_own
    ON public.interview_kit_ratings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "raterId")
    WITH CHECK (
      auth.uid() = "raterId"
      AND EXISTS (
        SELECT 1
        FROM public.interview_kits k
        WHERE k.id = interview_kit_ratings."kitId"
          AND k.visibility = 'PUBLIC'
          AND k."isArchived" = false
      )
      AND EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = interview_kit_ratings."sessionId"
          AND s.status = 'COMPLETED'
          AND (auth.uid() = s."interviewerId" OR auth.uid() = s."candidateId")
          AND (s.metadata->>'kitId') = interview_kit_ratings."kitId"::text
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_ratings'
      AND policyname = 'interview_kit_ratings_delete_own'
  ) THEN
    CREATE POLICY interview_kit_ratings_delete_own
    ON public.interview_kit_ratings
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "raterId");
  END IF;
END $$;
