/**
 * Hyatt shifts are a separate Planner-owned layer, never a childcare Carer.
 * Times are decimal hours in 30-minute increments, [start, end).
 */
export type WorkBlock = { day: number; start: number; end: number };
export type WorkOverride = { date: string; start: number; end: number; off?: boolean };
export type CareCarer = 'Youn' | 'Lach' | 'Childcare' | 'Shared' | 'Unassigned';
export type CareSlot = { start: number; end: number; carer: CareCarer; auto?: boolean };

const halfHour = (n: number) => Number.isFinite(n) && n * 2 === Math.round(n * 2);
export function validShift(start: number, end: number): boolean {
  return halfHour(start) && halfHour(end) && start >= 0 && end <= 24 && end > start;
}
export function validateWorkBlock(block: WorkBlock): boolean {
  return Number.isInteger(block.day) && block.day >= 0 && block.day <= 6 &&
    validShift(block.start, block.end);
}
function mergeIntervals<T extends { start: number; end: number }>(items: T[]): T[] {
  const sorted = items.slice().sort((a,b) => a.start-b.start || a.end-b.end);
  const merged: T[] = [];
  for (const item of sorted) {
    const last = merged[merged.length-1];
    if (last && item.start <= last.end) last.end = Math.max(last.end,item.end);
    else merged.push({...item});
  }
  return merged;
}
/** An override is a patch to a recurring shift: off removes covered time. */
export function shiftsOnDate(date: string, weekly: WorkBlock[], overrides: WorkOverride[]): WorkBlock[] {
  const day = new Date(date+'T12:00:00').getDay();
  let intervals: WorkBlock[] = weekly.filter(b => b.day === day && validateWorkBlock(b)).map(b => ({...b}));
  for (const override of overrides.filter(o => o.date === date && validShift(o.start,o.end))) {
    intervals = intervals.flatMap(b => {
      if (b.end <= override.start || b.start >= override.end) return [b];
      return [
        ...(b.start < override.start ? [{...b,end:override.start}] : []),
        ...(b.end > override.end ? [{...b,start:override.end}] : [])
      ];
    });
    if (!override.off) intervals.push({day,start:override.start,end:override.end});
  }
  return mergeIntervals(intervals);
}
/** Overlay automatic Lach care only over otherwise unassigned hours during Hyatt. */
export function effectiveCareSlots(
  care: CareSlot[], shifts: Pick<WorkBlock,'start'|'end'>[],
  from = 8, to = 20
): CareSlot[] {
  const boundaries = new Set<number>([from,to]);
  for (const b of care) { boundaries.add(Math.max(from,Math.min(to,b.start))); boundaries.add(Math.max(from,Math.min(to,b.end))); }
  for (const s of shifts) { boundaries.add(Math.max(from,Math.min(to,s.start))); boundaries.add(Math.max(from,Math.min(to,s.end))); }
  const ticks = [...boundaries].sort((a,b)=>a-b);
  const result: CareSlot[] = [];
  for (let i=0;i<ticks.length-1;i++) {
    const start=ticks[i], end=ticks[i+1];
    if (end<=start) continue;
    const assigned = care.find(b=>b.start<=start && b.end>=end);
    const carer = assigned?.carer ?? 'Unassigned';
    const auto = carer==='Unassigned' && shifts.some(s=>s.start<end && s.end>start);
    const next: CareSlot = {start,end,carer:auto?'Lach':carer,...(auto?{auto:true}:{})};
    const prev=result[result.length-1];
    if(prev && prev.end===start && prev.carer===next.carer && !!prev.auto===!!next.auto) prev.end=end;
    else result.push(next);
  }
  return result;
}
