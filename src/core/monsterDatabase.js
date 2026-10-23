import leaders from './leader-skills.json' with {type:'json'};
import metadata from './monster-metadata.json' with {type:'json'};
import openers from './atb-openers.json' with {type:'json'};
// Verified SWARFARM/com2us equivalents: Water Pudding Princess / Water Cookie.
const LEADER_CORRECTIONS={26811:{stat:'atk',value:44,scope:'arena',element:0},26311:{stat:'atk',value:44,scope:'arena',element:0}};

export function monsterLeader(master){const leader=LEADER_CORRECTIONS[Number(master)]||leaders[Number(master)];return leader?{...leader}:null;}
export function monsterOpener(master){const opener=openers.monsters[Number(master)];return opener?{...opener}:null;}
export function monsterRecord(master){const id=Number(master),entry=metadata.monsters[id];return entry?{...entry,master:id,base:{...entry.base},leader:monsterLeader(id),opener:monsterOpener(id)}:null;}
