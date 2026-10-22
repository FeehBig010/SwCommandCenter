import {useState} from 'react';
import {equippedBuild} from '../core/optimizer';
import EquipmentWheel from './EquipmentWheel';
export default function EquipmentInspector({account,team,config,options,build}){const [open,setOpen]=useState(false);let current;try{if(open&&account)current=build||equippedBuild(account,team,config,options);}catch{}return <details className="equipment-inspector" onToggle={e=>setOpen(e.currentTarget.open)}><summary>✦ Ficha & Oficina de Runas</summary>{open&&(current?<EquipmentWheel account={account} build={current}/>:<p className="fineprint">Equipe seis runas no JSON para abrir a ficha e comparar trocas.</p>)}</details>;}
