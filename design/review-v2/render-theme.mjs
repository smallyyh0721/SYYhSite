// Code-native theme drawings. Existing raster island concepts remain untouched.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/yonghao.yu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const cfg=JSON.parse(await fs.readFile(new URL('./theme-proposal.json',import.meta.url)));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
function scene(mode){
 const c=cfg.themes[mode],isDay=mode==='day';
 const t=(x,y,s,size=14,fill=c.ink,extra='')=>`<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" ${extra}>${esc(s)}</text>`;
 const hud=(x,y,s,fill=c['ink-muted'],size=12)=>t(x,y,s,size,fill,'font-family="Consolas,monospace" letter-spacing="1.3"');
 const title=(x,y,s,size=72)=>t(x,y,s,size,c.ink,'font-family="Arial Narrow,Arial,sans-serif" font-weight="900" font-style="italic" letter-spacing="-2"');
 const r=(x,y,w,h,fill,stroke='none',extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
 const p=(d,stroke=c['line-hair'],fill='none',extra='')=>`<path d="${d}" stroke="${stroke}" fill="${fill}" ${extra}/>`;
 const l=(x,y,x2,y2,fill=c['line-hair'],extra='')=>p(`M${x} ${y}L${x2} ${y2}`,fill,'none',extra);
 function island(kind,x,y,scale){
  let shape=p('M-115 12L-20 -42 128 7 26 65Z',c['control-border'],c.surface)+p('M-115 12L-88 87 -49 140 -18 106 21 164 73 85 128 7 26 65Z',c['control-border'],c['surface-raised'])+p('M-88 87L26 65 21 164 M73 85L26 65',c['line-hair']);
  if(kind===0){shape+=p('M-54 -4v-81l17 -26 18 26v33h32v-69l18 -44 18 44v48h28v-27l17 -25 17 25v75',c.ink,c.surface,'stroke-width="1.6"')+p('M13 -120q17 -20 35 0',c.ink)+p('M-35 -87v54 M30 -103v89 M-51 -9L81 -9',c['line-hair'])+p('M71 42v60l-9 10v45',c.primary,'none','opacity=".6"');}
  if(kind===1){shape+=p('M-81 4v-59l18 -21 14 7v55 M-17 -4v-81q4 -62 67 -49 61 20 36 83l-11 32',c.ink,'none','stroke-width="8"')+p('M-14 -92L81 -73 M-4 -117L69 -118',c['line-hair'])+p('M-60 21q66 -41 138 -3l-30 25 -91 0Z',c.primary,c['surface-raised']);}
  if(kind===2){shape+=p('M-78 10q-91 -90 40 -165l-20 69 2 60 35 36',c.ink,c['surface-raised'],'stroke-width="1.7"')+p('M2 -14v-100l18 -18 19 31v69 M7 -105l27 4 M9 -78l23 -4 M65 -13q-5 -52 35 -50v42',c.ink,c.surface)+p('M-25 -62l-9 -34 66 16q-26 31 -57 18Z',c.ink,c.surface)+p('M-32 100l16 -37 19 54 15 -20',isDay?'#B75E18':'#E49849','none','stroke-width="2"');}
  if(kind===3){shape+=p('M-70 -2v-78l88 -47 73 49v75 M-86 -77L17 -135 106 -77 M-70 -50h158 M16 -116v112',c.ink,c.surface,'stroke-width="1.6"')+p('M-54 -37v-31h41v31Z M34 -40v-28h33v28Z',c['control-border'],isDay?'#D9EDFF':'#846548')+p('M-64 -5v-31h36v31 M34 -6v-26h34v26',c['line-hair'])+p('M-40 -111v-27h59 M88 -6v-67',c.ink)+`<circle cx="95" cy="-75" r="26" fill="${isDay?'#E5DCEC':'#514659'}"/><circle cx="111" cy="-57" r="22" fill="${isDay?'#E5DCEC':'#514659'}"/>`;}
  return `<g transform="translate(${x} ${y}) scale(${scale})">${shape}<ellipse cx="0" cy="86" rx="150" ry="38" stroke="${c.primary}" opacity=".25" fill="none" stroke-dasharray="3 8"/></g>`;
 }
 let s=r(0,0,1440,900,c.void);
 if(isDay){s+=`<ellipse cx="930" cy="158" rx="222" ry="57" fill="#FFFFFF" opacity=".55"/><ellipse cx="240" cy="682" rx="213" ry="76" fill="#FFFFFF" opacity=".48"/>`;}else{for(let i=0;i<75;i++){let x=62+(i*137)%1320,y=105+(i*67)%681;s+=`<circle cx="${x}" cy="${y}" r="${i%3===0?1.3:.6}" fill="#F3F1EA" opacity=".3"/>`;}}
 s+=title(48,51,'SYYH',29)+hud(175,47,'SIGNAL / WORLD / THE FOUR ISLANDS')+l(48,79,1392,79);
 s+=hud(931,47,'THEME',c['ink-muted'],11)+r(997,22,89,40,isDay?c.primary:c.surface,c['control-border'])+r(1090,22,89,40,!isDay?c.primary:c.surface,c['control-border'])+hud(1019,48,'DAY',isDay?c['on-primary']:c['ink-muted'])+hud(1104,48,'NIGHT',!isDay?c['on-primary']:c['ink-muted'])+hud(1230,47,'SOUND OFF');
 s+=hud(49,138,isDay?'DAY / 蓝白明亮':'NIGHT / 暗黑广播',c.primary,13)+title(45,224,'FOUR ISLANDS.',80)+t(50,270,'同一个世界，四种想象。移动鼠标，选择你的频率。',19,c['ink-muted']);
 s+=p('M442 420L1000 372 1070 655 444 689 442 420',c['line-hair'],'none','stroke-dasharray="5 9"')+p('M442 420L1000 372',c.primary,'none','stroke-dasharray="5 9"');
 s+=island(0,448,455,.94)+island(1,1009,400,.81)+island(2,460,719,.72)+island(3,1083,686,.8);
 s+=hud(188,375,'01 / SKY CITY',c.primary)+title(185,422,'天空之城',28)+r(187,449,179,45,c.primary)+t(206,478,'进入频道  ▶',14,c['on-primary'])+hud(1152,332,'02 / 远古地貌')+hud(230,735,'03 / 末日星球')+hud(1183,758,'04 / 宅岛')+l(48,838,1392,838)+hud(49,804,'3D布局示意 / 详细岛屿造型见概念图；栏目映射尚未确定',c['ink-muted'],12)+hud(49,872,'POINTER / MOVE     ENTER / CONFIRM     ESC / BACK')+hud(1110,872,'DESIGN REVIEW / V2');
 return s;
}
const wrap=(w,h,s)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g font-family="Microsoft YaHei,Arial,sans-serif">${s}</g></svg>`;
for(const mode of ['day','night']){const raw=wrap(1440,900,scene(mode));await fs.writeFile(new URL(`./theme-${mode}.svg`,import.meta.url),raw);await sharp(Buffer.from(raw)).png().toFile(new URL(`./theme-${mode}.png`,import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));}
const combined=wrap(1440,1820,scene('day')+'<g transform="translate(0 920)">'+scene('night')+'</g>');
await fs.writeFile(new URL('./theme-comparison.svg',import.meta.url),combined);await sharp(Buffer.from(combined)).png().toFile(new URL('./theme-comparison.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));
function lum(hex){let rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];}
const contrast=(a,b)=>{let x=lum(a),y=lum(b);return Number(((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2));};
const results={};for(const [mode,c] of Object.entries(cfg.themes)){results[mode]={bodyOnPage:contrast(c.ink,c.void),mutedOnPage:contrast(c['ink-muted'],c.void),bodyOnSurface:contrast(c.ink,c.surface),mutedOnSurface:contrast(c['ink-muted'],c.surface),button:contrast(c.primary,c['on-primary']),controlBorder:contrast(c['control-border'],c.surface)};for(const [key,v]of Object.entries(results[mode])){if(v<(key==='controlBorder'?3:4.5))throw Error(`Low contrast: ${mode}.${key} ${v}`);}}
await fs.writeFile(new URL('./contrast-check.json',import.meta.url),JSON.stringify(results,null,2));console.log(results);
