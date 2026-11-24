import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('security center exposes real controls separately from unconfigured monitoring',async({page})=>{
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname==='127.0.0.1'){return route.continue();}
  let body={};let status=200;
  if(u.pathname==='/api/security/status'){body={controls:{databaseSessionRevocation:true}};}
  else if(u.pathname==='/api/security/audit'){body={events:[{occurred_at:'synthetic-time',action:'POST',resource_type:'assignments',outcome:403,request_id:'synthetic-request'}]};}
  else if(u.pathname==='/api/access/status'){body={classes:[]};}
  else if(u.pathname==='/api/access/directory'){body={users:[],classes:[],memberships:[],approvals:[]};}
  else if(u.pathname.startsWith('/api/data/')){body=[];}
  else {status=503;}
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/');await page.waitForFunction(()=>typeof window.enterApp==='function');
 await page.evaluate(()=>window.enterApp({serverId:'synthetic-admin',name:'مدير تجريبي',contact:'admin@example.invalid',role:'admin',serverAuth:true}));
 const panel=page.locator('#security-panel');await expect(panel).toBeVisible();await panel.getByRole('button',{name:'تحديث حالة الأمان وسجل الأحداث'}).click();await expect(panel).toContainText('synthetic-request');
 const result=await new AxeBuilder({page}).include('#security-panel').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([]);
 await page.setViewportSize({width:430,height:900});await panel.screenshot({path:'/downloads/cloud-school-integrated/security-center.png'});
 await page.evaluate(async()=>{const s=await import('/src/modules/app-state.js');s.setCurrentUserSession(null);});await expect(panel).toHaveCount(0);
});
