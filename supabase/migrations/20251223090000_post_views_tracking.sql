-- Track unique post views per user and expose a helper function

CREATE TABLE IF NOT EXISTS public.community_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "postId" uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "viewedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS community_post_views_post_user_idx
  ON public.community_post_views ("postId", "userId");

CREATE OR REPLACE FUNCTION public.record_post_view(
  p_post_id uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_inserted integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.community_post_views ("postId", "userId")
  VALUES (p_post_id, p_user_id)
  ON CONFLICT ("postId", "userId") DO NOTHING;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;

  IF rows_inserted = 1 THEN
    UPDATE public.community_posts
    SET "viewsCount" = COALESCE("viewsCount", 0) + 1
    WHERE id = p_post_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

ALTER TABLE public.community_post_views ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.community_post_views TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_post_views'
      AND policyname = 'community_post_views_select_own'
  ) THEN
    EXECUTE '
      CREATE POLICY community_post_views_select_own
      ON public.community_post_views
      FOR SELECT
      TO authenticated
      USING ("userId" = auth.uid())
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_post_views'
      AND policyname = 'community_post_views_insert_own'
  ) THEN
    EXECUTE '
      CREATE POLICY community_post_views_insert_own
      ON public.community_post_views
      FOR INSERT
      TO authenticated
      WITH CHECK ("userId" = auth.uid())
    ';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.refresh_post_comments(
  p_post_id uuid
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_posts
  SET "commentsCount" = (
    SELECT COUNT(*)
    FROM public.community_post_comments
    WHERE "postId" = p_post_id
      AND COALESCE("isDeleted", false) = false
  )
  WHERE id = p_post_id;
END;
$$;
