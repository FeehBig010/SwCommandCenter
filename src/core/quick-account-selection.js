import {MONSTER_CATALOG} from './monsters.js';
import {canonicalMonsterId} from './CollabMapping.js';
import {quickTeamFromPreset} from './quick-presets.js';
import {quickLeader} from './quick-calculator.js';
import {accountStamp} from './loadouts.js';
import {arenaContextOf} from './arena-context.js';

// Scope is explicit: catalog options never implicitly bind an owned instance.
export function quickMonsterChoices(account,scope='all'){
 if(scope==='owned')return (account?.units||[]).map(u=>({id:u.id,unitId:u.id,master:u.master,name:u.name,element:u.element,value:`unit:${u.id}`,detail:`Da conta · Nv. ${u.level} · #${u.id}`,owned:true}));
 const owned=new Set((account?.units||[]).map(u=>canonicalMonsterId(u.master)));
 return MONSTER_CATALOG.map(u=>({...u,value:String(u.master),owned:owned.has(canonicalMonsterId(u.master)),detail:owned.has(canonicalMonsterId(u.master))?'Possuído na conta':'Não possuído'}));
}

// Selecting a copy loads a detached snapshot, never a rune proposal. A missing
// RTA assignment stays empty rather than borrowing equipment from the main pool.
export function quickAccountSelection(team,key,unitId,account,{presetId=null,options={}}={}){
 if(!account?.units)throw new Error('Importe seu SWEX para selecionar uma unidade da conta.');
 const current=team.configs.find(c=>c.key===key),unit=account.units.find(u=>u.id===Number(unitId));
 if(!current)throw new Error('O slot selecionado não pertence a este time.');
 if(!unit)throw new Error('Esta unidade não está na conta atual.');
 if(team.sourceAccountId!=null&&String(team.sourceAccountId)!==String(account.id))throw new Error('Este time pertence a outra conta. Abra uma nova simulação.');
 if(team.configs.some(c=>c.key!==key&&c.unitId===unit.id))throw new Error('Esta cópia já está selecionada no time.');
 const preset=presetId==null?null:account.accountPresets?.find(p=>p.id===presetId);
 if(presetId!=null&&(!preset||preset.gameMode!==team.gameMode||!preset.unitIds.includes(unit.id)||team.gameMode==='arena'&&arenaContextOf(preset)!==arenaContextOf(team)))throw new Error('O preset não corresponde à unidade, área ou contexto selecionado.');
 const equipment=preset?.equipment?.find(e=>e.unitId===unit.id),rta=team.gameMode==='rta';
 const ids=equipment?equipment.runeIds||[]:rta?account.equipmentPools?.rta?.assignments?.[unit.id]||[]:unit.runeIds||[];
 const artifactIds=options.artifacts===false?[]:equipment?.artifactIds??(rta?[]:unit.artifactIds??[]);
 const sourceMissing=[];
 if(rta&&!equipment&&!Object.hasOwn(account.equipmentPools?.rta?.assignments||{},unit.id))sourceMissing.push('rta-assignment');
 if(rta&&!equipment&&options.artifacts!==false&&unit.artifactIds?.length)sourceMissing.push('rta-artifact-assignment');
 for(const id of ids)if(!account.runes.some(r=>r.id===id))sourceMissing.push(`rune:${id}`);
 for(const id of artifactIds)if(!(account.artifacts||[]).some(a=>a.id===id))sourceMissing.push(`artifact:${id}`);
 const loaded=quickTeamFromPreset({id:preset?.id||'calculator-unit',name:team.name,gameMode:team.gameMode,arenaContext:team.arenaContext,unitIds:[unit.id],equipment:[{unitId:unit.id,runeIds:[...ids],artifactIds:[...artifactIds]}]},account);
 const card=loaded.configs[0];
 if(card.sourceRuneCount!==6||new Set(ids.map(id=>account.runes.find(r=>r.id===id)?.slot)).size!==6)sourceMissing.push('incomplete-runes');
 const next={...card,key,sourceMissing,equipmentSource:equipment?'swex-preset':rta?'swex-rta':'swex-main',artifacts:options.artifacts!==false};
 const oldPlans=team.plannedRunes?.accountStamp===accountStamp(account)?team.plannedRunes.byConfig:{};
 return {...team,speedMode:'snapshot',automaticSync:null,syncAudit:null,perfectTuneAudit:null,configs:team.configs.map(c=>c.key===key?next:c),plannedRunes:{accountStamp:accountStamp(account),byConfig:{...oldPlans,[key]:[...ids]}},
  ...(team.leaderKey===key?{leader:quickLeader(next.masterId),leaderSpd:0}:{}),
  ...(current.unitId!==unit.id?{sourceDeckId:null,sourceDeckName:null}:{}),sourceAccountId:account.id};
}
