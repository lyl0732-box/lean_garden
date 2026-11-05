// All eight wands grow from the same wooden stem. The tip stays at (40, 16)
// so the live spell beam stays attached while the character swings its wand.
import {evolution} from './yaya-forms.js';

export const wands=[
  {name:'嫩叶木杖',wood:'#89633d',color:'#c6e78b',glow:8},
  {name:'花苞木杖',wood:'#89633d',color:'#eeb2c9',glow:10},
  {name:'初绽花杖',wood:'#85603d',color:'#f0bfda',glow:12},
  {name:'披叶花杖',wood:'#805c3d',color:'#f1c5df',glow:14},
  {name:'学徒晶杖',wood:'#7b583c',color:'#d0c0ef',glow:16},
  {name:'星叶晶杖',wood:'#76553d',color:'#bfa5e9',glow:18},
  {name:'花园晶杖',wood:'#71513d',color:'#b595df',glow:20},
  {name:'紫晶贤者杖',wood:'#6d4e3b',color:'#ac85d3',glow:22}
];

export function wandArt(level=1){
  const stage=evolution(level).stage,w=wands[stage];
  const leaf='<path d="M40 31C20 28 23 9 39 11C50 0 58 11 49 24Z" fill="#c6e78b" stroke="#668647" stroke-width="2.5"/><path d="M40 29L43 13" stroke="#85a451" stroke-width="2"/>';
  const bud='<path d="M40 30C24 28 26 10 32 9Q39 17 42 4Q58 12 50 25Z" fill="'+w.color+'" stroke="#9c6c82" stroke-width="2"/><path d="M27 28Q35 38 44 30Q59 31 56 21Q46 22 42 29Z" fill="#9ac66c" stroke="#668647" stroke-width="2"/>';
  const bloom='<path d="M39 9C30-2 21 8 29 17C16 22 25 34 36 28C42 41 53 32 49 23C63 18 54 6 45 11C48-2 35-4 39 9Z" fill="'+w.color+'" stroke="#a87b91" stroke-width="2"/><circle cx="40" cy="17" r="6" fill="#ffe5a0" stroke="#c9a75e" stroke-width="2"/>';
  const crystal='<path d="M40 2L51 15L43 33L30 21Z" fill="'+w.color+'" stroke="#80669f" stroke-width="2.5"/><path d="M40 3L39 17L50 15M39 17L43 32M39 17L31 21" fill="none" stroke="#f3e7ff" stroke-width="1.6"/>';
  return `<svg class="wand-art" viewBox="0 0 60 140" preserveAspectRatio="none" data-wand-stage="${stage+1}" xmlns="http://www.w3.org/2000/svg"><title>${w.name}</title><path d="M15 132Q23 94 40 30" fill="none" stroke="${w.wood}" stroke-width="${6+stage*.25}" stroke-linecap="round"/><path d="M16 126Q24 89 38 37" fill="none" stroke="#bb9866" stroke-width="1.5" stroke-linecap="round"/>${stage===0?leaf:stage===1?bud:stage<4?bloom:crystal}${stage>=3?'<path d="M27 85Q15 79 19 68Q31 69 30 76M31 66Q49 65 48 52Q35 53 31 66" fill="#9ec777" stroke="#60824b" stroke-width="2"/><path d="M26 81Q23 64 33 54Q40 43 39 32" fill="none" stroke="#82a963" stroke-width="2"/>':''}${stage>=4?'<path d="M28 29Q39 40 51 27L48 36Q38 44 30 36Z" fill="#c9ab6d" stroke="#927248" stroke-width="2"/>':''}${stage>=5?'<path d="M29 44L41 48M26 55L38 59M23 67L35 71" fill="none" stroke="#bda2dc" stroke-width="3" stroke-linecap="round"/><path d="M31 36Q20 33 22 20Q30 22 33 29M46 33Q58 33 56 22Q48 23 46 33" fill="#9ec777" stroke="#668647" stroke-width="2"/>':''}${stage>=6?'<path d="M31 88L32 83L36 86L41 83L42 88L36 93Z" fill="#d4bf87" stroke="#997d51" stroke-width="1.4"/><path d="M36 86L36 91" stroke="#997d51" stroke-width="1.2"/>':''}${stage===7?'<path d="M25 26L23 15L31 21M50 25L56 14L48 19M32 37L45 41M17 118L23 120" fill="none" stroke="#dabd7c" stroke-width="2.5" stroke-linecap="round"/><circle cx="29" cy="48" r="2" fill="#f2dfad"/><circle cx="26" cy="60" r="2" fill="#f2dfad"/>':''}</svg>`;
}
