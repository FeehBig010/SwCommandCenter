import leaders from './leader-skills.json' with {type:'json'};
import {normalizeLeader} from './leaders.js';
export function catalogLeader(master){return leaders[Number(master)]?{...leaders[Number(master)]}:null;}
export function leaderForTeam(team){
 if(Object.hasOwn(team,'leader'))return normalizeLeader(team.leader);
 if(Number(team.leaderSpd)>0)return {stat:'spd',value:Number(team.leaderSpd),scope:'general',element:0};
 return catalogLeader(team.configs[team.leaderIndex||0]?.masterId);
}
