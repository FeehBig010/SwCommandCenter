import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';

const NAV_GROUPS='.sidebar nav,[role="tablist"],.segmented,.optimizer-area-tabs';
const ACTIVE_ITEMS=['button[aria-current="page"]','[role="tab"][aria-selected="true"]','button[aria-current="location"]','button[aria-pressed="true"],button.active'];
function selectedItem(group){for(const selector of ACTIVE_ITEMS){const item=group.querySelector(selector);if(item)return item;}return null;}
const SURFACES='.portal-glass,.portal-coupons,.summary-monster-card,.monster-editor,.command-area,.command-metric,.command-insight,.command-war,.game-news-card,.gi-counter-card,.siege-master-card,.siege-goal-card,.rune-detail,.saved-item,.team-panel,.cairos-panel,.guild-center-links>.button';
const FLOATING='dialog,[role="dialog"],.quick-settings-popover,.quick-header-popover,.combobox-popover,[inert]';

function NavigationLight({group}){
 const marker=useRef(null);
 useLayoutEffect(()=>{
  let frame=0,disposed=false;
  function measure(){
   frame=0;if(disposed||!group.isConnected||!marker.current)return;
   const active=selectedItem(group),bounds=group.getBoundingClientRect();
   if(!active||!bounds.width||!bounds.height){delete group.dataset.motionNav;return;}
   const rect=active.getBoundingClientRect(),light=marker.current;
   light.style.setProperty('--nav-x',`${rect.left-bounds.left+group.scrollLeft-group.clientLeft}px`);
   light.style.setProperty('--nav-y',`${rect.top-bounds.top+group.scrollTop-group.clientTop}px`);
   light.style.setProperty('--nav-width',`${rect.width}px`);
   light.style.setProperty('--nav-height',`${rect.height}px`);
   group.dataset.motionNav='ready';
  }
  const schedule=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(measure);};
  const changes=new MutationObserver(schedule);changes.observe(group,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-selected','aria-current','aria-pressed','class']});
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;resize?.observe(group);
  window.addEventListener('resize',schedule,{passive:true});
  group.addEventListener('scroll',schedule,{passive:true});measure();
  return()=>{disposed=true;cancelAnimationFrame(frame);changes.disconnect();resize?.disconnect();window.removeEventListener('resize',schedule);group.removeEventListener('scroll',schedule);delete group.dataset.motionNav;};
 },[group]);
 return createPortal(<span ref={marker} className="motion-navigation-light" aria-hidden="true" data-export-ignore data-html2canvas-ignore="true"/>,group);
}

// Decorative only: no action handlers, account state or navigation are replaced.
export default function AppMotion(){
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)').matches),[groups,setGroups]=useState([]),[ripples,setRipples]=useState([]);
 const light=useRef(null),nextId=useRef(0),groupIds=useRef(new WeakMap()),nextGroupId=useRef(0);
 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)'),change=()=>setReduced(preference.matches);
  preference.addEventListener('change',change);change();return()=>preference.removeEventListener('change',change);
 },[]);
 useEffect(()=>{
  if(reduced){setGroups([]);setRipples([]);return;}
  const host=document.getElementById('root'),pointer=window.matchMedia('(hover: hover) and (pointer: fine)');
  let app,main,frame=0,discoverFrame=0,lastPointer,surface;
  const hideLight=()=>{lastPointer=undefined;if(light.current)light.current.dataset.visible='false';surface=null;};
  function discover(){
   discoverFrame=0;const next=host.querySelector('.app-shell');
   if(app!==next){appChanges.disconnect();app=next;if(app)appChanges.observe(app,{childList:true});}
   const nextMain=app?.querySelector('main');
   if(main!==nextMain){mainChanges.disconnect();main=nextMain;if(main)mainChanges.observe(main,{childList:true});}
   const found=app?[...app.querySelectorAll(NAV_GROUPS)]:[];
   for(const node of found)if(!groupIds.current.has(node))groupIds.current.set(node,++nextGroupId.current);
   setGroups(previous=>previous.length===found.length&&previous.every((node,i)=>node===found[i])?previous:found);
  }
  const scheduleDiscovery=()=>{if(!discoverFrame)discoverFrame=requestAnimationFrame(discover);};
  const rootChanges=new MutationObserver(scheduleDiscovery),appChanges=new MutationObserver(scheduleDiscovery),mainChanges=new MutationObserver(scheduleDiscovery);
  rootChanges.observe(host,{childList:true});discover();
  function paint(){
   frame=0;const event=lastPointer,target=event?.target;
   if(!pointer.matches||document.hidden||!(target instanceof Element)||target.closest(FLOATING)){hideLight();return;}
   const card=target.closest(SURFACES),element=light.current;
   if(!card||!element||!card.closest('.app-shell')){hideLight();return;}
   const bounds=card.getBoundingClientRect();
   if(surface!==card){element.style.borderRadius=getComputedStyle(card).borderRadius;surface=card;}
   element.style.setProperty('--surface-x',`${bounds.left}px`);element.style.setProperty('--surface-y',`${bounds.top}px`);
   element.style.setProperty('--surface-width',`${bounds.width}px`);element.style.setProperty('--surface-height',`${bounds.height}px`);
   element.style.setProperty('--cursor-x',`${event.clientX-bounds.left}px`);element.style.setProperty('--cursor-y',`${event.clientY-bounds.top}px`);
   element.dataset.visible='true';
  }
  function move(event){if(!pointer.matches)return;lastPointer=event;if(!frame)frame=requestAnimationFrame(paint);}
  function click(event){
   const target=event.target instanceof Element?event.target.closest('button,a.button,summary'):null;
   if(!target?.closest('.app-shell')||target.matches(':disabled,[aria-disabled="true"]')||target.closest('[inert],[data-motion-skip]'))return;
   hideLight();scheduleDiscovery();
   const bounds=target.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
   const item={id:++nextId.current,left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height,radius:getComputedStyle(target).borderRadius,x:event.detail?event.clientX-bounds.left:bounds.width/2,y:event.detail?event.clientY-bounds.top:bounds.height/2};
   setRipples(previous=>[...previous.slice(-3),item]);
  }
  const leave=event=>{if(!event.relatedTarget)hideLight();};
  const visibility=()=>{if(document.hidden){hideLight();setRipples([]);}};
  document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerout',leave,{passive:true});document.addEventListener('click',click,true);
  document.addEventListener('scroll',hideLight,{capture:true,passive:true});document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',hideLight,{passive:true});pointer.addEventListener('change',hideLight);
  return()=>{
   cancelAnimationFrame(frame);cancelAnimationFrame(discoverFrame);rootChanges.disconnect();appChanges.disconnect();mainChanges.disconnect();hideLight();
   document.removeEventListener('pointermove',move);document.removeEventListener('pointerout',leave);document.removeEventListener('click',click,true);
   document.removeEventListener('scroll',hideLight,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',hideLight);pointer.removeEventListener('change',hideLight);
  };
 },[reduced]);
 if(reduced)return null;
 return <>{groups.map(group=><NavigationLight key={groupIds.current.get(group)} group={group}/>)}{createPortal(<div className="app-motion-layer" aria-hidden="true" data-export-ignore data-html2canvas-ignore="true"><div ref={light} className="app-motion-spotlight" data-visible="false"/>{ripples.map(r=><span key={r.id} className="motion-ripple-clip" style={{left:r.left,top:r.top,width:r.width,height:r.height,borderRadius:r.radius}}><i style={{left:r.x,top:r.y,'--ripple-size':`${Math.max(r.width,r.height)*2}px`}} onAnimationEnd={()=>setRipples(items=>items.filter(item=>item.id!==r.id))}/></span>)}</div>,document.body)}</>;
}
