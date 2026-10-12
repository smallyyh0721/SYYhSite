// Read-only reference-source research; does not control the browser.
import fs from 'node:fs/promises';
const root = new URL('./references/', import.meta.url);
await fs.mkdir(root, {recursive:true});
const sites = {rikka:'https://rikkazzz.com/',ryuse1:'https://ryuse1-studio.com/',steffie:'https://steffieharner.netlify.app/',cyber:'https://cyberfiction-five.vercel.app/'};
const results = await Promise.all(Object.entries(sites).map(async ([id,url]) => {
  try {
    const res = await fetch(url,{signal:AbortSignal.timeout(25000)});
    const html = await res.text();
    await fs.writeFile(new URL(id+'.html',root),html);
    return {id,url,status:res.status,title:html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],bytes:Buffer.byteLength(html),scripts:[...html.matchAll(/<script[^>]*src=["']([^"']+)/g)].map(x=>x[1])};
  } catch(e) {return {id,url,error:e.message};}
}));
await fs.writeFile(new URL('access-log.json',root),JSON.stringify({capturedAt:new Date().toISOString(),browserStatus:'CUA Chrome fetch failed; IAB timed out. Sources only; existing local screenshots studied separately.',results},null,2));
console.log(JSON.stringify(results,null,2));
