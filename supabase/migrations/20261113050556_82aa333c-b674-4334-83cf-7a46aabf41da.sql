DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['planner_cake_stages','planner_event_types','planner_intentions','planner_groups','planner_task_series'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authed all '||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_household_member(auth.uid())) WITH CHECK (public.is_household_member(auth.uid()))', 'household all '||t, t);
  END LOOP;
END $$;