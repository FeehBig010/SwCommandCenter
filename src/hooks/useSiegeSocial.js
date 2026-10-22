import {useCallback,useEffect,useRef,useState} from 'react';
import {readStore,writeStore} from '../core/storage';
import {makeFavorite,summarizeFeedback} from '../core/siege';
import {supabase} from '../lib/supabase';
import {loadSiegeSocial,sendSiegeFeedback,saveSiegeFavorite,deleteSiegeFavorite} from '../lib/siege-cloud';
const empty=owner=>({owner,ready:false,favorites:[],votes:{},towerSpd:0});
export default function useSiegeSocial(session,cloudRows,guildId){
 const owner=session?.user.id||'device',key=`siege-private:${owner}`;
 const [storageError,setStorageError]=useState('');
 const [local,setLocal]=useState(()=>empty(owner)),[remote,setRemote]=useState({owner:null,feedback:[],favorites:[],error:''});
 const current=useRef(owner),generation=useRef(0);current.current=owner;
 const ids=JSON.stringify(cloudRows.filter(r=>r.kind==='counter'&&r.payload.offense.configs.length===3&&r.payload.enemyDefense.length===3).map(r=>r.id).sort());
 useEffect(()=>{let live=true;setLocal(empty(owner));readStore(key).then(saved=>{if(live)setLocal({...empty(owner),favorites:(Array.isArray(saved?.favorites)?saved.favorites:[]).flatMap(f=>{try{if(typeof f.key!=='string')return [];return [{...makeFavorite(f.counter,f.key),savedAt:typeof f.savedAt==='string'?f.savedAt:new Date().toISOString()}];}catch{return [];}}),votes:Object.fromEntries(Object.entries(saved?.votes&&typeof saved.votes==='object'?saved.votes:{}).filter(([,v])=>v&&typeof v==='object').map(([k,v])=>[k,{reaction:['free_win','rng','high_runes'].includes(v.reaction)?v.reaction:null,outcome:['win','loss'].includes(v.outcome)?v.outcome:null}])),towerSpd:Math.min(100,Math.max(0,Number(saved?.towerSpd)||0)),owner,ready:true});}).catch(()=>{if(live)setLocal({...empty(owner),ready:true});});return()=>{live=false;};},[owner,key]);
 useEffect(()=>{if(local.owner!==owner||!local.ready)return;const timer=setTimeout(()=>writeStore(key,{favorites:local.favorites,votes:local.votes,towerSpd:local.towerSpd}).catch(()=>setStorageError('Não foi possível salvar seus favoritos neste navegador.')),250);return()=>clearTimeout(timer);},[local,owner,key]);
 const refresh=useCallback(async()=>{
  const token=++generation.current;if(!supabase||owner==='device'){setRemote({owner,feedback:[],favorites:[],error:''});return;}
  try{const data=await loadSiegeSocial(supabase,JSON.parse(ids));if(token===generation.current&&current.current===owner)setRemote({owner,...data,error:''});}
  catch(e){if(token===generation.current&&current.current===owner)setRemote({owner,feedback:[],favorites:[],error:e.message});}
 },[owner,ids,guildId]);
 useEffect(()=>{
  refresh();if(!supabase||owner==='device')return;
  let timer;const queue=()=>{clearTimeout(timer);timer=setTimeout(refresh,100);};
  const channel=supabase.channel(`siege-feedback-${owner}-${guildId||'private'}`).on('postgres_changes',{event:'*',schema:'public',table:'counter_feedback'},queue).subscribe();
  const onFocus=()=>refresh(),interval=setInterval(refresh,30000);window.addEventListener('focus',onFocus);
  return()=>{generation.current++;clearTimeout(timer);clearInterval(interval);window.removeEventListener('focus',onFocus);supabase.removeChannel(channel);};
 },[owner,guildId,refresh]);
 useEffect(()=>{const clear=()=>{setLocal({...empty(owner),ready:true});setStorageError('');};window.addEventListener('siege-clear-local',clear);return()=>window.removeEventListener('siege-clear-local',clear);},[owner]);
 const state=local.owner===owner?local:empty(owner),server=remote.owner===owner?remote:{feedback:[],favorites:[],error:''};
 async function persistLocal(next){await writeStore(key,{favorites:next.favorites,votes:next.votes,towerSpd:next.towerSpd});if(current.current===owner)setLocal(next);}
 async function favorite(record){if(!state.ready)throw new Error('Aguarde carregar seus favoritos.');if(record.cloud&&supabase&&session){await saveSiegeFavorite(supabase,record.id);if(current.current===owner)await refresh();}else{const saved=makeFavorite(record.counter,record.key);await persistLocal({...state,favorites:[saved,...state.favorites.filter(f=>f.key!==record.key)]});}}
 async function removeFavorite(favorite){if(favorite.cloud){await deleteSiegeFavorite(supabase,favorite.id);if(current.current===owner)await refresh();}else await persistLocal({...state,favorites:state.favorites.filter(f=>f.key!==favorite.key)});}
 async function react(record,field,value){if(record.cloud){if(!session||!supabase)throw new Error('Entre para enviar feedback à guilda.');await sendSiegeFeedback(supabase,record.id,field,value);if(current.current===owner)await refresh();}else await persistLocal({...state,votes:{...state.votes,[record.key]:{...state.votes[record.key],[field]:value}}});}
 function feedback(record){if(record.cloud){const f=server.feedback.find(f=>f.counter_id===record.id);const wins=Number(f?.wins)||0,losses=Number(f?.losses)||0;return {counts:{free_win:Number(f?.free_win)||0,rng:Number(f?.rng)||0,high_runes:Number(f?.high_runes)||0},wins,losses,total:wins+losses,winRate:wins+losses?Math.round(wins/(wins+losses)*100):null,reaction:f?.my_reaction||null,outcome:f?.my_outcome||null,author:f?.author_label||'Membro da guilda',scope:'guild',available:!!f};}const f=state.votes[record.key]||{};return {...summarizeFeedback([f]),reaction:f.reaction||null,outcome:f.outcome||null,author:record.counter.siege.authorLabel,scope:'device',available:true};}
 return {ready:state.ready,towerSpd:state.towerSpd,setTowerSpd:value=>setLocal(s=>s.owner===owner?{...s,towerSpd:value}:s),favorites:[...server.favorites,...state.favorites],error:server.error||storageError,favorite,removeFavorite,react,feedback,refresh};
}
