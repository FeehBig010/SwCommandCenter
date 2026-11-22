import {isArenaContext} from './arena-context.js';
import {isPve} from './pve.js';

/**
 * Projeção de leitura dos presets SWEX para os módulos da interface.
 * Mantém referências/ordem e nunca persiste ou altera os presets importados.
 */
export function buildAccountDeckLists(hydratedPresets=[]){
 return {
  arenaPresetsByContext:Object.fromEntries(['regular','interserver'].map(context=>[context,hydratedPresets.filter(p=>isArenaContext(p,context))])),
  presetsByArea:Object.fromEntries(['siege','arena','rta','cairos','dimensional','rift','toa'].map(area=>[area,hydratedPresets.filter(p=>p.gameMode===area)])),
  arenaPresets:hydratedPresets.filter(p=>['arena','rta'].includes(p.gameMode)),
  deck_list:hydratedPresets.filter(p=>!['siege','arena','rta'].includes(p.gameMode)),
  defense_deck_list:hydratedPresets.filter(p=>['siege','arena'].includes(p.gameMode)),
  world_arena_deck_list:hydratedPresets.filter(p=>p.gameMode==='rta'),
  pveDecksByDungeon:hydratedPresets.filter(p=>isPve(p.gameMode)).reduce((groups,p)=>{(groups[p.dungeon||'pve-other']??=[]).push(p);return groups;},{}),
  deck_recent_list:hydratedPresets.filter(p=>p.sourceKey==='deck_recent_list'),
  party_deck:hydratedPresets.filter(p=>p.sourceKey==='party_deck'),
  dungeon_deck:hydratedPresets.filter(p=>p.sourceKey==='dungeon_deck')
 };
}
