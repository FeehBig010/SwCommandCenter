// Arena shares combat rules, but its inventories of teams and results are separate.
export const ARENA_CONTEXTS={regular:'Arena Regular',interserver:'Arena Interserver'};
const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const inter=/inter[ _/-]?server|server[ _/-]arena|servidor\s*x\s*servidor/;
export const ARENA_CONTEXT_FIELDS=['arenaContext','arena_context','is_interserver','is_inter_server'];
export function arenaContextOf(record={},path=''){
 record=record||{};
 // Native namespaces are authoritative, including legacy cached source IDs.
 const source=fold([path,record.sourcePath,record.sourceKey,record.sourceDeckId,record.id].join(' '));
 if(inter.test(source))return 'interserver';
 const explicit=record.arenaContext??record.arena_context;
 if(explicit!=null)return Object.hasOwn(ARENA_CONTEXTS,explicit)?explicit:'unknown';
 const flag=record.is_interserver??record.is_inter_server;
 if(flag!=null)return [true,1,'1'].includes(flag)?'interserver':[false,0,'0'].includes(flag)?'regular':'unknown';
 const mode=fold([record.area,record.game_mode,record.mode,record.content_name].join(' '));
 return inter.test(mode)?'interserver':'regular';
}
// Legacy shared rows without a source or explicit mode are ambiguous.
export function hasArenaContext(record={}){return ARENA_CONTEXT_FIELDS.some(k=>Object.hasOwn(record,k))||['sourceKey','sourcePath','sourceDeckId'].some(k=>!!record[k])||arenaContextOf(record)==='interserver';}
export function isArenaContext(team,context){return Object.hasOwn(ARENA_CONTEXTS,context)&&team?.gameMode==='arena'&&arenaContextOf(team)===context;}
export function arenaMatchups(records,context){return (records||[]).filter(m=>m&&hasArenaContext(m.offense||{})&&isArenaContext(m.offense,context)&&m.enemyDefense?.length===4&&(!Object.hasOwn(m,'arenaContext')||m.arenaContext===context));}
export function arenaCloudRows(rows,context){return (rows||[]).filter(r=>r&&(r.kind==='counter'?arenaMatchups([r.payload],context).length:hasArenaContext(r.payload?.team||{})&&isArenaContext(r.payload?.team,context)));}
