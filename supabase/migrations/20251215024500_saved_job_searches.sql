CREATE TABLE IF NOT EXISTS public.saved_job_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  filters jsonb NOT NULL,
  "isEnabled" boolean NOT NULL DEFAULT true,
  frequency text NOT NULL DEFAULT 'daily',
  "notifyOnMatch" boolean NOT NULL DEFAULT true,
  "lastRunAt" timestamptz,
  "lastSeenJobKeys" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT saved_job_searches_user_name_unique UNIQUE ("userId", name)
);

CREATE INDEX IF NOT EXISTS saved_job_searches_user_id_idx ON public.saved_job_searches ("userId");
