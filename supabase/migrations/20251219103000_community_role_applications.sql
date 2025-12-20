CREATE TABLE IF NOT EXISTS public.community_role_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "roleType" text NOT NULL,
  status text NOT NULL DEFAULT 'NOT_STARTED',
  grade text,
  "submittedAt" timestamptz,
  "approvedAt" timestamptz,
  "approvedBy" uuid REFERENCES public.users(id) ON DELETE SET NULL,
  "rejectedAt" timestamptz,
  "rejectedBy" uuid REFERENCES public.users(id) ON DELETE SET NULL,
  "reviewNote" text,
  payload jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_role_applications_role_type_check CHECK ("roleType" IN ('MENTOR','MODERATOR')),
  CONSTRAINT community_role_applications_status_check CHECK (status IN ('NOT_STARTED','STARTED','SUBMITTED','APPROVED','REJECTED')),
  CONSTRAINT community_role_applications_user_role_unique UNIQUE ("userId", "roleType")
);

CREATE INDEX IF NOT EXISTS community_role_applications_user_id_idx ON public.community_role_applications ("userId");
CREATE INDEX IF NOT EXISTS community_role_applications_role_type_idx ON public.community_role_applications ("roleType");
CREATE INDEX IF NOT EXISTS community_role_applications_status_idx ON public.community_role_applications (status);

CREATE OR REPLACE FUNCTION public.set_community_role_applications_updated_at()
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
    WHERE tgname = 'set_community_role_applications_updated_at'
      AND tgrelid = 'public.community_role_applications'::regclass
  ) THEN
    CREATE TRIGGER set_community_role_applications_updated_at
    BEFORE UPDATE ON public.community_role_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_community_role_applications_updated_at();
  END IF;
END $$;

REVOKE UPDATE ON public.community_role_applications FROM authenticated;
GRANT UPDATE (status, "submittedAt", payload) ON public.community_role_applications TO authenticated;

ALTER TABLE public.community_role_applications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.community_role_applications TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_role_applications'
      AND policyname = 'community_role_applications_select_own'
  ) THEN
    CREATE POLICY community_role_applications_select_own
    ON public.community_role_applications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_role_applications'
      AND policyname = 'community_role_applications_insert_own'
  ) THEN
    CREATE POLICY community_role_applications_insert_own
    ON public.community_role_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = "userId"
      AND (
        "roleType" <> 'MODERATOR'
        OR EXISTS (
          SELECT 1
          FROM public.community_profiles cp
          WHERE cp."userId" = auth.uid()
            AND cp."isBanned" = false
            AND cp."reputationPoints" >= 500
            AND cp."helpfulVotes" >= 25
        )
      )
      AND status IN ('NOT_STARTED','STARTED','SUBMITTED')
      AND grade IS NULL
      AND "approvedAt" IS NULL
      AND "approvedBy" IS NULL
      AND "rejectedAt" IS NULL
      AND "rejectedBy" IS NULL
      AND "reviewNote" IS NULL
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_role_applications'
      AND policyname = 'community_role_applications_update_own'
  ) THEN
    CREATE POLICY community_role_applications_update_own
    ON public.community_role_applications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "userId")
    WITH CHECK (
      auth.uid() = "userId"
      AND (
        "roleType" <> 'MODERATOR'
        OR EXISTS (
          SELECT 1
          FROM public.community_profiles cp
          WHERE cp."userId" = auth.uid()
            AND cp."isBanned" = false
            AND cp."reputationPoints" >= 500
            AND cp."helpfulVotes" >= 25
        )
      )
      AND status IN ('NOT_STARTED','STARTED','SUBMITTED')
      AND "approvedAt" IS NULL
      AND "approvedBy" IS NULL
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_role_applications'
      AND policyname = 'community_role_applications_delete_own'
  ) THEN
    CREATE POLICY community_role_applications_delete_own
    ON public.community_role_applications
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;
END $$;
