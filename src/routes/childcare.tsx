import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/childcare')({ component: ChildcareSchedule });
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
 const [blocks,setBlocks]=useState<Block[]>(defaults);
 const [ready,setReady]=useState(false);
 useEffect(()=>{try{const v=localStorage.getItem('wann-childcare-weekly-v1');if(v){const parsed=JSON.parse(v);if(Array.isArray(parsed))setBlocks(parsed)}}catch{}setReady(true)},[]);
 useEffect(()=>{if(ready)localStorage.setItem('wann-childcare-weekly-v1',JSON.stringify(blocks))},[blocks,ready]);
 const update=(index:number,patch:Partial<Block>)=>setBlocks(prev=>prev.map((b,i)=>i===index?{...b,...patch}:b));
 const add=(day:number)=>setBlocks(prev=>[...prev,{day,start:8,end:12,carer:'Unassigned'}]);
 const totals=(person:'Youn'|'Lach')=>days.reduce((sum,_,day)=>{const intervals=blocks.filter(b=>b.day===day&&b.carer!==person&&b.carer!=='Shared'&&b.carer!=='Unassigned').map(b=>[b.start,b.end]);const hours=new Set<number>();intervals.forEach(([s,e])=>{for(let h=s;h<e;h++)hours.add(h)});return sum+hours.size},0);
 return <main className="mx-auto max-w-6xl p-4 md:p-8 space-y-5">
 <header><h1 className="text-2xl font-semibold">Weekly childcare schedule</h1><p className="text-sm text-muted-foreground">Sunday–Saturday · edit each coloured block's carer and time. Changes save in this browser.</p></header>
 <div className="flex flex-wrap gap-4 text-sm">{(Object.keys(colours) as Carer[]).map(c=><span key={c} className="flex items-center gap-2"><i style={{background:colours[c]}} className="w-3 h-3 rounded-sm"/>{c}</span>)}</div>
 <div className="overflow-x-auto"><div className="grid min-w-[780px] gap-1" style={{gridTemplateColumns:'70px repeat(7,minmax(0,1fr))'}}>
 <div className="text-xs text-muted-foreground">Time</div>{days.map(d=><div key={d} className="text-center text-xs font-semibold">{d}</div>)}
 {Array.from({length:12},(_,i)=>i+8).map(hour=><div key={hour} className="contents"><div className="text-xs text-muted-foreground py-3">{String(hour).padStart(2,'0')}:00</div>{days.map((_,day)=>{const b=blocks.find(b=>b.day===day&&b.start<=hour&&b.end>hour);return <div key={day} className="rounded-sm min-h-10 text-center text-[10px] flex items-center justify-center" style={{background:b?colours[b.carer]:colours.Unassigned}}>{b?.start===hour?b.carer:''}</div>})}</div>)}
 </div></div>
 <h2 className="font-semibold">Adjust blocks</h2>
 <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{days.map((d,day)=><section key={d} className="border rounded-lg p-3 space-y-2"><div className="flex justify-between items-center"><strong>{d}</strong><button className="text-xs underline" onClick={()=>add(day)}>+ Add block</button></div>{blocks.map((b,i)=>b.day===day?<div key={i} className="flex flex-wrap items-center gap-1 rounded p-2" style={{background:colours[b.carer]+'55'}}><select aria-label="Carer" className="bg-background border rounded p-1 text-xs" value={b.carer} onChange={e=>update(i,{carer:e.target.value as Carer})}>{(Object.keys(colours) as Carer[]).map(c=><option key={c}>{c}</option>)}</select><input aria-label="Start hour" className="w-14 bg-background border rounded p-1 text-xs" type="number" min="0" max="23" value={b.start} onChange={e=>update(i,{start:Number(e.target.value)})}/><span>–</span><input aria-label="End hour" className="w-14 bg-background border rounded p-1 text-xs" type="number" min="1" max="24" value={b.end} onChange={e=>update(i,{end:Number(e.target.value)})}/><button aria-label="Remove block" className="ml-auto text-xs" onClick={()=>setBlocks(prev=>prev.filter((_,j)=>j!==i))}>×</button></div>:null)}</section>)}</div>
 <p className="text-sm text-muted-foreground">Unassigned and Shared hours are excluded from available-work totals. Childcare is provisionally 10:00–16:00 Thursday and Friday; Wednesday can be changed to childcare when needed.</p>
 <button className="text-sm underline" onClick={()=>setBlocks(defaults)}>Reset to original schedule</button>
 </main>
}