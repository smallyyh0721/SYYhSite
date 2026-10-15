import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.argv[2]||'http://localhost:8895';const out=process.argv[3]||'docs/agent-work/evidence/P5-06-lead/dev';
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
const checks=[];const errors=[];const forbidden=[];
try{
 for(const [theme,width,height] of [['day',1440,900],['night',1440,900],['day',390,844],['night',390,844],['day',320,568],['night',320,844]]){
  const context=await browser.newContext({viewport:{width,height}});
  await context.addInitScript(theme=>{
   localStorage.setItem('syyh-theme',theme);window.__frames=[];window.__hubEntries=0;
   const native=history.pushState;history.pushState=function(...args){if(String(args[2]).includes('/hub'))window.__hubEntries++;return native.apply(this,args)};
   new MutationObserver(()=>{const stage=document.querySelector('[data-greeting]');const frame=stage?.getAttribute('data-greeting-frame');if(frame&&window.__frames.at(-1)!==frame)window.__frames.push(frame)}).observe(document,{attributes:true,childList:true,subtree:true});
  },theme);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{if(/\.(glb|gltf|mp4|webm)(\?|$)/i.test(r.url()))forbidden.push(r.url())});
  try{
   await page.goto(origin+'/');await page.waitForFunction(()=>document.documentElement.dataset.clientReady==='true');
   assert.equal(await page.locator('video,canvas,[data-greeting]').count(),0);
   await page.getByRole('button',{name:'CONNECT',exact:true}).click();
   await page.locator('[data-greeting-renderer="animated-images"][data-greeting-state="playing"]').waitFor();
   assert.equal(await page.locator('video,canvas').count(),0);
   assert.equal(await page.locator('[data-greeting]').getAttribute('data-greeting-theme'),theme);
   for(const frame of ['cold','smile','reach']){
    await page.waitForFunction(frame=>{
     const stage=document.querySelector('[data-greeting]');const node=stage?.querySelector('[data-greeting-figure] [data-pose="'+frame+'"]');
     return stage?.getAttribute('data-greeting-frame')===frame&&node&&Number(getComputedStyle(node).opacity)>.99;
    },frame);
    if(frame==='reach'||width===1440)await page.screenshot({path:out+'/'+theme+'-'+width+'x'+height+'-'+frame+'.png'});
   }
   const skip=await page.getByRole('button',{name:'跳过',exact:true}).boundingBox();assert.ok(skip.height>=44&&skip.width>=44&&skip.y+skip.height<=height);
   const fit=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(fit.width<=fit.viewport);
   await page.waitForURL(/\/hub\/?/);
   const result=await page.evaluate(()=>({frames:window.__frames,entries:window.__hubEntries,reason:sessionStorage.getItem('syyh-greeting-reason')}));
   assert.deepEqual(result.frames,['cold','smile','reach']);assert.equal(result.entries,1);assert.equal(result.reason,'ended');
   checks.push({theme,width,height,result,ok:true});console.log('PASS original image sequence',theme,width,height);
  }catch(error){
   const state=await page.evaluate(()=>({url:location.href,reason:sessionStorage.getItem('syyh-greeting-reason'),stage:document.querySelector('[data-greeting]')?.outerHTML.slice(0,2000),frames:window.__frames,images:[...document.images].map(i=>({src:i.currentSrc,loaded:i.complete,width:i.naturalWidth})),resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('greeting-image')).map(e=>({url:e.name,duration:e.duration,bytes:e.transferSize}))})).catch(()=>null);
   await writeFile(out+'/failure.json',JSON.stringify({theme,width,height,error:String(error),state},null,2));
   throw error;
  }finally{await context.close()}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(forbidden,[]);
}finally{await writeFile(out+'/checks.json',JSON.stringify({at:new Date().toISOString(),origin,checks,errors,forbidden,ok:checks.length===6&&!errors.length&&!forbidden.length},null,2));await browser.close()}
