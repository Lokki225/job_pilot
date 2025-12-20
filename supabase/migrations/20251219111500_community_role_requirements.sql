CREATE TABLE IF NOT EXISTS public.community_role_requirements (
  "roleType" text PRIMARY KEY,
  "minReputationPoints" integer NOT NULL DEFAULT 500,
  "minHelpfulVotes" integer NOT NULL DEFAULT 25,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_role_requirements_role_type_check CHECK ("roleType" IN ('MENTOR','MODERATOR'))
);

CREATE OR REPLACE FUNCTION public.set_community_role_requirements_updated_at()
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
    WHERE tgname = 'set_community_role_requirements_updated_at'
      AND tgrelid = 'public.community_role_requirements'::regclass
  ) THEN
    CREATE TRIGGER set_community_role_requirements_updated_at
    BEFORE UPDATE ON public.community_role_requirements
    FOR EACH ROW
    EXECUTE FUNCTION public.set_community_role_requirements_updated_at();
  END IF;
END $$;

INSERT INTO public.community_role_requirements ("roleType", "minReputationPoints", "minHelpfulVotes")
VALUES ('MODERATOR', 500, 25)
ON CONFLICT ("roleType") DO NOTHING;

ALTER TABLE public.community_role_requirements ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.community_role_requirements TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_role_requirements'
      AND policyname = 'community_role_requirements_select_all'
  ) THEN
    CREATE POLICY community_role_requirements_select_all
    ON public.community_role_requirements
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DROP POLICY IF EXISTS community_role_applications_insert_own ON public.community_role_applications;

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
      JOIN public.community_role_requirements rr
        ON rr."roleType" = 'MODERATOR'
      WHERE cp."userId" = auth.uid()
        AND cp."isBanned" = false
        AND cp."reputationPoints" >= rr."minReputationPoints"
        AND cp."helpfulVotes" >= rr."minHelpfulVotes"
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

DROP POLICY IF EXISTS community_role_applications_update_own ON public.community_role_applications;

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
      JOIN public.community_role_requirements rr
        ON rr."roleType" = 'MODERATOR'
      WHERE cp."userId" = auth.uid()
        AND cp."isBanned" = false
        AND cp."reputationPoints" >= rr."minReputationPoints"
        AND cp."helpfulVotes" >= rr."minHelpfulVotes"
    )
  )
  AND status IN ('NOT_STARTED','STARTED','SUBMITTED')
  AND "approvedAt" IS NULL
  AND "approvedBy" IS NULL
);
