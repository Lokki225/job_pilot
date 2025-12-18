ALTER TABLE public.mentor_kyc_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mentor_kyc_verifications_select_public_approved ON public.mentor_kyc_verifications;
CREATE POLICY mentor_kyc_verifications_select_public_approved
ON public.mentor_kyc_verifications
FOR SELECT
TO authenticated
USING (status = 'APPROVED');
