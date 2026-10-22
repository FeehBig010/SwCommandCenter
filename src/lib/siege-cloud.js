import {assertUuid} from './guild-cloud.js';
import {cleanSiegeCounter} from '../core/siege.js';
function check({data,error}){if(error)throw new Error('Não foi possível atualizar os counters. Confira a conexão e a migration de Siege.');return data;}
export async function loadSiegeSocial(client,ids){
 const target_ids=ids.slice(0,500).map(assertUuid);
 const [feedback,favorites]=await Promise.all([target_ids.length?client.rpc('get_siege_feedback',{target_ids}):Promise.resolve({data:[],error:null}),client.from('counter_favorites').select('id,source_counter_id,counter_snapshot,saved_at').order('saved_at',{ascending:false}).limit(500)]);
 return {feedback:check(feedback),favorites:check(favorites).flatMap(row=>{try{return [{id:row.id,key:`cloud:${row.source_counter_id||row.id}`,counter:cleanSiegeCounter(row.counter_snapshot),savedAt:row.saved_at,cloud:true}];}catch{return [];}})};
}
export async function sendSiegeFeedback(client,id,field,value){
 assertUuid(id);if(!['reaction','outcome'].includes(field)||value!==null&&!(field==='reaction'?['free_win','rng','high_runes']:['win','loss']).includes(value))throw new Error('Feedback inválido.');
 check(await client.rpc('set_counter_feedback',{target:id,field,value}));
}
export async function saveSiegeFavorite(client,id){assertUuid(id);return check(await client.rpc('save_counter_favorite',{target:id}));}
export async function deleteSiegeFavorite(client,id){assertUuid(id);check(await client.from('counter_favorites').delete().eq('id',id));}
