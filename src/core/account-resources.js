const integer=value=>(typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isSafeInteger(Number(value))&&Number(value)>=0&&Number(value)<=1000000?Number(value):null;
export function cleanAccountResources(resources){
 const energy=resources?.dimensionalEnergy,current=integer(energy?.current),maximum=integer(energy?.max);
 if(current===null)return {};
 return {dimensionalEnergy:{current,max:maximum!==null&&maximum>0?maximum:null}};
}
// SWEX's dimensional-hole balance is distinct from ordinary energy and from
// wizard_info.darkportal_energy (Dimensional Rift crystals). Never substitute it.
export function extractAccountResources(raw){
 const hole=raw?.dimension_hole_info;
 if(!hole)return {};
 return cleanAccountResources({dimensionalEnergy:{current:hole.energy,max:hole.energy_max??hole.max_energy}});
}
