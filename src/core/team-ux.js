import {SETS,FOUR} from './data.js';
export function automaticTeamName(configs){return configs.filter(c=>c.enabled!==false&&c.masterId).map(c=>c.label).join(' - ')||'Novo time';}
export function updateAutomaticName(previous,next){if(next.autoName===false)return {...next,autoName:false};const oldAuto=automaticTeamName(previous.configs);const automatic=previous.autoName!==false&&(previous.autoName===true||['Novo time','Molly · Vritra · Solveig',oldAuto].includes(previous.name));return {...next,autoName:automatic,...(automatic?{name:automaticTeamName(next.configs)}:{})};}
export function setRuneSlot(current,index,value){
 const slots=Array.from({length:3},(_,i)=>Number(current[i])||0);slots[index]=Number(value)||0;
 if(slots[index]&&(!SETS[slots[index]]||slots[index]===25))throw new Error('Set não suportado.');
 const four=slots.findIndex(s=>FOUR.has(s));
 if(four>=0){const two=slots.filter((s,i)=>i!==four&&s&&!FOUR.has(s))[0]||0;return [slots[four],two].filter(Boolean);}
 return slots.filter(Boolean);
}
export const GOAL_PRESETS={tank:{label:'🛡️ Tank',goals:{hp:40000,def:1500,spd:200,cr:15,cd:50,res:100,acc:0,atk:0},objective:'hp'},damage:{label:'⚔️ Dano/CR',goals:{hp:20000,def:800,atk:2000,spd:180,cr:100,cd:180,res:15,acc:0},objective:'damage'},speed:{label:'⚡ Speed Tune',goals:{hp:25000,def:1000,atk:0,spd:260,cr:15,cd:50,res:15,acc:0},objective:'spd'},control:{label:'🎯 Control',goals:{hp:30000,def:1200,atk:0,spd:230,cr:15,cd:50,res:15,acc:85},objective:'balanced'}};
export function applyGoalPreset(config,key){const p=GOAL_PRESETS[key];if(!p)throw new Error('Preset inválido.');return {...config,basis:'total',goals:{...p.goals},objective:p.objective};}
export function reorderTeam(team,from,to){
 const configs=team.configs.slice();if(from<0||to<0||from>=configs.length||to>=configs.length)return team;
 [configs[from],configs[to]]=[configs[to],configs[from]];
 const ref=k=>{if(!k.startsWith('ally:'))return k;const old=team.configs[Number(k.split(':')[1])];return `ally:${configs.findIndex(c=>c.key===old?.key)}`;};
 return updateAutomaticName(team,{...team,configs,leaderIndex:Math.max(0,configs.findIndex(c=>c.key===team.leaderKey)),...(team.combatScenario?{combatScenario:{...team.combatScenario,events:(team.combatScenario.events||[]).map(e=>({...e,afterKey:ref(e.afterKey),targets:e.targets.map(ref)}))}}:{})});
}

export function normalizeFocuses(values){return [...new Set(Array.isArray(values)?values:[])].filter(key=>Object.hasOwn(GOAL_PRESETS,key));}
export function toggleGoalFocus(config,key,base={}){
 if(!GOAL_PRESETS[key])throw new Error('Foco inválido.');
 const selected=normalizeFocuses(config.focuses),removing=selected.includes(key),focuses=removing?selected.filter(v=>v!==key):[...selected,key];
 if(removing)return {...config,focuses};
 const goals=Object.fromEntries(Object.entries(config.goals).map(([stat,value])=>[stat,value===''?'':Number(value)+(config.basis==='bonus'&&['hp','atk','def','spd'].includes(stat)?Number(base[stat]||0):0)]));
 for(const focus of focuses)for(const [stat,target] of Object.entries(GOAL_PRESETS[focus].goals))goals[stat]=Math.max(Number(goals[stat])||0,target);
 return {...config,focuses,basis:'total',goals};
}
