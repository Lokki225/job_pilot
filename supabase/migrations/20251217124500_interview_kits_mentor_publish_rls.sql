ALTER TABLE public.interview_kits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interview_kits_insert_own ON public.interview_kits;
CREATE POLICY interview_kits_insert_own
ON public.interview_kits
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = "ownerId"
  AND (
    visibility <> 'PUBLIC'
    OR EXISTS (
      SELECT 1
      FROM public.community_profiles cp
      WHERE cp."userId" = auth.uid()
        AND cp."isMentor" = true
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
    OR EXISTS (
      SELECT 1
      FROM public.community_profiles cp
      WHERE cp."userId" = auth.uid()
        AND cp."isMentor" = true
    )
  )
);
