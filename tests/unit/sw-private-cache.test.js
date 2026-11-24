/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('private API requests bypass cache on canonical and same-origin backend routes',async()=>{
 const listeners={};const fetch=jest.fn(async()=>({ok:true}));const caches={match:jest.fn(),open:jest.fn()};
 runInNewContext(readFileSync('public/sw.js','utf8'),{self:{addEventListener:(name,fn)=>listeners[name]=fn},URL,fetch,caches,Response});
 for(const url of ['https://school.example.invalid/api/auth/session','https://school.example.invalid/api/data/submissions','https://cloud-school-api.cloud-school-subdomain.workers.dev/api/data/submissions']){
  let promise;listeners.fetch({request:{url,method:'GET'},respondWith:value=>promise=value});await promise;
 }
 expect(fetch).toHaveBeenCalledTimes(3);expect(caches.match).not.toHaveBeenCalled();expect(caches.open).not.toHaveBeenCalled();
 expect(fetch.mock.calls.every(args=>args[1].cache==='no-store')).toBe(true);
});

test('activation deletes prior private API caches instead of keeping the current API-cache label',async()=>{
 const listeners={};const removed=[];let pending;
 runInNewContext(readFileSync('public/sw.js','utf8'),{self:{addEventListener:(name,fn)=>listeners[name]=fn,clients:{claim:()=>{}}},caches:{keys:async()=>['cloud-school-api-v6','cloud-school-static-v5','cloud-school-static-v6'],delete:async key=>removed.push(key)}});
 listeners.activate({waitUntil:p=>pending=p});await pending;
 expect(removed).toContain('cloud-school-api-v6');expect(removed).toContain('cloud-school-static-v5');expect(removed).not.toContain('cloud-school-static-v6');
});
