import { getCurrentUserSession } from './app-state.js';
import { getProxyBase } from './gemini-client.js';
import { logout } from './auth.js';

async function api(path, body) {
  const r = await fetch(`${getProxyBase()}/api/security/${path}`, { credentials:'include', cache:'no-store', ...(body === undefined ? {} : { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }) });
  const data = await r.json(); if (!r.ok) {throw Error(data.error || 'تعذر تنفيذ طلب الأمان');} return data;
}
function element(tag, text, parent) { const e=document.createElement(tag); e.textContent=text; if(parent){parent.append(e);}return e; }
export function renderSecurityPanel() {
  document.getElementById('security-panel')?.remove();
  const session=getCurrentUserSession();if(!session?.serverAuth){return;}
  const view=document.getElementById(`view-${session.role}`);if(!view){return;}
  const panel=element('section','',view);panel.id='security-panel';panel.className='card p-6 my-4 border-2 rounded';
  element('h2','أمان الحساب',panel).className='text-2xl font-bold';
  const status=element('p','يمكنك إلغاء جميع جلسات الحساب بما فيها هذه الجلسة. الملفات المحفوظة على الأجهزة لا تمسح عن بعد.',panel);status.setAttribute('role','status');
  const revoke=element('button','تسجيل الخروج من كل الأجهزة',panel);revoke.type='button';revoke.className='p-3 my-3 border-2 rounded';
  let confirmed=false;
  revoke.onclick=async()=>{
    if(getCurrentUserSession()!==session){return;}
    if(!confirmed){confirmed=true;revoke.textContent='تأكيد إلغاء جميع جلساتي وتسجيل الخروج';return;}
    revoke.disabled=true;
    try{await api('revoke-sessions',{});if(getCurrentUserSession()===session){logout();}}
    catch(error){if(getCurrentUserSession()===session){status.textContent=error.message;}}
    finally{revoke.disabled=false;}
  };
  if(session.role!=='admin'){return;}
  element('h3','مركز الأمان',panel).className='text-xl font-bold';
  element('p','سجل أحداث تقني دون إجابات الطلاب أو كلمات المرور. ليس بديلا عن مراقبة سحابية أو نسخ احتياطي مجدول.',panel);
  const refresh=element('button','تحديث حالة الأمان وسجل الأحداث',panel);refresh.type='button';refresh.className='p-3 my-3 border-2 rounded';
  const summary=element('p','',panel);summary.setAttribute('role','status');
  const list=element('ol','',panel);
  refresh.onclick=async()=>{
    refresh.disabled=true;
    try{
      const [health,audit]=await Promise.all([api('status'),api('audit')]);if(getCurrentUserSession()!==session){return;}
      summary.textContent=`إعادة فحص الدور وإلغاء الجلسات: ${health.controls?.databaseSessionRevocation?'مفعلة':'غير مؤكدة'}. المراقبة السحابية والنسخ المجدول لم يتم التحقق منهما.`;
      list.replaceChildren();for(const event of audit.events||[]){element('li',`${event.occurred_at} | ${event.action} | ${event.resource_type} | ${event.outcome} | ${event.request_id}`,list);}
    }catch(error){if(getCurrentUserSession()===session){summary.textContent=error.message;}}finally{refresh.disabled=false;}
  };
  const form=element('form','',panel);form.className='p-3 border rounded';
  const label=element('label','معرف الحساب، من دليل الإدارة',form);const id=element('input','',label);id.required=true;id.name='userId';id.className='block p-2 my-2 border rounded';
  const modeLabel=element('label','الإجراء',form);const select=element('select','',modeLabel);select.className='block p-2 my-2 border rounded';
  for(const [value,text]of [['','اختر'],['true','إيقاف الحساب وإلغاء جلساته'],['false','إعادة تفعيل الحساب، يلزمه دخول جديد']]){const o=element('option',text,select);o.value=value;}
  select.required=true;const submit=element('button','تنفيذ إجراء الحساب المحدد',form);submit.type='submit';submit.className='p-3 border-2 rounded';
  form.onsubmit=async event=>{event.preventDefault();if(getCurrentUserSession()!==session){return;}submit.disabled=true;
    try{await api('account',{userId:id.value.trim(),suspended:select.value==='true'});if(getCurrentUserSession()===session){status.textContent='تم تغيير حالة الحساب وإلغاء الجلسات السابقة.';}}
    catch(error){if(getCurrentUserSession()===session){status.textContent=error.message;}}finally{submit.disabled=false;}
  };
}
window.addEventListener('school-account-changed',()=>document.getElementById('security-panel')?.remove());
