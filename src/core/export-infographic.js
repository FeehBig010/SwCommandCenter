import {equivalentSkillIds} from './CollabMapping.js';
import {orderRuneSets} from './rune-sets.js';
import {SETS,FOUR} from './data.js';
import {quickPreview,quickOrderLocked,quickCombatTeam} from './quick-calculator.js';
import {firstRotationSafe,combatAttributes,scenarioForTeam,simulateCombat} from './speedTuner.js';
import {calculateStats,artifactBonus,artifactEffects,setCounts} from './optimizer.js';
import {currentRuneIds} from './loadouts.js';
import {monsterLeader} from './monsterDatabase.js';
import {monsterBase} from './monster-search.js';
import {teamCardHeading} from './team-card.js';
import skillCatalog from './monster-skills.json' with {type:'json'};
import {pveArt} from './pve.js';

const statsOrder=['hp','atk','def','spd','cr','cd','res','acc'];
const elementNames={1:'water',2:'fire',3:'wind',4:'light',5:'dark'};
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
export function infographicFileName(timestamp=Date.now()){return `sw_infographic_${timestamp}.png`;}

// Snapshot actual displayed sheets/loadouts. Catalog-only templates retain
// unknown totals, with goals labelled separately; targets are never actual stats.
export function createInfographic(team,account=null,{builds=null,options={}}={}){
 const configs=team?.configs?.filter(c=>c.enabled!==false)||[];
 if(!configs.length||configs.some(c=>!c.masterId))throw new Error('Selecione todos os monstros antes de exportar.');
 const manual=configs.every(c=>c.manual?.base&&c.manual?.sheet);
 const area=team.gameMode||'siege',stage=team.destination||team.dungeon||team.sourceDungeon||'gbah';
 const pve=['cairos','dimensional','rift','raid','toa','labyrinth','pve'].includes(area);
 const titles={siege:'SIEGE',arena:'ARENA',rta:'WORLD ARENA',cairos:'CAIROS',dimensional:'DIMENSIONAL',rift:'RIFT',raid:'RAID',toa:'TOA',labyrinth:'LABIRINTO'};
 const matchingAccount=account&&(!team.sourceAccountId||String(team.sourceAccountId)===String(account.id));
 const runeMap=new Map((account?.runes||[]).map(r=>[r.id,r])),artifactMap=new Map((account?.artifacts||[]).map(a=>[a.id,a]));
 const preset=matchingAccount?account.accountPresets?.find(p=>p.id===team.sourceDeckId):null;
 const actors=[];
 const monsters=configs.map((c,index)=>{
  const unit=matchingAccount?account.units?.find(u=>u.id===c.unitId&&Number(u.master)===Number(c.masterId)):null;
  const build=unit?builds?.find(b=>b.key===c.key&&b.unitId===unit.id&&(!b.teamId||b.teamId===team.id)):null;
  const ids=unit?(build?.runeIds??currentRuneIds(account,team,c,unit))||[]:[],gear=ids.map(id=>runeMap.get(id)).filter(Boolean);
  const equipment=preset?.equipment?.find(e=>e.unitId===unit?.id);
  const artifactIds=unit&&c.artifacts!==false&&options.artifacts!==false?(build?.artifactIds??equipment?.artifactIds??unit.artifactIds??[]):[];
  const equippedUnit=unit?{...unit,artifactIds}:null;
  const base=c.manual?.base||unit?.base||monsterBase(c.masterId);
  const stats=c.manual?.sheet?{total:c.manual.sheet}:build?.stats?.total?build.stats:unit&&gear.length===ids.length?calculateStats(unit,gear,artifactBonus(account,equippedUnit)):null;
  const counts=build?.counts||setCounts(gear),effects=unit?artifactEffects(account,equippedUnit,c.artifacts!==false):{};
  const combat=build?.stats?.combat||(stats&&base?combatAttributes({master:c.masterId,element:c.masterId%10,base},stats,counts,manual?quickCombatTeam(team):team,c.combat,effects):null);
  if(combat)actors.push({key:c.key,master:c.masterId,name:c.label,spd:combat.spd,rawSpd:combat.rawSpd,combat:c.combat,effects,attributes:combat,will:(counts[15]||0)>=2,nemesisSets:Math.floor((counts[14]||0)/2)});
  const rows=statsOrder.map(key=>({key,base:base?finite(base[key]):null,bonus:stats?.total&&base?finite(stats.total[key])-finite(base[key]):null,total:stats?.total?finite(stats.total[key]):null}));
  const runes=Array.from({length:6},(_,slot)=>{const r=gear.find(r=>r.slot===slot+1);return r?{slot:slot+1,set:r.set,name:SETS[r.set]||'Runa',level:r.level,stars:r.stars,icon:SETS[r.set]?`/game-icons/runes/${SETS[r.set].toLowerCase()}.png`:null}:null;});
  const artifacts=Array.from({length:2},(_,i)=>{const a=artifactMap.get(artifactIds[i]);return a?{level:a.level,stat:({100:'HP',101:'ATK',102:'DEF'})[a.main?.[0]]||'Artefato',value:finite(a.main?.[1])}:null;});
  const abilities=equivalentSkillIds(skillCatalog,c.masterId).map(id=>skillCatalog.skills[id]).filter(Boolean).map(s=>({...s,level:unit?.skillLevels?.find(l=>l.slot===s.slot)?.level??c.skillLevels?.find(l=>l.slot===s.slot)?.level??null}));
  const leader=monsterLeader(c.masterId),activeLeader=!!team.leader&&(team.leaderKey?team.leaderKey===c.key:team.configs.indexOf(c)===(team.leaderIndex||0));
  const setPieces=(gear.length?gear.map(r=>r.set):(c.sets||[]).filter(Boolean)).reduce((out,id)=>({...out,[id]:(out[id]||0)+1}),{});
  const sets=orderRuneSets(Object.keys(setPieces).map(Number)).map(id=>[id,setPieces[id]]).filter(([id])=>SETS[id]).map(([id,pieces])=>({name:SETS[id],count:gear.length?Math.floor(pieces/(FOUR.has(Number(id))?4:2)):pieces,partial:gear.length&&pieces<(FOUR.has(Number(id))?4:2)?`${pieces}/${FOUR.has(Number(id))?4:2}`:null,icon:`/game-icons/runes/${SETS[id].toLowerCase()}.png`}));
  return {name:c.label||unit?.name||'Monstro',master:c.masterId,position:index+1,role:manual?(index===0?'ABRIDOR':'SEQUÊNCIA'):'POSIÇÃO',elementIcon:elementNames[c.masterId%10]?`/game-icons/elements/${elementNames[c.masterId%10]}.png`:null,
   level:unit?(unit.level||null):base?40:null,stars:unit?(unit.stars||null):base?6:null,awakened:Math.floor(c.masterId/10)%10>0,planning:!unit,statsKnown:!!stats,selectedBuild:!!build,
   stats:rows,runes,artifacts,sets,desiredSets:!gear.length,skills:abilities,leader:activeLeader?team.leader:leader,activeLeader,
   combatSpd:combat?.spd??null,runeSpd:stats?.total&&base?Math.max(0,finite(stats.total.spd)-finite(base.spd)):null,artifactSpd:finite(c.combat?.artifactSpd),
   goals:statsOrder.filter(key=>Number(c.goals?.[key])>0).map(key=>({key,value:Number(c.goals[key]),additional:c.basis==='bonus'&&!['cr','cd','res','acc'].includes(key)}))};
 });
 let preview;
 if(manual)preview=quickPreview(team);
 else if(actors.length===configs.length){
  const configured=scenarioForTeam(team,actors),enemy=Number(team.enemyCombatSpd)||0;
  const scenario=simulateCombat([...configured.actors,...(!configured.actors.some(a=>a.enemy)&&enemy>0?[{key:'infographic-enemy',name:'Inimigo',spd:enemy,enemy:true}]:[])],{events:configured.events,stopAfterFirst:true});
  preview={complete:true,actors,scenario,turns:scenario.firstTurns,cut:scenario.cut};
 }else preview={complete:false,actors,turns:[],cut:null};
 const locked=manual&&quickOrderLocked(team),audit=team.syncAudit||team.perfectTuneAudit;
 const ladderRequired=team.automaticSync?.kind!=='boost';
 const safe=locked&&audit?.safe===true&&!preview.cut&&firstRotationSafe(preview.scenario,configs.map(c=>c.key))&&(!ladderRequired||preview.actors.every((a,i)=>i===0||preview.actors[i-1].spd-a.spd===1));
 // Manual preview is authoritative, including its forced Arena tower and
 // reference enemy. Account builds retain their own area/leader/equipment rules.
 for(const m of monsters){const actor=preview.actors.find(a=>a.master===m.master&&a.key===configs[m.position-1].key);if(actor)m.combatSpd=actor.spd;}
 const names=new Map([...actors,...(preview.actors||[])].map(a=>[a.key,a.name]));
 (team.combatScenario?.enemies||[]).forEach((enemy,i)=>names.set(`enemy:${i}`,enemy.label||'Inimigo'));
 const context=manual&&!pve&&!team.exportContext?.title?'':teamCardHeading(team).title;
 const background=['arena','rta'].includes(area)?'/art/arena-coliseum.png':['rift','raid'].includes(area)?'/art/pve-rift.png':pve?pveArt(area==='pve'?'cairos':area,stage)||'/art/cairos-abyss.png':'/art/siege-castle.png';
 return {title:titles[area]||'TEAM',subtitle:pve?'DUNGEON GUIDE':!manual&&team.mode==='defense'?'DEFENSE GUIDE':'OFFENSE GUIDE',name:team.name||monsters.map(m=>m.name).join(' · '),context:context!==team.name?context:'',description:String(team.description||'').slice(0,1000),area,background,monsters,
  orderLabel:!preview.complete?'Simulação indisponível · status não informados':locked?(safe?'Fila validada no cenário':'Ordem não validada'):preview.cut?'Risco de corte no cenário':'Cenário informado',safe,
  turns:preview.turns.map(t=>({name:names.get(t.key)||(t.enemy?'Inimigo':'Monstro'),tick:Math.max(1,Math.trunc(t.tick)),enemy:!!t.enemy,disabled:!!t.disabled})),referenceEnemy:preview.referenceEnemy||0};
}
