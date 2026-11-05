/** Original, code-drawn storybook illustrations for the learning cards.
 * Run with: node scripts/generate-card-art.mjs
 * Every card has its own scene; component helpers only establish the art style.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/assets/cards');
await mkdir(out, { recursive: true });
const ink = '#384c43';
const C = { leaf:'#85b957', dark:'#579551', lime:'#c9dc77', pink:'#f4a4a9', coral:'#ec806e', yellow:'#f6cb65', blue:'#7bbdc6', purple:'#b2a1d6', cream:'#fff5d9', wood:'#bc8558', brown:'#855b40' };
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shape = (tag, attrs, content='') => `<${tag} ${Object.entries(attrs).map(([k,v])=>`${k}="${esc(v)}"`).join(' ')}>${content}</${tag}>`;
const p = (d, fill='none', stroke=ink, sw=3, extra={}) => shape('path',{d,fill,stroke,'stroke-width':sw,...extra});
const r = (x,y,w,h,fill,rx=9,extra={}) => shape('rect',{x,y,width:w,height:h,rx,fill,stroke:ink,'stroke-width':3,...extra});
const c = (x,y,rad,fill,extra={}) => shape('circle',{cx:x,cy:y,r:rad,fill,stroke:ink,'stroke-width':2.6,...extra});
const e = (x,y,rx,ry,fill,extra={}) => shape('ellipse',{cx:x,cy:y,rx,ry,fill,stroke:ink,'stroke-width':2.5,...extra});
const t = (x,y,txt,size=16,fill=ink,extra={}) => shape('text',{x,y,'font-size':size,fill,'font-family':'Verdana, sans-serif','font-weight':700,'text-anchor':'middle',stroke:'none',...extra},esc(txt));
const g = (x,y,body,scale=1,rotate=0) => `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${rotate})">${body}</g>`;
const face = (x,y,scale=1,mood='happy') => g(x,y,
  c(-6,-2,1.8,ink,{stroke:'none'})+c(6,-2,1.8,ink,{stroke:'none'})+
  e(-11,3,3,1.6,C.pink,{stroke:'none',opacity:.7})+e(11,3,3,1.6,C.pink,{stroke:'none',opacity:.7})+
  p(mood==='wow'?'M-2 5 Q0 1 2 5 Q0 9 -2 5':'M-4 4 Q0 9 4 4','none',ink,1.8),scale);
const sparkle = (x,y,s=1,col=C.yellow) => g(x,y,p('M0 -8 Q1 -1 8 0 Q1 1 0 8 Q-1 1 -8 0 Q-1 -1 0 -8',col,'none'),s);
const leaf = (x,y,s=1,rot=0,col=C.leaf) => g(x,y,p('M0 0 Q-21 -3 -18 -19 Q-2 -21 0 0Z',col)+p('M-1 -1 L-12 -12','none',C.dark,1.7),s,rot);
const sprout = (x,y,s=1,col=C.leaf) => g(x,y,p('M0 8 Q3 -3 0 -17','none',C.dark,4)+leaf(-1,-2,.72,-10,col)+leaf(1,-9,.72,90,col),s);
const seed = (x,y,s=1,col=C.yellow) => g(x,y,p('M0 -22 C-22 -13 -18 12 0 17 C18 12 22 -13 0 -22Z',col)+p('M-9 -10 Q-14 -1 -10 7','none','#fff8d9',3)+face(0,1,.8),s);
const apple = (x,y,s=1,col=C.coral) => g(x,y,p('M0 -11 C-22 -26 -26 7 -9 17 Q0 23 9 17 C26 7 22 -26 0 -11Z',col)+p('M0 -10 Q4 -19 1 -24','none',C.brown,3)+leaf(4,-17,.52,105)+p('M-10 -6 Q-15 -1 -12 5','none','#ffe4cc',3)+face(0,5,.65),s);
const flower = (x,y,s=1,col=C.pink) => g(x,y,p('M0 18 L0 46','none',C.dark,4)+leaf(0,34,.7,0)+leaf(0,39,.6,95)+[0,60,120,180,240,300].map(a=>g(0,0,e(0,-15,10,14,col),1,a)).join('')+c(0,0,12,C.yellow)+face(0,2,.75),s);
const pot = (x,y,s=1,fill=C.coral) => g(x,y,p('M-27 -4 L-20 30 Q0 38 20 30 L27 -4Z',fill)+r(-31,-12,62,14,fill,6)+face(0,13),s);
const basket = (x,y,s=1,fruit=3,col=C.wood) => g(x,y,p('M-28 -5 Q-30 -45 0 -45 Q30 -45 28 -5','none',C.brown,5)+
  Array.from({length:fruit},(_,i)=>apple(-20+(i%3)*20,-7-Math.floor(i/3)*20,.55,i%2?C.yellow:C.coral)).join('')+
  p('M-40 -3 L-31 30 Q0 41 31 30 L40 -3Z',col)+p('M-32 9 L32 9 M-28 23 L28 23 M-15 -2 L-11 31 M8 -2 L8 34 M25 -2 L19 31','none','#e6b373',2)+face(0,16,.8),s);
const cloud = (x,y,s=1,fill='#fffdf3') => g(x,y,p('M-38 12 C-62 10 -58 -17 -34 -16 C-35 -42 7 -42 13 -20 C39 -30 59 -8 44 11 Q0 26 -38 12Z',fill)+face(0,1),s);
const arrow = (x1,y1,x2,y2,col=C.dark,sw=4) => {
  const angle=Math.atan2(y2-y1,x2-x1), back=9;
  return p(`M${x1} ${y1} L${x2} ${y2}`,'none',col,sw)+p(`M${x2-back*Math.cos(angle-.5)} ${y2-back*Math.sin(angle-.5)} L${x2} ${y2} L${x2-back*Math.cos(angle+.5)} ${y2-back*Math.sin(angle+.5)}`,'none',col,sw);
};
const eq = (x,y) => p(`M${x-8} ${y-4} H${x+8} M${x-8} ${y+4} H${x+8}`,'none',ink,3.5);
const plus = (x,y,s=1) => g(x,y,p('M-7 0 H7 M0 -7 V7','none',ink,3),s);
const cross = (x,y,s=1,col=C.coral) => g(x,y,p('M-6 -6 L6 6 M6 -6 L-6 6','none',col,3),s);
const dot = (x,y,s=1,col=C.yellow) => g(x,y,c(0,0,9,col)+c(-2,-2,2,'#fff9dc',{stroke:'none'}),s);
const stone = (x,y,w=34,col='#d8cda8') => p(`M${x-w/2} ${y+5} Q${x-w/2-3} ${y-6} ${x} ${y-9} Q${x+w/2+5} ${y-7} ${x+w/2} ${y+5}Z`,col);
const fence = (x,y,count=3,s=1) => g(x,y,Array.from({length:count},(_,i)=>p(`M${i*16} 0 V-26 L${i*16+5} -33 L${i*16+10} -26 V0Z`,'#f3dfad')).join('')+r(-4,-18,count*16+2,8,'#e2bd7e',2),s);
const check = (x,y,s=1) => g(x,y,p('M-9 0 L-2 8 L13 -11','none',C.dark,5),s);
const hill = (d='M22 142 Q61 116 104 133 Q166 109 218 142 L218 164 H22Z',col='#d6e7aa') => p(d,col,'none');
const water = () => p('M18 134 Q40 124 65 135 T112 136 T160 133 T223 135 V164 H18Z','#b5dae0','none')+p('M32 146 Q45 139 58 146 M158 151 Q175 144 192 151','none','#78b5c4',2);
const axes = () => p('M35 135 H205 M45 143 V36','none','#8caa9c',2.3);
const graph = (curve,col=C.blue) => axes()+p(curve,'none',col,7);
const rabbit = (x,y,s=1,fill='#fff5db') => g(x,y,e(-10,-26,7,24,fill,{transform:'rotate(-12 -10 -26)'})+e(10,-26,7,24,fill,{transform:'rotate(12 10 -26)'})+e(0,10,25,29,fill)+c(0,-4,24,fill)+face(0,-2,1.3)+e(-10,35,11,6,fill)+e(12,35,11,6,fill),s);
const bee = (x,y,s=1) => g(x,y,e(-9,-10,10,15,'#fffdf5',{transform:'rotate(-30 -9 -10)'})+e(10,-10,10,15,'#fffdf5',{transform:'rotate(30 10 -10)'})+e(0,5,24,17,C.yellow)+p('M-7 -10 V20 M7 -10 V20','none',C.brown,5)+face(12,3,.55),s);
const mushroom = (x,y,s=1,col=C.coral) => g(x,y,p('M-13 -2 L-18 33 Q0 45 18 33 L13 -2Z',C.cream)+p('M-36 0 Q-31 -41 0 -42 Q31 -41 36 0 Q0 16 -36 0Z',col)+c(-14,-18,6,'#fff6db',{stroke:'none'})+c(11,-27,6,'#fff6db',{stroke:'none'})+face(0,21,.9),s);
const scroll = (x,y,s=1,col=C.cream) => g(x,y,p('M-32 -42 H27 Q37 -37 29 -25 L26 37 H-27 L-29 -28 Q-43 -25 -42 -34 Q-41 -43 -32 -42Z',col)+p('M-27 26 H31 Q41 30 33 39 H-22 Q-33 37 -27 26Z',col)+p('M-19 -17 H16 M-19 -3 H16','none','#b79b67',3),s);
const book = (x,y,s=1,col=C.purple) => g(x,y,p('M0 -30 Q-25 -44 -49 -31 V29 Q-25 17 0 32 Q25 17 49 29 V-31 Q25 -44 0 -30Z',col)+p('M0 -29 V30 M-38 -18 Q-22 -22 -10 -14 M11 -14 Q24 -22 38 -18 M-38 -4 Q-22 -8 -10 0 M11 0 Q24 -8 38 -4','none','#fff6df',3),s);
const stairs = (x,y,s=1) => g(x,y,p('M0 50 V30 H25 V10 H50 V-10 H75 V-30 H100 V50Z','#e8bb7f')+p('M0 30 H25 M25 10 H50 M50 -10 H75 M75 -30 H100','none','#fff0cd',4),s);
const wheel = (x,y,s=1,col=C.yellow) => g(x,y,Array.from({length:8},(_,i)=>g(0,0,r(-5,-32,10,17,col,3),1,i*45)).join('')+c(0,0,25,col)+c(0,0,11,C.cream)+face(0,0,.7),s);
const rows = (x,y,n,m,s=.5,fruit='seed') => Array.from({length:n*m},(_,i)=>(fruit==='apple'?apple:seed)(x+(i%m)*26*s,y+Math.floor(i/m)*34*s,s*.65,i%2?C.yellow:C.coral)).join('');
const scenes = {};
function card(id, meaning, body, family='nature') { scenes[id]={meaning,body,family}; }

// Natural-number theorems: fruit, steps, flowerbeds and grouping have distinct silhouettes.
card('one_eq_succ_zero','一只小芽站在唯一的一级台阶上：1 是 0 的下一步',hill()+r(99,109,63,55,C.blue,5)+sprout(130,87,.85)+t(130,144,'1',21)+t(61,155,'0',18)+arrow(58,117,91,105)+sparkle(180,52,.8));
card('add_zero','右边空篮子加入后，左边的三颗苹果不变',hill()+basket(66,109,1,3)+plus(117,106)+basket(172,116,.66,0)+t(174,153,'0',15)+p('M38 49 Q75 25 109 50','none',C.dark,3)+arrow(109,50,96,50)+sparkle(180,61,.7));
card('zero_add','左边空推车遇见右边花盆，花的数量保持不变',hill()+r(27,106,55,24,C.yellow,7)+c(39,137,8,C.brown)+c(72,137,8,C.brown)+p('M81 109 L94 91','none',C.brown,4)+t(54,103,'0',24)+plus(115,111)+pot(175,125,.85)+flower(174,76,.75)+butterfly(149,38));
card('add_succ','藤蔓多走一格，整个花朵队伍也多一格',hill()+p('M29 123 C50 74 77 137 103 90 S154 68 188 51','none',C.dark,8)+[ [38,114],[74,112],[110,85] ].map(([x,y])=>leaf(x,y,.9,75)).join('')+flower(186,50,.64,C.coral)+c(142,87,20,C.cream)+t(142,94,'+1',15)+arrow(145,123,182,99,C.coral)+sparkle(198,105,.65));
card('add_one_eq_succ','小兔向上跳一级，添一颗果子就是后继',hill()+stairs(54,99,1.25)+rabbit(108,60,.62)+apple(177,99,.58)+p('M60 76 Q58 39 93 34','none',C.coral,3,{'stroke-dasharray':'5 6'})+arrow(93,34,105,38,C.coral,3)+t(47,139,'n',16)+t(177,141,'+1',17)+sparkle(151,36,.7));
card('succ_ne','台阶上的新芽永远高于零点的小池塘',water()+stairs(95,94,1.06)+pot(174,71,.66,C.yellow)+sprout(174,50,.95)+t(57,133,'0',32)+p('M80 81 L81 141','none',C.coral,4,{'stroke-dasharray':'5 6'})+t(116,128,'≠',29)+sparkle(204,49,.7));
card('succ_inj','两株同高的花取下相同顶帽，原来的花盆也配对',hill()+pot(64,126,.75)+pot(178,126,.75)+p('M64 115 V66 M178 115 V66','none',C.dark,5)+flower(64,64,.55)+flower(178,64,.55)+eq(120,64)+eq(120,133)+p('M39 39 Q64 25 89 39 M153 39 Q178 25 203 39','none',C.blue,4)+arrow(112,83,112,113,C.blue,3)+arrow(130,83,130,113,C.blue,3));
card('add_assoc','三种果子用两只柔软的篮框重新分组',hill()+apple(55,92,.72)+apple(119,92,.72,C.yellow)+apple(183,92,.72,C.pink)+p('M30 64 Q14 92 30 124 H143 Q156 92 143 64','none',C.blue,5)+p('M97 51 Q80 86 97 138 H205 Q222 89 205 51','none',C.coral,5)+plus(86,89,.65)+plus(151,89,.65)+sparkle(161,37,.6));
card('add_comm','红花与黄花在旋转小路两侧互换位置',hill()+flower(59,85,.85,C.coral)+flower(180,85,.85,C.yellow)+p('M72 42 Q120 11 166 43','none',C.blue,4)+arrow(166,43,168,34,C.blue,3)+p('M166 144 Q120 171 74 146','none',C.blue,4)+arrow(74,146,76,157,C.blue,3)+plus(120,91));
card('mul_zero','没有发出的种子包，得到的种子仍为零',hill()+r(35,55,67,78,C.lime,13)+p('M43 68 H94 M43 121 H94','none',C.dark,2)+seed(69,94,.65)+cross(88,52,.7)+arrow(113,98,151,98)+e(183,113,29,13,C.cream)+t(183,115,'0',26)+p('M166 74 L172 83 M196 74 L190 83','none',C.blue,3));
card('mul_succ','整齐的花坛之外再添一整排新花',hill()+r(27,80,128,69,'#bc946b',10)+[0,1,2].map(i=>[0,1].map(j=>sprout(49+i*41,99+j*30,.65)).join('')).join('')+r(170,69,39,90,C.cream,8)+[0,1,2].map(i=>flower(189,80+i*27,.3,C.coral)).join('')+plus(161,48)+arrow(190,48,190,60,C.coral,3));
card('zero_mul','空花盆排成一队，里面仍然没有花',hill()+[52,120,188].map(x=>pot(x,112,.75,C.blue)).join('')+[52,120,188].map(x=>t(x,116,'0',17)).join('')+p('M35 57 Q120 16 205 57','none',C.purple,4)+t(120,50,'× n',17)+cloud(120,87,.25));
card('distribute','一只浇水壶把水分别送进两块花田',hill()+g(115,47,r(-22,-15,44,32,C.blue,8)+p('M-21 -10 Q-45 -22 -44 2 Q-40 20 -22 9','none',ink,4)+p('M22 -7 L43 -16 L43 -7 L22 10Z',C.blue)+face(0,1,.8),.85)+p('M121 75 Q76 70 64 93 M133 75 Q177 75 182 94','none',C.blue,4,{'stroke-dasharray':'4 7'})+r(26,124,76,26,C.wood)+r(139,124,76,26,C.wood)+[44,81].map(x=>flower(x,98,.42,C.yellow)).join('')+[156,195].map(x=>flower(x,98,.42,C.pink)).join('')+plus(120,124,.8));
card('mul_comm','同一块六花花田转过直角，行与列交换',hill()+r(24,72,79,62,C.wood,9)+rows(43,88,2,3,.8)+r(144,55,60,88,C.wood,9)+rows(164,72,3,2,.8)+p('M73 43 Q124 14 162 37','none',C.blue,4)+arrow(162,37,161,26,C.blue,3)+t(65,153,'2 × 3',13)+t(175,160,'3 × 2',13));
card('pow','小树按层分枝，一颗种子变成成倍的果园',hill()+p('M120 143 V104 M120 108 L76 79 M120 108 L164 79 M76 79 L48 54 M76 79 L91 49 M164 79 L148 49 M164 79 L193 54','none',C.brown,7)+[48,91,148,193].map((x,i)=>apple(x,i===0||i===3?44:39,.62,i%2?C.yellow:C.coral)).join('')+seed(120,137,.5)+t(70,122,'×',18)+t(174,122,'×',18)+sparkle(119,62,.7));
card('square_nonneg','一块方形花毯稳稳放在零线的上面',hill()+p('M28 143 H214','none',C.dark,5)+r(73,51,94,87,C.lime,12)+p('M104 54 V135 M136 54 V135 M76 81 H164 M76 110 H164','none','#f8ffe0',3)+flower(121,80,.7,C.yellow)+t(45,147,'0',18)+check(189,89,.9)+sparkle(61,43,.7),'logic');
card('abs','小刺猬从零点向两边走相同距离',hill()+p('M28 121 H211','none',C.blue,4)+p('M53 114 V128 M120 110 V132 M187 114 V128','none',ink,3)+t(120,153,'0',18)+t(53,149,'−x',14)+t(187,149,'x',14)+rabbit(53,83,.47)+rabbit(187,83,.47)+p('M66 60 Q120 22 174 60','none',C.purple,4)+t(120,48,'|x|',16),'analysis');

// Analysis theorems use paths, clouds, boats and slopes, instead of interchangeable water icons.
card('deriv_id','小蜗牛沿直坡前进，每向右一步就向上一步',water()+graph('M49 130 L195 47')+stairs(58,120,.64)+snail(152,61,.75)+t(178,115,'1',27)+arrow(181,133,202,133,C.coral,3)+arrow(203,133,203,112,C.coral,3),'analysis');
card('deriv_pow','向上弯曲的豆藤越来越陡，小叶标出切线',water()+graph('M48 129 Q146 134 192 38',C.dark)+leaf(82,128,.6,110)+leaf(139,108,.6,90)+leaf(169,76,.6,100)+p('M117 141 L187 65','none',C.coral,4)+c(155,100,6,C.yellow)+bee(76,54,.6)+t(192,153,'xⁿ',18),'analysis');
card('deriv_const','小云朵停在水平轨道上，高度没有变化',water()+axes()+p('M48 90 H199','none',C.blue,7)+cloud(125,72,.74)+p('M53 124 H191','none',C.coral,3,{'stroke-dasharray':'5 6'})+t(179,58,'0',25)+sparkle(53,53,.65),'analysis');
card('deriv_add','两条彩色溪流汇成一条更大的河',water()+p('M44 47 Q39 92 105 104 Q122 108 126 154','none',C.blue,15)+p('M197 44 Q201 92 145 104 Q127 110 126 154','none',C.purple,15)+p('M126 111 V157','none','#7cb9a0',18)+leaf(54,71,.7,82)+leaf(186,75,.7,8)+cloud(120,53,.38)+plus(120,83,.85)+face(126,139,.8),'analysis');
card('integral','彩色积木逐块填满弧线下的面积',water()+axes()+[0,1,2,3,4,5,6].map(i=>r(53+i*20,106-i*9,18,28+i*9,i%2?C.yellow:C.coral,3)).join('')+p('M50 109 Q119 95 195 39','none',C.dark,5)+cloud(82,50,.38)+t(183,157,'∫',25),'analysis');
card('rolle','小兔爬过同高的两端，在山顶找到水平跷板',hill('M24 140 Q79 18 121 52 Q162 19 218 140 L218 164 H24Z','#caddad')+p('M40 132 Q120 -20 200 132','none',C.dark,5)+p('M76 58 H163','none',C.coral,5)+rabbit(120,48,.43)+c(40,132,7,C.yellow)+c(200,132,7,C.yellow)+p('M43 146 H199','none',C.blue,3,{'stroke-dasharray':'5 6'})+t(120,147,'0',20),'analysis');
card('mvt','弯曲小桥旁两根平行的坡杆表示相同斜率',water()+p('M35 134 Q57 139 97 101 T199 48','none',C.dark,7)+p('M35 134 L199 48','none',C.blue,4)+p('M70 128 L172 74','none',C.coral,5)+c(121,101,8,C.yellow)+p('M113 66 L133 55 M119 76 L139 65','none',C.coral,3)+rabbit(175,34,.4)+c(35,134,6,C.blue)+c(199,48,6,C.blue),'analysis');
card('ivt','彩虹小桥一定经过中间高度的小旗子',water()+p('M37 135 Q72 131 97 95 Q128 44 200 43','none',C.purple,15)+p('M37 131 Q72 127 97 91 Q128 40 200 39','none',C.pink,4)+p('M31 91 H205','none',C.blue,3,{'stroke-dasharray':'5 6'})+p('M111 87 V43','none',C.brown,3)+p('M112 43 L143 52 L112 64Z',C.yellow)+c(111,83,9,C.yellow)+face(130,54,.4)+flower(52,116,.42,C.yellow),'analysis');
card('real_identities','一对相同云朵互相抵消，露出零形彩虹圈',water()+cloud(58,75,.51)+cloud(184,75,.51)+p('M107 73 H133','none',ink,4)+arrow(120,96,120,111,C.blue,3)+c(120,139,21,C.yellow)+c(120,139,10,C.cream,{stroke:'none'})+sparkle(74,136,.7)+sparkle(167,129,.8),'analysis');

// Number theory: genuinely different locks, tools and packaging scenes.
card('bezout','两根不同长度的绳子合力拉出一块单位金砖',hill()+p('M27 76 Q43 29 85 69 Q107 91 120 117','none',C.coral,9)+p('M211 59 Q165 41 161 90 Q157 113 120 117','none',C.blue,9)+r(91,107,60,42,C.yellow,8)+t(121,136,'1',26)+rabbit(42,86,.43)+rabbit(190,96,.43)+sparkle(122,57,.9),'number');
card('crt','两把不同颜色的余数钥匙共同打开古树宝箱',hill()+p('M29 146 V63 Q29 35 56 35 H184 Q211 35 211 63 V146Z','#d8bc83')+p('M45 147 V71 Q45 50 65 50 H175 Q195 50 195 71 V147Z','#8ca079')+r(76,99,89,50,C.wood,9)+p('M76 115 Q120 82 165 115','none',C.brown,4)+r(109,117,22,22,C.yellow,5)+key(66,72,.65,C.coral,30)+key(171,72,.65,C.blue,-30)+sparkle(118,55,1.2)+face(121,110,.6),'number');

// Tactics are characterful garden tools with recognisable silhouettes.
card('rfl','两粒一模一样的种子在等号两边微笑',hill()+seed(62,105,1.2)+seed(181,105,1.2)+eq(120,108)+sparkle(120,54,1.1)+leaf(97,150,.6,65));
card('rw','藤蔓的两个卷曲分枝交换一红一黄两颗果子',hill()+p('M117 150 C114 87 39 135 42 69 C45 39 88 41 86 67 M118 122 C190 142 209 80 179 55 C162 38 143 52 148 68','none',C.dark,7)+apple(74,71,.65)+apple(165,76,.65,C.yellow)+arrow(100,71,137,71,C.coral,3)+arrow(139,91,102,91,C.blue,3)+leaf(117,128,.8,95));
card('induction','大树从一颗种子逐层长出重复的新枝',hill()+p('M119 145 V67 M119 118 L76 91 M119 95 L163 65 M119 70 L91 49','none',C.brown,9)+[ [75,82],[163,58],[91,43],[126,41] ].map(([x,y])=>leaf(x,y,1.4,90)).join('')+seed(118,144,.55)+[ [67,121],[159,103],[166,34] ].map(([x,y])=>sparkle(x,y,.5)).join(''));
card('apply','小木桥连接已有条件花盆与目标花台',water()+p('M25 137 Q118 30 215 137','none',C.brown,17)+p('M25 126 Q118 19 215 126','none','#e1b571',11)+p('M58 98 V136 M181 97 V136 M93 75 V113 M146 75 V112','none',C.brown,5)+rabbit(121,52,.55)+arrow(86,147,154,147,C.blue,3));
card('exact','带有印章的完整花朵证据',hill()+scroll(121,96,1.14)+flower(120,84,.68)+check(151,125,.7)+sparkle(66,57,.8));
card('assumption','叶子在两个回声圆环之间传递',hill()+c(63,89,32,C.cream)+c(179,89,32,C.cream)+leaf(70,100,1.5,35)+leaf(186,100,1.5,35)+arrow(105,89,137,89));
card('ac_rfl','小松鼠把不同果子装进整齐的分格抽屉',hill()+r(45,73,151,65,C.wood,9)+p('M97 75 V136 M147 75 V136','none',C.brown,4)+seed(71,100,.7)+apple(122,104,.6)+flower(171,97,.48)+p('M68 51 Q121 22 173 51','none',C.blue,3)+arrow(173,51,167,42,C.blue,3));
card('intro','欢迎拱门打开，让一粒带叶种子走进花园',hill()+p('M54 144 V64 Q120 5 186 64 V144','none',C.brown,11)+p('M60 145 V65 L98 49 V135Z',C.yellow)+seed(137,119,1)+sprout(137,85,.8)+arrow(174,111,158,111,C.blue,3)+leaf(181,50,.8,90));
card('constructor','同一株茎上分成两朵都需要照顾的小花',hill()+p('M119 144 V103 Q73 106 64 71 M119 103 Q170 105 177 71','none',C.dark,7)+flower(64,67,.88,C.pink)+flower(177,67,.88,C.yellow)+pot(119,137,.65,C.blue)+sparkle(119,55,.75));
card('rcases','一个蘑菇礼盒打开，取出两颗小种子',hill()+r(70,99,101,51,C.wood,9)+p('M61 98 L117 73 L178 94 L123 119Z',C.yellow)+p('M119 79 L118 122','none',C.coral,4)+mushroom(49,76,.65)+seed(192,83,.65)+sparkle(120,43,1.2)+p('M83 67 L74 56 M156 68 L168 57','none',C.yellow,3));
card('left','岔路小旗指向左边的粉色花园',hill()+p('M120 157 V111 Q70 110 40 63 M120 111 Q168 108 200 63','none','#d0ae7e',18)+arrow(117,112,70,82,C.coral,6)+flower(45,49,.56,C.pink)+leaf(208,69,.8,55)+p('M149 58 V105','none',C.brown,4)+p('M149 58 L114 65 L149 79Z',C.coral));
card('right','岔路小旗指向右边的黄色蘑菇园',hill()+p('M120 157 V111 Q70 110 40 63 M120 111 Q168 108 200 63','none','#d0ae7e',18)+arrow(122,112,171,82,C.blue,6)+mushroom(194,50,.56,C.yellow)+leaf(47,74,.9,25)+p('M86 58 V105','none',C.brown,4)+p('M86 58 L122 65 L86 79Z',C.blue));
card('use','小兔从树上挑出一颗发光的见证果',hill()+p('M164 144 V62 M164 82 L193 63 M164 98 L134 74','none',C.brown,8)+leaf(163,64,1.5,0)+leaf(194,62,1.3,90)+apple(137,79,.76,C.yellow)+rabbit(79,114,.75)+sparkle(120,45,.8)+arrow(114,101,99,106,C.blue,3));
card('specialize','小蜜蜂敲响写着一个名字的点名铃',hill()+p('M115 51 V37 Q126 25 137 37 V51','none',C.brown,4)+p('M97 62 Q97 43 126 43 Q153 43 153 64 L163 111 H89Z',C.yellow)+c(126,118,9,C.wood)+face(125,78,1.1)+bee(59,72,.69)+p('M176 55 L185 48 M180 76 H193','none',C.yellow,4));
card('change','放大镜透过外壳看见种子内部的小芽',hill()+seed(84,107,.96)+g(150,88,p('M20 27 L47 59','none',C.brown,15)+c(0,0,42,C.blue)+c(0,0,32,'#e0f4df',{stroke:'#639d99'})+sprout(0,10,1.3),1)+sparkle(63,45,.8));
card('ring','两只不同大小的齿轮将散落果子整理好',hill()+wheel(96,97,1.3,C.yellow)+wheel(165,119,.81,C.blue)+apple(184,50,.45)+seed(46,48,.45)+sparkle(124,37,.6));
card('nlinarith','盾牌保护一朵花，四周有平方晶石',hill()+p('M120 35 L181 58 L174 114 Q153 146 120 158 Q87 146 66 114 L59 58Z',C.blue)+p('M120 48 L167 67 L161 111 Q145 135 120 145 Q95 135 79 111 L73 67Z','#c5e4cf')+flower(120,85,.75,C.yellow)+crystal(43,86,.5,C.purple)+crystal(200,113,.5,C.yellow));
card('have','书写着中间发现的便笺被夹在一片大叶上',hill()+leaf(161,141,4.5,-15,C.leaf)+r(68,46,105,93,C.cream,8,{transform:'rotate(-6 120 95)'})+p('M87 72 H147 M87 89 H133','none','#b1a27d',4)+check(133,116,.8)+r(106,37,26,20,C.yellow,4)+sparkle(187,52,.8));
card('norm_num','三枚数字晶石组成一座发光的小矿山',hill()+crystal(73,115,.95,C.blue)+crystal(125,89,1.3,C.purple)+crystal(178,121,.82,C.yellow)+t(125,97,'3',26)+t(73,122,'1',20)+t(178,127,'2',17)+sparkle(75,49,.9));
card('simp','园丁剪刀修去多余枝叶，留下清楚的小花',hill()+p('M162 143 V75 M162 111 L195 92 M162 91 L139 65','none',C.dark,5)+flower(164,64,.62)+leaf(195,91,.8,95)+g(82,107,p('M-16 10 L31 -43 M15 10 L-26 -44','none','#93b7b2',8)+c(-20,23,15,C.coral)+c(20,23,15,C.coral)+c(0,-1,5,C.yellow),1,-15)+leaf(116,146,.6,40));
card('linarith','两只装着果子的天平托盘保持平衡',hill()+p('M120 58 V145 M89 148 H151 M53 73 H187','none',C.brown,7)+p('M61 74 L44 112 M61 74 L78 112 M180 74 L163 112 M180 74 L197 112','none',ink,2)+p('M35 112 Q61 148 87 112Z',C.yellow)+p('M154 112 Q180 148 206 112Z',C.blue)+apple(60,104,.49)+seed(180,101,.58)+c(120,63,11,C.yellow)+sparkle(160,40,.65));
card('convert','两截不同颜色的枝条在嫁接口长出一朵花',hill()+p('M91 145 Q100 91 145 52','none',C.brown,10)+p('M91 145 Q100 91 145 52','none',C.dark,6)+r(100,84,31,22,C.cream,4,{transform:'rotate(-45 116 95)'})+p('M106 84 L124 101 M99 91 L117 108','none',C.yellow,3)+flower(153,52,.75,C.pink)+leaf(91,128,.95,-10)+arrow(48,75,80,89,C.blue,4));
card('omega','整数罗盘的叶片指针指向刻度道路',hill()+c(120,97,59,C.wood)+c(120,97,49,C.cream)+[0,45,90,135,180,225,270,315].map(a=>g(120,97,p('M0 -38 V-43','none',ink,2),1,a)).join('')+g(120,97,p('M0 -33 L13 6 L0 28 L-13 -6Z',C.coral)+p('M0 -33 V28','none',ink,2),1,35)+c(120,97,6,C.yellow)+t(120,34,'0',15)+t(190,102,'1',14)+t(48,102,'−1',13));
card('field_simp','四片分数风车叶转动，消去分母的枝藤',hill()+p('M105 146 L111 88 H137 L144 146Z',C.wood)+g(124,76,[0,90,180,270].map(a=>g(0,0,p('M0 -2 L-12 -50 L18 -50 L15 -15Z',a%180?C.blue:C.yellow)+p('M-6 -35 H12','none',ink,2)+t(3,-20,'2',11),1,a)).join('')+c(0,0,11,C.coral),1)+leaf(74,150,.8,65)+sparkle(191,51,.7));

// Definition cards have their own visual memory cues, even though they do not appear in the theorem garden.
card('nat_zero','后继是一阶一阶向上生长的小楼梯',hill()+stairs(51,103,1.35)+[ [65,137,'0'],[99,111,'1'],[133,84,'2'],[166,57,'3'] ].map(([x,y,txt])=>t(x,y,txt,16)).join('')+rabbit(180,33,.4)+leaf(39,132,.75,0));
card('addition','两队种子从两侧进入同一个果篮',hill()+seed(47,70,.66)+seed(82,67,.66,C.pink)+seed(177,66,.66)+seed(208,70,.66,C.coral)+arrow(72,94,97,108,C.blue,3)+arrow(185,94,160,108,C.blue,3)+basket(129,126,.95,3)+plus(128,58,.9));
card('multiplication','一排种子包展开成整齐的重复花坛',hill()+[49,85,121].map(x=>r(x,39,26,34,C.yellow,4)+seed(x+13,57,.32)).join('')+arrow(182,58,182,84,C.blue,4)+r(53,100,143,52,C.wood,8)+[0,1,2,3].map(i=>[0,1].map(j=>sprout(72+i*34,111+j*24,.57)).join('')).join(''));
card('exponentiation','枝条分叉成二再成四，展现反复相乘',hill()+p('M119 147 V119 M119 119 L70 88 M119 119 L171 88 M70 88 L41 54 M70 88 L95 54 M171 88 L145 54 M171 88 L201 54','none',C.brown,5)+[41,95,145,201].map(x=>seed(x,45,.52)).join('')+[70,171].map(x=>apple(x,85,.5,C.yellow)).join('')+c(119,145,10,C.lime)+t(119,148,'1',12));
card('implication','一把小钥匙打开通向花朵的门',hill()+p('M129 145 V59 Q162 28 195 59 V145Z',C.wood)+p('M138 144 V65 Q162 43 186 65 V144Z',C.cream)+flower(163,94,.55)+key(58,96,1,C.yellow,25)+arrow(89,100,119,100,C.blue,3),'logic');
card('forall','一朵大云把雨滴均匀送给每一株幼苗',hill()+cloud(120,56,.9)+[52,97,143,188].map(x=>p(`M${x} 88 L${x-3} 101`,'none',C.blue,3)+sprout(x,137,.88)).join('')+p('M32 153 H208','none',C.dark,3),'logic');
card('and','双口花盆中的两朵花都需要亮起来',hill()+pot(120,126,1.35,C.purple)+p('M119 112 L76 78 M120 112 L163 78','none',C.dark,5)+flower(75,65,.76,C.pink)+flower(164,65,.76,C.yellow)+check(73,118,.55)+check(166,118,.55),'logic');
card('or','两扇花园门任选一扇，小兔站在岔口',hill()+p('M120 154 V122 L54 77 M120 122 L184 77','none','#d3b281',14)+r(30,44,48,55,C.pink,20)+r(160,44,48,55,C.yellow,20)+flower(54,65,.3)+mushroom(184,69,.35,C.coral)+rabbit(120,127,.47),'logic');
card('not','一块禁止牌挡住与小花相冲突的雨云',hill()+cloud(120,85,.76,'#c2cbd9')+c(120,88,56,'none',{stroke:C.coral,'stroke-width':9})+p('M83 48 L158 128','none',C.coral,9)+flower(199,134,.44,C.yellow),'logic');
card('exists','许多叶子中找到一颗正在发光的果子',hill()+[ [52,91],[77,64],[116,109],[169,71],[196,112] ].map(([x,y])=>leaf(x,y,1.5,45)).join('')+apple(126,76,1,C.yellow)+sparkle(95,40,.8)+sparkle(162,35,.6)+arrow(52,139,91,117,C.blue,4),'logic');
card('iff','两座花屋之间有来回两条小桥',water()+r(26,82,52,55,C.pink,10)+p('M21 82 L52 51 L83 82Z',C.coral)+r(161,82,52,55,C.lime,10)+p('M156 82 L187 51 L218 82Z',C.dark)+face(52,113,.9)+face(187,113,.9)+arrow(89,91,149,91,C.blue,4)+arrow(149,116,89,116,C.coral,4),'logic');
card('function','种子经过小花工坊，变成一株幼苗',hill()+r(80,61,85,80,C.yellow,12)+p('M77 62 L122 33 L169 62Z',C.coral)+r(91,80,62,38,C.cream,8)+wheel(121,99,.49,C.blue)+seed(36,113,.6)+sprout(204,117,1.1)+arrow(53,111,72,111,C.blue,3)+arrow(174,111,189,111,C.blue,3),'logic');
card('composition','种子先经过蓝色工坊，再进入红色工坊',hill()+r(48,76,58,61,C.blue,8)+r(136,76,58,61,C.coral,8)+p('M42 76 L77 51 L112 76Z',C.purple)+p('M130 76 L165 51 L200 76Z',C.yellow)+seed(77,105,.45)+sprout(165,111,.65)+arrow(112,106,130,106,C.dark,3)+seed(25,133,.32)+flower(218,116,.4),'logic');
card('injective','不同颜色的三颗种子各自走上不同的花台',hill()+[ [52,C.pink],[120,C.yellow],[188,C.blue] ].map(([x,col])=>seed(x,131,.6,col)+arrow(x,105,x,82,C.dark,3)+pot(x,62,.55,col)+sprout(x,46,.62)).join(''),'logic');
card('surjective','每一个花盆都有至少一只小蜜蜂到达',hill()+[58,119,181].map(x=>pot(x,124,.61)+flower(x,89,.43,C.yellow)).join('')+[49,104,161,194].map(x=>bee(x,43,.4)).join('')+arrow(50,61,57,80,C.blue,2.7)+arrow(104,61,116,79,C.blue,2.7)+arrow(162,61,178,79,C.blue,2.7)+arrow(193,61,186,79,C.blue,2.7),'logic');
card('epsilon_delta','小花被嵌套的小围栏保护在任意精细的距离内',water()+e(120,114,86,40,'#dcefe6')+e(120,110,59,29,'#b5d3c6')+e(120,106,31,18,C.cream)+flower(120,73,.66,C.yellow)+p('M34 111 V70 M206 111 V70','none',C.blue,3)+p('M64 115 V87 M176 115 V87','none',C.coral,3)+t(42,62,'ε',24,C.blue)+t(181,78,'δ',22,C.coral),'analysis');
card('derivative','小蜗牛观察弯道上切线的方向',water()+graph('M47 133 Q138 135 189 42')+p('M94 145 L191 69','none',C.coral,5)+snail(142,82,.75)+arrow(58,58,89,58,C.dark,3)+arrow(89,58,89,36,C.dark,3),'analysis');
card('continuity','一根没有断开的花绳跨过小溪',water()+p('M28 75 C54 11 79 145 115 80 S171 21 210 96','none',C.dark,7)+[ [33,60],[76,88],[128,56],[186,60] ].map(([x,y],i)=>flower(x,y,.32,i%2?C.pink:C.yellow)).join('')+rabbit(122,124,.55)+check(183,139,.65),'analysis');
card('definite_integral','一只篮子收集区间内每一小块彩色面积',water()+basket(124,127,1.08,0)+[ [63,51],[100,43],[137,51],[175,44] ].map(([x,y],i)=>r(x,y,17,27,i%2?C.yellow:C.blue,3,{transform:`rotate(${i*7-10} ${x} ${y})`})).join('')+arrow(63,88,87,104,C.blue,3)+arrow(184,84,164,104,C.blue,3)+t(125,135,'∫',31),'analysis');
card('intervals','一条小路的两个门可选择打开或关闭',hill()+p('M43 105 H197','none',C.blue,13)+c(43,105,17,C.cream)+c(197,105,17,C.yellow)+p('M43 75 V40 M196 76 V40','none',C.brown,4)+p('M43 41 L74 47 L43 60Z',C.pink)+p('M196 41 L168 47 L196 60Z',C.lime)+rabbit(120,92,.55)+t(43,149,'a',17)+t(197,149,'b',17),'analysis');
card('integer','地面之上与地下都有编号的小台阶',hill()+p('M24 95 H216','none',C.dark,4)+stairs(51,99,.8)+stairs(116,49,.8)+t(67,141,'−1',16)+t(118,103,'0',17)+t(172,62,'1',17)+seed(198,110,.6)+sparkle(47,46,.65),'number');
card('dvd','所有果子刚好装进一样大的小盒子',hill()+[48,120,192].map(x=>r(x-27,93,54,43,C.wood,7)+apple(x-10,86,.41)+apple(x+12,86,.41)).join('')+p('M33 53 H207','none',C.blue,3)+p('M33 54 V66 M207 54 V66','none',C.blue,3)+t(120,46,'6 = 3 × 2',16)+check(120,153,.55),'number');
card('mod','两串果子分组后留下一样的一颗余果',hill()+r(27,69,75,35,C.wood,8)+r(27,116,122,35,C.wood,8)+rows(42,83,1,3,.8,'apple')+rows(42,131,1,5,.8,'apple')+apple(180,85,.62,C.yellow)+apple(180,134,.62,C.yellow)+p('M176 100 V108 M184 100 V108','none',C.dark,2)+t(121,46,'mod',15)+sparkle(204,56,.65),'number');
card('gcd','两段不同长度的栅栏由相同最长木板拼成',hill()+[0,1,2].map(i=>r(39+i*53,55,50,26,C.yellow,5)).join('')+[0,1].map(i=>r(39+i*53,100,50,26,C.blue,5)).join('')+r(162,101,44,27,C.cream,5)+t(184,119,'?',20)+p('M40 139 H91 M40 135 V145 M91 135 V145','none',C.coral,3)+t(66,161,'gcd',14),'number');
card('remainder','果子装满两篮后，剩下两颗金色小苹果',hill()+basket(60,103,.83,3)+basket(141,103,.83,3)+apple(188,137,.45,C.yellow)+apple(213,137,.45,C.yellow)+p('M174 99 V153 H223','none',C.coral,3)+t(201,83,'2',24)+sparkle(201,51,.7),'number');
card('false_elim','两把矛盾的钥匙打开通往任意花朵的门',hill()+p('M115 148 V58 Q151 23 187 58 V148Z',C.wood)+p('M126 146 V64 Q151 40 176 64 V146Z',C.cream)+flower(153,103,.65,C.pink)+key(48,65,.65,C.yellow,25)+key(48,124,.65,C.blue,-25)+p('M40 86 L61 105 M61 86 L40 105','none',C.coral,5)+arrow(81,95,110,95,C.dark,3),'logic');
for(const [id,n]of [['two_eq_succ_one',2],['three_eq_succ_two',3],['four_eq_succ_three',4]])card(id,`${n} 只小芽走上写着 ${n} 的台阶`,hill()+Array.from({length:n},(_,i)=>r(28+i*43,133-i*24,42,43+i*24,C.blue,5)+sprout(49+i*43,115-i*24,.65)+t(49+i*43,158-i*24,i+1,17)).join('')+sparkle(205,30,.8));
card('peano_zero','太阳照着标有零的起点石，第一颗种子准备出发',hill()+c(120,118,43,C.yellow)+t(120,139,'0',57)+seed(120,61,.8)+sparkle(54,55)+sparkle(188,50,.7));
card('peano_successor','一只小芽沿着永远向前的脚印走向新台阶',hill()+r(28,127,61,35,C.wood)+sprout(58,105,.9)+r(150,90,61,72,C.blue)+sprout(180,68,.9)+arrow(91,104,139,76,C.dark,4)+t(117,47,'succ',20));
card('peano_induction','第一块骨牌推动一整条发芽的骨牌桥',hill()+[0,1,2,3,4].map(i=>r(28+i*40,75-i*6,23,78,C.yellow,5)+sprout(40+i*40,61-i*6,.5)).join('')+arrow(24,157,217,157,C.dark,3)+t(118,34,'0 → 1 → …',19));
card('succ_add','队伍最左边的小芽搭上升高一步的电梯',hill()+r(30,94,52,63,C.blue)+flower(56,73,.65,C.yellow)+basket(152,121,.85,3)+arrow(91,101,127,101,C.dark,4)+t(120,40,'succ a + b',18));
card('mul_one','一排整齐的小花在花田中挥手',hill()+r(29,115,181,40,C.wood)+[0,1,2,3].map(i=>flower(52+i*44,91,.64,C.pink)).join('')+t(121,40,'× 1',25)+sparkle(201,57,.8));
card('succ_mul','花田旁新添一整列蓝色小花',hill()+[0,1,2].flatMap(i=>[0,1].map(j=>flower(50+i*43,70+j*53,.55,C.pink))).join('')+[0,1].map(j=>flower(185,70+j*53,.55,C.blue)).join('')+p('M160 40 V154','none',C.yellow,5)+t(120,28,'+ 一列',16));
card('add_mul','两只小花箱一起复制出两排花田',hill()+r(21,55,83,94,C.blue)+r(133,55,83,94,C.purple)+[0,1].flatMap(i=>[0,1].map(j=>flower(43+i*40,76+j*48,.5,C.yellow)+flower(154+i*40,76+j*48,.5,C.pink))).join('')+t(120,31,'(a + b) × c',18));
card('pow_two','四片小花田拼成方形，两个相同边长在招手',hill()+r(66,42,106,106,C.purple)+[0,1,2].flatMap(i=>[0,1,2].map(j=>flower(85+i*34,61+j*33,.32,C.yellow))).join('')+t(120,171,'a × a',20)+t(45,100,'a',20)+t(122,31,'a',20));
card('positivity','小太阳把平方花朵托在零刻度之上',hill()+p('M32 142 H209','none',C.dark,4)+t(31,164,'0',14)+flower(120,76,1.2,C.yellow)+p('M186 125 V54 M179 63 L186 54 L193 63','none',C.coral,4),'logic');
card('abs_value','零刻度两侧的小芽走相同距离回家',hill()+r(99,82,42,55,C.cream)+t(120,115,'0',27)+sprout(44,92,.9)+sprout(196,92,.9)+arrow(62,116,92,116,C.blue,3)+arrow(178,116,148,116,C.coral,3)+t(120,47,'|x|',24),'analysis');
card('integral_power','弧线下面的紫色小花一层层累积成面积',hill()+p('M31 142 H212 M38 149 V31','none',C.dark,3)+p('M43 136 Q129 130 199 42 L199 137Z',C.purple)+[0,1,2,3,4].map(i=>r(53+i*28,127-i*i*3,22,10+i*i*3,C.blue,3)).join('')+t(101,55,'xⁿ',28),'analysis');
card('integral_identity','三角形斜坡下的金色小花标出一半的面积',hill()+p('M34 140 L198 43 V140Z',C.yellow)+p('M34 140 H213 M34 140 V31','none',C.dark,3)+flower(151,106,.55,C.pink)+t(101,110,'½',32)+sparkle(200,29,.6),'analysis');
card('unknown','一本等待发现的新知识绘本',hill()+book(120,95,1.3)+sprout(120,71,.9)+sparkle(54,43,.8));

function butterfly(x,y) { return g(x,y,e(-5,-3,7,11,C.pink,{transform:'rotate(-25 -5 -3)'})+e(5,-3,7,11,C.yellow,{transform:'rotate(25 5 -3)'})+p('M0 -8 V9','none',C.brown,3),.65); }
function snail(x,y,s=1) { return g(x,y,p('M-27 14 Q-8 -3 18 10 Q39 -9 33 -20 L43 -21 Q46 8 38 21 H-24Z',C.lime)+c(-5,-3,21,C.yellow)+p('M-13 -3 Q-6 -18 5 -7 Q10 6 -4 8 Q-13 6 -8 -3','none',C.wood,3)+c(39,-19,2,ink,{stroke:'none'})+p('M36 -29 L39 -22','none',ink,2),s); }
function key(x,y,s=1,col=C.yellow,rot=0) { return g(x,y,c(-15,0,17,col)+c(-15,0,6,C.cream)+p('M1 -6 H39 V6 H30 V17 H20 V7 H1Z',col),s,rot); }
function crystal(x,y,s=1,col=C.purple) { return g(x,y,p('M0 -38 L22 -15 L17 26 L0 38 L-20 25 L-24 -12Z',col)+p('M0 -38 L-7 -5 L0 38 M-24 -12 L-7 -5 L22 -15 M-7 -5 L17 26','none','#f8f1d8',2.5),s); }

const palettes = { nature:['#f6f1d7','#e7edca'], logic:['#f6edf5','#eee0ee'], analysis:['#e9f5f5','#d3e7e8'], number:['#faf0d8','#eddbb8'] };
const manifest = {};
for (const [id,{meaning,body,family}] of Object.entries(scenes)) {
  const [top,bottom] = palettes[family];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180" role="img" aria-labelledby="title-${id}"><title id="title-${id}">${esc(meaning)}</title><defs><linearGradient id="paper" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><filter id="soft" x="-20%" y="-20%" width="140%" height="145%"><feDropShadow dx="0" dy="3" stdDeviation="1.5" flood-color="#78684d" flood-opacity=".14"/></filter><clipPath id="frame"><rect x="7" y="7" width="226" height="166" rx="25"/></clipPath></defs><rect x="6" y="6" width="228" height="168" rx="26" fill="url(#paper)" stroke="#fffdf0" stroke-width="9"/><g clip-path="url(#frame)" stroke-linecap="round" stroke-linejoin="round"><circle cx="39" cy="30" r="28" fill="#fffaf0" opacity=".45"/><circle cx="209" cy="144" r="44" fill="#fffaf0" opacity=".25"/><g filter="url(#soft)">${body}</g>${sparkle(218,24,.45,'#fff8dc')}${c(21,155,2,'#fff8dc',{stroke:'none'})}</g><rect x="6" y="6" width="228" height="168" rx="26" fill="none" stroke="#697b60" stroke-width="1.6" opacity=".35"/></svg>\n`;
  await writeFile(path.join(out, `${id}.svg`),svg,'utf8');
  manifest[id] = { file:`/assets/cards/${id}.svg`, description:meaning, family };
}
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
const moduleText = `// Original storybook card illustrations. Generated by scripts/generate-card-art.mjs.\nconst descriptions = ${JSON.stringify(Object.fromEntries(Object.entries(scenes).map(([id,v])=>[id,v.meaning])),null,2)};\nconst escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));\nexport const cardArtIds = Object.freeze(Object.keys(descriptions));\nexport function cardArt(id, { className = 'card-art', label } = {}) {\n  const key = Object.hasOwn(descriptions, id) ? id : 'unknown';\n  const alt = label ?? descriptions[key];\n  return '<img class="'+escape(className)+'" src="/assets/cards/'+key+'.svg" width="240" height="180" alt="'+escape(alt)+'" decoding="async" draggable="false">';\n}\n`;
await writeFile(path.join(root,'public/card-art.js'),moduleText,'utf8');
console.log(`Generated ${Object.keys(scenes).length} original SVG card illustrations and public/card-art.js`);
