import { test, expect } from '@playwright/test';

// All identities are synthetic. External requests are intercepted, never sent.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') {return route.continue();}
    return route.fulfill({status:503, contentType:'application/json', body:'{}'});
  });
  await page.goto('/');
  await page.waitForFunction(() => typeof window.enterApp === 'function');
});

test('real IndexedDB preserves failed retries and never syncs another account or ownerless legacy data', async ({page}) => {
 const result = await page.evaluate(async()=>{
  const state=await import('/src/modules/app-state.js');
  const offline=await import('/src/modules/offline-sync.js');
  const session=id=>({serverId:id,name:id,contact:`${id}@example.invalid`,role:'student',serverAuth:true});
  state.setCurrentUserSession(session('synthetic-a'));
  await offline.queueOfflineSave('submissions',{studentAnswer:'private A'});
  const before=await offline.getPendingSaves();
  await new Promise((resolve,reject)=>{const req=indexedDB.open('cloud_school_offline',1);req.onsuccess=()=>{const tx=req.result.transaction('pending_saves','readwrite');tx.objectStore('pending_saves').add({collection:'submissions',data:{studentAnswer:'legacy unowned'}});tx.oncomplete=()=>{req.result.close();resolve();};tx.onerror=reject;};});
  state.setCurrentUserSession(session('synthetic-b'));
  const sent=[];await offline.syncOfflineData(async(c,d)=>sent.push(d));
  const bCount=sent.length;
  state.setCurrentUserSession(session('synthetic-a'));
  await offline.syncOfflineData(async(c,d)=>{sent.push(d);throw Error('lost response');});
  const failedCount=(await offline.getPendingSaves()).length;
  await offline.syncOfflineData(async(c,d)=>sent.push(d));
  return {bCount,failedCount,initialKey:before[0].data.clientMutationId,keys:sent.map(d=>d.clientMutationId),remaining:await offline.getPendingSaves()};
 });
 expect(result.bCount).toBe(0);expect(result.failedCount).toBe(2);
 expect(result.keys).toEqual([result.initialKey,result.initialKey]);
 expect(result.remaining).toHaveLength(1);expect(result.remaining[0].owner).toBeUndefined();
});

test('switch during queued sync stops before the next item', async({page})=>{
 const result=await page.evaluate(async()=>{
  const s=await import('/src/modules/app-state.js');const q=await import('/src/modules/offline-sync.js');
  s.setCurrentUserSession({serverId:'A',role:'student',serverAuth:true});
  await q.queueOfflineSave('submissions',{studentAnswer:'one'});await q.queueOfflineSave('submissions',{studentAnswer:'two'});
  let calls=0;await q.syncOfflineData(async()=>{calls++;s.setCurrentUserSession({serverId:'B',role:'student',serverAuth:true});});
  return {calls,left:(await q.getPendingSaves()).length};
 });
 expect(result).toEqual({calls:1,left:1});
});

test('delayed server response cannot populate the next account',async({page})=>{
 const result=await page.evaluate(async()=>{
  const s=await import('/src/modules/app-state.js');const b=await import('/src/modules/server-backend.js');
  s.setCurrentUserSession({serverId:'A',role:'student',serverAuth:true});b.setServerAvailable(true);
  const original=window.fetch;let release;
  const gate=new Promise(r=>release=r);window.fetch=async()=>{await gate;return new Response(JSON.stringify([{id:'private-A'}]),{headers:{'Content-Type':'application/json'}});};
  try{const pending=b.syncDataFromServer();s.setCurrentUserSession({serverId:'B',role:'student',serverAuth:true});release();await pending;return JSON.parse(JSON.stringify(s.localData));}finally{window.fetch=original;b.setServerAvailable(false);}
 });
 expect(result.submissions).toEqual([]);expect(result.books).toEqual([]);expect(result.assignments).toEqual([]);
});

test('account logout clears in-memory answers but restores only the correct private account cache',async({page})=>{
 const result=await page.evaluate(async()=>{
  const s=await import('/src/modules/app-state.js');const session=id=>({serverId:id,role:'student',serverAuth:true});
  s.setCurrentUserSession(session('A'));s.localData.submissions=[{id:'private-A'}];
  s.setCurrentUserSession(null);const loggedOut=s.localData.submissions.length;
  s.setCurrentUserSession(session('B'));const b=s.localData.submissions.length;
  s.setCurrentUserSession(session('A'));return {loggedOut,b,a:s.localData.submissions};
 });
 expect(result).toEqual({loggedOut:0,b:0,a:[{id:'private-A'}]});
});

test('mobile auth fits narrow viewport and keyboard can reach sign-in fields',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await page.waitForFunction(()=>document.getElementById('splash-screen').style.display==='none');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.locator('#login-username').focus();await expect(page.locator('#login-username')).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('#login-password')).toBeFocused();
 await page.screenshot({path:'/downloads/cloud-school-review/mobile-keyboard-validation.png'});
});

for(const role of ['admin','parent','teacher','student']) {
 test(`${role}: synthetic view survives denied access without exposing another role panel`,async({page})=>{
  await page.evaluate(role=>window.enterApp({serverId:`synthetic-${role}`,name:'Synthetic',contact:`${role}@example.invalid`,role,serverAuth:true}),role);
  await expect(page.locator(`#view-${role}`)).toBeVisible();
  await expect(page.locator('#dev-role-bar')).toBeHidden();
  for(const other of ['admin','parent','teacher','student'].filter(r=>r!==role)) {await expect(page.locator(`#view-${other}`)).toBeHidden();}
  // A local role panel is not a server authorization boundary. Server denial is tested separately.
 });
}
