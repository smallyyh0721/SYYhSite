import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { hashPassword } from '../services/guestbook/owner-password.mjs';
await mkdir('.local',{recursive:true});
try { await access('.local/production-owner-credentials.txt'); console.log('Existing private owner credentials retained.'); }
catch {
  const password=randomBytes(24).toString('base64url');
  await writeFile('.local/production-owner.hash',(await hashPassword(password))+'\n',{mode:0o600,flag:'wx'});
  await writeFile('.local/production-owner-login.json',JSON.stringify({password}),{mode:0o600,flag:'wx'});
  await writeFile('.local/production-owner-credentials.txt',`SYYH V3 站主入口\nhttps://124.220.190.120/owner/\n\n口令：${password}\n\n此文件仅留在本机，不进入Git或镜像。\nSFTP：syyh-upload@124.220.190.120:22，沿用本机smallyyh.pem，目录/inbox。\n`,{mode:0o600,flag:'wx'});
  console.log('Created private local credentials and separate server password hash. No secret printed.');
}
