-- Enable Realtime for notifications table
-- This allows Supabase Realtime to broadcast INSERT/UPDATE/DELETE events

-- Enable replica identity for notifications table (required for realtime UPDATE/DELETE events)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Enable realtime publication for notifications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END
$$;
