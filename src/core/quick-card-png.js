import {localGameImage} from './monster-assets.js';
import {createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {MONSTER_FALLBACK} from './monsters.js';
import {loadCardPortraits} from './team-card.js';
import {createInfographic,infographicFileName} from './export-infographic.js';
import skillCache from './skill-cache.json' with {type:'json'};

function dataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
async function imageAsset(sources,signal){
 for(const url of sources){
  signal.throwIfAborted();
  try{
   const response=await fetch(url,{mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.any([signal,AbortSignal.timeout(4000)])});
   if(!response.ok)continue;const blob=await response.blob();if(!blob.type.startsWith('image/'))continue;
   const src=await dataUrl(blob),image=new Image();image.src=src;await image.decode();return src;
  }catch{signal.throwIfAborted();}
 }
 return null;
}
async function loadAssets(data,signal,compact=false){
 const sources=new Map(compact?[]:[[data.background,[data.background]]]);
 for(const m of data.monsters){
  if(m.elementIcon)sources.set(m.elementIcon,[m.elementIcon]);
  for(const item of [...m.runes.filter(Boolean),...m.sets])if(item.icon)sources.set(item.icon,[item.icon]);
  if(!compact)for(const s of m.skills)if(s.icon&&/^[\w.-]+$/.test(s.icon))sources.set(`skill:${s.icon}`,[localGameImage('skills',s.icon),...(skillCache.includes(s.icon)?[`/game-icons/skills/${s.icon}`]:[]),`https://swarfarm.com/static/herders/images/skills/${s.icon}`,`https://raw.githubusercontent.com/swarfarm/swarfarm/master/herders/static/herders/images/skills/${s.icon}`]);
 }
 const [entries,portraits]=await Promise.all([
  Promise.all([...sources].map(async([key,urls])=>[key,await imageAsset(urls,signal)])),
  loadCardPortraits(data.monsters,signal),
  document.fonts.load('700 108px Cinzel'),document.fonts.ready
 ]);
 signal.throwIfAborted();const assets=Object.fromEntries(entries);
 if(!compact&&!assets[data.background])throw new Error('Não foi possível carregar o cenário do infográfico. Tente novamente.');
 for(const m of data.monsters)assets[`portrait:${m.master}`]=portraits[m.master]||MONSTER_FALLBACK;
 return assets;
}

export async function exportTeamInfographic(team,account,signal,settings={}){
 const data=createInfographic(team,account,settings);
 const compact=settings.compact===true;
 const [{default:html2canvas},{default:ExportTemplate},assets]=await Promise.all([import('html2canvas'),compact?import('../components/QuickShareTemplate.jsx'):import('../components/ExportTemplate.jsx'),loadAssets(data,signal,compact)]);
 signal.throwIfAborted();
 const host=document.createElement('div');host.setAttribute('data-infographic-host','');host.setAttribute('aria-hidden','true');host.inert=true;
 Object.assign(host.style,{position:'absolute',left:'-100000px',top:'0',width:'1280px',pointerEvents:'none'});document.body.append(host);
 const root=createRoot(host);
 try{
  flushSync(()=>root.render(createElement(ExportTemplate,{data,assets})));
  const node=host.querySelector('#sw-export-template');
  await Promise.all([...node.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
  await document.fonts.ready;signal.throwIfAborted();
  const canvas=await html2canvas(node,{scale:2,width:1280,height:Math.ceil(node.getBoundingClientRect().height),windowWidth:1440,windowHeight:Math.ceil(node.getBoundingClientRect().height),backgroundColor:null,useCORS:true,allowTaint:false,logging:false,scrollX:0,scrollY:0,
   onclone:doc=>{const clonedHost=doc.querySelector('[data-infographic-host]');clonedHost.style.left='0';clonedHost.style.top='0';}
  });
  signal.throwIfAborted();
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Falha ao gerar PNG.')),'image/png'));
  signal.throwIfAborted();
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=compact?`sw_team_${Date.now()}.png`:infographicFileName();document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }finally{root.unmount();host.remove();}
}

// Compatibility for the prominent free-calculator action.
export const exportQuickCard=exportTeamInfographic;
