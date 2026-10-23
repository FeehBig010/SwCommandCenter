import {monsterSlug,portraitNameKeys} from './monster-assets.js';

// Portrait overrides only: never replace inventory IDs, stats or skills.
export const collabMapping={
 'Pure Vanilla Cookie':'Adriana',
 'Magic Order Swordsinger (Água)':'Mage (Água)'
};

// Element-preserving SW/com2us counterparts, including unawakened IDs.
// Exact elemental entries take precedence over a family's default name.
const families=[
 [240,245,'RYU'],[241,246,'KEN'],[242,247,'M. BISON'],
 [243,248,'DHALSIM'],[244,249,'CHUN-LI'],
 [262,267,'GingerBrave'],[263,268,'Pure Vanilla Cookie'],
 [264,269,'Hollyberry Cookie'],[265,270,'Espresso Cookie'],
 [266,271,'Madeleine Cookie'],[273,278,'Altair'],
 [274,279,'Ezio'],[275,280,'Bayek'],[276,281,'Kassandra'],[277,282,'Eivor'],
 [292,296,'Geralt'],[293,297,'Ciri'],[294,298,'Yennefer'],[295,299,'Triss'],
 [302,308,'Ryomen Sukuna'],[303,309,'Satoru Gojo'],[304,310,'Yuji Itadori'],
 [305,311,'Megumi Fushiguro'],[306,312,'Nobara Kugisaki'],
 [317,324,'Gyomei Himejima'],[318,325,'Tanjiro Kamado'],[319,326,'Nezuko Kamado'],
 [320,327,'Nezuko Kamado (transformed)'],[321,328,'Inosuke Hashibira'],[322,329,'Zenitsu Agatsuma']
];
const elements=['water','fire','wind','light','dark'];
for(const [collab,original,name] of families){
 collabMapping[name]??=original*100+10+({241:2,262:3,273:4}[collab]||1);
 for(let element=1;element<=5;element++){
  for(const state of [0,10])collabMapping[collab*100+state+element]=original*100+state+element;
  collabMapping[`${name} (${elements[element-1]})`]=original*100+10+element;
 }
}
const namedMapping=new Map(Object.entries(collabMapping).filter(([key])=>!/^\d+$/.test(key)).map(([key,value])=>[monsterSlug(key),value]));

export function collabPortraitTarget(master,name,element){
 const id=Number(master);
 if(Object.hasOwn(collabMapping,id))return collabMapping[id];
 const keys=portraitNameKeys(name,element||id%10);
 // Explicit suffix/element wins over a bare family default such as Adriana.
 for(const key of [...keys.filter(k=>/_(water|fire|wind|light|dark)$/.test(k)),...keys])if(namedMapping.has(key))return namedMapping.get(key);
 return null;
}
