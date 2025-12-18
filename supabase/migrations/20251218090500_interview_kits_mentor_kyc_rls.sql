ALTER TABLE public.interview_kits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interview_kits_select_visible ON public.interview_kits;
CREATE POLICY interview_kits_select_visible
ON public.interview_kits
FOR SELECT
TO authenticated
USING (
  auth.uid() = "ownerId"
  OR (
    visibility = 'PUBLIC'
    AND NOT "isArchived"
    AND EXISTS (
      SELECT 1
      FROM public.community_profiles cp
      WHERE cp."userId" = interview_kits."ownerId"
        AND cp."isMentor" = true
    )
    AND EXISTS (
      SELECT 1
      FROM public.mentor_kyc_verifications mk
      WHERE mk."userId" = interview_kits."ownerId"
        AND mk.status = 'APPROVED'
    )
  )
);

DROP POLICY IF EXISTS interview_kits_insert_own ON public.interview_kits;
CREATE POLICY interview_kits_insert_own
ON public.interview_kits
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = "ownerId"
  AND (
    visibility <> 'PUBLIC'
    OR (
      EXISTS (
        SELECT 1
        FROM public.community_profiles cp
        WHERE cp."userId" = auth.uid()
          AND cp."isMentor" = true
      )
      AND EXISTS (
        SELECT 1
        FROM public.mentor_kyc_verifications mk
        WHERE mk."userId" = auth.uid()
          AND mk.status = 'APPROVED'
      )
    )
  )
);

DROP POLICY IF EXISTS interview_kits_update_own ON public.interview_kits;
CREATE POLICY interview_kits_update_own
ON public.interview_kits
FOR UPDATE
TO authenticated
USING (
  auth.uid() = "ownerId"
)
WITH CHECK (
  auth.uid() = "ownerId"
  AND (
    visibility <> 'PUBLIC'
    OR (
      EXISTS (
        SELECT 1
        FROM public.community_profiles cp
        WHERE cp."userId" = auth.uid()
          AND cp."isMentor" = true
      )
      AND EXISTS (
        SELECT 1
        FROM public.mentor_kyc_verifications mk
        WHERE mk."userId" = auth.uid()
          AND mk.status = 'APPROVED'
      )
    )
  )
);

ALTER TABLE public.interview_kit_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interview_kit_snapshots_select_visible ON public.interview_kit_snapshots;
CREATE POLICY interview_kit_snapshots_select_visible
ON public.interview_kit_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.interview_kits k
    WHERE k.id = interview_kit_snapshots."kitId"
      AND (
        auth.uid() = k."ownerId"
        OR (
          k.visibility = 'PUBLIC'
          AND NOT k."isArchived"
          AND EXISTS (
            SELECT 1
            FROM public.community_profiles cp
            WHERE cp."userId" = k."ownerId"
              AND cp."isMentor" = true
          )
          AND EXISTS (
            SELECT 1
            FROM public.mentor_kyc_verifications mk
            WHERE mk."userId" = k."ownerId"
              AND mk.status = 'APPROVED'
          )
        )
      )
  )
);
