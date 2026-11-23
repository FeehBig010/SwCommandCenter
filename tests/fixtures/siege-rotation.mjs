import {blankConfig} from '../../src/core/data.js';
import {monsterRecord} from '../../src/core/monsterDatabase.js';

export function fixture(){
 const runes=[],artifacts=[];
 const units=[26311,18311,29311].map((master,i)=>{
  const id=i+1,runeIds=[],artifactId=100+i;
  for(let slot=1;slot<=6;slot++){
   const runeId=i*6+slot;runeIds.push(runeId);
   runes.push({id:runeId,slot,set:1,owner:id,main:slot===2?[8,[162,80,73][i]]:[1,100],innate:[],subs:[],level:15,stars:6});
  }
  artifacts.push({id:artifactId,owner:id,main:[100,0],subs:[]});
  return {...monsterRecord(master),id,element:1,runeIds,artifactIds:[artifactId],skillLevels:[{slot:i===0?3:2,level:i===0?2:5}]};
 });
 const configs=units.map((unit,i)=>({...blankConfig(unit),key:'AMR'[i],enabled:true,sets:[]}));
 return {account:{id:'fixture',units,runes,artifacts},team:{id:'test',name:'Trio',gameMode:'siege',configs,leaderKey:'M',towerSpd:15},target:{spd:230,def:1000,element:1,hp:7000,defenseBuff:true,ignorePercent:50}};
}
