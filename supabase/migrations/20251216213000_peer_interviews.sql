CREATE TABLE IF NOT EXISTS public.interview_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requesterId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "targetId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'INSTANT',
  status text NOT NULL DEFAULT 'PENDING',
  "proposedTimes" timestamptz[] NOT NULL DEFAULT ARRAY[]::timestamptz[],
  message text,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT interview_requests_mode_check CHECK (mode IN ('INSTANT','SCHEDULED')),
  CONSTRAINT interview_requests_status_check CHECK (status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED','EXPIRED'))
);

CREATE INDEX IF NOT EXISTS interview_requests_requester_id_idx ON public.interview_requests ("requesterId");
CREATE INDEX IF NOT EXISTS interview_requests_target_id_idx ON public.interview_requests ("targetId");
CREATE INDEX IF NOT EXISTS interview_requests_status_idx ON public.interview_requests (status);

CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requestId" uuid REFERENCES public.interview_requests(id) ON DELETE SET NULL,
  "interviewerId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "candidateId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "scheduledAt" timestamptz NOT NULL,
  "startedAt" timestamptz,
  "endedAt" timestamptz,
  status text NOT NULL DEFAULT 'SCHEDULED',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT interview_sessions_status_check CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'))
);

CREATE INDEX IF NOT EXISTS interview_sessions_interviewer_id_idx ON public.interview_sessions ("interviewerId");
CREATE INDEX IF NOT EXISTS interview_sessions_candidate_id_idx ON public.interview_sessions ("candidateId");
CREATE INDEX IF NOT EXISTS interview_sessions_scheduled_at_idx ON public.interview_sessions ("scheduledAt");

CREATE TABLE IF NOT EXISTS public.interview_room_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" uuid NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT interview_room_roles_role_check CHECK (role IN ('INTERVIEWER','CANDIDATE')),
  CONSTRAINT interview_room_roles_unique UNIQUE ("sessionId", "userId")
);

CREATE INDEX IF NOT EXISTS interview_room_roles_session_id_idx ON public.interview_room_roles ("sessionId");
CREATE INDEX IF NOT EXISTS interview_room_roles_user_id_idx ON public.interview_room_roles ("userId");

CREATE OR REPLACE FUNCTION public.set_interview_requests_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_interview_sessions_updated_at()
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
    WHERE tgname = 'set_interview_requests_updated_at'
      AND tgrelid = 'public.interview_requests'::regclass
  ) THEN
    CREATE TRIGGER set_interview_requests_updated_at
    BEFORE UPDATE ON public.interview_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_interview_requests_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_interview_sessions_updated_at'
      AND tgrelid = 'public.interview_sessions'::regclass
  ) THEN
    CREATE TRIGGER set_interview_sessions_updated_at
    BEFORE UPDATE ON public.interview_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_interview_sessions_updated_at();
  END IF;
END $$;

ALTER TABLE public.interview_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_room_roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_room_roles TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_requests'
      AND policyname = 'interview_requests_select_participants'
  ) THEN
    CREATE POLICY interview_requests_select_participants
    ON public.interview_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "requesterId" OR auth.uid() = "targetId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_requests'
      AND policyname = 'interview_requests_insert_own'
  ) THEN
    CREATE POLICY interview_requests_insert_own
    ON public.interview_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = "requesterId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_requests'
      AND policyname = 'interview_requests_update_participants'
  ) THEN
    CREATE POLICY interview_requests_update_participants
    ON public.interview_requests
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "requesterId" OR auth.uid() = "targetId")
    WITH CHECK (auth.uid() = "requesterId" OR auth.uid() = "targetId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_requests'
      AND policyname = 'interview_requests_delete_participants'
  ) THEN
    CREATE POLICY interview_requests_delete_participants
    ON public.interview_requests
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "requesterId" OR auth.uid() = "targetId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_sessions'
      AND policyname = 'interview_sessions_select_participants'
  ) THEN
    CREATE POLICY interview_sessions_select_participants
    ON public.interview_sessions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "interviewerId" OR auth.uid() = "candidateId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_sessions'
      AND policyname = 'interview_sessions_insert_participants'
  ) THEN
    CREATE POLICY interview_sessions_insert_participants
    ON public.interview_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = "interviewerId" OR auth.uid() = "candidateId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_sessions'
      AND policyname = 'interview_sessions_update_participants'
  ) THEN
    CREATE POLICY interview_sessions_update_participants
    ON public.interview_sessions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "interviewerId" OR auth.uid() = "candidateId")
    WITH CHECK (auth.uid() = "interviewerId" OR auth.uid() = "candidateId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_sessions'
      AND policyname = 'interview_sessions_delete_participants'
  ) THEN
    CREATE POLICY interview_sessions_delete_participants
    ON public.interview_sessions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "interviewerId" OR auth.uid() = "candidateId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_room_roles'
      AND policyname = 'interview_room_roles_select_participants'
  ) THEN
    CREATE POLICY interview_room_roles_select_participants
    ON public.interview_room_roles
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = interview_room_roles."sessionId"
          AND (auth.uid() = s."interviewerId" OR auth.uid() = s."candidateId")
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_room_roles'
      AND policyname = 'interview_room_roles_insert_participants'
  ) THEN
    CREATE POLICY interview_room_roles_insert_participants
    ON public.interview_room_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = interview_room_roles."sessionId"
          AND (auth.uid() = s."interviewerId" OR auth.uid() = s."candidateId")
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_room_roles'
      AND policyname = 'interview_room_roles_update_participants'
  ) THEN
    CREATE POLICY interview_room_roles_update_participants
    ON public.interview_room_roles
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = interview_room_roles."sessionId"
          AND (auth.uid() = s."interviewerId" OR auth.uid() = s."candidateId")
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = interview_room_roles."sessionId"
          AND (auth.uid() = s."interviewerId" OR auth.uid() = s."candidateId")
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_room_roles'
      AND policyname = 'interview_room_roles_delete_participants'
  ) THEN
    CREATE POLICY interview_room_roles_delete_participants
    ON public.interview_room_roles
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = interview_room_roles."sessionId"
          AND (auth.uid() = s."interviewerId" OR auth.uid() = s."candidateId")
      )
    );
  END IF;
END $$;
