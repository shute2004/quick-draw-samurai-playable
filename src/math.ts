export const TAU=Math.PI*2;
export const randomBetween=(a:number,b:number):number=>a+Math.random()*(b-a);
export const clamp=(value:number,min:number,max:number):number=>Math.max(min,Math.min(max,value));
export const lerp=(a:number,b:number,k:number):number=>a+(b-a)*k;
