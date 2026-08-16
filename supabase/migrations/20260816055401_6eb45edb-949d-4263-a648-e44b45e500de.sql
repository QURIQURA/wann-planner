ALTER TABLE public.planner_baby_slot_types ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#C9C6E8';

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY sort_order, created_at) - 1 AS rn
  FROM public.planner_baby_slot_types
), palette AS (
  SELECT unnest(ARRAY['#C7B9E8','#F7C9A9','#A9D8C8','#F3B9C6','#B9CDEB','#EBD9A9','#D8B9E8','#A9C9B0']) AS c, generate_series(0,7) AS i
)
UPDATE public.planner_baby_slot_types t
SET color = p.c
FROM ordered o JOIN palette p ON p.i = (o.rn % 8)
WHERE t.id = o.id;