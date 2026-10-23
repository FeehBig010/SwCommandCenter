import InfoTooltip from './InfoTooltip';
import {useMemo} from 'react';
import {isPve} from '../core/pve';

export default function PresetImportSummary({account,detailed=false}){
 const summary=useMemo(()=>{
  const decks=account?.accountPresets||[],sources=Object.entries(account?.presetImport?.sources||{});
  return {pve:decks.filter(p=>isPve(p.gameMode)).length,siege:decks.filter(p=>p.gameMode==='siege').length,arena:decks.filter(p=>p.gameMode==='arena').length,rta:decks.filter(p=>p.gameMode==='rta').length,missing:decks.reduce((n,p)=>n+(p.missingIds?.length||0),0),sources,unsupported:sources.reduce((n,[,s])=>n+s.unrecognized,0)};
 },[account]);
 if(!account)return null;
 return <div className="preset-import-summary" aria-label="Resumo dos decks importados">
  <p className="fineprint">{summary.pve} presets PvE · {summary.siege} Siege/GvG · {summary.arena} Arena · {summary.rta} RTA</p>
  {summary.unsupported>0&&<p className="notice warning" role="status">Há estruturas de decks não reconhecidas neste arquivo. Os times reconhecidos foram preservados. Confira o diagnóstico em Dados SWEX.</p>}
  {!summary.pve&&<p className="notice warning" role="status">Nenhum preset PvE foi encontrado neste inventário. Reimporte o JSON original mais recente do SWEX. Um backup antigo não recupera times que não foram importados antes.</p>}
  {summary.missing>0&&<span className="fineprint">{summary.missing} slots ausentes <InfoTooltip label="Monstros ausentes nos presets">Referências não encontradas no inventário ficam vazias. O restante do time é preservado.</InfoTooltip></span>}
  {detailed&&<details><summary>Diagnóstico dos decks</summary>{summary.sources.length?summary.sources.map(([key,s])=><p className="fineprint" key={key}><code>{key}</code>: {!s.present?'chave ausente':!s.hasData?'lista vazia':`${s.imported} times importados${s.unrecognized?` · ${s.unrecognized} estruturas não reconhecidas`:''}`}</p>):<p className="fineprint">Este inventário foi importado antes do diagnóstico. Reimporte o JSON original para conferir suas fontes.</p>}</details>}
 </div>;
}
