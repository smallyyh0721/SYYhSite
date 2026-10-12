import {readFileSync,writeFileSync} from 'node:fs';
import {compile} from './tokens-to-css.mjs';
const file='design/tokens.json';const tokens=JSON.parse(readFileSync(file,'utf8'));
tokens.version=2;tokens.color.themes=[{id:'night',name:'Night (default)'},{id:'day',name:'Day blue / white'},{id:'paper',name:'Legacy prototype / local About only'}];
const day={void:'#EDF6FF',surface:'#FFFFFF','surface-raised':'#E3F0FF',ink:'#143453','ink-muted':'#526B84',focus:'#145EC4','signal-text':'#145EC4','line-soft':'#9DB8CF','line-hair':'#9DB8CF',signal:'#145EC4','on-accent':'#FFFFFF'};
for(const token of tokens.color.tokens){if(day[token.name])token.value={...(typeof token.value==='object'?token.value:{night:token.value,paper:token.value}),day:day[token.name]}}
const semantic={raised:['#1F1F29','#E3F0FF'],muted:['#A3A2AD','#526B84'],primary:['#C8FF2E','#145EC4'],'on-primary':['#0A0A0E','#FFFFFF'],border:['#A3A2AD','#5E7B96'],hairline:['#555560','#9DB8CF'],sky:['#080D1B','#D9EDFF'],fog:['#0A0A0E','#EDF6FF']};
for(const [name,[night,d]] of Object.entries(semantic)){const token={name,value:{night,day:d,paper:night},usage:'Runtime semantic token; Paper is local to About.'};const at=tokens.color.tokens.findIndex(t=>t.name===name);if(at<0)tokens.color.tokens.push(token);else tokens.color.tokens[at]=token}
writeFileSync(file,JSON.stringify(tokens,null,2)+'\n');writeFileSync('design/tokens.css',compile(tokens));
