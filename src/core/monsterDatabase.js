import leaders from './leader-skills.json' with {type:'json'};
import metadata from './monster-metadata.json' with {type:'json'};
// Verified SWARFARM/com2us equivalents: Water Pudding Princess / Water Cookie.
const LEADER_CORRECTIONS={26811:{stat:'atk',value:44,scope:'arena',element:0},26311:{stat:'atk',value:44,scope:'arena',element:0}};
const OPENERS={11513:{skill:'Tailwind',slot:3,boost:30,type:'boost',speedBuff:true},11533:{skill:'Tailwind',slot:3,boost:30,type:'boost',speedBuff:true},15911:{skill:'Spell of Strengthening',slot:3,boost:20,type:'boost'},15931:{skill:'Spell of Strengthening',slot:3,boost:20,type:'boost'},10514:{skill:'Rapid Advance',slot:3,boost:30,type:'boost'},18913:{skill:'Wind of Changes',slot:3,boost:30,type:'tiana',sourceSkillId:9713}};
export function monsterLeader(master){const leader=LEADER_CORRECTIONS[Number(master)]||leaders[Number(master)];return leader?{...leader}:null;}
export function monsterOpener(master){const opener=OPENERS[Number(master)];return opener?{...opener}:null;}
export function monsterRecord(master){const id=Number(master),entry=metadata.monsters[id];return entry?{...entry,master:id,base:{...entry.base},leader:monsterLeader(id),opener:monsterOpener(id)}:null;}
