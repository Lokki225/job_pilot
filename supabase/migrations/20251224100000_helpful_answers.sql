ALTER TABLE public.community_post_comments
  ADD COLUMN IF NOT EXISTS "isHelpful" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "helpfulMarkedBy" uuid,
  ADD COLUMN IF NOT EXISTS "helpfulMarkedAt" timestamptz;

CREATE OR REPLACE FUNCTION increment_profile_helpful_votes(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE community_profiles
  SET "helpfulVotes" = "helpfulVotes" + 1
  WHERE "userId" = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_profile_helpful_votes(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE community_profiles
  SET "helpfulVotes" = GREATEST("helpfulVotes" - 1, 0)
  WHERE "userId" = user_id;
END;
$$ LANGUAGE plpgsql;
