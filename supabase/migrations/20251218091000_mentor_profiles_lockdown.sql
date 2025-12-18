DROP POLICY IF EXISTS mentor_profiles_insert_own ON public.mentor_profiles;
CREATE POLICY mentor_profiles_insert_own
ON public.mentor_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = "userId"
  AND "isActive" = false
);

DROP POLICY IF EXISTS mentor_profiles_update_own ON public.mentor_profiles;
CREATE POLICY mentor_profiles_update_own
ON public.mentor_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

REVOKE UPDATE ON public.mentor_profiles FROM authenticated;
GRANT UPDATE (bio, expertise, availability, "maxMentees") ON public.mentor_profiles TO authenticated;
