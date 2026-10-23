import {STATS} from './data.js';
import {calculateStats,artifactBonus} from './optimizer.js';
import {currentRuneIds} from './loadouts.js';
import {orderRuneSets} from './rune-sets.js';
// Saved targets remain authoritative. Empty controls receive the selected
// loadout's actual values, in the same total/bonus basis used by the form.
export function autoFillTeam(team,account,options={},builds=[]){
 if(!account)return team;
 return {...team,configs:team.configs.map(c=>{
  const unit=account.units.find(u=>u.id===c.unitId);if(!unit)return {...c,sets:orderRuneSets(c.sets)};
  const build=builds?.find(b=>b.key===c.key&&b.unitId===unit.id&&(!b.teamId||b.teamId===team.id));
  const ids=build?.runeIds??currentRuneIds(account,team,c,unit)??[],runes=ids.map(id=>account.runes.find(r=>r.id===id));
  if(runes.some(r=>!r))return c;
  const stats=build?.stats||calculateStats(unit,runes,options.artifacts!==false&&c.artifacts!==false?artifactBonus(account,unit):{});
  const autoFilledGoals={};
  const goals=Object.fromEntries(STATS.map(key=>{const old=c.goals?.[key],generated=c.autoFilledGoals?.[key];if(old!==''&&old!=null&&(generated==null||String(old)!==String(generated)))return [key,old];const value=stats[c.basis==='total'||['cr','cd','res','acc'].includes(key)?'total':'bonus'][key];autoFilledGoals[key]=value;return [key,value];}));
  return {...c,sets:orderRuneSets(c.sets),goals,autoFilledGoals};
 })};
}
