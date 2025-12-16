CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'EVENT',
  title varchar(120) NOT NULL,
  description text,
  location text,
  "startAt" timestamptz NOT NULL,
  "endAt" timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  "recurrenceRule" text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT calendar_events_type_check CHECK (type IN ('EVENT','REMINDER','INTERVIEW_SESSION')),
  CONSTRAINT calendar_events_time_check CHECK ("endAt" > "startAt")
);

CREATE INDEX IF NOT EXISTS calendar_events_user_start_idx ON public.calendar_events ("userId", "startAt");

CREATE TABLE IF NOT EXISTS public.calendar_event_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventId" uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "remindAt" timestamptz NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'PENDING',
  "sentAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT calendar_event_reminders_channel_check CHECK (channel IN ('in_app','email','push')),
  CONSTRAINT calendar_event_reminders_status_check CHECK (status IN ('PENDING','PROCESSING','SENT','CANCELLED','FAILED'))
);

CREATE INDEX IF NOT EXISTS calendar_event_reminders_user_remind_idx ON public.calendar_event_reminders ("userId", "remindAt");
CREATE INDEX IF NOT EXISTS calendar_event_reminders_due_idx ON public.calendar_event_reminders (status, "remindAt");

CREATE OR REPLACE FUNCTION public.set_calendar_events_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_calendar_event_reminders_updated_at()
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
    WHERE tgname = 'set_calendar_events_updated_at'
      AND tgrelid = 'public.calendar_events'::regclass
  ) THEN
    CREATE TRIGGER set_calendar_events_updated_at
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION public.set_calendar_events_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_calendar_event_reminders_updated_at'
      AND tgrelid = 'public.calendar_event_reminders'::regclass
  ) THEN
    CREATE TRIGGER set_calendar_event_reminders_updated_at
    BEFORE UPDATE ON public.calendar_event_reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_calendar_event_reminders_updated_at();
  END IF;
END $$;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_reminders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_event_reminders TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_events'
      AND policyname = 'calendar_events_select_own'
  ) THEN
    CREATE POLICY calendar_events_select_own
    ON public.calendar_events
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_events'
      AND policyname = 'calendar_events_insert_own'
  ) THEN
    CREATE POLICY calendar_events_insert_own
    ON public.calendar_events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_events'
      AND policyname = 'calendar_events_update_own'
  ) THEN
    CREATE POLICY calendar_events_update_own
    ON public.calendar_events
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_events'
      AND policyname = 'calendar_events_delete_own'
  ) THEN
    CREATE POLICY calendar_events_delete_own
    ON public.calendar_events
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_event_reminders'
      AND policyname = 'calendar_event_reminders_select_own'
  ) THEN
    CREATE POLICY calendar_event_reminders_select_own
    ON public.calendar_event_reminders
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_event_reminders'
      AND policyname = 'calendar_event_reminders_insert_own'
  ) THEN
    CREATE POLICY calendar_event_reminders_insert_own
    ON public.calendar_event_reminders
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_event_reminders'
      AND policyname = 'calendar_event_reminders_update_own'
  ) THEN
    CREATE POLICY calendar_event_reminders_update_own
    ON public.calendar_event_reminders
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_event_reminders'
      AND policyname = 'calendar_event_reminders_delete_own'
  ) THEN
    CREATE POLICY calendar_event_reminders_delete_own
    ON public.calendar_event_reminders
    FOR DELETE
    TO authenticated
    USING (auth.uid() = "userId");
  END IF;
END $$;
