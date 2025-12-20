CREATE TABLE IF NOT EXISTS public.community_grade_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trackType" text NOT NULL,
  grade text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT community_grade_thresholds_track_type_check CHECK ("trackType" IN ('MENTOR','RESOURCE_SHARER','MODERATOR')),
  CONSTRAINT community_grade_thresholds_grade_check CHECK (grade IN ('BRONZE','SILVER','GOLD')),
  CONSTRAINT community_grade_thresholds_unique UNIQUE ("trackType", grade)
);

CREATE OR REPLACE FUNCTION public.set_community_grade_thresholds_updated_at()
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
    WHERE tgname = 'set_community_grade_thresholds_updated_at'
      AND tgrelid = 'public.community_grade_thresholds'::regclass
  ) THEN
    CREATE TRIGGER set_community_grade_thresholds_updated_at
    BEFORE UPDATE ON public.community_grade_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION public.set_community_grade_thresholds_updated_at();
  END IF;
END $$;

INSERT INTO public.community_grade_thresholds ("trackType", grade, criteria)
VALUES
  ('MENTOR','BRONZE','{"minCompletedMentorships":0}'::jsonb),
  ('MENTOR','SILVER','{"minCompletedMentorships":5}'::jsonb),
  ('MENTOR','GOLD','{"minCompletedMentorships":20}'::jsonb),
  ('RESOURCE_SHARER','BRONZE','{"minResourcePosts":3,"minLikes":10,"minBookmarks":5}'::jsonb),
  ('RESOURCE_SHARER','SILVER','{"minResourcePosts":10,"minLikes":50,"minBookmarks":25}'::jsonb),
  ('RESOURCE_SHARER','GOLD','{"minResourcePosts":25,"minLikes":200,"minBookmarks":100}'::jsonb)
ON CONFLICT ("trackType", grade) DO NOTHING;

ALTER TABLE public.community_grade_thresholds ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.community_grade_thresholds TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_grade_thresholds'
      AND policyname = 'community_grade_thresholds_select_all'
  ) THEN
    CREATE POLICY community_grade_thresholds_select_all
    ON public.community_grade_thresholds
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;
