import {useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {loadDefenseCatalog,loadGuildOverview,loadIntelligenceCounters} from '../lib/guild-intelligence';
const empty={rows:[],total:0,loading:false,error:''};
export function useIntelligenceDebounce(value){const [debounced,setDebounced]=useState(value);useEffect(()=>{const timer=setTimeout(()=>setDebounced(value),200);return()=>clearTimeout(timer);},[value]);return debounced;}
export default function useGuildIntelligence({userId,guildId,filters,counterFilters,defenseId}){
 const [revision,setRevision]=useState(0),[catalog,setCatalog]=useState(empty),[counters,setCounters]=useState(empty),[overview,setOverview]=useState(null),catalogRun=useRef(0),counterRun=useRef(0);
 const scope=`${userId||''}:${guildId||''}`,current=useRef(scope);current.current=scope;
 const filterKey=JSON.stringify(filters),counterKey=JSON.stringify(counterFilters);
 useEffect(()=>{const token=++catalogRun.current;let live=true;setOverview(null);setCatalog({...empty,scope,loading:!!guildId});if(!guildId||!userId||!supabase)return;
  Promise.all([loadDefenseCatalog(supabase,guildId,JSON.parse(filterKey)),loadGuildOverview(supabase,guildId)]).then(([data,stats])=>{if(live&&token===catalogRun.current&&current.current===scope){setCatalog({...data,scope,loading:false,error:''});setOverview({...stats,scope});}}).catch(e=>{if(live&&token===catalogRun.current&&current.current===scope)setCatalog({...empty,scope,error:e.message});});return()=>{live=false;};
 },[scope,guildId,userId,filterKey,revision]);
 useEffect(()=>{const token=++counterRun.current;let live=true;setCounters({...empty,scope,defenseId,loading:!!defenseId});if(!guildId||!userId||!supabase||!defenseId)return;
  loadIntelligenceCounters(supabase,guildId,defenseId,0,JSON.parse(counterKey)).then(data=>{if(live&&token===counterRun.current&&current.current===scope)setCounters({...data,scope,defenseId,loading:false,error:''});}).catch(e=>{if(live&&token===counterRun.current&&current.current===scope)setCounters({...empty,scope,defenseId,error:e.message});});return()=>{live=false;};
 },[scope,guildId,userId,defenseId,counterKey,revision]);
 useEffect(()=>{if(!guildId||!userId)return;const refresh=()=>setRevision(n=>n+1),timer=setInterval(refresh,60000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[scope,guildId,userId]);
 async function more(kind){const isCatalog=kind==='catalog',state=isCatalog?catalog:counters,set=isCatalog?setCatalog:setCounters,run=isCatalog?catalogRun:counterRun,token=run.current;if(state.loading||state.rows.length>=state.total)return;set(s=>({...s,loading:true,error:''}));try{const data=isCatalog?await loadDefenseCatalog(supabase,guildId,filters,state.rows.length):await loadIntelligenceCounters(supabase,guildId,defenseId,state.rows.length,counterFilters);if(current.current===scope&&run.current===token)set(s=>({...s,...data,rows:[...s.rows,...data.rows],loading:false}));}catch(e){if(current.current===scope&&run.current===token)set(s=>({...s,loading:false,error:e.message}));}}
 return {catalog:catalog.scope===scope?catalog:empty,counters:counters.scope===scope&&counters.defenseId===defenseId?counters:empty,overview:overview?.scope===scope?overview:null,refresh:()=>setRevision(n=>n+1),moreCatalog:()=>more('catalog'),moreCounters:()=>more('counters')};
}
