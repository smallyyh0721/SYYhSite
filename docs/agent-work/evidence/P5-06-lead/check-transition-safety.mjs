import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.argv[2]||'http://localhost:8896';
const out=process.argv[3]||'docs/agent-work/evidence/P5-06-lead/production-safety';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const checks=[],errors=[];
async function open(){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{
  window.__entries=0;const push=history.pushState;
  history.pushState=function(...args){if(String(args[2]).includes('/hub'))window.__entries++;return push.apply(this,args)};
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 return {context,page};
}
async function connect(page){await page.goto(origin+'/');await page.waitForFunction(()=>document.documentElement.dataset.clientReady==='true');await page.getByRole('button',{name:'CONNECT',exact:true}).click()}
async function entered(page,reason){await page.waitForURL(/\/hub\/?/);assert.deepEqual(await page.evaluate(()=>({count:window.__entries,reason:sessionStorage.getItem('syyh-greeting-reason')})),{count:1,reason})}
try{
 {const {context,page}=await open();try{
  await connect(page);await page.locator('[data-greeting-state="playing"]').waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-greeting-state="reduced"][data-greeting-frame="reach"]').waitFor();
  assert.equal(await page.locator('[data-greeting-figure] > div').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
  await page.waitForTimeout(1200);assert.ok(!page.url().includes('/hub'));
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))});
  await entered(page,'reduced');checks.push({name:'Live reduce stops motion; hidden still does not expire; one Hub entry',ok:true});
 }finally{await context.close()}}
 {const {context,page}=await open();try{
  await page.route('**/media/v2/greeting-image/*',r=>r.abort());await connect(page);
  await entered(page,'error');assert.equal(await page.locator('video,canvas').count(),0);
  checks.push({name:'Both approved image URLs failing still enter Hub once',ok:true});
 }finally{await context.close()}}
 {const {context,page}=await open();let unblock;const pending=new Promise(r=>unblock=r);try{
  await page.route('**/media/v2/greeting-image/*',async r=>{await pending;await r.abort().catch(()=>{})});
  await connect(page);await page.locator('[data-greeting-state="loading"]').waitFor();
  const start=Date.now();await page.getByRole('button',{name:'跳过',exact:true}).click();await entered(page,'skip');
  assert.ok(Date.now()-start<4000);checks.push({name:'Skip works while artwork is loading',ok:true});
 }finally{unblock();await context.close()}}
 assert.deepEqual(errors,[]);console.log('PASS independent transition safety: '+checks.length);
}finally{await writeFile(out+'/checks.json',JSON.stringify({origin,at:new Date().toISOString(),checks,errors,ok:checks.length===3&&!errors.length},null,2));await browser.close()}
