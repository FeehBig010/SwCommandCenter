import {canonicalMonsterId} from './CollabMapping.js';
import {blankConfig,makeTeam} from './data.js';
import {catalogLeader} from './leader-catalog.js';

// MVP fechado: nenhuma intenção fora deste trio é enviada ao motor de Siege.
export const BUILD_LAB_TRIO=[26811,18311,29711];
const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const names=[
 /(?:\badriana\b|\bpure[\s-]*vanilla[\s-]*cookie\b)/i,
 /\bmihyang\b/i,
 /(?:\brigna\b|\bciri\b)/i,
];
const numberNear=(text,patterns)=>{
 for(const pattern of patterns){const match=text.match(pattern);if(match)return Number(match[1]);}
 return null;
};

export function parseBuildLabRequest(raw){
 const text=fold(raw).trim();
 if(!text||text.length>1200)throw new Error('Descreva o time em até 1.200 caracteres.');
 if(!names.every(pattern=>pattern.test(text)))throw new Error('Neste MVP, informe Adriana (ou Pure Vanilla Cookie), Mihyang e Rigna (ou Ciri). Outros times ainda não são suportados.');
 const preserve=text.match(/(?:preserv\w*|proteg\w*|reserv\w*|sem\s+mexer\s+n[oa]?)\s+(?:[^\n.]{0,50}?\s+)?(?:deck|preset)\s*#?\s*(\d{1,3})(?!\d)/i)
  ||text.match(/(?:deck|preset)\s*#?\s*(\d{1,3})(?!\d)[^\n.]{0,35}?(?:preserv\w*|proteg\w*|reserv\w*|sem\s+mexer)/i);
 const targetSpd=numberNear(text,[/\b(?:alvo|inimigo|defensor)\s*(?:de|com|a|:)?\s*(\d{2,4})\s*spd\b/i,/\b(\d{2,4})\s*spd\b/i]);
 const targetDef=numberNear(text,[/\b(?:def|defesa)\s*(?:de|:)?\s*(\d{2,5})\b/i,/\b(\d{2,5})\s*(?:de\s*)?def\b/i]);
 const noBuff=/\b(?:sem|ausencia de)\s+(?:buff\s+)?(?:de\s+)?def\b/i.test(text);
 return {kind:'siege-first-rotation',protectDeck:preserve?Number(preserve[1]):null,targetSpd,targetDef,
  defenseBuff:!noBuff,requireNoCut:/sem corte|anti.?corte|sincroniz|sem ser cortad/.test(text),
  wantsDamage:/dano|damage|nuk|maxim|mais forte|melhor build|otimiz/.test(text)};
}

function unitFor(account,master){
 return (account?.units||[]).filter(unit=>canonicalMonsterId(unit.master)===master)
  .sort((a,b)=>Number(b.level||0)-Number(a.level||0)||Number(b.class||0)-Number(a.class||0)||Number(a.id)-Number(b.id))[0];
}

export function prepareBuildLabTeam(account,teams,parsed){
 if(!account||!Array.isArray(account.units)||!account.units.length)throw new Error('Importe seu SWEX antes de otimizar.');
 if(parsed?.kind!=='siege-first-rotation')throw new Error('Pedido de build não reconhecido.');
 const existing=(teams||[]).find(team=>team.gameMode==='siege'&&team.configs?.length===3
  &&BUILD_LAB_TRIO.every(master=>team.configs.some(c=>c.enabled!==false&&c.unitId&&canonicalMonsterId(c.masterId)===master))
  &&new Set(team.configs.map(c=>c.unitId)).size===3);
 if(existing)return {team:existing,reused:true};
 const units=BUILD_LAB_TRIO.map(master=>unitFor(account,master));
 if(units.some(unit=>!unit))throw new Error('O SWEX não contém as três unidades físicas necessárias. Confira a versão da conta.');
 const configs=units.map(unit=>({...blankConfig(unit),artifacts:true}));
 const team={...makeTeam('siege'),name:'Adriana · Mihyang (L) · Rigna',autoName:false,mode:'attack',
  active:true,optimizerSpeedSync:false,leaderIndex:1,leaderKey:configs[1].key,leader:catalogLeader(18311),
  configs,gamePlacement:configs.map(c=>c.key)};
 return {team,reused:false};
}

export function resolveBuildLabProtection(account,team,deckNumber){
 if(deckNumber==null)return {preset:null,runeIds:[],artifactIds:[]};
 const pattern=new RegExp('(?:^|\\b)(?:deck|preset)\\s*#?\\s*'+deckNumber+'(?!\\d)','i');
 const matches=(account?.accountPresets||[]).filter(p=>pattern.test(fold(p.name)));
 if(matches.length!==1)throw new Error(matches.length?'Há mais de um Deck '+deckNumber+'. Selecione uma cópia no editor.':'O Deck '+deckNumber+' não foi localizado no SWEX.');
 const preset=matches[0];
 const equipment=preset.equipment||[];
 if(!equipment.length)throw new Error('O Deck '+deckNumber+' não tem equipamentos registrados. Não é seguro afirmar que está protegido.');
 const runeIds=[...new Set(equipment.flatMap(e=>e.runeIds||[]).map(Number).filter(Number.isSafeInteger))];
 const artifactIds=[...new Set(equipment.flatMap(e=>e.artifactIds||[]).map(Number).filter(Number.isSafeInteger))];
 if(!runeIds.length)throw new Error('O Deck '+deckNumber+' não contém IDs de runas utilizáveis.');
 const ownArtifacts=new Set(team.configs.flatMap(c=>(account.units.find(u=>u.id===c.unitId)?.artifactIds)||[]));
 const clash=artifactIds.filter(id=>ownArtifacts.has(id));
 if(clash.length)throw new Error('O Deck '+deckNumber+' compartilha artefatos equipados com o trio (#'+clash.join(', ')+'). A busca de runas não consegue resolver esse conflito sem mudar artefatos.');
 return {preset,runeIds,artifactIds};
}

export function resultProtectionConflicts(result,protection){
 const runeSet=new Set(protection?.runeIds||[]),artifactSet=new Set(protection?.artifactIds||[]);
 return (result?.alternatives||[]).map(row=>({
  kind:row.kind,
  runeIds:row.builds.flatMap(b=>b.runeIds||[]).filter(id=>runeSet.has(id)),
  artifactIds:row.builds.flatMap(b=>b.artifactIds||[]).filter(id=>artifactSet.has(id)),
 }));
}
