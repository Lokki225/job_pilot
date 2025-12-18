CREATE TABLE IF NOT EXISTS public.interview_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'PRIVATE',
  "blocksJson" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "prepBlocksJson" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "isArchived" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT interview_kits_visibility_check CHECK (visibility IN ('PRIVATE','PUBLIC'))
);

CREATE INDEX IF NOT EXISTS interview_kits_owner_id_idx ON public.interview_kits ("ownerId");
CREATE INDEX IF NOT EXISTS interview_kits_visibility_idx ON public.interview_kits (visibility);

CREATE TABLE IF NOT EXISTS public.interview_kit_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "kitId" uuid NOT NULL REFERENCES public.interview_kits(id) ON DELETE CASCADE,
  "createdById" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label varchar(120),
  note text,
  "blocksJson" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "prepBlocksJson" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS interview_kit_snapshots_kit_id_idx ON public.interview_kit_snapshots ("kitId");
CREATE INDEX IF NOT EXISTS interview_kit_snapshots_created_by_id_idx ON public.interview_kit_snapshots ("createdById");
CREATE INDEX IF NOT EXISTS interview_kit_snapshots_created_at_idx ON public.interview_kit_snapshots ("createdAt");

CREATE OR REPLACE FUNCTION public.set_interview_kits_updated_at()
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
    WHERE tgname = 'set_interview_kits_updated_at'
      AND tgrelid = 'public.interview_kits'::regclass
  ) THEN
    CREATE TRIGGER set_interview_kits_updated_at
    BEFORE UPDATE ON public.interview_kits
    FOR EACH ROW
    EXECUTE FUNCTION public.set_interview_kits_updated_at();
  END IF;
END $$;

ALTER TABLE public.interview_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_kit_snapshots ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_kits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_kit_snapshots TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kits'
      AND policyname = 'interview_kits_select_visible'
  ) THEN
    CREATE POLICY interview_kits_select_visible
    ON public.interview_kits
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "ownerId" OR (visibility = 'PUBLIC' AND NOT "isArchived"));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kits'
      AND policyname = 'interview_kits_insert_own'
  ) THEN
    CREATE POLICY interview_kits_insert_own
    ON public.interview_kits
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = "ownerId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kits'
      AND policyname = 'interview_kits_update_own'
  ) THEN
    CREATE POLICY interview_kits_update_own
    ON public.interview_kits
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "ownerId")
    WITH CHECK (auth.uid() = "ownerId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kits'
      AND policyname = 'interview_kits_delete_own'
  ) THEN
    CREATE POLICY interview_kits_delete_own
    ON public.interview_kits
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "ownerId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_snapshots'
      AND policyname = 'interview_kit_snapshots_select_visible'
  ) THEN
    CREATE POLICY interview_kit_snapshots_select_visible
    ON public.interview_kit_snapshots
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.interview_kits k
        WHERE k.id = interview_kit_snapshots."kitId"
          AND (auth.uid() = k."ownerId" OR (k.visibility = 'PUBLIC' AND NOT k."isArchived"))
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_snapshots'
      AND policyname = 'interview_kit_snapshots_insert_own'
  ) THEN
    CREATE POLICY interview_kit_snapshots_insert_own
    ON public.interview_kit_snapshots
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = "createdById"
      AND EXISTS (
        SELECT 1
        FROM public.interview_kits k
        WHERE k.id = interview_kit_snapshots."kitId"
          AND auth.uid() = k."ownerId"
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_snapshots'
      AND policyname = 'interview_kit_snapshots_update_own'
  ) THEN
    CREATE POLICY interview_kit_snapshots_update_own
    ON public.interview_kit_snapshots
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.interview_kits k
        WHERE k.id = interview_kit_snapshots."kitId"
          AND auth.uid() = k."ownerId"
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.interview_kits k
        WHERE k.id = interview_kit_snapshots."kitId"
          AND auth.uid() = k."ownerId"
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_kit_snapshots'
      AND policyname = 'interview_kit_snapshots_delete_own'
  ) THEN
    CREATE POLICY interview_kit_snapshots_delete_own
    ON public.interview_kit_snapshots
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.interview_kits k
        WHERE k.id = interview_kit_snapshots."kitId"
          AND auth.uid() = k."ownerId"
      )
    );
  END IF;
END $$;
