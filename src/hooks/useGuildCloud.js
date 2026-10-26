import {useCallback,useEffect,useRef,useState} from 'react';
import {canAdmin,canManageSystem} from '../lib/auth';
import {supabase} from '../lib/supabase';
import {listMemberships,listCloudTeams,saveCloudTeam,deleteCloudTeam,voteGuildAttack,updateGuildAttackTarget} from '../lib/guild-cloud';
export default function useGuildCloud(session,profile){
 const userId=session?.user.id||null;
 const [state,setState]=useState({userId:null,rows:[],memberships:[],guildId:null,loading:false,error:''}),generation=useRef(0),activeUser=useRef(userId);
 activeUser.current=userId;
 const refresh=useCallback(async(preferredGuild)=>{
  const token=++generation.current;if(!supabase||!userId){setState({userId,rows:[],memberships:[],guildId:null,loading:false,error:''});return;}
  setState(s=>({...s,userId,loading:true,error:''}));
  try{
   const memberships=await listMemberships(supabase),guildId=memberships.some(m=>m.guild_id===preferredGuild)?preferredGuild:memberships[0]?.guild_id||null;
   const rows=await listCloudTeams(supabase,userId,guildId);
   if(token===generation.current&&activeUser.current===userId)setState({userId,rows,memberships,guildId,attackFeaturesReady:rows.attackFeaturesReady,loading:false,error:''});
  }catch{if(token===generation.current&&activeUser.current===userId)setState(s=>({...s,userId,loading:false,error:'Não foi possível sincronizar. Confira a conexão e se a migration Supabase foi aplicada.'}));}
 },[userId]);
 useEffect(()=>{setState({userId,rows:[],memberships:[],guildId:null,loading:false,error:''});refresh();return()=>{generation.current++;};},[userId,refresh]);
 useEffect(()=>{if(!userId)return;const onFocus=()=>refresh(state.guildId);window.addEventListener('focus',onFocus);const timer=setInterval(onFocus,30000);return()=>{window.removeEventListener('focus',onFocus);clearInterval(timer);};},[userId,state.guildId,refresh]);
 const visible=state.userId===userId?state:{userId,rows:[],memberships:[],guildId:null,loading:!!userId,error:''};
 async function save(input,previous){if(!canAdmin(profile)||!visible.guildId||!canManageSystem(profile)&&!visible.memberships.some(m=>m.guild_id===visible.guildId&&m.role==='leader'))throw new Error('Somente a liderança pode publicar ou editar composições na nuvem.');const row=await saveCloudTeam(supabase,userId,input,previous);if(activeUser.current===userId)await refresh(visible.guildId);return row;}
 async function voteAttack(row,value){await voteGuildAttack(supabase,row,value);if(activeUser.current===userId)await refresh(visible.guildId);}
 async function updateAttackTarget(row,target){if(!canAdmin(profile))throw new Error('Somente a liderança pode editar composições da guilda.');await updateGuildAttackTarget(supabase,userId,row,target);if(activeUser.current===userId)await refresh(visible.guildId);}
 async function remove(row){if(!canAdmin(profile))throw new Error('Somente a liderança pode excluir composições da guilda.');await deleteCloudTeam(supabase,userId,row);if(activeUser.current===userId)await refresh(visible.guildId);}
 async function rpc(name,args){const {data,error}=await supabase.rpc(name,args);if(error)throw new Error('Não foi possível concluir. Confira sua permissão e os dados informados.');if(activeUser.current===userId)await refresh(name==='create_guild'||name==='join_guild'?data:visible.guildId);return data;}
 return {...visible,enabled:!!supabase&&!!userId,canCreateGuild:canAdmin(profile),isLeader:canAdmin(profile)&&!!visible.guildId&&(canManageSystem(profile)||visible.memberships.some(m=>m.guild_id===visible.guildId&&m.role==='leader')),refresh:()=>refresh(visible.guildId),selectGuild:id=>refresh(id),save,remove,rpc,voteAttack,updateAttackTarget};
}
