UPDATE public.planner_user_settings
SET widget_visibility = (widget_visibility - 'tasks' - 'multiple_tasks') || jsonb_build_object('task_workspace', true),
    widget_order = (
      SELECT array_agg(x) FROM (
        SELECT DISTINCT ON (ord) CASE WHEN k IN ('tasks','multiple_tasks') THEN 'task_workspace' ELSE k END AS x, ord
        FROM unnest(widget_order) WITH ORDINALITY AS t(k, ord)
        ORDER BY ord
      ) s
    );