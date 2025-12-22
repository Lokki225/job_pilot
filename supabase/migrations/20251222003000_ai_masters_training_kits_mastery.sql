CREATE TABLE IF NOT EXISTS public.interview_masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(80) NOT NULL UNIQUE,
  "displayName" varchar(120) NOT NULL,
  tagline varchar(255),
  "avatarUrl" text,
  "systemPrompt" text NOT NULL DEFAULT '',
  "abilitiesJson" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "defaultKitId" uuid REFERENCES public.interview_kits(id) ON DELETE SET NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "isPublic" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS interview_masters_is_active_idx ON public.interview_masters ("isActive");
CREATE INDEX IF NOT EXISTS interview_masters_is_public_idx ON public.interview_masters ("isPublic");

CREATE OR REPLACE FUNCTION public.set_interview_masters_updated_at()
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
    WHERE tgname = 'set_interview_masters_updated_at'
      AND tgrelid = 'public.interview_masters'::regclass
  ) THEN
    CREATE TRIGGER set_interview_masters_updated_at
    BEFORE UPDATE ON public.interview_masters
    FOR EACH ROW
    EXECUTE FUNCTION public.set_interview_masters_updated_at();
  END IF;
END $$;

ALTER TABLE public.interview_masters ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_masters TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_masters'
      AND policyname = 'interview_masters_select_public_or_admin'
  ) THEN
    CREATE POLICY interview_masters_select_public_or_admin
    ON public.interview_masters
    FOR SELECT
    TO authenticated
    USING (
      ("isPublic" = true AND "isActive" = true)
      OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('ADMIN','SUPER_ADMIN')
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_masters'
      AND policyname = 'interview_masters_insert_admin'
  ) THEN
    CREATE POLICY interview_masters_insert_admin
    ON public.interview_masters
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('ADMIN','SUPER_ADMIN')
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_masters'
      AND policyname = 'interview_masters_update_admin'
  ) THEN
    CREATE POLICY interview_masters_update_admin
    ON public.interview_masters
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('ADMIN','SUPER_ADMIN')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('ADMIN','SUPER_ADMIN')
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_masters'
      AND policyname = 'interview_masters_delete_admin'
  ) THEN
    CREATE POLICY interview_masters_delete_admin
    ON public.interview_masters
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('ADMIN','SUPER_ADMIN')
      )
    );
  END IF;
END $$;

INSERT INTO public.interview_masters (slug, "displayName", tagline, "avatarUrl", "systemPrompt", "abilitiesJson", "isActive", "isPublic")
VALUES
  (
    'friendly-coach',
    'The Friendly Coach',
    'Supportive, structured, and focused on actionable growth.',
    null,
    'You are a supportive interview coach. You ask clear questions, keep a warm tone, and always provide actionable feedback. Be honest but encouraging. Use simple language, and always give 2-3 concrete improvement tips.',
    '{"tone":"warm","pressure":"low","strictness":0.3,"followups":true,"hints":true}'::jsonb,
    true,
    true
  ),
  (
    'strict-tech-lead',
    'The Strict Tech Lead',
    'High standards, direct feedback, precision over fluff.',
    null,
    'You are a strict technical interviewer. You value correctness, clarity, and conciseness. You challenge vague answers, ask follow-ups to validate depth, and score harshly if the answer lacks specifics or is hand-wavy. Provide direct feedback and demand measurable impact.',
    '{"tone":"direct","pressure":"medium","strictness":0.85,"followups":true,"hints":false}'::jsonb,
    true,
    true
  ),
  (
    'high-pressure-recruiter',
    'The High-Pressure Recruiter',
    'Fast-paced screening style, evaluates communication under stress.',
    null,
    'You are a high-pressure recruiter conducting a fast screening. Keep questions short and time-aware. Push for clarity, motivation, and fit. Evaluate how well the candidate communicates concisely and handles pressure. Feedback should focus on communication, structure, and confidence.',
    '{"tone":"fast","pressure":"high","strictness":0.6,"followups":true,"hints":false}'::jsonb,
    true,
    true
  )
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE IF EXISTS public.training_sessions
  ADD COLUMN IF NOT EXISTS "kitId" uuid REFERENCES public.interview_kits(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.training_sessions
  ADD COLUMN IF NOT EXISTS "masterId" uuid REFERENCES public.interview_masters(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.training_sessions
  ADD COLUMN IF NOT EXISTS "kitSnapshotJson" jsonb;

ALTER TABLE IF EXISTS public.training_sessions
  ADD COLUMN IF NOT EXISTS "masterSnapshotJson" jsonb;

CREATE INDEX IF NOT EXISTS training_sessions_kit_id_idx ON public.training_sessions ("kitId");
CREATE INDEX IF NOT EXISTS training_sessions_master_id_idx ON public.training_sessions ("masterId");

ALTER TABLE IF EXISTS public.community_posts
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'CommunityPostType'
      AND e.enumlabel = 'TRAINING_RESULT_SHARE'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'CommunityPostType'
  ) THEN
    ALTER TYPE "CommunityPostType" ADD VALUE 'TRAINING_RESULT_SHARE';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_interview_kit_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "kitId" uuid NOT NULL REFERENCES public.interview_kits(id) ON DELETE CASCADE,
  "sessionsCount" int NOT NULL DEFAULT 0,
  "avgScore" int NOT NULL DEFAULT 0,
  "bestScore" int NOT NULL DEFAULT 0,
  "avgCompletionRate" int NOT NULL DEFAULT 0,
  "lastPracticedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_interview_kit_mastery_unique UNIQUE ("userId", "kitId")
);

CREATE INDEX IF NOT EXISTS user_interview_kit_mastery_user_id_idx ON public.user_interview_kit_mastery ("userId");
CREATE INDEX IF NOT EXISTS user_interview_kit_mastery_kit_id_idx ON public.user_interview_kit_mastery ("kitId");
CREATE INDEX IF NOT EXISTS user_interview_kit_mastery_best_score_idx ON public.user_interview_kit_mastery ("bestScore");

CREATE OR REPLACE FUNCTION public.set_user_interview_kit_mastery_updated_at()
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
    WHERE tgname = 'set_user_interview_kit_mastery_updated_at'
      AND tgrelid = 'public.user_interview_kit_mastery'::regclass
  ) THEN
    CREATE TRIGGER set_user_interview_kit_mastery_updated_at
    BEFORE UPDATE ON public.user_interview_kit_mastery
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_interview_kit_mastery_updated_at();
  END IF;
END $$;

ALTER TABLE public.user_interview_kit_mastery ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_interview_kit_mastery TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_interview_kit_mastery'
      AND policyname = 'user_interview_kit_mastery_select_own'
  ) THEN
    CREATE POLICY user_interview_kit_mastery_select_own
    ON public.user_interview_kit_mastery
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_interview_kit_mastery'
      AND policyname = 'user_interview_kit_mastery_insert_own'
  ) THEN
    CREATE POLICY user_interview_kit_mastery_insert_own
    ON public.user_interview_kit_mastery
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_interview_kit_mastery'
      AND policyname = 'user_interview_kit_mastery_update_own'
  ) THEN
    CREATE POLICY user_interview_kit_mastery_update_own
    ON public.user_interview_kit_mastery
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_interview_kit_mastery'
      AND policyname = 'user_interview_kit_mastery_delete_own'
  ) THEN
    CREATE POLICY user_interview_kit_mastery_delete_own
    ON public.user_interview_kit_mastery
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;
END $$;
