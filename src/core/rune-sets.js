import {FOUR} from './data.js';
// Stable within each size; never mutate saved set requirements or count arrays.
export function orderRuneSets(sets=[]){return [...sets].sort((a,b)=>(FOUR.has(Number(b))?2:b?1:0)-(FOUR.has(Number(a))?2:a?1:0));}
