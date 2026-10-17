// Local-only preview of the real static production export, with the existing API.
import http from 'node:http';
import {stat,readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
const record=JSON.parse(await readFile('docs/agent-work/logs/current-production-check.json','utf8'));const root=resolve(record.directory,'out');const port=Number(process.argv[2]||8896);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.ico':'image/x-icon','.glb':'model/gltf-binary','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/')){
      const proxy=http.request({hostname:'127.0.0.1',port:3001,path:url.pathname+url.search,method:req.method,headers:{...req.headers,host:'127.0.0.1:3001'}},incoming=>{res.writeHead(incoming.statusCode,incoming.headers);incoming.pipe(res)});proxy.on('error',()=>{res.writeHead(502);res.end('API unavailable')});req.pipe(proxy);return;
    }
    let file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+sep)&&file!==root){res.writeHead(403);res.end();return}
    let info;try{info=await stat(file);if(info.isDirectory()){file=resolve(file,'index.html');info=await stat(file)}}catch{file=resolve(root,'404.html');info=await stat(file);res.statusCode=404}
    res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Accept-Ranges','bytes');
    const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);let start=0,end=info.size-1;
    if(range){start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;if(start>end){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return}res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`)}
    res.setHeader('Content-Length',end-start+1);if(req.method==='HEAD'){res.end();return}createReadStream(file,{start,end}).pipe(res);
  }catch{if(!res.headersSent)res.writeHead(500);res.end()}
});server.listen(port,'127.0.0.1',()=>console.log('Production export preview http://localhost:'+port));
