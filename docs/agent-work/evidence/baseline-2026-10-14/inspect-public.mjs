// Read-only public response inspection. No submissions, moderation or DB reads.
import { writeFile } from 'node:fs/promises';
const origin = 'http://124.220.190.120';
const names = ['server','content-type','cache-control','x-content-type-options','x-frame-options','referrer-policy','content-security-policy','content-security-policy-report-only','permissions-policy','strict-transport-security'];
const checks=[];
async function inspect(path, getBody=false) {
  try {
    const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});
    const headers=Object.fromEntries(names.map(name=>[name,response.headers.get(name)]));
    checks.push({path,status:response.status,headers});
    if(getBody)return await response.text();
    await response.body?.cancel();
  } catch(error) {checks.push({path,error:String(error)});}
}
const html=await inspect('/',true);
await Promise.all(['/hub/','/about/','/api/health','/health','/this-page-does-not-exist/','/media/world-v3/environment-night.webp'].map(path=>inspect(path)));
const script=html?.match(/<script[^>]+src="([^\"]+)"/i)?.[1];
if(script?.startsWith('/_next/static/')) await inspect(script);
const result={checkedAt:new Date().toISOString(),scope:'Read-only public GET headers; no write endpoints, port scan or vulnerability exploitation',origin,checks};
await writeFile('docs/agent-work/evidence/baseline-2026-10-14/public-headers.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({checkedAt:result.checkedAt,checks:checks.map(c=>({path:c.path,status:c.status,nosniff:c.headers?.['x-content-type-options'],frame:c.headers?.['x-frame-options'],csp:c.headers?.['content-security-policy'],error:c.error}))},null,2));
