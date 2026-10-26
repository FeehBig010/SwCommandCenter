import {makeTeam,blankConfig} from '../../src/core/data.js';
export function fixture(){
 const account={version:1,id:'test',importedAt:'2026-10-26T12:00:00Z',name:'Conta de teste',units:[],runes:[],artifacts:[],accountPresets:[]};
 for(const [i,speed]of [316,305,294].entries()){
  const u={id:i+1,master:[13413,13911,19614][i],name:['Lushen','Julie','Iris'][i],level:40,element:3,base:{hp:10000,atk:800,def:600,spd:100,cr:15,cd:50,res:15,acc:0},runeIds:[],artifactIds:[]};account.units.push(u);let extra=speed-142,left=5;
  for(let slot=1;slot<=6;slot++){
   const spd=slot===2?0:Math.ceil(extra/left);if(slot!==2){extra-=spd;left--;}
   const main={1:[3,160],2:[8,42],3:[5,160],4:[2,63],5:[1,2448],6:[4,63]}[slot],id=i*6+slot;
   account.runes.push({id,slot,owner:u.id,set:slot<=4?13:15,stars:6,level:15,main,innate:[],subs:slot===2?[[2,8,0,0],[6,8,0,0],[9,6,0,0],[10,7,0,0]]:[[8,spd,0,0],[2,8,0,0],[6,8,0,0],[10,7,0,0]]});u.runeIds.push(id);
  }
 }
 const team={...makeTeam('siege'),id:'attack',name:'Ataque teste',mode:'attack',autoOpener:false,towerSpd:0,guildSpd:0,leaderSpd:0,configs:account.units.map(u=>({...blankConfig(u),sets:[13,15],strictSets:false,goals:{hp:999999,atk:999999,def:999999,spd:999,cr:100,cd:300,res:100,acc:100}}))};
 return {account,team};
}
export function freeFrom(account,id,{spd=0,hp=0,cd=0,newId=101,set}={}){const rune=structuredClone(account.runes.find(r=>r.id===id));rune.id=newId;rune.owner=0;if(set)rune.set=set;for(const sub of rune.subs){if(sub[0]===8)sub[1]+=spd;if(sub[0]===2)sub[1]+=hp;if(sub[0]===10)sub[1]+=cd;}account.runes.push(rune);return rune;}
