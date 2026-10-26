export const COUPON_SOURCE='https://raw.githubusercontent.com/yunamystcodes/yunamystcodes/main/data/code_history.json';
export const COUPON_SOURCE_PAGE='https://github.com/yunamystcodes/yunamystcodes';
export const COUPON_REDEEM_URL='https://withhive.com/';
export const COUPON_EVENTS_URL='https://www.withhive.com/event/game/313?lang=pt';
export const COUPON_MAX_AGE=72*60*60*1000;
const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
export function couponMonthMatches(code,now=Date.now()){
 const monthly=code.match(/^([A-Z]{3})SW(20\d{2})/),month=monthly?MONTHS.indexOf(monthly[1]):-1;if(month<0)return true;
 const calendar=new Intl.DateTimeFormat('en',{month:'numeric',year:'numeric',timeZone:'America/Sao_Paulo'}).formatToParts(now);
 return month===Number(calendar.find(p=>p.type==='month').value)-1&&Number(monthly[2])===Number(calendar.find(p=>p.type==='year').value);
}
const TYPES=[
 ['wind','Pergaminhos de Vento','(?:wind scrolls?|scrolls? wind)'],
 ['water','Pergaminhos de Água','(?:water scrolls?|scrolls? water)'],
 ['fire','Pergaminhos de Fogo','(?:fire scrolls?|scrolls? fire)'],
 ['mystical','Pergaminhos Místicos','(?:mystical scrolls?|scrolls? mystical)'],
 ['light_dark','Pergaminhos de Luz e Escuridão','(?:light (?:and|&) dark(?:ness)? scrolls?|scrolls? light (?:and|&) dark(?:ness)?)'],
 ['legendary','Pergaminhos Lendários','(?:legendary scrolls?|scrolls? legendary)'],
 ['mana','Mana','mana(?: stones?)?'],['energy','Energia','(?:energy|energia)'],['crystal','Cristais','(?:crystals?|cristais)'],
];
export function couponRewards(text){
 const source=String(text||'').split('|')[0].slice(0,400),rewards=[];
 for(const [type,label,pattern] of TYPES){
  const after=source.match(new RegExp(`\\b${pattern}\\s*[×x+]\\s*(\\d+(?:[,.]\\d+)*)`,'i'));
  const before=source.match(new RegExp(`(\\d+(?:[,.]\\d+)*)\\s*[×x]?\\s*${pattern}\\b`,'i'));
  const raw=after?.[1]||before?.[1]||'',amount=/^(?:\d+|\d{1,3}(?:[,.]\d{3})+)$/.test(raw)?Number(raw.replace(/[,.]/g,'')):0;
  if(Number.isSafeInteger(amount)&&amount>0&&amount<=1000000000)rewards.push({type,label,amount});
 }
 return rewards;
}
export function activeCoupons(history,now=Date.now()){
 if(!history||typeof history!=='object'||Array.isArray(history)||!Number.isFinite(now))return [];
 const items=[];
 for(const [key,row] of Object.entries(history).slice(0,2000)){
  if(!row||row.status!=='active'||Number(row.missing_runs||0)>0)continue;
  const code=String(row.code||key).toUpperCase(),seen=Date.parse(row.last_seen);
  if(!/^[A-Z0-9]{4,40}$/.test(code)||!Number.isFinite(seen)||seen>now+300000||now-seen>COUPON_MAX_AGE)continue;
  if(!Array.isArray(row.sources)||!row.sources.some(s=>['SWGT','SWQuery'].includes(s)))continue;
  if(!couponMonthMatches(code,now))continue;
  if(row.expires_at&&(!Number.isFinite(Date.parse(row.expires_at))||Date.parse(row.expires_at)<=now))continue;
  if(items.some(item=>item.code===code))continue;
  items.push({code,checkedAt:new Date(seen).toISOString(),rewards:couponRewards(row.reward)});
 }
 return items.sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt)).slice(0,12);
}
export async function fetchCouponHistory({fetcher=globalThis.fetch,signal}={}){
 const response=await fetcher(COUPON_SOURCE,{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal});
 if(!response.ok)throw new Error('Não foi possível consultar os cupons.');
 const text=await response.text();if(text.length>1000000)throw new Error('Lista de cupons inválida.');
 const history=JSON.parse(text);
 if(!history||typeof history!=='object'||Array.isArray(history)||!Object.values(history).some(row=>row&&['active','expired'].includes(row.status)))throw new Error('Lista de cupons inválida.');
 return history;
}
