// Old manual selectors assigned awakened Swordsinger names to unawakened IDs.
// Correct only that exact name/ID mismatch in enemy compositions, never SWEX units.
const SWORDSINGERS={29701:'Rigna',29702:'Reyka',29703:'Tirsa',29704:'Birgitta',29705:'Fiona'};
export function normalizeDefenseIdentity(member){
 if(!member)return member;
 const id=Number(member.masterId||member.master),name=String(member.label||member.name||'').trim();
 return SWORDSINGERS[id]===name?{...member,masterId:id+10}:member;
}
