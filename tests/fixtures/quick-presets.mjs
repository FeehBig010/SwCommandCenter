import {normalizeAccount} from '../../src/core/data.js';
// Fictitious account only. No user JSON, identity or equipment is used in QA.
export function quickPresetAccount(){
 const masters=[15713,18913,19411,21313,20012,18011];
 const units=masters.map((master,index)=>({unit_id:index+1,unit_master_id:master,unit_level:40,class:6,attribute:master%10,con:700+index*20,atk:750+index*11,def:600+index*7,spd:100+index,critical_rate:15,critical_damage:50,resist:15,accuracy:0,
  runes:Array.from({length:6},(_,slot)=>({rune_id:index*6+slot+1,slot_no:slot+1,set_id:slot<4?13:15,class:6,upgrade_curr:15,pri_eff:slot===1?[8,42]:[1,600],sec_eff:slot===1?[]:[[8,4+index*3,0,1]]})),
  artifacts:index===0?[{artifact_id:1000,unit_id:1,type:1,level:15,pri_eff:[100,1000],sec_eff:[[206,12],[202,8]]},null]:[null]}));
 const rtaRunes=Array.from({length:24},(_,index)=>({rune_id:100+index,slot_no:index%6+1,set_id:index%6<4?3:15,class:6,upgrade_curr:15,pri_eff:index%6===1?[8,24]:[1,300],sec_eff:index%6===1?[]:[[8,2,0,0]]}));
 const account=normalizeAccount({wizard_info:{wizard_id:7654321,wizard_name:'Conta fictícia de testes'},unit_list:units,runes:rtaRunes,world_arena_rune_equip_list:Array.from({length:4},(_,index)=>({unit_id:index+1,rune_id_list:Array.from({length:6},(_,slot)=>100+index*6+slot)}))});
 account.towers={glorySpd:10,guildSpd:5};
 account.accountPresets=[
  {id:'qa-siege',gameMode:'siege',name:'Siege de exemplo',mode:'attack',unitIds:[1,2,3],leaderIndex:2},
  {id:'qa-arena',gameMode:'arena',arenaContext:'regular',name:'Arena de exemplo',mode:'defense',unitIds:[1,3,4,2],leaderIndex:0},
  {id:'qa-interserver',gameMode:'arena',arenaContext:'interserver',name:'Interserver de exemplo',mode:'defense',unitIds:[6,5,4,3],leaderIndex:1},
  {id:'qa-rta',gameMode:'rta',name:'RTA de exemplo',unitIds:[2,1,4,3],leaderIndex:0},
  {id:'qa-dragao',gameMode:'cairos',dungeon:'dbah',name:'Dragão com slot vazio',unitIds:[1,null,3,4,6],leaderIndex:2},
  {id:'qa-dimensao',gameMode:'dimensional',dungeon:'sacreon-2a',name:'Sacréon de exemplo',unitIds:[5,4,3,2],leaderIndex:3},
  {id:'qa-predador',gameMode:'dimensional',dungeon:'ellunia-predator',name:'Predador de exemplo',unitIds:[1,2,3,4,5],leaderIndex:0},
  {id:'qa-r5',gameMode:'rift',dungeon:'r5',name:'R5 de exemplo',unitIds:[1,2,3,4,5,6],leaderIndex:1},
  {id:'qa-toa',gameMode:'toa',dungeon:'toah',name:'ToA de exemplo',unitIds:[6,4,2,1,3],leaderIndex:1},
 ];
 return account;
}
