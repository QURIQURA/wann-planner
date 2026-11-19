import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useChildcareSync } from '@/lib/use-childcare-sync';
import { effectiveCareSlots, validShift } from '@/lib/hyatt-shifts';

export const Route = createFileRoute('/_authenticated/childcare')({ component: ChildcareSchedule });
type Carer = 'Youn' | 'Lach' | 'Childcare' | 'Shared' | 'Unassigned';
type Block = { day: number; start: number; end: number; carer: Carer };
const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const colours: Record<Carer,string> = {Youn:'#E9B46A',Lach:'#79ACD0',Childcare:'#A6B99A',Shared:'#C9B4D9',Unassigned:'#E5E7EB'};
const defaults: Block[] = days.flatMap((_,day) => {
  if(day===0||day===1) return [{day,start:8,end:20,carer:'Youn' as Carer}];
  if(day===2||day===6) return [{day,start:8,end:20,carer:'Lach' as Carer}];
  if(day===3) return [{day,start:8,end:14,carer:'Youn' as Carer},{day,start:14,end:20,carer:'Lach' as Carer}];
  return [{day,start:8,end:10,carer:'Unassigned' as Carer},{day,start:10,end:16,carer:'Childcare' as Carer},{day,start:16,end:20,carer:'Unassigned' as Carer}];
});
function ChildcareSchedule(){
 const {weekly:blocks,workWeekly,ready,error,saveWeekly,saveWorkWeekly}=useChildcareSync();
 const [shiftDay,setShiftDay]=useState(4);
 const [shiftStart,setShiftStart]=useState(10);
 const [shiftEnd,setShiftEnd]=useState(18);
 const [shiftError,setShiftError]=useState<string|null>(null);
 const addShift=()=>{if(!validShift(shiftStart,shiftEnd)){setShiftError('Use 30-minute increments with end after start');return}setShiftError(null);void saveWorkWeekly([...workWeekly,{day:shiftDay,start:shiftStart,end:shiftEnd}]);};
 const removeShift=(index:number)=>void saveWorkWeekly(workWeekly.filter((_,i)=>i!==index));
 const [selected,setSelected]=useState<{day:number;hour:number}|null>(null);
 const [draftCarer,setDraftCarer]=useState<Carer>('Unassigned');
 const setBlocks=(updater:((prev:Block[])=>Block[])|Block[])=>{const next=typeof updater==='function'?updater(blocks):updater;void saveWeekly(next)};
 const choose=(day:number,hour:number)=>{const current=blocks.find(b=>b.day===day&&b.start<=hour&&b.end>hour);setSelected({day,hour});setDraftCarer(current?.carer??'Unassigned')};
 const apply=()=>{
  if(!selected)return;
  const {day,hour}=selected;
  setBlocks(prev=>{
   const next:Block[]=[];
   for(const b of prev){
    if(b.day!==day||b.end<=hour||b.start>=hour+1){next.push(b);continue}
    if(b.start<hour)next.push({...b,end:hour});
    if(b.end>hour+1)next.push({...b,start:hour+1});
   }
   next.push({day,start:hour,end:hour+1,carer:draftCarer});
   next.sort((a,b)=>a.day-b.day||a.start-b.start);
   const merged:Block[]=[];
   for(const b of next){const last=merged[merged.length-1];if(last&&last.day===b.day&&last.end===b.start&&last.carer===b.carer)last.end=b.end;else merged.push({...b})}
   return merged;
  });
  setSelected(null);
 };
 const update=(index:number,patch:Partial<Block>)=>setBlocks(prev=>prev.map((b,i)=>i===index?{...b,...patch}:b));
 const add=(day:number)=>setBlocks(prev=>[...prev,{day,start:8,end:12,carer:'Unassigned'}]);
 const totals=(person:'Youn'|'Lach')=>days.reduce((sum,_,day)=>{const intervals=blocks.filter(b=>b.day===day&&b.carer!==person&&b.carer!=='Shared'&&b.carer!=='Unassigned').map(b=>[b.start,b.end]);const hours=new Set<number>();intervals.forEach(([s,e])=>{for(let h=s;h<e;h++)hours.add(h)});return sum+hours.size},0);
 return <main className="mx-auto max-w-6xl p-4 md:p-8 space-y-5">
 {!ready&&<p className="text-sm">Loading synced childcare schedule…</p>}{error&&<p role="alert" className="text-sm text-red-600">Sync error: {error}</p>}
 <header><h1 className="text-2xl font-semibold">Weekly childcare schedule</h1><p className="text-sm text-muted-foreground">Sunday–Saturday · edit each coloured block's carer and time. Changes sync to your Supabase account.</p></header>
 <div className="flex flex-wrap gap-4 text-sm">{(Object.keys(colours) as Carer[]).map(c=><span key={c} className="flex items-center gap-2"><i style={{background:colours[c]}} className="w-3 h-3 rounded-sm"/>{c}</span>)}</div>
 <div className="overflow-x-auto"><div className="grid min-w-[780px] gap-1" style={{gridTemplateColumns:'70px repeat(7,minmax(0,1fr))'}}>
 <div className="text-xs text-muted-foreground">Time</div>{days.map(d=><div key={d} className="text-center text-xs font-semibold">{d}</div>)}
 {Array.from({length:12},(_,i)=>i+8).map(hour=><div key={hour} className="contents"><div className="text-xs text-muted-foreground py-3">{String(hour).padStart(2,'0')}:00</div>{days.map((_,day)=>{const shifts=workWeekly.filter(w=>w.day===day);const care=effectiveCareSlots(blocks.filter(b=>b.day===day),shifts,hour,hour+1)[0];const b=care??blocks.find(b=>b.day===day&&b.start<=hour&&b.end>hour);const atHyatt=shifts.some(w=>w.start<hour+1&&w.end>hour);const topHyatt=shifts.some(w=>w.start<hour+0.5&&w.end>hour);const bottomHyatt=shifts.some(w=>w.start<hour+1&&w.end>hour+0.5);return <button type="button" key={day} onClick={()=>choose(day,hour)} aria-label={`${days[day]} ${hour}:00 carer: ${b?.carer??'Unassigned'}`} className={`rounded-sm min-h-10 text-center text-[10px] flex items-center justify-center hover:ring-2 hover:ring-foreground/40 ${selected?.day===day&&selected.hour===hour?'ring-2 ring-foreground':''}`} style={{background:b?colours[b.carer]:colours.Unassigned,backgroundImage:topHyatt||bottomHyatt?`linear-gradient(to bottom, transparent 0%, transparent ${topHyatt?'0':'50%'}, #3070C7 ${topHyatt?'0':'50%'}, #3070C7 ${bottomHyatt?'100%':'50%'}, transparent ${bottomHyatt?'100%':'50%'})`:undefined,backgroundSize:'6px 100%',backgroundPosition:'right',backgroundRepeat:'no-repeat'}}>{b?.carer??'—'}{b&&'auto' in b&&b.auto?' · auto':''}{atHyatt?' · H':''}</button>})}</div>)}
 </div></div>
 {selected&&<div className="sticky bottom-3 z-20 border border-border bg-background rounded-xl p-3 shadow-xl space-y-3">
  <div className="flex items-center justify-between"><strong className="text-sm">{days[selected.day]} · {String(selected.hour).padStart(2,'0')}:00–{String(selected.hour+1).padStart(2,'0')}:00</strong><button aria-label="Close editor" onClick={()=>setSelected(null)}>×</button></div>
  <div className="flex gap-2"><select aria-label="Choose carer" value={draftCarer} onChange={e=>setDraftCarer(e.target.value as Carer)} className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2">{(Object.keys(colours) as Carer[]).map(c=><option key={c} value={c}>{c}</option>)}</select><button onClick={apply} className="rounded-full bg-foreground text-background px-5 py-2 font-medium">Apply</button></div>
  <p className="text-xs text-muted-foreground">Changes apply to the selected one-hour block only.</p>
 </div>}
 <section className="border rounded-lg p-3 space-y-3"><h2 className="font-semibold">Yeon · Hyatt shifts <span className="text-xs font-normal" style={{color:'#3070C7'}}>■</span></h2>
 <div className="flex flex-wrap gap-2 items-center text-sm"><select aria-label="Shift day" className="border rounded p-2 bg-background" value={shiftDay} onChange={e=>setShiftDay(Number(e.target.value))}>{days.map((d,i)=><option value={i} key={d}>{d}</option>)}</select><input aria-label="Shift start" type="number" min="0" max="23.5" step="0.5" className="border rounded p-2 w-20 bg-background" value={shiftStart} onChange={e=>setShiftStart(Number(e.target.value))}/><span>–</span><input aria-label="Shift end" type="number" min="0.5" max="24" step="0.5" className="border rounded p-2 w-20 bg-background" value={shiftEnd} onChange={e=>setShiftEnd(Number(e.target.value))}/><button type="button" onClick={addShift} className="border rounded px-3 py-2">+ Add Hyatt shift</button></div>
 {shiftError&&<p role="alert" className="text-red-600 text-xs">{shiftError}</p>}
 <div className="flex flex-wrap gap-2">{workWeekly.map((w,i)=><div key={i} className="border rounded px-2 py-1 text-xs flex gap-2 items-center"><span>{days[w.day]} · {w.start.toFixed(1)}–{w.end.toFixed(1)}</span><button type="button" aria-label="Remove Hyatt shift" onClick={()=>removeShift(i)}>×</button></div>)}</div>
 </section>
 <h2 className="font-semibold">Adjust blocks</h2>
 <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{days.map((d,day)=><section key={d} className="border rounded-lg p-3 space-y-2"><div className="flex justify-between items-center"><strong>{d}</strong><button className="text-xs underline" onClick={()=>add(day)}>+ Add block</button></div>{blocks.map((b,i)=>b.day===day?<div key={i} className="flex flex-wrap items-center gap-1 rounded p-2" style={{background:colours[b.carer]+'55'}}><select aria-label="Carer" className="bg-background border rounded p-1 text-xs" value={b.carer} onChange={e=>update(i,{carer:e.target.value as Carer})}>{(Object.keys(colours) as Carer[]).map(c=><option key={c}>{c}</option>)}</select><input aria-label="Start hour" className="w-14 bg-background border rounded p-1 text-xs" type="number" min="0" max="23" value={b.start} onChange={e=>update(i,{start:Number(e.target.value)})}/><span>–</span><input aria-label="End hour" className="w-14 bg-background border rounded p-1 text-xs" type="number" min="1" max="24" value={b.end} onChange={e=>update(i,{end:Number(e.target.value)})}/><button aria-label="Remove block" className="ml-auto text-xs" onClick={()=>setBlocks(prev=>prev.filter((_,j)=>j!==i))}>×</button></div>:null)}</section>)}</div>
 <p className="text-sm text-muted-foreground">Unassigned and Shared hours are excluded from available-work totals. Childcare is provisionally 10:00–16:00 Thursday and Friday; Wednesday can be changed to childcare when needed.</p>
 <button className="text-sm underline" onClick={()=>setBlocks(defaults)}>Reset to original schedule</button>
 </main>
}