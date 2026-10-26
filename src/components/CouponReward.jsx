import {REWARD_ASSETS} from '../lib/coupons.js';
export default function CouponReward({reward}){
 const asset=REWARD_ASSETS[reward?.type];if(!asset)return null;
 return <span className="coupon-reward"><img src={asset.src} alt={asset.label} width="40" height="40" onError={e=>{if(!e.currentTarget.dataset.fallback){e.currentTarget.dataset.fallback='true';e.currentTarget.src='/game-icons/rewards/reward-fallback.svg';}}}/><span><b>{reward.amount.toLocaleString('pt-BR')}</b> {asset.label}</span></span>;
}
