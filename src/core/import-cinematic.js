export const SUMMONING_DURATION=20000;
export const SUMMONING_MESSAGES=[
 'Descriptografando pacotes de dados do SWEX...',
 'Mapeando inventário de runas e artefatos...',
 'Importando presets de Siege, Arena e Masmorras...',
 'Sincronizando torres de glória e estatísticas...',
 'Preparando a Central de Comando... Pronto!',
];
export const SUMMONING_STAGES=[0,5000,9000,13000,17000];
export function summoningFrame(elapsed){
 const time=Math.max(0,Math.min(SUMMONING_DURATION,elapsed));
 const stage=SUMMONING_STAGES.findLastIndex(start=>time>=start);
 return {percent:Math.min(100,Math.floor(time/SUMMONING_DURATION*100)),message:SUMMONING_MESSAGES[stage]};
}
// A visual clock independent of parsing. Deadlines avoid cumulative timer drift;
// the caller waits for both this promise and real inventory hydration.
export function startSummoning({onFrame,signal,now=()=>performance.now(),schedule=setTimeout,unschedule=clearTimeout}={}){
 const started=now();let timer,settled=false,resolve,reject;
 const completed=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
 // Parsing can fail before the caller awaits the clock. Keep aborts handled.
 completed.catch(()=>{});
 function cleanup(){unschedule(timer);signal?.removeEventListener('abort',cancel);}
 function cancel(){if(settled)return;settled=true;cleanup();reject(new DOMException('Importação cancelada.','AbortError'));}
 function tick(){
  if(settled)return;const elapsed=now()-started;onFrame?.(summoningFrame(elapsed));
  if(elapsed>=SUMMONING_DURATION){settled=true;cleanup();resolve();return;}
  timer=schedule(tick,Math.min(100,SUMMONING_DURATION-elapsed));
 }
 signal?.addEventListener('abort',cancel,{once:true});
 if(signal?.aborted)cancel();else tick();
 return {completed,cancel};
}
