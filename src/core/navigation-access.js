export const PRIVATE_AREAS=new Set(['optimizer','arena','guild','siege','saved','cairos','dimensional','rift','toa','rta','inventory','workshop','admin']);
export function requiresLogin(page){return PRIVATE_AREAS.has(page);}
