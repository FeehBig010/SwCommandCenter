import {equipmentPools} from './equipment-pools.js';
import {normalizeCrafts} from './rune-crafts.js';
import {skillLevels} from './skill-levels.js';
import {extractTowers} from './towers.js';
import {normalizeArtifactSubstats} from './artifacts.js';
import { extractAccountPresets } from './decks.js';
import catalog from './catalog.json' with { type: 'json' };
export const SETS={1:'Energy',2:'Guard',3:'Swift',4:'Blade',5:'Rage',6:'Focus',7:'Endure',8:'Fatal',10:'Despair',11:'Vampire',13:'Violent',14:'Nemesis',15:'Will',16:'Shield',17:'Revenge',18:'Destroy',19:'Fight',20:'Determination',21:'Enhance',22:'Accuracy',23:'Tolerance',24:'Seal',25:'Intangible'};
export const STAT_NAMES={1:'HP',2:'HP%',3:'ATK',4:'ATK%',5:'DEF',6:'DEF%',8:'SPD',9:'TC%',10:'DC%',11:'RES%',12:'ACC%'};
export const ELEMENTS={1:'Água',2:'Fogo',3:'Vento',4:'Luz',5:'Trevas'};
export const FOUR=new Set([3,5,8,10,11,13]);
export const STATS=['hp','def','spd','atk','cr','cd','res','acc'];
export const LABELS={combatSpd:'SPD combate',hp:'HP',def:'DEF',spd:'SPD',atk:'ATK',cr:'TC',cd:'DC',res:'RES',acc:'ACC'};
export function monsterName(master){return catalog[master]||`${catalog[String(master).slice(0,3)]||'Monstro'} (${ELEMENTS[master%10]||master})`;}
const number=(x,fallback=0)=>Number.isFinite(Number(x))?Number(x):fallback;
function effect(e){return Array.isArray(e)?e.slice(0,4).map(x=>number(x)):[];}
export function normalizeAccount(raw){
 if(!raw||!Array.isArray(raw.unit_list)||!Array.isArray(raw.runes))throw new Error('Escolha um JSON original do SWEX com unit_list e runes.');
 if(raw.unit_list.length>10000||raw.runes.length>100000)throw new Error('Inventário acima do limite de importação.');
 const runeMap=new Map(),artifactMap=new Map(),locked=new Set((raw.rune_lock_list||[]).map(x=>number(typeof x==='object'?x.rune_id:x)));
 function addRune(r,owner){
  if(!r||!Number.isSafeInteger(r.rune_id)||r.slot_no<1||r.slot_no>6||!Array.isArray(r.pri_eff))return;
  runeMap.set(r.rune_id,{id:r.rune_id,slot:r.slot_no,set:number(r.set_id),stars:number(r.class)%10,ancient:number(r.class)>10,level:number(r.upgrade_curr),owner:number(owner??r.occupied_id),main:effect(r.pri_eff),innate:effect(r.prefix_eff),subs:(r.sec_eff||[]).map(effect),locked:locked.has(r.rune_id)});
 }
 function addArtifact(a,owner){const id=a?.rid??a?.artifact_id;if(Number.isSafeInteger(id)&&id>0)artifactMap.set(id,{id,owner:number(owner??a.occupied_id),type:number(a.type),element:number(a.attribute),style:number(a.unit_style),main:effect(a.pri_effect??a.pri_eff),subs:normalizeArtifactSubstats(a),level:number(a.level)});}
 raw.runes.forEach(r=>addRune(r));(raw.artifacts||[]).forEach(a=>addArtifact(a));
 const units=raw.unit_list.filter(u=>u.unit_id&&u.unit_master_id&&u.con>0).map(u=>{
  (u.runes||[]).forEach(r=>addRune(r,u.unit_id));(u.artifacts||[]).forEach(a=>addArtifact(a,u.unit_id));
  return {id:u.unit_id,master:u.unit_master_id,name:catalog[u.unit_master_id]||String(u.unit_name??u.name??monsterName(u.unit_master_id)),level:number(u.unit_level),stars:number(u.class),element:number(u.attribute,u.unit_master_id%10),base:{hp:number(u.con)*15,atk:number(u.atk),def:number(u.def),spd:number(u.spd),cr:number(u.critical_rate),cd:number(u.critical_damage),res:number(u.resist),acc:number(u.accuracy)},...(skillLevels(u.skills??u.skill_list).length?{skillLevels:skillLevels(u.skills??u.skill_list)}:{}),runeIds:(u.runes||[]).map(r=>r.rune_id),artifactIds:(u.artifacts||[]).map(a=>a.rid??a.artifact_id)};
 });
 const runesByOwner=new Map();for(const r of runeMap.values()){if(!runesByOwner.has(r.owner))runesByOwner.set(r.owner,[]);runesByOwner.get(r.owner).push(r.id);}for(const unit of units)if(!unit.runeIds.length)unit.runeIds=runesByOwner.get(unit.id)||[];
 const artifactsByOwner=new Map();
 for(const a of artifactMap.values()){if(!artifactsByOwner.has(a.owner))artifactsByOwner.set(a.owner,[]);artifactsByOwner.get(a.owner).push(a.id);}
 for(const unit of units)if(!unit.artifactIds.length)unit.artifactIds=artifactsByOwner.get(unit.id)||[];
 const unitIds=new Set(units.map(u=>u.id));
 const siege=(raw.guildsiege_defense_deck_unit_list||[]).map((d,i)=>({name:`Defesa ${i+1}`,unitIds:(d.unit_id_list||[]).filter(id=>unitIds.has(id)),equipment:raw.guildsiege_defense_deck_equip_list?.[d.deck_id]?.equip?.map(e=>({unitId:e.unit_id,runeIds:e.rune_id_list||[],artifactIds:e.artifact_id_list||[]}))||[]}));
 if(!units.length||!runeMap.size)throw new Error('Não há monstros e runas válidos neste arquivo.');
 const presetImport={sources:{}};
 function nativeDecks(key,path,area=null){
  const value=raw[key],detail={present:Object.hasOwn(raw,key),hasData:!!value&&typeof value==='object'&&Object.keys(value).length>0,imported:0,unrecognized:0};
  const decks=extractAccountPresets({[path]:value},units,area,detail);detail.imported=decks.length;
  if(detail.hasData&&!decks.length)detail.unrecognized=Math.max(1,detail.unrecognized);
  presetImport.sources[key]=detail;return decks;
 }
 const presets=nativeDecks('deck_list','pve','pve-default');
 const typed=[...extractAccountPresets({r5:{raid:raw.raid_deck,party:raw.party_deck,raid_list:raw.raid_deck_list}},units,'pve'),...extractAccountPresets({siege:raw.siege_deck},units,'siege'),...extractAccountPresets({arena:raw.arena_deck},units,'arena'),...extractAccountPresets({dungeon:raw.dungeon_deck},units,'pve'),...extractAccountPresets({rta:raw.world_arena_deck},units,'rta'),...nativeDecks('world_arena_deck_list','rta_list','rta')];
 const supplemental=[...typed,...nativeDecks('defense_deck_list','native_defense'),...extractAccountPresets({siege_defense:raw.guildsiege_defense_deck_unit_list},units)];
 if(Array.isArray(raw.defense_unit_list)&&raw.defense_unit_list.length===4&&raw.defense_unit_list.every(u=>Number.isSafeInteger(Number(u.unit_id)))){
  const ordered=raw.defense_unit_list.slice().sort((a,b)=>Number(a.pos_id??0)-Number(b.pos_id??0));
  supplemental.push(...extractAccountPresets({arena_defense:{deck_name:'Defesa Arena',unit_id_list:ordered.map(u=>Number(u.unit_id))}},units));
 }
 for(const preset of supplemental)presets.push({...preset,id:`source-${preset.id}`});
 return {version:1,id:String(raw.wizard_info?.wizard_id||raw.wizard_id||'conta'),name:String(raw.wizard_info?.wizard_name||'Minha conta'),guild:String(raw.guild?.guild_info?.name||''),importedAt:new Date().toISOString(),units,runes:[...runeMap.values()],artifacts:[...artifactMap.values()],siege,accountPresets:presets,presetImport,towers:extractTowers(raw),crafts:normalizeCrafts(raw.rune_craft_item_list),equipmentPools:equipmentPools(raw,units,[...runeMap.values()])};
}
export function blankConfig(unit=null,name='Escolher monstro'){
 return {key:crypto.randomUUID(),unitId:unit?.id||null,masterId:unit?.master||null,label:unit?.name||name,enabled:true,lockSpeedSync:false,artifacts:true,sets:[0,0],strictSets:true,mains:{2:0,4:0,6:0},goals:{hp:'',def:'',spd:'',atk:'',cr:'',cd:'',res:'',acc:''},basis:'bonus',objective:'balanced'};
}
export function initialTeams(account){
 const configs=['Molly','Vritra','Solveig'].map(name=>{
  const matches=account?.units.filter(u=>u.name===name).sort((a,b)=>b.level-a.level)||[];
  const c=blankConfig(matches[0],name);
  if(name==='Vritra'){c.sets=[10,17];c.strictSets=false;}
  else{c.sets=[13,0];c.mains={2:8,4:2,6:2};c.goals.hp=28001;c.goals.def=700;c.objective=name==='Solveig'?'cr':'balanced';}
  return c;
 });
 return [{id:crypto.randomUUID(),name:configs.filter(c=>c.masterId).map(c=>c.label).join(' - ')||'Novo time',autoName:true,mode:'defense',priority:1,order:'soft',configs}];
}
export function makeTeam(gameMode='siege'){return {id:crypto.randomUUID(),name:'Novo time',autoName:true,gameMode,mode:'defense',priority:1,order:'off',configs:Array.from({length:GAME_MODES[gameMode]?.slots||3},()=>blankConfig())};}
export const DEFAULT_OPTIONS={equipped:true,respectLocks:false,artifacts:true,depth:'balanced',minLevel:12,maxGrindsGems:false,strictMode:false,speedTick:7};

export const GAME_MODES = {
 solo: {label:'1 Slot (Solo)', slots:1},
 siege: {label:'3 Slots (Siege / WGB)', slots:3},
 arena: {label:'4 Slots (Arena Offense / Defense)', slots:4},
 cairos: {label:'5 Slots (Cairos Dungeons)', slots:5},
 dimensional:{label:'4 Slots (Buraco Dimensional)',slots:4},
 rift:{label:'6 Slots (Rift / R5)',slots:6},
 toa:{label:'5 Slots (Torre da Ascensão)',slots:5},
};
export function changeGameMode(team, gameMode) {
 const slots=GAME_MODES[gameMode]?.slots;
 if(!slots)return team;
 const configs=[...team.configs,...(team.inactiveConfigs||[])];
 while(configs.length<slots)configs.push(blankConfig());
 return {...team,gameMode,configs:configs.slice(0,slots),inactiveConfigs:configs.slice(slots)};
}
// Legacy three-slot plans default to Siege. Stored hidden slots never enter a search.
export function restoreTeam(team) {
 return changeGameMode(team, GAME_MODES[team.gameMode]?team.gameMode:'siege');
}

export function teamFromPreset(preset,account,team=makeTeam(preset.gameMode||'siege')){
 const base=changeGameMode(team,preset.gameMode||team.gameMode||'siege');
 return {...base,name:preset.name,configs:Array.from({length:base.configs.length},(_,i)=>blankConfig(account.units.find(u=>u.id===preset.unitIds[i]))),inactiveConfigs:[],leaderKey:null};
}
