import {MONSTER_CATALOG} from './monsters.js';
import {portableTeam,cleanMatchup} from './hub.js';
import {blankConfig} from './data.js';
import {catalogLeader} from './leader-catalog.js';
export const GI_MONSTERS=new Map(MONSTER_CATALOG.map(m=>[m.master,m]));
export const GI_CHOICES=MONSTER_CATALOG.map(m=>({...m,value:String(m.master)}));
export function intelligenceTrio(value){
 if(!Array.isArray(value)||value.length!==3)throw new Error('Selecione exatamente três monstros.');
 const ids=value.map(n=>typeof n==='string'&&/^\d+$/.test(n)?Number(n):n);
 if(ids.some(id=>!Number.isSafeInteger(id)||!GI_MONSTERS.has(id))||new Set(ids).size!==3)throw new Error('Use três IDs distintos e válidos do catálogo de monstros.');
 return ids;
}
export function defenseKey(ids,leader=0){ids=intelligenceTrio(ids);if(!Number.isInteger(leader)||leader<0||leader>2)throw new Error('Selecione o líder da composição.');return `${ids[leader]}:${ids.filter((_,i)=>i!==leader).sort((a,b)=>a-b).join(':')}`;}
export const giName=id=>GI_MONSTERS.get(Number(id))?.name||`Monstro ${id}`;
const text=(v,max,label,required=false)=>{if(v==null&&!required)return '';if(typeof v!=='string'||v.length>max||required&&!v.trim())throw new Error(`${label}: informe ${required?'um valor válido de ': 'até '}${max} caracteres.`);return v.trim();};
function sourceUrl(value){const raw=text(value,500,'URL da origem');if(!raw)return null;try{const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password)throw 0;return url.href;}catch{throw new Error('A origem deve usar uma URL HTTPS válida.');}}
export function normalizeDefense(input,{importing=false,now=new Date().toISOString()}={}){
 const monster_ids=intelligenceTrio(input.monster_ids),leader_index=Number(input.leader_index??0);defenseKey(monster_ids,leader_index);
 const category=input.category==null||input.category===''?null:Number(input.category),tier=input.tier||null;
 if(category!==null&&![4,5].includes(category)||tier!==null&&!['G1','G2','G3'].includes(tier))throw new Error('Categoria ou faixa competitiva inválida.');
 const observed=input.observed_at||(!importing?now:null);if(!observed||!Number.isFinite(Date.parse(observed))||Date.parse(observed)>Date.parse(now)+60000)throw new Error('Informe a data real da atualização, sem datas futuras.');
 const origin_kind=importing?(input.origin_kind||'external'):'guild';if(!['guild','external'].includes(origin_kind))throw new Error('Informe se os dados são da guilda ou de uma fonte externa.');
 const source_name=text(input.source_name||(!importing?'Cadastro da guilda':''),120,'Origem',true),authorization=importing?text(input.authorization,500,'Autorização de uso',true):null;
 let popularity=null;if(input.popularity!=null){const p=input.popularity;if(!importing||!Number.isSafeInteger(p.count)||p.count<0||!['picks','defenses','battles'].includes(p.unit)||typeof p.period!=='string'||!p.period.trim()||p.period.length>100)throw new Error('Popularidade exige dados de uma fonte autorizada, unidade e período.');popularity={count:p.count,unit:p.unit,period:p.period.trim()};}
 return {monster_ids,leader_index,category,tier,origin_kind,source_kind:importing?'authorized_import':'guild',source_name,source_url:sourceUrl(input.source_url),observed_at:new Date(observed).toISOString(),authorization,popularity};
}
// Small RFC 4180 reader: quoted commas, escaped quotes, BOM and CRLF are accepted.
function csvRows(raw){
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<raw.length;i++){const c=raw[i];if(quoted){if(c==='"'&&raw[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;closed=true;}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw new Error('CSV inválido: aspas fora de posição.');quoted=true;}else if(c===','||c==='\n'||c==='\r'){row.push(cell);cell='';closed=false;if(c!==','){if(c==='\r'&&raw[i+1]==='\n')i++;if(row.some(v=>v.trim()))rows.push(row);row=[];}}else{if(closed&&!/\s/.test(c))throw new Error('CSV inválido após aspas.');cell+=c;}}
 if(quoted)throw new Error('CSV inválido: aspas não fechadas.');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
export function parseDefenseImport(raw,format,source={}){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>500000)throw new Error('Use um arquivo de até 500 KB.');
 let rows;
 try{if(format==='csv'){const [headers,...values]=csvRows(raw.replace(/^\uFEFF/,''));const required=['monster_1','monster_2','monster_3','observed_at'];if(!headers||new Set(headers).size!==headers.length||required.some(k=>!headers.includes(k)))throw new Error('CSV exige monster_1, monster_2, monster_3 e observed_at.');rows=values.map(r=>{if(r.length!==headers.length)throw new Error('CSV com quantidade de colunas inconsistente.');const v=Object.fromEntries(headers.map((k,i)=>[k.trim(),r[i]]));return {...v,monster_ids:[v.monster_1,v.monster_2,v.monster_3]};});}else{const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data)||data.version!==1||!Array.isArray(data.defenses))throw new Error('JSON exige version: 1 e defenses: [].');rows=data.defenses;}}
 catch(error){throw new Error(error instanceof SyntaxError?'Arquivo JSON inválido. Confira o formato antes de importar.':error.message);}
 if(!rows.length||rows.length>200)throw new Error('Importe entre 1 e 200 defesas por arquivo.');
 const seen=new Set();return rows.map((r,i)=>{try{if(!r||typeof r!=='object')throw new Error('Registro inválido.');const d=normalizeDefense({...r,...source},{importing:true}),key=defenseKey(d.monster_ids,d.leader_index);if(seen.has(key))throw new Error('Defesa duplicada no arquivo (mesmo líder).');seen.add(key);return d;}catch(e){throw new Error(`Linha ${i+1}: ${e.message}`);}});
}
export function offenseFromIds(ids,leaderIndex=0){ids=intelligenceTrio(ids);defenseKey(ids,leaderIndex);return {name:ids.map(giName).join(' · ').slice(0,100),mode:'attack',gameMode:'siege',leaderIndex,leader:catalogLeader(ids[leaderIndex]),configs:ids.map(id=>({...blankConfig(),masterId:id,label:giName(id)}))};}
export function intelligenceCounter(defense,offense,notes='',account=null){
 const portable=portableTeam(offense,account);if(portable.gameMode!=='siege'||portable.configs.length!==3)throw new Error('Vincule uma ofensa de Siege com três monstros.');intelligenceTrio(portable.configs.map(c=>c.masterId));
 return cleanMatchup({name:portable.name,offense:portable,enemyDefense:defense.monster_ids.map(id=>({masterId:id,label:giName(id)})),notes:text(notes,1000,'Estratégia'),outcome:'unrecorded',siege:{defenseLeaderIndex:defense.leader_index,defenseLeader:catalogLeader(defense.monster_ids[defense.leader_index]),requireOrder:false,beforeEnemy:false}});
}
export function intelligencePresets(teams=[],account=null){
 const result=teams.filter(t=>(t.gameMode||'siege')==='siege'&&t.mode==='attack'&&t.configs?.length===3).flatMap(t=>{try{const team=portableTeam({...t,gameMode:'siege'},account);intelligenceTrio(team.configs.map(c=>c.masterId));return [{id:`local:${t.id}`,reference:['local',account?.id||'device',t.id],name:t.name,team}];}catch{return [];}});
 for(const preset of account?.accountPresets||[]){if(preset.gameMode!=='siege'||preset.mode!=='attack'||preset.unitIds?.length!==3)continue;try{const units=preset.unitIds.map(id=>account.units.find(u=>u.id===id));const ids=units.map(u=>u?.master),leader=Number(preset.leaderIndex)||0;const team=offenseFromIds(ids,leader);result.push({id:`swex:${preset.id}`,reference:['swex',account.id,preset.id],name:preset.name,team:{...team,name:preset.name}});}catch{}}
 return result;
}
export function battleStatistics(battles=[]){const wins=battles.filter(b=>b.outcome==='win').length,losses=battles.filter(b=>b.outcome==='loss').length,total=wins+losses;return {wins,losses,total,winRate:total?wins/total*100:null,status:!total?'Não testado':total<5?'Testado · Amostra insuficiente':'Testado'};}
export function filterIntelligenceCounters(rows,{query='',status='all',sort='recent'}={}){
 const q=query.trim().toLocaleLowerCase('pt-BR');return rows.filter(r=>(!q||[r.author_label,r.payload?.notes,...(r.payload?.offense?.configs||[]).map(c=>c.label)].join(' ').toLocaleLowerCase('pt-BR').includes(q))&&(status==='all'||status==='untested'&&!r.total||status==='tested'&&r.total>0||status==='sample'&&r.total>0&&r.total<5)).sort((a,b)=>sort==='winrate'?(b.win_rate??-1)-(a.win_rate??-1)||b.total-a.total:sort==='battles'?b.total-a.total:Date.parse(b.created_at)-Date.parse(a.created_at));
}
