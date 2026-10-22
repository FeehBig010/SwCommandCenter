import {teamTurnPreview} from './optimizer.js';
import {combatAttributes,simulateCombat} from './speedTuner.js';
export function normalizeArenaSettings(raw={}){
 const bounds={enemyBase: [0,300,0],enemyRuneSpd:[0,1000,0],enemyTower:[0,100,0],enemyLeader:[0,100,0],enemyMaster:[0,100000,0],healerSpd:[0,2000,0],healerMaster:[0,100000,0],nemesis:[0,3,0],damage:[0,100,0]};const out={};
 for(const [key,[min,max,fallback]] of Object.entries(bounds)){const n=Number(raw[key]??fallback);if(!Number.isFinite(n)||n<min||n>max||['enemyMaster','healerMaster','nemesis'].includes(key)&&!Number.isInteger(n))throw new Error('Cenário Arena inválido.');out[key]=n;}
 return {...out,swift:raw.swift===true,attacker:String(raw.attacker||'').slice(0,100)};
}
export function arenaContest(account,team,options={},raw={}){
 const settings=normalizeArenaSettings(raw),preview=teamTurnPreview(account,team,options);
 if(!preview.complete||!settings.enemyBase)return {complete:false,message:'Informe a SPD base e as runas do booster inimigo e complete sua composição.'};
 const enemy={id:0,master:settings.enemyMaster,element:settings.enemyMaster%10,base:{hp:10000,atk:0,def:0,spd:settings.enemyBase,cr:0,cd:0,res:0,acc:0}};
 const enemyStats={total:{...enemy.base,spd:settings.enemyBase+settings.enemyRuneSpd+(settings.swift?Math.ceil(settings.enemyBase*.25):0)}};
 const combat=combatAttributes(enemy,enemyStats,settings.swift?{3:4}:{},{gameMode:'arena',towerSpd:settings.enemyTower,leaderSpd:settings.enemyLeader});
 const actors=[...preview.actors,{key:'arena-booster',name:'Booster inimigo',enemy:true,master:enemy.master,spd:combat.spd}];
 const race=simulateCombat(actors,{stopAfterFirst:true});
 let antiCut=null;
 if(settings.healerSpd>0){const healer={key:'arena-healer',name:'Curandeiro Nemesis',enemy:true,master:settings.healerMaster,spd:settings.healerSpd,nemesisSets:settings.nemesis};const afterKey=preview.actors.find(a=>a.key===settings.attacker)?.key||preview.actors[0].key;const report=simulateCombat([...actors,healer],{events:[{afterKey,type:'damage',amount:settings.damage,targets:[healer.key],occurrence:1}],stopAfterFirst:true});const healerIndex=report.firstTurns.findIndex(t=>t.key===healer.key);antiCut={cut:healerIndex>=0&&report.firstTurns.some((t,i)=>!t.enemy&&i>healerIndex),turns:report.firstTurns,risks:report.risks};}
 return {complete:true,first:race.firstTurns[0],wins:!race.firstTurns[0]?.enemy,enemyCombatSpd:combat.spd,turns:race.firstTurns,risks:race.risks,antiCut};
}
