import { monsterImageSources } from './monsters.js';

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
  return {master,name:unit?.name||c.label,sets:[...(c.sets||[])],strictSets:c.strictSets!==false,
   mains:{...c.mains},goals:{...c.goals},basis:c.basis,lockSpeedSync:c.lockSpeedSync===true};
 });
 if(monsters.some(m=>!m))return null;
 return {name:team.name||'Equipe',description:team.description||'',gameMode:team.gameMode||'siege',mode:team.mode,
  towerSpd:Number(team.towerSpd)||0,leaderSpd:Number(team.leaderSpd)||0,enemyCombatSpd:Number(team.enemyCombatSpd)||0,monsters};
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
  for(const url of monsterImageSources(master)){
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
