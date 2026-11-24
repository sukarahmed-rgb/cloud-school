export async function tokenHash(token) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map(b => b.toString(16).padStart(2,'0')).join(''); }
// Security control plane: D1 revocation is authoritative; KV holds token sessions.
export async function securityState(env, userId) {
  return (await env.DB.prepare('SELECT session_version,suspended FROM account_security WHERE user_id=?').bind(userId).first()) || { session_version: 0, suspended: 0 };
}
export async function validateSecuritySession(env, session, token) {
  const revoked = await env.DB.prepare('SELECT token_hash FROM revoked_sessions WHERE token_hash=? AND expires_at>?').bind(await tokenHash(token), Date.now()).first();
  if (revoked) {return null;}
  const state = await securityState(env, session.userId);
  if (state.suspended || Number(session.securityVersion || 0) !== Number(state.session_version)) {return null;}
  const user = await env.DB.prepare('SELECT role FROM users WHERE id=?').bind(session.userId).first();
  // Do not trust a stale cached role after an administrator changes it.
  if (!user || user.role !== session.role) {return null;}
  return session;
}
export async function auditEvent(env, { actorId, action, resourceType, resourceId, outcome, requestId }) {
  const resourceHash = resourceId ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(resourceId)))].map(b => b.toString(16).padStart(2,'0')).join('') : null;
  await env.DB.prepare('INSERT INTO security_audit (id,occurred_at,actor_id,action,resource_type,resource_id,outcome,request_id) VALUES (?,?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), new Date().toISOString(), actorId || null, action, resourceType, resourceHash, outcome, requestId).run();
}
export function auditTarget(path, method) {
  const data = path.match(/^\/api\/data\/([a-z_]+)(?:\/([^/]+))?$/);
  if (data && ['curriculum_modules','assignments','submissions','students','notifications','exam_results'].includes(data[1])) {return { action: method, resourceType: data[1], resourceId: data[2] || null };}
  const safe = path.match(/^\/api\/(auth|access|security|admin)\/([a-z-]+)$/);
  if (safe && ['session','me','logout','firebase-login','firebase-register','status','directory','classes','memberships','approve-teacher','assign-record','invite-guardian','accept-guardian','revoke-guardian','revoke-sessions','audit','account','gemini-key','migrate'].includes(safe[2])) {return { action: `${method}:${safe[1]}:${safe[2]}`, resourceType: safe[1], resourceId: null };}
  return { action: method, resourceType: 'api', resourceId: null };
}
export async function securityRoutes(request, env, session, respond) {
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/api/security/')) {return null;}
  if (!session) {return respond({ error: 'Not authenticated' }, 401);}
  if (path === '/api/security/revoke-sessions' && request.method === 'POST') {
    await env.DB.prepare('INSERT INTO account_security (user_id,session_version,suspended,updated_at) VALUES (?,1,0,?) ON CONFLICT(user_id) DO UPDATE SET session_version=session_version+1,updated_at=excluded.updated_at').bind(session.userId, new Date().toISOString()).run();
    return respond({ success: true, signedOutEverywhere: true });
  }
  if (session.role !== 'admin') {return respond({ error: 'Administrator required' }, 403);}
  if (path === '/api/security/status' && request.method === 'GET') {
    const counts = await env.DB.prepare('SELECT outcome,count(*) AS count FROM security_audit GROUP BY outcome').all();
    return respond({ controls: { databaseSessionRevocation: true, roleRevalidation: true, metadataAudit: true }, auditCounts: counts.results || [], liveMonitoringConnected: false, backupScheduleVerified: false });
  }
  if (path === '/api/security/audit' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT occurred_at,actor_id,action,resource_type,resource_id,outcome,request_id FROM security_audit ORDER BY occurred_at DESC LIMIT 100').all();
    return respond({ events: rows.results || [] });
  }
  if (path === '/api/security/account' && request.method === 'POST') {
    let body; try { body = await request.json(); } catch { return respond({error:'Invalid JSON'},400); }
    if (!body || typeof body.userId !== 'string' || typeof body.suspended !== 'boolean') {return respond({error:'Account and suspension state required'},400);}
    if (body.userId === session.userId) {return respond({error:'Use another administrator to change your own suspension'},409);}
    const user = await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(body.userId).first();
    if (!user) {return respond({error:'Account not found'},404);}
    await env.DB.prepare('INSERT INTO account_security (user_id,session_version,suspended,updated_at) VALUES (?,1,?,?) ON CONFLICT(user_id) DO UPDATE SET session_version=session_version+1,suspended=excluded.suspended,updated_at=excluded.updated_at').bind(body.userId, body.suspended ? 1 : 0, new Date().toISOString()).run();
    return respond({success:true});
  }
  return respond({error:'Not found'},404);
}
