import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';

export default function InfoTooltip({label,children}){
 const id=useId(),[open,setOpen]=useState(false);
 const interaction=useRef({hovered:false,focused:false,pointerDown:false});
 const tooltip=useRef(null);
 useLayoutEffect(()=>{
  if(!open)return;
  const viewport=window.visualViewport;
  const fit=()=>{
   const element=tooltip.current;
   element.style.transform='none';
   const bounds=element.getBoundingClientRect();
   const left=viewport?.offsetLeft||0,width=viewport?.width||document.documentElement.clientWidth;
   const shift=Math.max(left+8-bounds.left,Math.min(0,left+width-8-bounds.right));
   if(shift!==0)element.style.transform=`translateX(${shift}px)`;
  };
  fit();window.addEventListener('resize',fit);
  viewport?.addEventListener('resize',fit);viewport?.addEventListener('scroll',fit);
  return()=>{window.removeEventListener('resize',fit);viewport?.removeEventListener('resize',fit);viewport?.removeEventListener('scroll',fit);};
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const dismiss=event=>{if(event.key==='Escape')setOpen(false);};
  document.addEventListener('keydown',dismiss);
  return()=>document.removeEventListener('keydown',dismiss);
 },[open]);
 // Touch focus can arrive after pointer-up; the click must own its toggle.
 return <span className="technical-help" data-export-ignore
  onPointerEnter={e=>{if(e.pointerType!=='touch'){interaction.current.hovered=true;setOpen(true);}}}
  onPointerLeave={()=>{interaction.current.hovered=false;if(!interaction.current.focused)setOpen(false);}}
 ><button type="button" aria-label={label} aria-describedby={id} aria-expanded={open}
  onPointerDown={()=>{interaction.current.pointerDown=true;}}
  onPointerCancel={()=>{interaction.current.pointerDown=false;}}
  onFocus={()=>{interaction.current.focused=true;if(!interaction.current.pointerDown)setOpen(true);}}
  onBlur={()=>{interaction.current.focused=false;interaction.current.pointerDown=false;if(!interaction.current.hovered)setOpen(false);}}
  onClick={e=>{e.stopPropagation();interaction.current.pointerDown=false;setOpen(value=>!value);}}
 >i</button><span ref={tooltip} id={id} role="tooltip" className={open?'is-open':''}>{children}</span></span>;
}
