-- PRAW private messages (praw.pro/pm)
-- Applied remotely via Supabase MCP as migration private_messages_pm.
-- Kept here as source of truth for the Carl-Walker-pm/pm repo.

CREATE TABLE IF NOT EXISTS public.pm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'dm' CHECK (kind = ANY (ARRAY['dm'::text, 'group'::text])),
  subject text CHECK (subject IS NULL OR (char_length(subject) >= 1 AND char_length(subject) <= 200)),
  pair_key text UNIQUE,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pm_threads_dm_pair CHECK (
    (kind = 'dm' AND pair_key IS NOT NULL) OR (kind = 'group')
  )
);

CREATE TABLE IF NOT EXISTS public.pm_participants (
  thread_id uuid NOT NULL REFERENCES public.pm_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.pm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.pm_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id),
  body text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 8000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pm_messages_thread_created_idx
  ON public.pm_messages (thread_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS pm_participants_user_idx
  ON public.pm_participants (user_id, thread_id);
CREATE INDEX IF NOT EXISTS pm_threads_updated_idx
  ON public.pm_threads (updated_at DESC);

CREATE OR REPLACE FUNCTION public.is_pm_participant(p_thread_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.pm_participants p
    WHERE p.thread_id = p_thread_id AND p.user_id = p_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.pm_pair_key(a uuid, b uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN a::text < b::text THEN a::text || ':' || b::text ELSE b::text || ':' || a::text END;
$function$;

CREATE OR REPLACE FUNCTION public.open_pm_dm(p_other uuid, p_body text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  key text;
  tid uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_other IS NULL OR p_other = me THEN
    RAISE EXCEPTION 'invalid recipient';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_other) THEN
    RAISE EXCEPTION 'recipient not found';
  END IF;

  key := public.pm_pair_key(me, p_other);

  SELECT t.id INTO tid FROM public.pm_threads t WHERE t.pair_key = key;
  IF tid IS NULL THEN
    INSERT INTO public.pm_threads (kind, pair_key, created_by)
    VALUES ('dm', key, me)
    RETURNING id INTO tid;

    INSERT INTO public.pm_participants (thread_id, user_id)
    VALUES (tid, me), (tid, p_other);
  ELSE
    INSERT INTO public.pm_participants (thread_id, user_id)
    VALUES (tid, me)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.pm_participants (thread_id, user_id)
    VALUES (tid, p_other)
    ON CONFLICT DO NOTHING;
  END IF;

  IF p_body IS NOT NULL AND length(trim(p_body)) > 0 THEN
    INSERT INTO public.pm_messages (thread_id, author_id, body)
    VALUES (tid, me, trim(p_body));
    UPDATE public.pm_threads SET updated_at = now() WHERE id = tid;
    UPDATE public.pm_participants
      SET last_read_at = now()
      WHERE thread_id = tid AND user_id = me;
  END IF;

  RETURN tid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_pm_read(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.is_pm_participant(p_thread_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a participant';
  END IF;
  UPDATE public.pm_participants
    SET last_read_at = now()
    WHERE thread_id = p_thread_id AND user_id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.pm_bump_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.pm_threads SET updated_at = now() WHERE id = NEW.thread_id;
  UPDATE public.pm_participants
    SET last_read_at = now()
    WHERE thread_id = NEW.thread_id AND user_id = NEW.author_id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pm_messages_bump ON public.pm_messages;
CREATE TRIGGER pm_messages_bump
AFTER INSERT ON public.pm_messages
FOR EACH ROW EXECUTE FUNCTION public.pm_bump_thread();

ALTER TABLE public.pm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_threads_select_participant ON public.pm_threads;
CREATE POLICY pm_threads_select_participant ON public.pm_threads
  FOR SELECT TO authenticated
  USING (public.is_pm_participant(id, auth.uid()));

DROP POLICY IF EXISTS pm_threads_insert_self ON public.pm_threads;
CREATE POLICY pm_threads_insert_self ON public.pm_threads
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS pm_participants_select_own_threads ON public.pm_participants;
CREATE POLICY pm_participants_select_own_threads ON public.pm_participants
  FOR SELECT TO authenticated
  USING (public.is_pm_participant(thread_id, auth.uid()));

DROP POLICY IF EXISTS pm_participants_insert_self ON public.pm_participants;
CREATE POLICY pm_participants_insert_self ON public.pm_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_pm_participant(thread_id, auth.uid())
  );

DROP POLICY IF EXISTS pm_participants_update_own ON public.pm_participants;
CREATE POLICY pm_participants_update_own ON public.pm_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS pm_messages_select_participant ON public.pm_messages;
CREATE POLICY pm_messages_select_participant ON public.pm_messages
  FOR SELECT TO authenticated
  USING (public.is_pm_participant(thread_id, auth.uid()));

DROP POLICY IF EXISTS pm_messages_insert_participant ON public.pm_messages;
CREATE POLICY pm_messages_insert_participant ON public.pm_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_pm_participant(thread_id, auth.uid())
  );

REVOKE ALL ON TABLE public.pm_threads FROM anon;
REVOKE ALL ON TABLE public.pm_participants FROM anon;
REVOKE ALL ON TABLE public.pm_messages FROM anon;
GRANT SELECT, INSERT ON public.pm_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pm_participants TO authenticated;
GRANT SELECT, INSERT ON public.pm_messages TO authenticated;

REVOKE ALL ON FUNCTION public.is_pm_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pm_pair_key(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.open_pm_dm(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_pm_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pm_bump_thread() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pm_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pm_pair_key(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_pm_dm(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_pm_read(uuid) TO authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pm_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
