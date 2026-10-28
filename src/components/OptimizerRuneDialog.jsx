import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
export default function OptimizerRuneDialog({name,busy,onClose,children}){
 const dialog=useRef(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const node=dialog.current,opener=document.activeElement;node.showModal();const cancel=e=>{e.preventDefault();close.current();};node.addEventListener('cancel',cancel);return()=>{node.removeEventListener('cancel',cancel);node.close();if(opener?.isConnected)opener.focus();};},[]);
 return createPortal(<dialog ref={dialog} className="optimizer-workspace optimizer-rune-dialog" aria-labelledby="optimizer-rune-dialog-title" onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}><header className="optimizer-dialog-header"><div><small>Ajustar Runas</small><h2 id="optimizer-rune-dialog-title">{name}</h2></div><button type="button" className="icon-button" aria-label="Fechar ajustes de runas" onClick={onClose} autoFocus><X size={19}/></button></header><fieldset disabled={busy} className="editor-fieldset">{children}</fieldset></dialog>,document.body);
}
