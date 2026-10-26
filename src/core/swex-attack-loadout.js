import {arenaContextOf} from './arena-context.js';

// A JSON deck snapshot is not a locally suggested plan. Resolve it directly
// from accountPresets so diagnostic baselines match the selected game preset.
export function resolveSwexAttackLoadout(account,team,original){
 const preset=(!team.sourceAccountId||String(team.sourceAccountId)===String(account.id))&&account.accountPresets?.find(p=>p.id===team.sourceDeckId&&p.gameMode===team.gameMode&&(p.gameMode!=='arena'||arenaContextOf(p)===arenaContextOf(team)));
 const equipment=preset?.unitIds?.includes(original.id)&&preset.equipment?.find(e=>e.unitId===original.id);
 if(equipment)return {unit:{...original,runeIds:Array.isArray(equipment.runeIds)?[...equipment.runeIds]:[],artifactIds:Array.isArray(equipment.artifactIds)?[...equipment.artifactIds]:original.artifactIds},source:`preset “${preset.name||team.sourceDeckName||'selecionado'}” do SWEX`,kind:'preset'};
 const current=Array.isArray(original.runeIds)?original.runeIds:[],owned=account.runes.filter(r=>r.owner===original.id&&r.pool!=='rta').map(r=>r.id);
 // Recover legacy/partial unit references only when the complete ownership list
 // agrees with every referenced ID. Never combine unrelated or local plan IDs.
 const byId=new Map(account.runes.map(r=>[r.id,r]));
 const complete=owned.length===6&&new Set(owned.map(id=>byId.get(id)?.slot)).size===6&&owned.every(id=>byId.get(id)?.slot>=1&&byId.get(id)?.slot<=6);
 const recover=current.length<6&&complete&&current.every(id=>owned.includes(id));
 return {unit:{...original,runeIds:recover?owned:[...current]},source:'equipamento principal do SWEX',kind:recover?'ownership':'main'};
}
export function assertSwexAttackRunes(loadout,byId,used){
 const {unit,source}=loadout,ids=unit.runeIds,where=`${unit.name} (cópia #${unit.id})`,retry='Reimporte o SWEX completo e atualizado ou selecione outra cópia da unidade.';
 if(!ids.length)throw new Error(`${where}: o ${source} não informa runas equipadas para esta cópia. ${retry}`);
 if(new Set(ids).size!==ids.length)throw new Error(`${where}: há IDs de runas repetidos no ${source}. ${retry}`);
 const missing=ids.filter(id=>!byId.has(id));if(missing.length)throw new Error(`${where}: ${missing.length} runa(s) referenciada(s) no ${source} não estão no inventário importado. ${retry}`);
 const slots=ids.map(id=>byId.get(id).slot),absent=[1,2,3,4,5,6].filter(slot=>!slots.includes(slot));
 if(ids.length!==6||new Set(slots).size!==6||slots.some(s=>!Number.isInteger(s)||s<1||s>6))throw new Error(`${where}: encontrei ${new Set(slots.filter(s=>Number.isInteger(s)&&s>=1&&s<=6)).size} de 6 slots válidos no ${source}.${absent.length?` Slots ausentes: ${absent.join(', ')}.`:' Existem slots repetidos ou inválidos.'} ${retry}`);
 for(const id of ids){const previous=used.get(id);if(previous)throw new Error(`A runa #${id} está repetida entre ${previous} e ${where} no equipamento de referência do time. Escolha outro preset ou reimporte o SWEX atualizado; não é possível distribuir a mesma runa entre dois monstros.`);}
 ids.forEach(id=>used.set(id,where));
}
export function restoreSwexAttackReference(account,team){
 const byId=new Map(account.runes.map(r=>[r.id,r])),used=new Map(),byConfig={};let hasReference=false;
 for(const config of team.configs){const original=account.units.find(u=>u.id===config.unitId);if(!original)throw new Error('Selecione uma unidade da conta em cada slot.');const loadout=resolveSwexAttackLoadout(account,team,original);assertSwexAttackRunes(loadout,byId,used);byConfig[config.key]=loadout.unit.runeIds;hasReference||=loadout.kind!=='main';}
 // A native preset is itself represented as plannedRunes by the editor. Keep
 // that snapshot when undoing a local proposal, instead of switching to main gear.
 return hasReference?{accountStamp:`${account.id||''}:${account.importedAt||''}`,byConfig,source:'swex-reference'}:null;
}
