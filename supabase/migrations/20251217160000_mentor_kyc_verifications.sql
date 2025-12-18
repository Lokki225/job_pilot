CREATE TABLE IF NOT EXISTS public.mentor_kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'NOT_STARTED',
  provider text NOT NULL DEFAULT 'PERSONA',
  "providerInquiryId" text,
  "providerStatus" text,
  payload jsonb,
  "submittedAt" timestamptz,
  "approvedAt" timestamptz,
  "approvedBy" uuid REFERENCES public.users(id) ON DELETE SET NULL,
  "rejectedAt" timestamptz,
  "rejectedBy" uuid REFERENCES public.users(id) ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mentor_kyc_verifications_status_check CHECK (status IN ('NOT_STARTED','STARTED','SUBMITTED','APPROVED','REJECTED')),
  CONSTRAINT mentor_kyc_verifications_user_unique UNIQUE ("userId")
);

CREATE INDEX IF NOT EXISTS mentor_kyc_verifications_user_id_idx ON public.mentor_kyc_verifications ("userId");
CREATE INDEX IF NOT EXISTS mentor_kyc_verifications_status_idx ON public.mentor_kyc_verifications (status);

CREATE OR REPLACE FUNCTION public.set_mentor_kyc_verifications_updated_at()
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
    WHERE tgname = 'set_mentor_kyc_verifications_updated_at'
      AND tgrelid = 'public.mentor_kyc_verifications'::regclass
  ) THEN
    CREATE TRIGGER set_mentor_kyc_verifications_updated_at
    BEFORE UPDATE ON public.mentor_kyc_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_mentor_kyc_verifications_updated_at();
  END IF;
END $$;

ALTER TABLE public.mentor_kyc_verifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_kyc_verifications TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_kyc_verifications'
      AND policyname = 'mentor_kyc_verifications_select_own'
  ) THEN
    CREATE POLICY mentor_kyc_verifications_select_own
    ON public.mentor_kyc_verifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_kyc_verifications'
      AND policyname = 'mentor_kyc_verifications_insert_own'
  ) THEN
    CREATE POLICY mentor_kyc_verifications_insert_own
    ON public.mentor_kyc_verifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = "userId"
      AND status IN ('NOT_STARTED','STARTED','SUBMITTED')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_kyc_verifications'
      AND policyname = 'mentor_kyc_verifications_update_own'
  ) THEN
    CREATE POLICY mentor_kyc_verifications_update_own
    ON public.mentor_kyc_verifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "userId")
    WITH CHECK (
      auth.uid() = "userId"
      AND status IN ('NOT_STARTED','STARTED','SUBMITTED')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_kyc_verifications'
      AND policyname = 'mentor_kyc_verifications_delete_own'
  ) THEN
    CREATE POLICY mentor_kyc_verifications_delete_own
    ON public.mentor_kyc_verifications
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;
END $$;
