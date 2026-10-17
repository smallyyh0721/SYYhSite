import { mkdir, writeFile, access } from 'node:fs/promises';
import { hashPassword } from '../services/guestbook/owner-password.mjs';
for(const folder of ['.local/store/derived','.local/store/originals','.local/tls/edge','.local/tls/acme','.local/inbox']) await mkdir(folder,{recursive:true});
for(const file of ['.local/store/.syyh-store-id','.local/store/derived/.syyh-store-id']) await writeFile(file,'syyh-v3-local-fixture\n');
try { await access('.local/owner-password.json'); } catch {
  await writeFile('.local/owner-password.json',(await hashPassword('local-owner-test-2026'))+'\n',{mode:0o600,flag:'wx'});
}
console.log('Local-only fixture ready. Test passphrase: local-owner-test-2026. Never use this fixture on a public host.');
