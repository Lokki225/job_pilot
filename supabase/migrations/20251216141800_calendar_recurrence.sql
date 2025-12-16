ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS "seriesId" uuid REFERENCES public.calendar_events(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS "overrideOfStartAt" timestamptz;

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS "recurrenceExceptions" jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS calendar_events_series_idx ON public.calendar_events ("seriesId");
CREATE INDEX IF NOT EXISTS calendar_events_override_idx ON public.calendar_events ("seriesId", "overrideOfStartAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'calendar_events_override_check'
      AND conrelid = 'public.calendar_events'::regclass
  ) THEN
    ALTER TABLE public.calendar_events
      ADD CONSTRAINT calendar_events_override_check
      CHECK (("overrideOfStartAt" IS NULL) OR ("seriesId" IS NOT NULL));
  END IF;
END $$;

ALTER TABLE public.calendar_event_reminders
  ADD COLUMN IF NOT EXISTS "occurrenceStartAt" timestamptz;

CREATE INDEX IF NOT EXISTS calendar_event_reminders_event_occurrence_idx
  ON public.calendar_event_reminders ("eventId", "occurrenceStartAt");
