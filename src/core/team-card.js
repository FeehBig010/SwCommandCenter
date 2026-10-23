import {skillLevels} from './skill-levels.js';
import {equippedBuild,calculateStats,artifactBonus} from './optimizer.js';
import {STATS,FOUR} from './data.js';
import {normalizeLeader} from './leaders.js';
import { MONSTER_FALLBACK,resolveMonsterImageSources,monsterImageSources } from './monsters.js';

const DUNGEONS={db12:"Dragon's Lair B12",gb12:"Giant's Keep B12",nb12:'Necropolis B12',dbah:"Dragon's Lair · Abyss Hard",gbah:"Giant's Keep · Abyss Hard",nbah:'Necropolis · Abyss Hard',sf10:'Steel Fortress B10',pc10:"Punisher's Crypt B10"};
export function teamCardHeading(team){
 const pve=['cairos','dimensional','pve','rift','raid','toa','labyrinth'].includes(team.gameMode)||team.exportContext?.kind==='pve';
 const explicit=String(team.exportContext?.title||team.objectiveName||'').trim().slice(0,200);
 if(explicit)return {kind:pve?'pve':'pvp',title:explicit};
 if(pve){const target=[team.bossName,team.stageName].filter(Boolean).join(' - ');return {kind:'pve',title:target||DUNGEONS[team.sourceDungeon||team.dungeon]||team.dungeonTitle||team.name||'Objetivo PvE'};}
 const enemies=(team.enemyDefense||[]).map(m=>m.label||m.name).filter(Boolean);
 return {kind:'pvp',title:enemies.length?`Counter · ${enemies.join(' / ')}`:team.mode==='defense'?`Defesa · ${team.gameMode==='arena'?'Arena':'Siege / GvG'}`:team.gameMode==='arena'?'Counter · Arena':'Counter Meta Siege Defense'};
}
function technicalSnapshot(team,c,unit,account){
 if(c.manual?.base&&c.manual?.sheet){const base={...c.manual.base},total={...c.manual.sheet};return {source:'manual',base,total,bonus:Object.fromEntries(STATS.map(k=>[k,Number(total[k])-Number(base[k])])),grinds:null};}
 if(!unit?.base)return null;
 const base={...unit.base};
 if(!Array.isArray(unit.runeIds)||!Array.isArray(account?.runes))return {source:'swex',base,total:null};
 const build=equippedBuild(account,team,c),runes=build?.runeIds.map(id=>account.runes.find(r=>r.id===id));
 if(!build||!runes)return {source:'swex',base,total:null};
 const flat=artifactBonus(account,unit),without=calculateStats(unit,runes.map(r=>({...r,subs:r.subs.map(e=>e.map((v,i)=>i===3?0:v))})),flat),total={...build.stats.total};
 return {source:team.plannedRunes?'local-plan':'swex',base,total,bonus:{...build.stats.bonus},grinds:Object.fromEntries(STATS.map(k=>[k,total[k]-without.total[k]])),sets:Object.entries(build.counts).flatMap(([id,n])=>Array(Math.floor(n/(FOUR.has(Number(id))?4:2))).fill(Number(id))),mains:Object.fromEntries(runes.filter(r=>[2,4,6].includes(r.slot)).map(r=>[r.slot,r.main[0]]))};
}

// Snapshot only the visible, included composition. No inventory or account identifiers.
export function createTeamCard(team,account){
 const configs=(team.configs||[]).filter(c=>c.enabled!==false);
 if(!configs.length)return null;
 const used=new Set();
 const monsters=configs.map(c=>{
  const unit=account?.units.find(u=>u.id===c.unitId);
  if(account&&(!unit||used.has(unit.id)))return null;
  if(unit)used.add(unit.id);
  const master=account?unit?.master:c.masterId;
  if(!master)return null;
  const technical=technicalSnapshot(team,c,unit,account),skills=unit?.skillLevels||skillLevels(c.skillLevels);
  const leaderActive=!!team.leader&&(team.leaderKey?team.leaderKey===c.key:(team.configs||[]).indexOf(c)===(team.leaderIndex||0));
  return {isLeader:leaderActive,technical,skillLevels:skills.map(s=>({...s})),...(Number(c.combatSpd)>0?{combatSpd:Number(c.combatSpd)}:{}),master,name:unit?.name||c.label,sets:[...(c.sets||[])],strictSets:c.strictSets!==false,
   mains:{...c.mains},goals:{...c.goals},basis:c.basis,lockSpeedSync:c.lockSpeedSync===true};
 });
 if(monsters.some(m=>!m))return null;
 return {...(team.leader?{leader:normalizeLeader(team.leader)}:{}),heading:teamCardHeading(team),name:team.name||'Equipe',description:team.description||'',gameMode:team.gameMode||'siege',mode:team.mode,
  towerSpd:Number(team.towerSpd)||0,guildSpd:Number(team.guildSpd)||0,leaderSpd:Number(team.leaderSpd)||0,enemyCombatSpd:Number(team.enemyCombatSpd)||0,monsters};
}
export function cardFileName(name){
 const safe=String(name||'Equipe').replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g,'-').trim().replace(/[. ]+$/g,'').slice(0,120)||'Equipe';
 return `${safe}-SW-CommandCenter.png`;
}
function asDataUrl(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
 });
}
// Inline only CORS-readable images. A failed host never taints the export canvas.
export async function loadCardPortraits(monsters,signal){
 const entries=await Promise.all([...new Set(monsters.map(m=>m.master))].map(async master=>{
  const known=monsterImageSources(master),sources=known.length?known:await resolveMonsterImageSources(master);
  for(const url of [...sources,MONSTER_FALLBACK]){
   if(signal.aborted)return [master,null];
   try{
    const response=await fetch(url,{mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.any([signal,AbortSignal.timeout(4000)])});
    if(!response.ok)continue;
    const blob=await response.blob();
    if(!blob.type.startsWith('image/'))continue;
    const dataUrl=await asDataUrl(blob);
    const image=new Image();image.src=dataUrl;await image.decode();
    return [master,dataUrl];
   }catch{if(signal.aborted)return [master,null];}
  }
  return [master,null];
 }));
 return Object.fromEntries(entries);
}
export async function downloadCardPng(node,name,signal){
 await document.fonts.ready;
 await Promise.all([...node.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
 if(signal.aborted)return;
 const htmlToImage=await import('html-to-image');
 const dataUrl=await htmlToImage.toPng(node,{pixelRatio:2,backgroundColor:'#101925',cacheBust:false});
 if(signal.aborted)return;
 // toPng produces a data URL; download a PNG Blob so large cards avoid URL-length limits.
 const blob=await (await fetch(dataUrl)).blob();
 if(signal.aborted)return;
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');
 anchor.href=url;anchor.download=cardFileName(name);document.body.append(anchor);anchor.click();anchor.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
