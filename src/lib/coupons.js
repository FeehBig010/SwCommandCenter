import {activeCoupons,couponRewards,fetchCouponHistory,couponMonthMatches,COUPON_MAX_AGE} from '../core/game-coupons.js';
import snapshot from '../core/coupon-snapshot.json' with {type:'json'};

export const COUPON_CLOUD_REFRESH=6*60*60*1000;
export const COUPON_COPY_DURATION=2000;
export const REWARD_ASSETS=Object.freeze({
 mana:{label:'Mana',src:'/game-icons/rewards/mana.png'},
 energy:{label:'Energia',src:'/game-icons/rewards/energy.png'},
 crystal:{label:'Cristais',src:'/game-icons/rewards/crystal.png'},
 mystical:{label:'Pergaminhos Místicos',src:'/game-icons/rewards/scroll_mystical.png'},
 wind:{label:'Pergaminhos de Vento',src:'/game-icons/rewards/scroll_wind.png'},
 water:{label:'Pergaminhos de Água',src:'/game-icons/rewards/scroll_water.png'},
 fire:{label:'Pergaminhos de Fogo',src:'/game-icons/rewards/scroll_fire.png'},
 light_dark:{label:'Pergaminhos de Luz e Escuridão',src:'/game-icons/rewards/scroll_light_and_dark.png'},
 legendary:{label:'Pergaminhos Lendários',src:'/game-icons/rewards/scroll_legendary.png'},
});
const validCode=code=>typeof code==='string'&&/^[A-Z0-9]{4,40}$/.test(code);
function rewardsOf(value){
 if(typeof value==='string')return couponRewards(value);
 if(!Array.isArray(value))return [];
 const seen=new Set();return value.slice(0,20).flatMap(row=>{
  const type=String(row?.type||''),amount=Number(row?.amount);
  if(!REWARD_ASSETS[type]||seen.has(type)||!Number.isSafeInteger(amount)||amount<1||amount>1000000000)return [];
  seen.add(type);return [{type,amount,label:REWARD_ASSETS[type].label}];
 });
}
export function normalizeCouponRows(rows,now=Date.now()){
 if(!Array.isArray(rows))return [];
 const seen=new Set();return rows.slice(0,100).flatMap(row=>{
  const code=String(row?.code||'').toUpperCase(),checked=Date.parse(row?.checked_at),expires=row?.expires_at==null?null:Date.parse(row.expires_at);
  if(!validCode(code)||seen.has(code)||row.status!=='active'||!Number.isFinite(checked)||checked>now+300000||expires!==null&&(!Number.isFinite(expires)||expires<=now)||expires===null&&(now-checked>COUPON_MAX_AGE||row.source==='community'&&!couponMonthMatches(code,now)))return [];
  seen.add(code);return [{code,checkedAt:new Date(checked).toISOString(),expiresAt:expires===null?null:new Date(expires).toISOString(),rewards:rewardsOf(row.rewards),origin:row.source==='community'?'community':'supabase'}];
 });
}
export function visibleCoupons(coupons,now=Date.now()){
 return normalizeCouponRows((coupons||[]).map(c=>({code:c.code,checked_at:c.checkedAt,expires_at:c.expiresAt,status:'active',rewards:c.rewards,source:c.origin})),now);
}
function communityCoupons(history,now){
 const byCode=new Map(Object.entries(history||{}).map(([key,row])=>[String(row?.code||key).toUpperCase(),row]));
 return activeCoupons(history,now).map(c=>({...c,expiresAt:byCode.get(c.code)?.expires_at||null,origin:'community'}));
}
const abortError=()=>new DOMException('Consulta cancelada.','AbortError');
function requestSignal(parent,timeout){
 const controller=new AbortController(),abort=()=>controller.abort();parent?.addEventListener('abort',abort,{once:true});if(parent?.aborted)abort();
 const timer=setTimeout(abort,timeout);return {signal:controller.signal,close(){clearTimeout(timer);parent?.removeEventListener('abort',abort);}};
}

// Only public reads run in the browser. Syncing the shared table is a trusted
// backend/admin operation; failure/missing migrations never block the portal.
export async function fetchActiveCoupons({client=null,fetcher=globalThis.fetch,signal,now=Date.now(),localSnapshot=snapshot}={}){
 if(signal?.aborted)throw abortError();
 let cloud=[];
 if(client){
  const request=requestSignal(signal,3500);
  try{
   let query=client.from('coupons').select('code,rewards,expires_at,checked_at,status,source').eq('status','active').or(`expires_at.is.null,expires_at.gt.${new Date(now).toISOString()}`).order('checked_at',{ascending:false}).limit(100);
   if(query.abortSignal)query=query.abortSignal(request.signal);
   const {data,error}=await query;if(!error)cloud=normalizeCouponRows(data,now);
  }catch{/* Community fallback covers unavailable or unconfigured tables. */}finally{request.close();}
  if(signal?.aborted)throw abortError();
  if(cloud.length&&cloud.every(c=>now-Date.parse(c.checkedAt)<=COUPON_CLOUD_REFRESH))return {coupons:cloud,source:'supabase',stale:false};
 }
 const request=requestSignal(signal,6500);
 try{
  const history=await fetchCouponHistory({fetcher,signal:request.signal});if(signal?.aborted)throw abortError();
  const recent=communityCoupons(history,now),merged=new Map(recent.map(c=>[c.code,c]));
  for(const coupon of cloud){
   if(coupon.origin==='community'&&history[coupon.code]?.status==='expired')continue;
   const current=merged.get(coupon.code);merged.set(coupon.code,current?{...current,...coupon,checkedAt:current.checkedAt>coupon.checkedAt?current.checkedAt:coupon.checkedAt}:coupon);
  }
  return {coupons:[...merged.values()].slice(0,12),source:cloud.length?'mixed':'community',stale:false};
 }catch(error){
  if(signal?.aborted)throw abortError();
  if(cloud.length)return {coupons:cloud,source:'supabase',stale:true};
  const cached=communityCoupons(localSnapshot,now);if(cached.length)return {coupons:cached,source:'snapshot',stale:true};
  throw new Error('Não foi possível consultar os cupons agora.',{cause:error});
 }finally{request.close();}
}

export async function copyCouponCode(code,{clipboard=globalThis.navigator?.clipboard}={}){
 if(!validCode(code)||typeof clipboard?.writeText!=='function')throw new Error('Selecione o código para copiar.');
 await clipboard.writeText(code);
}
export function couponRedeemUrl(code){return validCode(code)?`https://withhive.me/313/${encodeURIComponent(code)}`:'https://withhive.com/';}
