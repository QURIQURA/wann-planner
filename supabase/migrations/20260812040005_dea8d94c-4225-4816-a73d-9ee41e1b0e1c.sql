UPDATE public.planner_user_settings
SET widget_visibility = (widget_visibility - 'weekly_review' - 'cross_app_alerts')
  || jsonb_build_object('habit_tracker', true, 'monthly_summary', true);