import {leaderApplies} from './leaders.js';
import {catalogLeader} from './leader-catalog.js';
import {teamsForArea,presetsForArea} from './deckManager.js';
export {MAX_TOWERS} from './combat-towers.js';
export const optimizerSyncEnabled=team=>team.optimizerSpeedSync!==false;
export function importedPreset(team,account){
 if(!team.sourceDeckId||team.sourceAccountId&&String(team.sourceAccountId)!==String(account?.id))return null;
 const preset=account?.accountPresets?.find(p=>p.id===team.sourceDeckId);
 if(!preset||preset.gameMode!==team.gameMode)return null;
 const ids=team.configs.map(c=>Number(c.unitId)||null).sort((a,b)=>(a||0)-(b||0));
 const original=Array.from({length:team.configs.length},(_,i)=>Number(preset.unitIds[i])||null).sort((a,b)=>(a||0)-(b||0));
 return JSON.stringify(ids)===JSON.stringify(original)?preset:null;
}
export function optimizerActionLabel(teams,account){const active=teams.filter(t=>t.active!==false);const n=active.filter(t=>importedPreset(t,account)).length;return n===active.length&&n?'Procurar Melhorias (Auditoria)':n?'Auditar Presets e Construir Times':'Construir Time (Buscar Runas)';}
export function optimizerPresets(account,area,context='regular'){
 return presetsForArea(account?.accountPresets,area,null,context).filter(p=>p.unitIds.length<=({siege:3,arena:4}[area]||0));
}
export function optimizerAreaTeams(teams,account,area,context='regular'){
 const allowed=new Set(optimizerPresets(account,area,context).map(p=>p.id));
 return teamsForArea(teams,area,null,context).filter(t=>!importedPreset(t,account)||allowed.has(t.sourceDeckId));
}
export function prepareOptimizerTeam(team){
 const sync=optimizerSyncEnabled(team),leaderIndex=Math.max(0,Math.min(team.configs.length-1,Number(team.leaderIndex)||0));
 const fromCalculator=team.origin==='calculator'&&Object.hasOwn(team,'leader');
 const leader=fromCalculator?team.leader:catalogLeader(team.configs[leaderIndex]?.masterId);
 const enemy=team.arenaScenario,enemyLeader=catalogLeader(enemy?.enemyMaster),enemySpeedLeader=enemyLeader?.stat==='spd'&&leaderApplies(enemyLeader,{element:Number(enemy?.enemyMaster)%10},team.gameMode)?enemyLeader.value:0,enemySpeed=Number(enemy?.enemyBase)>0?Math.ceil(Number(enemy.enemyBase)*(1+(enemy.swift?.25:0)+.15+enemySpeedLeader/100)+Number(enemy.enemyRuneSpd||0)):team.enemyCombatSpd;
 return {...team,enemyCombatSpd:enemySpeed,maxedTowers:true,towerSpd:fromCalculator?team.towerSpd??15:15,guildSpd:fromCalculator?team.guildSpd??0:0,leaderSpd:fromCalculator?team.leaderSpd??0:0,leader,leaderIndex,leaderKey:leader?team.configs[leaderIndex]?.key:null,optimizerSpeedSync:sync,autoOpener:team.autoOpener!==false,cloneTiming:sync,order:'off',
  configs:team.configs.map(c=>({...c,lockSpeedSync:sync,...(!sync?{maxTick:0}:{}),rawPower:!sync})),
  arenaScenario:{...team.arenaScenario,enemyTower:15,enemyLeader:enemySpeedLeader}};
}

export function resultForTeams(result,teams){if(!result)return null;const ids=result.teamIds||[...new Set((result.builds||[]).map(b=>b.teamId).filter(Boolean))],allowed=new Set(teams.map(t=>t.id));return ids.length&&ids.every(id=>allowed.has(id))?result:null;}
