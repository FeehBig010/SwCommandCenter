// Only describe the loaded snapshot; import time is not a live game status.
export function homeSummary(account){
 if(!account)return null;
 const imported=typeof account.importedAt==='string'?Date.parse(account.importedAt):NaN;
 return {id:account.id!=null?String(account.id):null,name:account.name||'Minha conta',guild:account.guild||null,importedAt:Number.isFinite(imported)?new Date(imported).toISOString():null,units:Array.isArray(account.units)?account.units.length:0,runes:Array.isArray(account.runes)?account.runes.length:0,artifacts:Array.isArray(account.artifacts)?account.artifacts.length:0,isDemo:account.isDemo===true};
}
