import {normalizeAccount} from './data.js';
export function createDemoAccount(){
 const masters=[18913,16512,16012,19211,18011,13811];
 const raw={wizard_info:{wizard_id:'demo',wizard_name:'Conta Demo'},unit_list:masters.map((master,i)=>({unit_id:i+1,unit_master_id:master,unit_level:40,class:6,attribute:master%10,con:700,atk:750,def:650,spd:100,critical_rate:15,critical_damage:50,resist:15,accuracy:0,runes:Array.from({length:6},(_,slot)=>({rune_id:i*6+slot+1,slot_no:slot+1,set_id:slot<4?13:15,class:6,upgrade_curr:15,pri_eff:slot===1?[8,42]:[2,20],prefix_eff:[],sec_eff:[[8,12,0,3],[2,8,0,0],[4,8,0,0]]}))})),runes:[],defense_deck_list:[{monster_ids:[1,2,3]}],deck_list:[{dungeon_name:'DBAH',monster_ids:[1,2,3,4,5]}]};
 return {...normalizeAccount(raw),isDemo:true};
}
