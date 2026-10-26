import {useEffect,useState} from 'react';
import {ONBOARDING_KEY,ONBOARDING_PENDING_KEY,readFlag,writeFlag,readOnboarding,finishOnboarding} from '../core/onboarding';
import {supabase} from '../lib/supabase';
const steps=[['Sua conta está pronta','O SWEX foi importado. A Dashboard reúne as métricas e oportunidades da sua conta.'],['Abra sua área de combate','Use os ícones laterais para abrir Siege, Arena ou as masmorras com seus presets.'],['Revise e prepare seu time','Selecione um time para conferir seus atributos e Ticks. Os ícones (i) guardam as regras técnicas.']];
export default function OnboardingTour({session,eligible=false}){
 const [done,setDone]=useState(()=>readFlag(ONBOARDING_KEY)),[index,setIndex]=useState(0),[checked,setChecked]=useState(!session);
 useEffect(()=>{let live=true;setChecked(!session);async function sync(){try{const remote=await readOnboarding(supabase,session.user.id);if(remote){writeFlag(ONBOARDING_KEY);if(live)setDone(true);}else if(readFlag(ONBOARDING_KEY))await finishOnboarding(supabase);}catch{}finally{if(live)setChecked(true);}}if(session)sync();const close=()=>setDone(true);window.addEventListener('onboarding-completed',close);const focus=()=>{if(session)sync();};window.addEventListener('focus',focus);return()=>{live=false;window.removeEventListener('onboarding-completed',close);window.removeEventListener('focus',focus);};},[session?.user.id]);
 function finish(){writeFlag(ONBOARDING_KEY);writeFlag(ONBOARDING_PENDING_KEY,false);setDone(true);if(session)finishOnboarding(supabase).catch(()=>{});}
 if(done||!eligible||!checked)return null;
 return <aside className="onboarding-tour" role="dialog" aria-modal="false" aria-labelledby="tour-title"><button className="tour-close" type="button" aria-label="Fechar ou pular tour" onClick={finish}>×</button><span>{index+1} / {steps.length}</span><h2 id="tour-title">{steps[index][0]}</h2><p>{steps[index][1]}</p><button className="button primary small" type="button" onClick={()=>index===steps.length-1?finish():setIndex(index+1)}>{index===steps.length-1?'Concluir':'Próximo'}</button></aside>;
}
