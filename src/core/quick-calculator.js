import {goalReport} from './optimizer.js';
import {blankConfig,makeTeam,STATS,FOUR} from './data.js';
import {monsterBase} from './monster-search.js';
import {leaderImpact,combatAttributes,scenarioForTeam,simulateCombat} from './speedTuner.js';
import {catalogLeader} from './leader-catalog.js';
const fallback={hp:10000,atk:800,def:650,spd:100,cr:15,cd:50,res:15,acc:0};
export function quickConfig(master=null,name='Escolher monstro'){
 const base={...(monsterBase(master)||fallback)};
 return {...blankConfig(null,name),masterId:master,sets:[],basis:'total',manual:{base,sheet:{...base}}};
}
export function quickTeam(area='siege'){return {...makeTeam(area),towerSpd:15,guildSpd:area==='siege'?5:0,autoEnemyPassives:true,configs:Array.from({length:{siege:3,arena:4,cairos:5}[area]||3},()=>quickConfig())};}
export function selectQuickMonster(config,option){return {...quickConfig(option?.master,option?.name),key:config.key};}
export function quickPreview(team){
 const active=team.configs.filter(c=>c.enabled!==false),actors=[];
 for(const c of active){if(!c.masterId)return {complete:false,missing:active.filter(c=>!c.masterId).map(c=>c.label),actors:[],turns:[],cut:null};
  const {base,sheet}=c.manual;for(const kind of [base,sheet])for(const stat of STATS){const n=Number(kind[stat]);if(!Number.isFinite(n)||n<0||n>10000000||stat==='spd'&&n<=0)throw new Error(`${c.label}: atributo ${stat.toUpperCase()} inválido.`);}
  const unit={master:c.masterId,element:c.masterId%10,base:Object.fromEntries(STATS.map(k=>[k,Number(base[k])]))},counts={};for(const set of c.sets.filter(Boolean))counts[set]=(counts[set]||0)+(FOUR.has(set)?4:2);
  const total=Object.fromEntries(STATS.map(k=>[k,Number(sheet[k])])),stats={total,bonus:Object.fromEntries(STATS.map(k=>[k,total[k]-unit.base[k]]))},combat=combatAttributes(unit,stats,counts,team,c.combat);
  actors.push({key:c.key,will:(counts[15]||0)>=2,master:c.masterId,name:c.label,spd:combat.spd,rawSpd:combat.rawSpd,combat:c.combat,attributes:combat,leaderBonus:leaderImpact(unit,stats,counts,team,c.combat).bonus,goals:goalReport({...stats,combat},c),nemesisSets:Math.floor((counts[14]||0)/2)});
 }
 if(!actors.length)return {complete:false,missing:[],actors:[],turns:[],cut:null};
 const configured=scenarioForTeam(team,actors),enemy=Number(team.enemyCombatSpd)||0,foes=configured.actors.some(a=>a.enemy);const scenario=simulateCombat([...configured.actors,...(!foes&&enemy>0?[{key:'quick-enemy',spd:enemy,enemy:true}]:[])],{events:configured.events,stopAfterFirst:true});
 return {complete:true,missing:[],actors,turns:scenario.firstTurns,scenario,cut:scenario.cut,source:'manual'};
}
export function quickLeader(master){return catalogLeader(master);}

// Exact integer sheet-SPD minimum within this first-rotation model. Unknown
// procs/damage still remain conditional; this is not a win guarantee.
export function autoTuneQuickTeam(team){
 if(team.configs.some(c=>!c.masterId))return team;
 let working={...team,towerSpd:15,guildSpd:team.gameMode==='siege'?5:0,configs:team.configs.map(c=>({...c,manual:{...c.manual,sheet:{...c.manual.sheet}}}))};
 let opener;try{opener=quickPreview(working).turns.find(t=>t.key===working.configs[0].key);}catch{return working;}if(!opener)return working;
 for(let index=1;index<working.configs.length;index++){
  const config=working.configs[index];if(config.autoSpeed===false)continue;
  const expected=working.configs.slice(0,index+1).map(c=>c.key),minimum=Math.ceil(Number(config.manual.base.spd)),deadline=opener.tick+index;
  const probe=value=>{const candidate={...working,configs:working.configs.map((c,i)=>i===index?{...c,manual:{...c.manual,sheet:{...c.manual.sheet,spd:value}}}:c)};try{const p=quickPreview(candidate),turn=p.turns.find(t=>t.key===config.key),prefix=p.turns.filter(t=>!t.enemy).slice(0,index+1),position=p.turns.indexOf(turn),enemy=p.turns.findIndex(t=>t.enemy);return !!turn&&!turn.disabled&&turn.tick<=deadline&&prefix.every((t,i)=>t.key===expected[i])&&(enemy<0||position<enemy);}catch{return false;}};
  let max=1000;try{const prev=quickPreview(working).actors[index-1].spd;let lo=minimum,hi=1000;const speed=value=>quickPreview({...working,configs:working.configs.map((v,i)=>i===index?{...v,manual:{...v.manual,sheet:{...v.manual.sheet,spd:value}}}:v)}).actors[index].spd;if(speed(minimum)>prev)max=minimum-1;else{while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(speed(mid)<=prev)lo=mid;else hi=mid-1;}max=lo;}}catch{max=minimum-1;}
  let found=null;if(max>=minimum&&probe(max)){let lo=minimum,hi=max;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(probe(mid))hi=mid;else lo=mid+1;}found=lo;}
  working.configs[index]={...config,syncMinimum:found,...(found!==null?{manual:{...config.manual,sheet:{...config.manual.sheet,spd:found}}}:{})};
 }
 return working;
}
