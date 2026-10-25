export const PRIVATE_AREAS=new Set(['optimizer','arena','guild','siege','saved','cairos','dimensional','rift','toa','rta','inventory','workshop','admin']);
const LOCAL_ACCOUNT_AREAS=new Set(['optimizer','arena','siege','saved','cairos','dimensional','rift','toa','rta','inventory','workshop']);
export function requiresLogin(page,account=null){return PRIVATE_AREAS.has(page)&&!(account?.id&&LOCAL_ACCOUNT_AREAS.has(page));}
