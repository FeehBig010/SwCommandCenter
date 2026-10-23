import {MONSTER_FALLBACK} from './monsters.js';
import {cardFileName,loadCardPortraits} from './team-card.js';

export async function exportQuickCard(node,team,signal){
 if(!node||team.configs.some(c=>!c.masterId))throw new Error('Selecione todos os monstros antes de exportar.');
 const [module,portraits]=await Promise.all([import('html2canvas'),loadCardPortraits(team.configs.map(c=>({master:c.masterId})),signal),document.fonts.ready]);
 if(signal.aborted)return;
 const width=Math.max(960,team.configs.length*240),probe=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
 const rgb=color=>{probe.clearRect(0,0,1,1);probe.fillStyle=color;probe.fillRect(0,0,1,1);const [r,g,b,a]=probe.getImageData(0,0,1,1).data;return `rgba(${r},${g},${b},${a/255})`;};
 const canvas=await module.default(node,{scale:2,width,windowWidth:Math.max(1280,width),backgroundColor:'#0c1720',useCORS:true,allowTaint:false,logging:false,scrollX:0,scrollY:0,
  ignoreElements:element=>element.hasAttribute('data-export-ignore'),
  onclone:doc=>{
   const root=doc.getElementById(node.id);root.classList.add('is-png-capture');root.style.width=`${width}px`;root.style.padding='28px';root.style.background='#0c1720';
   const grid=root.querySelector('.summary-team-grid');grid.style.gridTemplateColumns=`repeat(${team.configs.length},minmax(0,1fr))`;
   root.querySelectorAll('[data-png-name]').forEach(el=>{el.textContent=el.dataset.pngName;el.className='capture-monster-name';});
   root.querySelectorAll('.monster-portrait').forEach(el=>{
    const card=el.closest('[data-png-master]'),master=card?.dataset.pngMaster||team.configs.find(c=>c.label===el.closest('[role=listitem]')?.querySelector('strong')?.textContent)?.masterId,name=card?.dataset.pngLabel||el.closest('[role=listitem]')?.querySelector('strong')?.textContent;
    if(portraits[master]){const img=doc.createElement('img');img.src=portraits[master];img.alt=name;img.width=64;img.height=64;el.replaceChildren(img);}
    else{const img=doc.createElement('img');img.src=MONSTER_FALLBACK;img.alt=`Retrato indisponível: ${name||'monstro'}`;img.width=64;img.height=64;el.replaceChildren(img);el.classList.add('portrait-fallback');}
   });
   root.querySelectorAll('input').forEach(input=>{
    const out=doc.createElement(input.type==='range'?'div':'strong');
    if(input.type==='range'){
     const min=Number(input.min)||0,max=Number(input.max)||350,pct=Math.max(0,Math.min(100,(Number(input.value)-min)/(max-min)*100));
     out.className='capture-speed-track';out.style.background=`linear-gradient(to right,#d4af37 0%,#d4af37 ${pct}%,#24323c ${pct}%,#24323c 100%)`;
     const thumb=doc.createElement('span');thumb.style.left=`${pct}%`;out.append(thumb);
    }else{out.className='capture-speed-value';out.textContent=input.value;}
    input.replaceWith(out);
   });
   // html2canvas does not parse modern color()/color-mix(). Resolve such colors
   // through the browser so current theme rules cannot break image generation.
   for(const el of [root,...root.querySelectorAll('*')]){
    const style=doc.defaultView.getComputedStyle(el);
    for(const property of ['color','background-color','border-top-color','border-right-color','border-bottom-color','border-left-color','outline-color']){const value=style.getPropertyValue(property);if(/color\(|(?:ok)?lab\(|(?:ok)?lch\(/.test(value))el.style.setProperty(property,rgb(value),'important');}
    if(/color\(|(?:ok)?lab\(|(?:ok)?lch\(/.test(style.backgroundImage))el.style.backgroundImage='none';
    if(/color\(|(?:ok)?lab\(|(?:ok)?lch\(/.test(style.boxShadow))el.style.boxShadow='none';
   }
  }
 });
 if(signal.aborted)return;
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Falha ao gerar PNG.')),'image/png'));
 if(signal.aborted)return;
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=cardFileName(team.name);document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
