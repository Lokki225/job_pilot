INSERT INTO public.community_role_applications (
  "userId",
  "roleType",
  status,
  grade,
  "submittedAt",
  "approvedAt",
  "approvedBy",
  "rejectedAt",
  "rejectedBy",
  "reviewNote",
  payload
)
SELECT
  mkv."userId",
  'MENTOR'::text,
  CASE mkv.status
    WHEN 'NOT_STARTED' THEN 'NOT_STARTED'
    WHEN 'STARTED' THEN 'STARTED'
    WHEN 'SUBMITTED' THEN 'SUBMITTED'
    WHEN 'APPROVED' THEN 'APPROVED'
    WHEN 'REJECTED' THEN 'REJECTED'
    ELSE 'NOT_STARTED'
  END,
  CASE WHEN mkv.status = 'APPROVED' THEN 'BRONZE' ELSE NULL END,
  mkv."submittedAt",
  mkv."approvedAt",
  mkv."approvedBy",
  mkv."rejectedAt",
  mkv."rejectedBy",
  CASE WHEN mkv.status = 'REJECTED' THEN mkv.payload->>'adminNote' ELSE NULL END,
  CASE WHEN mkv."providerInquiryId" IS NOT NULL THEN jsonb_build_object('providerInquiryId', mkv."providerInquiryId") ELSE NULL END
FROM public.mentor_kyc_verifications mkv
ON CONFLICT ("userId", "roleType") DO UPDATE
SET
  status = EXCLUDED.status,
  grade = COALESCE(public.community_role_applications.grade, EXCLUDED.grade),
  "submittedAt" = COALESCE(public.community_role_applications."submittedAt", EXCLUDED."submittedAt"),
  "approvedAt" = COALESCE(public.community_role_applications."approvedAt", EXCLUDED."approvedAt"),
  "approvedBy" = COALESCE(public.community_role_applications."approvedBy", EXCLUDED."approvedBy"),
  "rejectedAt" = COALESCE(public.community_role_applications."rejectedAt", EXCLUDED."rejectedAt"),
  "rejectedBy" = COALESCE(public.community_role_applications."rejectedBy", EXCLUDED."rejectedBy"),
  "reviewNote" = COALESCE(public.community_role_applications."reviewNote", EXCLUDED."reviewNote"),
  payload = COALESCE(EXCLUDED.payload, public.community_role_applications.payload);
