import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type WorkBlock, type WorkOverride, validateWorkBlock, validShift } from './hyatt-shifts';
export type Carer = 'Youn'|'Lach'|'Childcare'|'Shared'|'Unassigned';
export type CareBlock = {day:number;start:number;end:number;carer:Carer};
export type CareOverride = {date:string;start:number;end:number;carer:Carer};
export const weeklyKey='wann-childcare-weekly-v1';
export const overrideKey='wann-childcare-overrides-v1';
export const defaultWeekly:CareBlock[]=Array.from({length:7},(_,day)=>day).flatMap(day=>day===0||day===1?[{day,start:8,end:20,carer:'Youn' as Carer}]:day===2||day===6?[{day,start:8,end:20,carer:'Lach' as Carer}]:day===3?[{day,start:8,end:14,carer:'Youn' as Carer},{day,start:14,end:20,carer:'Lach' as Carer}]:[{day,start:8,end:10,carer:'Unassigned' as Carer},{day,start:10,end:16,carer:'Childcare' as Carer},{day,start:16,end:20,carer:'Unassigned' as Carer}]);
const parse=<T,>(key:string,fallback:T):T=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback}catch{return fallback}};
export function useChildcareSync(){
 const [weekly,setWeekly]=useState<CareBlock[]>(defaultWeekly);
 const [overrides,setOverrides]=useState<CareOverride[]>([]);
 const [workWeekly,setWorkWeekly]=useState<WorkBlock[]>([]);
 const [workOverrides,setWorkOverrides]=useState<WorkOverride[]>([]);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [userId,setUserId]=useState<string|null>(null);
 useEffect(()=>{
  let active=true;
  (async()=>{
   const {data:{user}}=await supabase.auth.getUser();
   if(!active)return;
   if(!user){setError('Sign in to sync childcare');setReady(true);return}
   setUserId(user.id);
   const {data,error}=await (supabase as any).from('childcare_schedules').select('weekly,overrides,work_weekly,work_overrides').eq('user_id',user.id).maybeSingle();
   if(!active)return;
   if(error){setError(error.message);setReady(true);return}
   if(data){setWeekly(data.weekly);setOverrides(data.overrides);setWorkWeekly(data.work_weekly??[]);setWorkOverrides(data.work_overrides??[]);localStorage.setItem(weeklyKey,JSON.stringify(data.weekly));localStorage.setItem(overrideKey,JSON.stringify(data.overrides))}
   else {
    const w=parse(weeklyKey,defaultWeekly),o=parse<CareOverride[]>(overrideKey,[]);
    const {error:saveError}=await (supabase as any).from('childcare_schedules').upsert({user_id:user.id,weekly:w,overrides:o,updated_at:new Date().toISOString()});
    if(!active)return;
    if(saveError)setError(saveError.message);
    setWeekly(w);setOverrides(o);
   }
   setReady(true);
  })();
  return()=>{active=false};
 },[]);
 const persist=useCallback(async(w:CareBlock[],o:CareOverride[])=>{
  if(!userId){setError('Not signed in');return}
  const {error}=await (supabase as any).from('childcare_schedules').upsert({user_id:userId,weekly:w,overrides:o,updated_at:new Date().toISOString()});
  if(error){setError(error.message);return}
  setError(null);
  localStorage.setItem(weeklyKey,JSON.stringify(w));
  localStorage.setItem(overrideKey,JSON.stringify(o));
  window.dispatchEvent(new Event('wann-childcare-changed'));
 },[userId]);
 const saveWorkWeekly=useCallback(async(next:WorkBlock[])=>{
  if(!userId){setError('Not signed in');return}
  if(!next.every(validateWorkBlock)){setError('Invalid Hyatt shift');return}
  const {error:saveError}=await (supabase as any).from('childcare_schedules').update({work_weekly:next,updated_at:new Date().toISOString()}).eq('user_id',userId);
  if(saveError){setError(saveError.message);return}
  setWorkWeekly(next);setError(null);window.dispatchEvent(new Event('wann-childcare-changed'));
 },[userId]);
 const saveWorkOverrides=useCallback(async(next:WorkOverride[])=>{
  if(!userId){setError('Not signed in');return}
  if(!next.every(o=>/^\\d{4}-\\d{2}-\\d{2}$/.test(o.date)&&validShift(o.start,o.end))){setError('Invalid Hyatt override');return}
  const {error:saveError}=await (supabase as any).from('childcare_schedules').update({work_overrides:next,updated_at:new Date().toISOString()}).eq('user_id',userId);
  if(saveError){setError(saveError.message);return}
  setWorkOverrides(next);setError(null);window.dispatchEvent(new Event('wann-childcare-changed'));
 },[userId]);
 const saveWeekly=useCallback(async(next:CareBlock[])=>{setWeekly(next);await persist(next,overrides)},[persist,overrides]);
 const saveOverrides=useCallback(async(next:CareOverride[])=>{setOverrides(next);await persist(weekly,next)},[persist,weekly]);
 useEffect(()=>{
  if(!userId)return;
  const channel=supabase.channel('childcare-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'childcare_schedules',filter:'user_id=eq.'+userId},(payload:any)=>{
   const row=payload.new;
   if(row?.weekly&&row?.overrides){setWeekly(row.weekly);setOverrides(row.overrides);setWorkWeekly(row.work_weekly??[]);setWorkOverrides(row.work_overrides??[]);localStorage.setItem(weeklyKey,JSON.stringify(row.weekly));localStorage.setItem(overrideKey,JSON.stringify(row.overrides))}
  }).subscribe();
  return()=>{void supabase.removeChannel(channel)};
 },[userId]);
 return {weekly,overrides,workWeekly,workOverrides,ready,error,saveWeekly,saveOverrides,saveWorkWeekly,saveWorkOverrides};
}
