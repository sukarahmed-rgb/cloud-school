// Server-side school access policy. All grants are administrator-controlled.
export async function teacherApproved(env, id) {
  return !!(await env.DB.prepare(
    'SELECT user_id FROM teacher_approvals WHERE user_id = ? AND approved = 1',
  )
    .bind(id)
    .first());
}
export async function classAllowed(env, session, classId) {
  if (session.role === 'admin') {
    return true;
  }
  if (!classId) {
    return false;
  }
  if (session.role === 'teacher' && !(await teacherApproved(env, session.userId))) {
    return false;
  }
  return !!(await env.DB.prepare(
    'SELECT user_id FROM class_memberships WHERE class_id = ? AND user_id = ? AND member_role = ?',
  )
    .bind(classId, session.userId, session.role)
    .first());
}
export async function guardianAllowed(env, parentId, studentId) {
  return !!(await env.DB.prepare(
    'SELECT student_id FROM guardian_links WHERE parent_id = ? AND student_id = ?',
  )
    .bind(parentId, studentId)
    .first());
}
export async function studentAllowed(env, session, studentId) {
  if (session.role === 'admin') {
    return true;
  }
  if (session.role === 'student') {
    return studentId === session.userId;
  }
  if (session.role === 'parent') {
    return guardianAllowed(env, session.userId, studentId);
  }
  if (session.role !== 'teacher' || !(await teacherApproved(env, session.userId))) {
    return false;
  }
  return !!(await env.DB.prepare(
    `SELECT s.user_id FROM class_memberships s JOIN class_memberships t ON t.class_id = s.class_id
    WHERE s.user_id = ? AND s.member_role = 'student' AND t.user_id = ? AND t.member_role = 'teacher'`,
  )
    .bind(studentId, session.userId)
    .first());
}
export function scopeFilter(session, collection) {
  if (session.role === 'admin') {
    return { sql: '1=1', args: [] };
  }
  const results = ['submissions', 'exam_results'].includes(collection);
  if (session.role === 'teacher') {
    const approval = 'EXISTS (SELECT 1 FROM teacher_approvals WHERE user_id = ? AND approved = 1)';
    if (results) {
      return {
        sql: `${approval} AND student_id IN (SELECT s.user_id FROM class_memberships s JOIN class_memberships t ON s.class_id=t.class_id WHERE s.member_role='student' AND t.member_role='teacher' AND t.user_id=?) AND class_id IN (SELECT class_id FROM class_memberships WHERE user_id=? AND member_role='teacher') AND EXISTS (SELECT 1 FROM class_memberships work_student WHERE work_student.user_id=student_id AND work_student.class_id=${collection}.class_id AND work_student.member_role='student')`,
        args: [session.userId, session.userId, session.userId],
      };
    }
    return {
      sql: `${approval} AND class_id IN (SELECT class_id FROM class_memberships WHERE user_id=? AND member_role='teacher')`,
      args: [session.userId, session.userId],
    };
  }
  if (session.role === 'parent') {
    if (results) {
      return {
        sql: 'student_id IN (SELECT student_id FROM guardian_links WHERE parent_id=?)',
        args: [session.userId],
      };
    }
    return {
      sql: 'class_id IN (SELECT class_id FROM class_memberships WHERE user_id IN (SELECT student_id FROM guardian_links WHERE parent_id=?))',
      args: [session.userId],
    };
  }
  if (results) {
    return { sql: 'created_by=?', args: [session.userId] };
  }
  return {
    sql: "class_id IN (SELECT class_id FROM class_memberships WHERE user_id=? AND member_role='student')",
    args: [session.userId],
  };
}
export async function recordAllowed(env, session, collection, row) {
  if (session.role === 'admin') {
    return true;
  }
  if (['student', 'parent'].includes(session.role) && ['curriculum_modules', 'assignments'].includes(collection)) {
    try { if (JSON.parse(row.data || '{}').publicationStatus === 'draft') {return false;} } catch { return false; }
  }
  if (['submissions', 'exam_results'].includes(collection)) {
    if (session.role === 'student') {
      return row.created_by === session.userId;
    }
    if (session.role === 'teacher') {
      if (!(await classAllowed(env, session, row.class_id))) {
        return false;
      }
      if (
        !(await env.DB.prepare(
          "SELECT user_id FROM class_memberships WHERE user_id=? AND class_id=? AND member_role='student'",
        )
          .bind(row.student_id, row.class_id)
          .first())
      ) {
        return false;
      }
    }
    return studentAllowed(env, session, row.student_id);
  }
  if (session.role === 'parent') {
    return !!(await env.DB.prepare(
      'SELECT m.user_id FROM class_memberships m JOIN guardian_links g ON g.student_id=m.user_id WHERE g.parent_id=? AND m.class_id=?',
    )
      .bind(session.userId, row.class_id)
      .first());
  }
  return classAllowed(env, session, row.class_id);
}
async function sha256(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function accessRoutes(request, env, session, respond) {
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/api/access/')) {
    return null;
  }
  if (!session) {
    return respond({ error: 'Not authenticated' }, 401);
  }
  if (path === '/api/access/status' && request.method === 'GET') {
    const classes = await env.DB.prepare(
      'SELECT c.id,c.name FROM school_classes c JOIN class_memberships m ON m.class_id=c.id WHERE m.user_id=?',
    )
      .bind(session.userId)
      .all();
    return respond({
      teacherApproved:
        session.role === 'teacher' ? await teacherApproved(env, session.userId) : null,
      classes: classes.results || [],
    });
  }
  if (path === '/api/access/directory' && request.method === 'GET') {
    if (session.role !== 'admin') {
      return respond({ error: 'Administrator required' }, 403);
    }
    const users = await env.DB.prepare(
      'SELECT id,name,email,role FROM users ORDER BY name LIMIT 500',
    ).all();
    const classes = await env.DB.prepare('SELECT id,name FROM school_classes ORDER BY name').all();
    const memberships = await env.DB.prepare('SELECT * FROM class_memberships').all();
    const approvals = await env.DB.prepare('SELECT user_id,approved FROM teacher_approvals').all();
    return respond({
      users: users.results,
      classes: classes.results,
      memberships: memberships.results,
      approvals: approvals.results,
    });
  }
  if (request.method !== 'POST') {
    return respond({ error: 'Method not allowed' }, 405);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return respond({ error: 'Invalid JSON' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return respond({ error: 'JSON object required' }, 400);
  }
  if (path === '/api/access/accept-guardian') {
    if (session.role !== 'parent') {
      return respond({ error: 'Parent account required' }, 403);
    }
    const account = await env.DB.prepare('SELECT email, data FROM users WHERE id=?')
      .bind(session.userId)
      .first();
    if (!account || !JSON.parse(account.data || '{}').emailVerified) {
      return respond({ error: 'Verified email required' }, 403);
    }
    const tokenHash = await sha256(String(body.token || ''));
    const invite = await env.DB.prepare(
      'SELECT * FROM guardian_invitations WHERE token_hash=? AND used_at IS NULL AND expires_at>?',
    )
      .bind(tokenHash, Date.now())
      .first();
    if (!invite || invite.parent_email !== account.email.toLowerCase()) {
      return respond({ error: 'Invalid or expired invitation' }, 403);
    }
    await env.DB.prepare(
      'INSERT OR IGNORE INTO guardian_links (parent_id,student_id,confirmed_by,confirmed_at) VALUES (?,?,?,?)',
    )
      .bind(session.userId, invite.student_id, invite.created_by, new Date().toISOString())
      .run();
    await env.DB.prepare('UPDATE guardian_invitations SET used_at=? WHERE token_hash=?')
      .bind(new Date().toISOString(), tokenHash)
      .run();
    return respond({ success: true });
  }
  if (session.role !== 'admin') {
    return respond({ error: 'Administrator required' }, 403);
  }
  if (path === '/api/access/classes') {
    const name = String(body.name || '')
      .trim()
      .slice(0, 200);
    if (!name) {
      return respond({ error: 'Class name required' }, 400);
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO school_classes (id,name,created_by,created_at) VALUES (?,?,?,?)',
    )
      .bind(id, name, session.userId, new Date().toISOString())
      .run();
    return respond({ id, name }, 201);
  }
  if (path === '/api/access/approve-teacher') {
    const user = await env.DB.prepare('SELECT role FROM users WHERE id=?')
      .bind(body.userId)
      .first();
    if (user?.role !== 'teacher') {
      return respond({ error: 'Teacher not found' }, 400);
    }
    await env.DB.prepare(
      'INSERT INTO teacher_approvals (user_id,approved,approved_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET approved=excluded.approved,approved_by=excluded.approved_by,updated_at=excluded.updated_at',
    )
      .bind(body.userId, body.approved === true ? 1 : 0, session.userId, new Date().toISOString())
      .run();
    return respond({ success: true });
  }
  if (path === '/api/access/memberships') {
    const user = await env.DB.prepare('SELECT role FROM users WHERE id=?')
      .bind(body.userId)
      .first();
    const cls = await env.DB.prepare('SELECT id FROM school_classes WHERE id=?')
      .bind(body.classId)
      .first();
    if (!cls || !['student', 'teacher'].includes(user?.role)) {
      return respond({ error: 'Valid class and student/teacher required' }, 400);
    }
    if (body.remove === true) {
      await env.DB.prepare('DELETE FROM class_memberships WHERE class_id=? AND user_id=?')
        .bind(body.classId, body.userId)
        .run();
    } else {
      await env.DB.prepare(
        'INSERT OR REPLACE INTO class_memberships (class_id,user_id,member_role) VALUES (?,?,?)',
      )
        .bind(body.classId, body.userId, user.role)
        .run();
    }
    return respond({ success: true });
  }
  if (path === '/api/access/assign-record') {
    const tables = {
      curriculum_modules: 'curriculum_modules',
      assignments: 'assignments',
      students: 'students',
      notifications: 'notifications',
      submissions: 'submissions',
      exam_results: 'exam_results',
    };
    const table = tables[body.collection];
    const cls = await env.DB.prepare('SELECT id FROM school_classes WHERE id=?')
      .bind(body.classId)
      .first();
    if (!table || !cls) {
      return respond({ error: 'Valid collection and class required' }, 400);
    }
    const row = await env.DB.prepare(`SELECT id,data FROM ${table} WHERE id=?`)
      .bind(body.recordId)
      .first();
    if (!row) {
      return respond({ error: 'Record not found' }, 404);
    }
    const data = JSON.parse(row.data || '{}');
    data.classId = body.classId;
    delete data.class_id;
    await env.DB.prepare(`UPDATE ${table} SET class_id=?,data=? WHERE id=?`)
      .bind(body.classId, JSON.stringify(data), body.recordId)
      .run();
    return respond({ success: true });
  }
  if (path === '/api/access/invite-guardian') {
    const student = await env.DB.prepare('SELECT role FROM users WHERE id=?')
      .bind(body.studentId)
      .first();
    const email = String(body.parentEmail || '')
      .trim()
      .toLowerCase();
    if (student?.role !== 'student' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return respond({ error: 'Valid student and parent email required' }, 400);
    }
    const token = crypto.randomUUID() + crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO guardian_invitations (token_hash,student_id,parent_email,created_by,expires_at) VALUES (?,?,?,?,?)',
    )
      .bind(await sha256(token), body.studentId, email, session.userId, Date.now() + 7 * 86400000)
      .run();
    return respond({ token, expiresInDays: 7 }, 201);
  }
  if (path === '/api/access/revoke-guardian') {
    await env.DB.prepare('DELETE FROM guardian_links WHERE parent_id=? AND student_id=?')
      .bind(body.parentId, body.studentId)
      .run();
    return respond({ success: true });
  }
  return respond({ error: 'Unknown access operation' }, 404);
}
