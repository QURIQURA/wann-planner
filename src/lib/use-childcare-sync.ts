import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
   const {data,error}=await (supabase as any).from('childcare_schedules').select('weekly,overrides').eq('user_id',user.id).maybeSingle();
   if(!active)return;
   if(error){setError(error.message);setReady(true);return}
   if(data){setWeekly(data.weekly);setOverrides(data.overrides);localStorage.setItem(weeklyKey,JSON.stringify(data.weekly));localStorage.setItem(overrideKey,JSON.stringify(data.overrides))}
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
 const saveWeekly=useCallback(async(next:CareBlock[])=>{setWeekly(next);await persist(next,overrides)},[persist,overrides]);
 const saveOverrides=useCallback(async(next:CareOverride[])=>{setOverrides(next);await persist(weekly,next)},[persist,weekly]);
 useEffect(()=>{
  if(!userId)return;
  const channel=supabase.channel('childcare-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'childcare_schedules',filter:'user_id=eq.'+userId},(payload:any)=>{
   const row=payload.new;
   if(row?.weekly&&row?.overrides){setWeekly(row.weekly);setOverrides(row.overrides);localStorage.setItem(weeklyKey,JSON.stringify(row.weekly));localStorage.setItem(overrideKey,JSON.stringify(row.overrides))}
  }).subscribe();
  return()=>{void supabase.removeChannel(channel)};
 },[userId]);
 return {weekly,overrides,ready,error,saveWeekly,saveOverrides};
}
