// Slider suggestions do not truncate typed/imported goals used by the optimizer.
export const STAT_RANGES={hp:{min:0,max:50000},def:{min:0,max:3000},atk:{min:0,max:4000},spd:{min:0,max:350},cr:{min:0,max:100},cd:{min:50,max:300},res:{min:0,max:100},acc:{min:0,max:100}};
export function goalSlider(key,value){
 const suggested=STAT_RANGES[key];
 const empty=value===''||value===null||value===undefined;
 const current=empty?suggested.min:Number(value);
 const finite=Number.isFinite(current)?Math.max(0,current):suggested.min;
 return {min:Math.min(suggested.min,finite),max:Math.max(suggested.max,finite),value:finite,empty};
}
