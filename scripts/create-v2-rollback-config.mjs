import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const root=resolve(process.argv[2]||''),destination=process.argv[3];
if(!process.argv[2]||!destination||!(await stat(root)).isDirectory())throw Error('Pass the exported V2 HTML root and a NEW output config filename');
const hashes=new Set();let pages=0;
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())await walk(path);else if(item.isFile()&&item.name.endsWith('.html')){pages++;const html=await readFile(path,'utf8');for(const[,attrs,body]of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(!/\bsrc\s*=/.test(attrs)&&body.trim())hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);}}}}
await walk(root);if(!pages||!hashes.size)throw Error('No static V2 pages/inline scripts found; refusing an incomplete CSP');
// The fixed V2 GLTF texture decoder needs WebAssembly; JavaScript eval stays forbidden.
const csp=`default-src 'self'; script-src 'self' 'wasm-unsafe-eval' ${[...hashes].sort().join(' ')}; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
const config=`# Generated from fixed V2 image HTML: ${pages} pages, ${hashes.size} exact inline-script hashes.
pid /tmp/nginx.pid;
error_log /dev/stderr warn;
events { worker_connections 512; }
http {
 include /etc/nginx/mime.types;
 default_type application/octet-stream;
 server_tokens off;
 access_log /dev/stdout;
 client_body_temp_path /tmp/client_body;
 proxy_temp_path /tmp/proxy;
 fastcgi_temp_path /tmp/fastcgi;
 uwsgi_temp_path /tmp/uwsgi;
 scgi_temp_path /tmp/scgi;
 server {
  listen 3000;
  root /usr/share/nginx/html;
  index index.html;
  add_header Content-Security-Policy "${csp}" always;
  add_header Cache-Control "no-store" always;
  location = /health { default_type text/plain; return 200 'ok'; }
  location / { try_files $uri $uri/ =404; }
  error_page 404 /404.html;
  location = /404.html { internal; }
 }
}
`;
await writeFile(destination,config,{flag:'wx'});
console.log(`Saved rollback config for ${pages} HTML pages with ${hashes.size} exact script hashes. No script unsafe-inline/eval.`);
