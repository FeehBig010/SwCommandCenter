import {isArenaContext} from './arena-context.js';
import {isPve} from './pve.js';

const TEAM_AREAS=['siege','arena','rta','cairos','dimensional','rift','toa'];
const ARENA_CONTEXTS=['regular','interserver'];

/**
 * Projeção somente-leitura dos presets SWEX hidratados para a interface.
 *
 * Não modifica nem copia os presets: as listas preservam a ordem e as
 * referências originais, como ocorria no componente App.
 */
export function buildAccountDeckLists(hydratedPresets=[]){
 const presets=hydratedPresets;
 return {
  arenaPresetsByContext:Object.fromEntries(
   ARENA_CONTEXTS.map(context=>[
    context,
    presets.filter(p=>isArenaContext(p,context))
   ])
  ),
  presetsByArea:Object.fromEntries(
   TEAM_AREAS.map(area=>[
    area,
    presets.filter(p=>p.gameMode===area)
   ])
  ),
  arenaPresets:presets.filter(p=>['arena','rta'].includes(p.gameMode)),
  deck_list:presets.filter(p=>!['siege','arena','rta'].includes(p.gameMode)),
  defense_deck_list:presets.filter(p=>['siege','arena'].includes(p.gameMode)),
  world_arena_deck_list:presets.filter(p=>p.gameMode==='rta'),
  pveDecksByDungeon:presets
   .filter(p=>isPve(p.gameMode))
   .reduce((groups,p)=>{
    (groups[p.dungeon||'pve-other']??=[]).push(p);
    return groups;
   },{}),
  deck_recent_list:presets.filter(p=>p.sourceKey==='deck_recent_list'),
  party_deck:presets.filter(p=>p.sourceKey==='party_deck'),
  dungeon_deck:presets.filter(p=>p.sourceKey==='dungeon_deck')
 };
}
