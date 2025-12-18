DROP POLICY IF EXISTS community_profiles_insert_own ON public.community_profiles;
CREATE POLICY community_profiles_insert_own
ON public.community_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = "userId"
  AND "reputationPoints" = 0
  AND "level" = 1
  AND "postsCount" = 0
  AND "commentsCount" = 0
  AND "helpfulVotes" = 0
  AND "successStoriesShared" = 0
  AND "isModerator" = false
  AND "isExpert" = false
  AND "isMentor" = false
  AND "isBanned" = false
  AND "banReason" IS NULL
  AND "banExpiresAt" IS NULL
);

DROP POLICY IF EXISTS community_profiles_update_own ON public.community_profiles;
CREATE POLICY community_profiles_update_own
ON public.community_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

REVOKE UPDATE ON public.community_profiles FROM authenticated;
GRANT UPDATE (bio, "favoriteTopics", "lastActiveAt") ON public.community_profiles TO authenticated;
