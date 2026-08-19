
CREATE TABLE IF NOT EXISTS public.household_members (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.household_members TO authenticated;
GRANT ALL ON public.household_members TO service_role;

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read own membership" ON public.household_members;
CREATE POLICY "members read own membership" ON public.household_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

INSERT INTO public.household_members (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_household_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = _user_id)
$$;

DO $$
DECLARE
  r record;
  p record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND (tablename LIKE 'planner\_%' OR tablename LIKE 'finance\_%' OR tablename LIKE 'croijang\_%')
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = r.tablename
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, r.tablename);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_household_member(auth.uid())) WITH CHECK (public.is_household_member(auth.uid()))',
      'household members only', r.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tablename);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "croijang-receipts authenticated all" ON storage.objects;
DROP POLICY IF EXISTS "authed read stickers" ON storage.objects;
DROP POLICY IF EXISTS "authed insert stickers" ON storage.objects;
DROP POLICY IF EXISTS "authed update stickers" ON storage.objects;
DROP POLICY IF EXISTS "authed delete stickers" ON storage.objects;
DROP POLICY IF EXISTS "diary photos read" ON storage.objects;
DROP POLICY IF EXISTS "diary photos insert" ON storage.objects;
DROP POLICY IF EXISTS "diary photos update" ON storage.objects;
DROP POLICY IF EXISTS "diary photos delete" ON storage.objects;

CREATE POLICY "receipts household members" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'croijang-receipts' AND public.is_household_member(auth.uid()))
  WITH CHECK (bucket_id = 'croijang-receipts' AND public.is_household_member(auth.uid()));

CREATE POLICY "stickers owner only" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'stickers' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'stickers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "diary photos owner only" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'diary-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'diary-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
