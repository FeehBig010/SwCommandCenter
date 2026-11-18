// Explicit local matches only. Legacy counter feedback is never read here.
const DB='d8stino-siege-v1';
export function siegeBattleJournalKey(accountId){
 if(!['string','number'].includes(typeof accountId)||!String(accountId).trim()||String(accountId).length>160)throw new Error('Selecione uma conta SWEX para registrar partidas.');
 return `siege-battle-journal:v1:${encodeURIComponent(String(accountId))}`;
}
function lineup(members){
 if(!Array.isArray(members)||members.length!==3)throw new Error('A partida precisa dos três monstros de cada time.');
 return members.map(m=>{if(!Number.isSafeInteger(Number(m.masterId))||Number(m.masterId)<10000||typeof m.label!=='string'||!m.label.trim()||m.label.length>80)throw new Error('Composição incompleta.');return {masterId:Number(m.masterId),label:m.label.trim()};});
}
export function cleanSiegeBattle({record,outcome,notes='',id=crypto.randomUUID(),foughtAt=new Date().toISOString()}){
 if(!['win','loss'].includes(outcome))throw new Error('Escolha Vitória ou Derrota.');
 if(typeof notes!=='string'||notes.length>1000)throw new Error('Use até 1.000 caracteres nas observações.');
 if(typeof foughtAt!=='string'||!Number.isFinite(Date.parse(foughtAt))||Date.parse(foughtAt)>Date.now()+60000)throw new Error('Data da partida inválida.');
 if(typeof id!=='string'||!id||id.length>100||typeof record?.key!=='string'||!record.key||record.key.length>250||typeof record.name!=='string'||!record.name.trim()||record.name.length>100)throw new Error('Identificação do ataque inválida.');
 const defenseLeaderIndex=record.counter?.siege?.defenseLeaderIndex??0,offenseLeaderIndex=record.team?.leaderIndex??0;
 if(![defenseLeaderIndex,offenseLeaderIndex].every(i=>Number.isInteger(i)&&i>=0&&i<=2))throw new Error('Líder inválido.');
 return {version:1,id,counterKey:record.key,counterName:record.name.trim(),foughtAt:new Date(foughtAt).toISOString(),outcome,notes:notes.trim(),defense:lineup(record.counter?.enemyDefense),offense:lineup(record.team?.configs),defenseLeaderIndex,offenseLeaderIndex};
}
function storedJournal(value){
 if(value===undefined)return [];
 if(!Array.isArray(value))throw new Error('Formato do histórico não suportado. Os dados salvos foram preservados.');
 return value;
}
function validBattle(row){
 if(!row||row.version!==1||typeof row.id!=='string'||!row.id||typeof row.counterKey!=='string'||typeof row.counterName!=='string'||typeof row.notes!=='string'||row.notes.length>1000||!['win','loss'].includes(row.outcome)||typeof row.foughtAt!=='string'||!Number.isFinite(Date.parse(row.foughtAt)))return false;
 if(![row.defenseLeaderIndex,row.offenseLeaderIndex].every(i=>Number.isInteger(i)&&i>=0&&i<=2))return false;
 try{lineup(row.defense);lineup(row.offense);return true;}catch{return false;}
}
export function siegeBattleContextKey(record){return JSON.stringify([record.key,record.counter?.enemyDefense?.map(m=>m.masterId),record.team?.configs?.map(m=>m.masterId),record.counter?.siege?.defenseLeaderIndex??0,record.team?.leaderIndex??0]);}
export function siegeBattleStats(rows=[]){const wins=rows.filter(r=>validBattle(r)&&r.outcome==='win').length,losses=rows.filter(r=>validBattle(r)&&r.outcome==='loss').length,total=wins+losses;return {wins,losses,total,winRate:total?Math.round(wins/total*100):null};}
export function siegeBattleHistoryForRecord(rows,record){return rows.filter(row=>validBattle(row)&&row.counterKey===record.key);}
export function siegeBattlesForRecord(rows,record){
 const signature=(defense,offense,defenseLeaderIndex,offenseLeaderIndex)=>JSON.stringify([defense?.map(m=>m.masterId),offense?.map(m=>m.masterId),defenseLeaderIndex,offenseLeaderIndex]);
 const current=signature(record.counter?.enemyDefense,record.team?.configs,record.counter?.siege?.defenseLeaderIndex??0,record.team?.leaderIndex??0);
 return rows.filter(row=>validBattle(row)&&row.counterKey===record.key&&signature(row.defense,row.offense,row.defenseLeaderIndex,row.offenseLeaderIndex)===current);
}
function open(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore('data');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function loadSiegeBattles(accountId){const key=siegeBattleJournalKey(accountId),db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('data'),request=tx.objectStore('data').get(key);request.onsuccess=()=>{try{resolve(storedJournal(request.result));}catch(error){reject(error);}};tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error);};});}
// Read and append in one transaction so simultaneous saves cannot overwrite matches.
export async function appendSiegeBattle(accountId,input){const key=siegeBattleJournalKey(accountId),battle=cleanSiegeBattle(input),db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite'),store=tx.objectStore('data'),request=store.get(key);let rows,failure;request.onsuccess=()=>{try{rows=storedJournal(request.result);if(!rows.some(r=>validBattle(r)&&r.id===battle.id)){rows=[...rows,battle];store.put(rows,key);}}catch(error){failure=error;tx.abort();}};tx.oncomplete=()=>{db.close();resolve(rows);};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(failure||tx.error||new Error('Não foi possível salvar a partida.'));};});}
