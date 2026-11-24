import { test } from 'node:test';
import { Buffer } from 'node:buffer';
import { webcrypto as crypto } from 'node:crypto';
import { TextEncoder } from 'node:util';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import worker from '../../worker/index.js';

// Real SQLite schema and real Worker handler. All identities and data are synthetic.
function setup(role = 'student', userId = 'student-a') {
  const db = new DatabaseSync(':memory:');
  for (const file of [
    '0000_init.sql',
    '0001_gemini_cache.sql',
    '0002_rate_limits_and_indexes.sql',
    '0003_scoped_access.sql',
    '0004_security_controls.sql',
  ]) {
    db.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), 'utf8'));
  }
  const insert = db.prepare('INSERT INTO users (id,email,parent_contact,role) VALUES (?,?,?,?)');
  insert.run('student-a', 'a@example.invalid', 'parent-a@example.invalid', 'student');
  insert.run('student-b', 'b@example.invalid', 'parent-b@example.invalid', 'student');
  insert.run('parent-a', 'parent-a@example.invalid', '', 'parent');
  insert.run('parent-b', 'parent-b@example.invalid', '', 'parent');
  db.exec(`INSERT INTO school_classes VALUES ('class-a','Class A','admin','now');
    INSERT INTO teacher_approvals VALUES ('teacher-a',1,'admin','now');
    INSERT INTO class_memberships VALUES ('class-a','teacher-a','teacher');
    INSERT INTO class_memberships VALUES ('class-a','student-a','student');
    INSERT INTO guardian_links VALUES ('parent-a','student-a','admin','now');
    INSERT INTO assignments (id,data,class_id) VALUES ('assignment-a','{}','class-a');`);
  for (const table of ['submissions', 'exam_results']) {
    for (const student of ['student-a', 'student-b']) {
      db.prepare(
        `INSERT INTO ${table} (id,data,student_id,created_by,class_id) VALUES (?,?,?,?,?)`,
      ).run(
        `${table}-${student}`,
        JSON.stringify({ studentAnswer: 'synthetic private answer' }),
        student,
        student,
        'class-a',
      );
    }
  }
  if (['teacher','admin','parent'].includes(role)) db.prepare('INSERT OR IGNORE INTO users (id,email,role) VALUES (?,?,?)').run(userId, userId+'@example.invalid', role);
  const env = {
    CORS_ORIGIN: 'https://cloud-school-6251a.web.app',
    SESSIONS: { put: async () => {}, delete: async () => {}, get: async () => JSON.stringify({ userId, role, expiresAt: Date.now() + 60000 }) },
    DB: {
      prepare(sql) {
        const stmt = db.prepare(sql);
        let args = [];
        return {
          bind(...values) {
            args = values;
            return this;
          },
          async first() {
            return stmt.get(...args) || null;
          },
          async all() {
            return { results: stmt.all(...args) };
          },
          async run() {
            stmt.run(...args);
            return { success: true };
          },
        };
      },
    },
  };
  return {
    db,
    env,
    async request(path, method = 'GET', body, origin = 'https://cloud-school-6251a.web.app') {
      const result = await worker.fetch(
        new Request(
          path.startsWith('/api/')
            ? `https://test.invalid${path}`
            : `https://test.invalid/api/data/${path}`,
          {
            method,
            headers: {
              Cookie: 'cloud_school_sid=synthetic',
              Origin: origin,
              'Content-Type': 'application/json',
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          },
        ),
        env,
        { waitUntil(promise) { promise.catch(() => {}); } },
      );
      return { status: result.status, body: await result.json() };
    },
  };
}

for (const collection of ['submissions', 'exam_results']) {
  test(`${collection}: student lists and reads only own records`, async () => {
    const s = setup();
    assert.equal((await s.request(collection)).body.length, 1);
    assert.equal((await s.request(`${collection}/${collection}-student-a`)).status, 200);
    assert.equal((await s.request(`${collection}/${collection}-student-b`)).status, 403);
    s.db.close();
  });
  test(`${collection}: parent can read linked child, not unrelated child`, async () => {
    const s = setup('parent', 'parent-a');
    assert.equal((await s.request(collection)).body.length, 1);
    assert.equal((await s.request(`${collection}/${collection}-student-a`)).status, 200);
    assert.equal((await s.request(`${collection}/${collection}-student-b`)).status, 403);
    s.db.close();
  });
  test(`${collection}: parent with no linked children has no access`, async () => {
    const s = setup('parent', 'unknown-parent');
    assert.deepEqual((await s.request(collection)).body, []);
    assert.equal((await s.request(`${collection}/${collection}-student-a`)).status, 403);
    s.db.close();
  });
  test(`${collection}: students create own data, cannot set grades or ownership`, async () => {
    const s = setup();
    const created = await s.request(collection, 'POST', {
      quizId: 'assignment-a',
      studentName: 'Synthetic student',
      studentAnswer: 'My answer',
      answers: ['My answer'],
      classId: 'class-a',
      score: 100,
      initialScore: 100,
      graderFeedback: 'fake',
      student_id: 'student-b',
      studentId: 'student-b',
      created_by: 'student-b',
      createdBy: 'student-b',
    });
    assert.equal(created.status, 201);
    const row = s.db.prepare(`SELECT * FROM ${collection} WHERE id = ?`).get(created.body.id);
    const data = JSON.parse(row.data);
    assert.equal(row.created_by, 'student-a');
    assert.equal(row.student_id, 'student-a');
    assert.equal(data.score, undefined);
    assert.equal(data.initialScore, undefined);
    assert.notEqual(data.graderFeedback, 'fake');
    if (collection === 'submissions') {
      assert.equal(data.studentAnswer, 'My answer');
      assert.equal(row.assignment_id, 'assignment-a');
    } else {
      assert.deepEqual(data.answers, ['My answer']);
    }
    assert.equal((await s.request(`${collection}/${created.body.id}`)).status, 200);
    assert.equal(
      (await s.request(`${collection}/${collection}-student-b`, 'PUT', { studentAnswer: 'tamper' }))
        .status,
      403,
    );
    assert.equal((await s.request(`${collection}/${collection}-student-b`, 'DELETE')).status, 403);
    s.db.close();
  });
  test(`${collection}: student update preserves ownership and grades`, async () => {
    const s = setup();
    const id = `${collection}-student-a`;
    const updated = await s.request(`${collection}/${id}`, 'PUT', {
      studentAnswer: 'Updated answer',
      answers: ['Updated answer'],
      score: 100,
      studentId: 'student-b',
      created_by: 'student-b',
    });
    assert.equal(updated.status, 200);
    const row = s.db.prepare(`SELECT * FROM ${collection} WHERE id = ?`).get(id);
    assert.equal(row.student_id, 'student-a');
    assert.equal(row.created_by, 'student-a');
    assert.equal(JSON.parse(row.data).score, undefined);
    s.db.close();
  });
  test(`${collection}: parent cannot create, and hostile origin is rejected`, async () => {
    const parent = setup('parent', 'parent-a');
    assert.equal((await parent.request(collection, 'POST', {})).status, 403);
    parent.db.close();
    const student = setup();
    assert.equal(
      (await student.request(collection, 'POST', {}, 'https://untrusted.invalid')).status,
      403,
    );
    student.db.close();
  });
  test(`${collection}: approved teacher sees assigned-class students only`, async () => {
    const s = setup('teacher', 'teacher-a');
    assert.equal((await s.request(collection)).body.length, 1);
    assert.equal((await s.request(`${collection}/${collection}-student-b`)).status, 403);
    s.db.close();
  });
}

test('stored ownership wins over forged JSON ownership on reads and writes', async () => {
  const s = setup();
  s.db
    .prepare('UPDATE exam_results SET data = ? WHERE id = ?')
    .run(
      JSON.stringify({ created_by: 'student-a', createdBy: 'student-a' }),
      'exam_results-student-b',
    );
  assert.equal((await s.request('exam_results/exam_results-student-b')).status, 403);
  assert.equal(
    (await s.request('exam_results/exam_results-student-b', 'PUT', { answers: [] })).status,
    403,
  );
  assert.equal((await s.request('exam_results/exam_results-student-b', 'DELETE')).status, 403);
  s.db.close();
});

test('student still cannot create curriculum or read student directory', async () => {
  const s = setup();
  assert.equal(
    (await s.request('curriculum_modules', 'POST', { title: 'unauthorized' })).status,
    403,
  );
  assert.equal((await s.request('students')).status, 403);
  s.db.close();
});

test('teacher cannot read, edit or delete another class work even for a shared student', async () => {
  const s = setup('teacher', 'teacher-a');
  s.db.exec(`INSERT INTO school_classes VALUES ('class-b','B','admin','now');
    INSERT INTO class_memberships VALUES ('class-b','student-a','student');
    UPDATE submissions SET class_id='class-b' WHERE id='submissions-student-a';
    UPDATE exam_results SET class_id='class-b' WHERE id='exam_results-student-a';`);
  for (const collection of ['submissions', 'exam_results']) {
    const id = collection + '-student-a';
    assert.deepEqual((await s.request(collection)).body, []);
    assert.equal((await s.request(collection + '/' + id)).status, 403);
    assert.equal(
      (await s.request(collection + '/' + id, 'PUT', { studentAnswer: 'tamper' })).status,
      403,
    );
    assert.equal((await s.request(collection + '/' + id, 'DELETE')).status, 403);
  }
  s.db.close();
});

test('ordinary update cannot move legacy divergent JSON ownership or class', async () => {
  const s = setup('teacher', 'teacher-a');
  s.db
    .prepare('UPDATE submissions SET data=? WHERE id=?')
    .run(
      JSON.stringify({ classId: 'other-class', studentId: 'student-b', createdBy: 'student-b' }),
      'submissions-student-a',
    );
  const result = await s.request('submissions/submissions-student-a', 'PUT', {
    graderFeedback: 'reviewed',
  });
  assert.equal(result.status, 200);
  const stored = s.db.prepare('SELECT * FROM submissions WHERE id=?').get('submissions-student-a');
  assert.equal(stored.class_id, 'class-a');
  assert.equal(stored.student_id, 'student-a');
  assert.equal(stored.created_by, 'student-a');
  assert.equal(JSON.parse(stored.data).classId, 'class-a');
  s.db.close();
});

test('unapproved teacher has no data access despite old teacher role session', async () => {
  const s = setup('teacher', 'teacher-a');
  s.db.exec('DELETE FROM teacher_approvals');
  assert.deepEqual((await s.request('submissions')).body, []);
  assert.equal((await s.request('submissions/submissions-student-a')).status, 403);
  assert.equal(
    (await s.request('curriculum_modules', 'POST', { classId: 'class-a', title: 'not approved' }))
      .status,
    403,
  );
  assert.equal(
    (
      await s.request('/api/access/approve-teacher', 'POST', {
        userId: 'teacher-a',
        approved: true,
      })
    ).status,
    403,
  );
  s.db.close();
});

test('parent contact string alone grants no access after migration', async () => {
  const s = setup('parent', 'parent-a');
  s.db.exec('DELETE FROM guardian_links');
  assert.deepEqual((await s.request('exam_results')).body, []);
  assert.equal((await s.request('exam_results/exam_results-student-a')).status, 403);
  s.db.close();
});

test('administrator approval and class membership controls validate roles and preserve records', async () => {
  const s = setup('admin', 'admin-a');
  s.db.exec(`INSERT INTO users (id,email,role) VALUES ('teacher-a','t@example.invalid','teacher')`);
  assert.equal(
    (
      await s.request('/api/access/approve-teacher', 'POST', {
        userId: 'student-a',
        approved: true,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await s.request('/api/access/approve-teacher', 'POST', {
        userId: 'teacher-a',
        approved: false,
      })
    ).status,
    200,
  );
  assert.equal(
    s.db.prepare('SELECT approved FROM teacher_approvals WHERE user_id=?').get('teacher-a')
      .approved,
    0,
  );
  assert.equal(
    (
      await s.request('/api/access/memberships', 'POST', {
        userId: 'student-a',
        classId: 'missing',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await s.request('/api/access/memberships', 'POST', {
        userId: 'student-a',
        classId: 'class-a',
        remove: true,
      })
    ).status,
    200,
  );
  assert.ok(s.db.prepare('SELECT id FROM users WHERE id=?').get('student-a'));
  s.db.close();
});

test('guardian invitation requires verified matching email, is admin-created and expiring', async () => {
  const admin = setup('admin', 'admin-a');
  const invite = await admin.request('/api/access/invite-guardian', 'POST', {
    studentId: 'student-a',
    parentEmail: 'parent-a@example.invalid',
  });
  assert.equal(invite.status, 201);
  assert.ok(invite.body.token);
  assert.equal(admin.db.prepare('SELECT count(*) AS n FROM guardian_invitations').get().n, 1);
  const stored = admin.db.prepare('SELECT * FROM guardian_invitations').get();
  assert.notEqual(stored.token_hash, invite.body.token);
  const parent = setup('parent', 'parent-a');
  parent.db.exec('DELETE FROM guardian_links');
  parent.db
    .prepare(
      'INSERT INTO guardian_invitations (token_hash,student_id,parent_email,created_by,expires_at) VALUES (?,?,?,?,?)',
    )
    .run(
      stored.token_hash,
      stored.student_id,
      stored.parent_email,
      stored.created_by,
      stored.expires_at,
    );
  assert.equal(
    (await parent.request('/api/access/accept-guardian', 'POST', { token: invite.body.token }))
      .status,
    403,
  );
  parent.db
    .prepare('UPDATE users SET data=? WHERE id=?')
    .run(JSON.stringify({ emailVerified: true }), 'parent-a');
  assert.equal(
    (await parent.request('/api/access/accept-guardian', 'POST', { token: invite.body.token }))
      .status,
    200,
  );
  assert.equal(
    (await parent.request('/api/access/accept-guardian', 'POST', { token: invite.body.token }))
      .status,
    403,
  );
  assert.equal(parent.db.prepare('SELECT count(*) AS n FROM guardian_links').get().n, 1);
  admin.db.close();
  parent.db.close();
});

test('UID mismatch does not inherit a known email account role or relink records', async () => {
  const s = setup();
  s.db
    .prepare('UPDATE users SET firebase_uid=?,role=? WHERE id=?')
    .run('stored-admin-uid', 'admin', 'student-a');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        users: [{ localId: 'different-uid', email: 'a@example.invalid', emailVerified: true }],
      }),
    );
  try {
    const r = await s.request('/api/auth/firebase-login', 'POST', { idToken: 'synthetic-token' });
    assert.equal(r.status, 409);
    const row = s.db.prepare('SELECT firebase_uid,role FROM users WHERE id=?').get('student-a');
    assert.equal(row.firebase_uid, 'stored-admin-uid');
    assert.equal(row.role, 'admin');
  } finally {
    globalThis.fetch = originalFetch;
    s.db.close();
  }
});

test('unverified email cannot claim a legacy account', async () => {
  const s = setup();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        users: [{ localId: 'new-uid', email: 'a@example.invalid', emailVerified: false }],
      }),
    );
  try {
    assert.equal(
      (await s.request('/api/auth/firebase-login', 'POST', { idToken: 'synthetic-token' })).status,
      409,
    );
    assert.equal(
      s.db.prepare('SELECT firebase_uid FROM users WHERE id=?').get('student-a').firebase_uid,
      null,
    );
  } finally {
    globalThis.fetch = originalFetch;
    s.db.close();
  }
});

test('actual bytes enforce normal request size even without Content-Length', async () => {
  const s = setup();
  assert.equal(
    (await s.request('submissions', 'POST', { studentAnswer: 'x'.repeat(70000) })).status,
    413,
  );
  assert.equal((await s.request('/api/access/classes', 'POST', null)).status, 400);
  s.db.close();
});

test('MCQ scores are computed on the server, answer keys are not sent to students', async () => {
  const s = setup();
  s.db
    .prepare('UPDATE assignments SET data=? WHERE id=?')
    .run(
      JSON.stringify({ title: 'Test MCQ', type: 'mcq', correct: 'B', ideal: 'secret' }),
      'assignment-a',
    );
  const task = await s.request('assignments/assignment-a');
  assert.equal(task.status, 200);
  assert.equal(task.body.correct, undefined);
  assert.equal(task.body.ideal, undefined);
  const submitted = await s.request('submissions', 'POST', {
    quizId: 'assignment-a',
    studentAnswer: 'B',
    initialScore: 0,
  });
  assert.equal(submitted.status, 201);
  assert.equal(submitted.body.initialScore, 100);
  assert.equal(
    (await s.request('submissions/' + submitted.body.id, 'PUT', { studentAnswer: 'A' })).status,
    409,
  );
  s.db.close();
});


test('same retry identifier creates one durable answer and returns its original result', async () => {
 const s=setup();const body={clientMutationId:'synthetic-retry-0001',quizId:'assignment-a',studentAnswer:'first answer'};
 const first=await s.request('submissions','POST',body);const replay=await s.request('submissions','POST',{...body,studentAnswer:'different answer'});
 assert.equal(first.status,201);assert.equal(replay.status,200);assert.equal(first.body.id,replay.body.id);assert.equal(replay.body.studentAnswer,'first answer');
 assert.equal(s.db.prepare('SELECT count(*) AS n FROM submissions WHERE id=?').get(first.body.id).n,1);s.db.close();
});

for (const collection of ['curriculum_modules', 'assignments', 'students', 'notifications']) {
  test(`${collection}: approved teacher list matches direct scoped reads`, async () => {
    const s = setup('teacher', 'teacher-a');
    s.db.prepare(`INSERT INTO ${collection} (id,data,class_id) VALUES (?,?,?)`).run('scope-test', '{}', 'class-a');
    s.db.prepare(`INSERT INTO ${collection} (id,data,class_id) VALUES (?,?,?)`).run('unscoped-test', '{}', null);
    assert.equal((await s.request(collection + '/scope-test')).status, 200);
    const list = await s.request(collection);
    assert.equal(list.status, 200);
    assert.ok(list.body.some(r => r.id === 'scope-test'));
    assert.ok(!list.body.some(r => r.id === 'unscoped-test'));
    assert.equal((await s.request(collection + '/unscoped-test')).status, 403);
    s.db.close();
  });
}

test('expired, absent and malformed sessions fail closed without private records', async () => {
  for (const value of [null, 'broken', JSON.stringify({userId:'student-a',role:'student',expiresAt:1}), JSON.stringify({userId:'student-a',role:'superuser',expiresAt:Date.now()+60000})]) {
    const s=setup();s.env.SESSIONS.get=async()=>value;s.env.SESSIONS.delete=async()=>{};
    const result=await s.request('submissions');assert.equal(result.status,401);assert.equal(result.body.studentAnswer,undefined);s.db.close();
  }
});

test('approval, class membership and guardian revocations affect existing sessions immediately',async()=>{
  const t=setup('teacher','teacher-a');t.db.exec('UPDATE teacher_approvals SET approved=0');
  assert.equal((await t.request('submissions/submissions-student-a')).status,403);t.db.close();
  const s=setup();s.db.exec('DELETE FROM class_memberships');assert.equal((await s.request('assignments/assignment-a')).status,403);s.db.close();
  const p=setup('parent','parent-a');p.db.exec('DELETE FROM guardian_links');assert.equal((await p.request('submissions/submissions-student-a')).status,403);p.db.close();
});

test('retry keys are isolated by authenticated owner and collection; invalid keys are rejected',async()=>{
  const s=setup();const body={clientMutationId:'shared-key-0001',quizId:'assignment-a',studentAnswer:'A',classId:'class-a'};
  const a=await s.request('submissions','POST',body);assert.equal(a.status,201);
  s.db.exec("INSERT INTO class_memberships VALUES ('class-a','student-b','student')");
  s.env.SESSIONS.get=async()=>JSON.stringify({userId:'student-b',role:'student',expiresAt:Date.now()+60000});
  const b=await s.request('submissions','POST',body);assert.equal(b.status,201);assert.notEqual(b.body.id,a.body.id);
  const exam=await s.request('exam_results','POST',body);assert.equal(exam.status,201);assert.notEqual(exam.body.id,b.body.id);
  for(const key of ['', 'short', '../path-escape', {}, 'x'.repeat(121)]) assert.equal((await s.request('submissions','POST',{...body,clientMutationId:key})).status,400);
  s.db.close();
});

test('retry does not bypass revoked access to the original assignment',async()=>{
 const s=setup();const body={clientMutationId:'revoke-retry-001',quizId:'assignment-a',studentAnswer:'A'};
 assert.equal((await s.request('submissions','POST',body)).status,201);s.db.exec('DELETE FROM class_memberships');
 assert.equal((await s.request('submissions','POST',body)).status,403);s.db.close();
});

test('expired guardian invitation and mismatched verified email cannot grant access',async()=>{
 const s=setup('parent','parent-a');s.db.exec('DELETE FROM guardian_links');
 s.db.prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify({emailVerified:true}),'parent-a');
 const token='expired-synthetic-token';const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
 const insert=s.db.prepare('INSERT INTO guardian_invitations (token_hash,student_id,parent_email,created_by,expires_at) VALUES (?,?,?,?,?)');
 insert.run(hash,'student-a','parent-a@example.invalid','admin',1);
 assert.equal((await s.request('/api/access/accept-guardian','POST',{token})).status,403);
 s.db.prepare('UPDATE guardian_invitations SET expires_at=?,parent_email=?').run(Date.now()+60000,'other@example.invalid');
 assert.equal((await s.request('/api/access/accept-guardian','POST',{token})).status,403);
 assert.equal(s.db.prepare('SELECT count(*) AS n FROM guardian_links').get().n,0);s.db.close();
});

test('unknown collections and hostile mutation origins cannot access or alter records',async()=>{
 const s=setup('admin','admin-a');assert.equal((await s.request('users')).status,400);
 for(const origin of ['', 'null','https://cloud-school-6251a.web.app.attacker.invalid']) assert.equal((await s.request('/api/access/classes','POST',{name:'no'},origin)).status,403);
 assert.equal(s.db.prepare('SELECT count(*) AS n FROM school_classes').get().n,1);s.db.close();
});

for (const collection of ['curriculum_modules','assignments','students','notifications','submissions','exam_results']) {
 test(`${collection}: administrator create/update/read/delete roundtrip`,async()=>{
  const s=setup('admin','admin-a');const created=await s.request(collection,'POST',{title:'Synthetic',classId:'class-a',studentId:'student-a'});
  assert.equal(created.status,201);const path=collection+'/'+created.body.id;
  assert.equal((await s.request(path,'PUT',{title:'Updated synthetic'})).status,200);
  assert.equal((await s.request(path)).body.title,'Updated synthetic');
  assert.equal((await s.request(path,'DELETE')).status,200);assert.equal((await s.request(path)).status,404);s.db.close();
 });
}

test('teacher grade validation rejects invalid marks without modifying stored answer',async()=>{
 const s=setup('teacher','teacher-a');
 for(const score of [-1,101,'100',null]){
  const result=await s.request('submissions/submissions-student-a','PUT',{initialScore:score});
  assert.equal(result.status,400);
 }
 assert.equal((await s.request('submissions/submissions-student-a','PUT',{initialScore:75,score:999})).status,400);
 assert.equal((await s.request('submissions/submissions-student-a','PUT',{initialScore:75,status:'graded'})).status,200);
 assert.equal(JSON.parse(s.db.prepare('SELECT data FROM submissions WHERE id=?').get('submissions-student-a').data).initialScore,75);s.db.close();
});

for(const role of ['student','parent'])for(const collection of ['curriculum_modules','assignments']){
 test(`${role}: ${collection} drafts are denied on list and direct reads`,async()=>{
  const s=setup(role,role==='student'?'student-a':'parent-a');
  s.db.prepare(`INSERT INTO ${collection} (id,data,class_id) VALUES (?,?,?)`).run('private-draft',JSON.stringify({publicationStatus:'draft',title:'secret draft'}),'class-a');
  assert.equal((await s.request(collection+'/private-draft')).status,403);
  assert.ok(!(await s.request(collection)).body.some(r=>r.id==='private-draft'));
  if(role==='student'&&collection==='assignments')assert.equal((await s.request('submissions','POST',{quizId:'private-draft',studentAnswer:'attempt'})).status,403);
  s.db.close();
 });
}
test('teacher draft-preview-publication lifecycle remains class scoped',async()=>{
 const s=setup('teacher','teacher-a');
 const created=await s.request('curriculum_modules','POST',{classId:'class-a',title:'Draft lesson',subject:'Synthetic',unitTitle:'Unit',lessonTitle:'Lesson',publicationStatus:'draft'});
 assert.equal(created.status,201);assert.equal(created.body.publicationStatus,'draft');
 assert.equal((await s.request('curriculum_modules/'+created.body.id)).status,200);
 assert.equal((await s.request('curriculum_modules/'+created.body.id,'PUT',{publicationStatus:'published'})).status,200);
 assert.equal((await s.request('curriculum_modules/'+created.body.id,'PUT',{publicationStatus:'invalid'})).status,400);
 s.env.SESSIONS.get=async()=>JSON.stringify({userId:'student-a',role:'student',expiresAt:Date.now()+60000});
 const read=await s.request('curriculum_modules/'+created.body.id);assert.equal(read.status,200);assert.equal(read.body.unitTitle,'Unit');
 s.db.close();
});
test('draft filtering occurs before pagination so a draft cannot hide the published first page',async()=>{
 const s=setup();s.db.prepare('UPDATE assignments SET created_at=? WHERE id=?').run('2000','assignment-a');
 s.db.prepare('INSERT INTO assignments (id,data,class_id,created_at) VALUES (?,?,?,?)').run('new-draft',JSON.stringify({publicationStatus:'draft'}),'class-a','2099');
 const result=await s.request('/api/data/assignments?limit=1');assert.equal(result.status,200);assert.equal(result.body[0].id,'assignment-a');s.db.close();
});

test('registration rejects unknown roles instead of silently creating a student without age validation',async()=>{
 const s=setup();const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({users:[{localId:'new-role-uid',email:'new@example.invalid',emailVerified:true}]}));
 try{assert.equal((await s.request('/api/auth/firebase-register','POST',{idToken:'synthetic',role:'unexpected'})).status,400);assert.equal(s.db.prepare('SELECT count(*) AS n FROM users WHERE email=?').get('new@example.invalid').n,0);}finally{globalThis.fetch=original;s.db.close();}
});

test('server rejects a lesson link from another class rather than storing foreign metadata',async()=>{
 const s=setup('teacher','teacher-a');s.db.prepare('INSERT INTO curriculum_modules (id,data,class_id) VALUES (?,?,?)').run('other-lesson','{}','other-class');
 assert.equal((await s.request('assignments','POST',{classId:'class-a',title:'Test',lessonId:'other-lesson',publicationStatus:'draft'})).status,403);s.db.close();
});
test('assignment lesson links accept same class and reject cross-class update',async()=>{
 const s=setup('teacher','teacher-a');s.db.prepare('INSERT INTO curriculum_modules (id,data,class_id) VALUES (?,?,?)').run('same-lesson','{}','class-a');s.db.prepare('INSERT INTO curriculum_modules (id,data,class_id) VALUES (?,?,?)').run('foreign-lesson','{}','foreign-class');
 const a=await s.request('assignments','POST',{classId:'class-a',lessonId:'same-lesson',title:'linked'});assert.equal(a.status,201);
 assert.equal((await s.request('assignments/'+a.body.id,'PUT',{lessonId:'foreign-lesson'})).status,403);
 assert.equal((await s.request('assignments/'+a.body.id)).body.lessonId,'same-lesson');s.db.close();
});
test('invalid cookie encoding does not turn a private read into a 500',async()=>{
 const s=setup();const response=await worker.fetch(new Request('https://test.invalid/api/data/submissions',{headers:{Cookie:'cloud_school_sid=%ZZ'}}),s.env,{waitUntil(){}});assert.equal(response.status,401);s.db.close();
});

test('self revocation invalidates old sessions including an otherwise valid KV token',async()=>{
 const s=setup();assert.equal((await s.request('submissions')).status,200);
 assert.equal((await s.request('/api/security/revoke-sessions','POST',{})).status,200);
 assert.equal((await s.request('submissions')).status,401);s.db.close();
});
test('database role change rejects a cached privileged session',async()=>{
 const s=setup('admin','admin-a');s.db.prepare('UPDATE users SET role=? WHERE id=?').run('student','admin-a');
 assert.equal((await s.request('/api/access/directory')).status,401);s.db.close();
});
test('administrator suspension and reactivation require fresh sessions, never self suspension',async()=>{
 const s=setup('admin','admin-a');assert.equal((await s.request('/api/security/account','POST',{userId:'admin-a',suspended:true})).status,409);
 assert.equal((await s.request('/api/security/account','POST',{userId:'student-a',suspended:true})).status,200);
 s.env.SESSIONS.get=async()=>JSON.stringify({userId:'student-a',role:'student',expiresAt:Date.now()+60000});
 assert.equal((await s.request('submissions')).status,401);
 s.env.SESSIONS.get=async()=>JSON.stringify({userId:'admin-a',role:'admin',expiresAt:Date.now()+60000});
 assert.equal((await s.request('/api/security/account','POST',{userId:'student-a',suspended:false})).status,200);
 s.env.SESSIONS.get=async()=>JSON.stringify({userId:'student-a',role:'student',expiresAt:Date.now()+60000});
 assert.equal((await s.request('submissions')).status,401);
 const version=s.db.prepare('SELECT session_version FROM account_security WHERE user_id=?').get('student-a').session_version;
 s.env.SESSIONS.get=async()=>JSON.stringify({userId:'student-a',role:'student',securityVersion:version,expiresAt:Date.now()+60000});
 assert.equal((await s.request('submissions')).status,200);s.db.close();
});
test('audit captures metadata and request ID, not content or cookies; only admin reads audit',async()=>{
 const s=setup();const r=await s.request('submissions','POST',{quizId:'assignment-a',studentAnswer:'PRIVATE ANSWER SENTINEL'});assert.equal(r.status,201);
 const events=s.db.prepare('SELECT * FROM security_audit').all();assert.ok(events.length);assert.ok(events[0].request_id);
 assert.ok(!JSON.stringify(events).includes('PRIVATE ANSWER SENTINEL'));assert.ok(!JSON.stringify(events).includes('synthetic'));
 assert.equal((await s.request('/api/security/audit')).status,403);s.db.close();
});
test('rate limiter datastore failure stops authenticated private requests',async()=>{
 const s=setup();const original=s.env.DB.prepare;s.env.DB.prepare=sql=>{if(sql.includes('INSERT INTO rate_limits'))throw Error('synthetic failure');return original(sql);};
 assert.equal((await s.request('submissions')).status,429);s.db.close();
});
test('security control database failure denies cached sessions rather than using stale role',async()=>{
 const s=setup();const original=s.env.DB.prepare;s.env.DB.prepare=sql=>{if(sql.includes('FROM account_security'))throw Error('synthetic failure');return original(sql);};
 assert.equal((await s.request('submissions')).status,401);s.db.close();
});
test('audit read is administrator-only and a degraded audit sink does not duplicate a committed mutation',async()=>{
 const s=setup('admin','admin-a');assert.equal((await s.request('/api/security/status')).status,200);assert.equal((await s.request('/api/security/audit')).status,200);
 const prepare=s.env.DB.prepare;s.env.DB.prepare=sql=>{if(sql.startsWith('INSERT INTO security_audit'))throw Error('synthetic audit failure');return prepare(sql);};
 const r=await s.request('curriculum_modules','POST',{title:'one committed item',classId:'class-a'});assert.equal(r.status,201);
 assert.equal(s.db.prepare('SELECT count(*) AS n FROM curriculum_modules WHERE id=?').get(r.body.id).n,1);s.db.close();
});
test('suspended user cannot obtain a new token through login',async()=>{
 const s=setup();s.db.prepare('UPDATE users SET firebase_uid=? WHERE id=?').run('suspended-uid','student-a');
 s.db.prepare('INSERT INTO account_security VALUES (?,0,1,?)').run('student-a','now');const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({users:[{localId:'suspended-uid',email:'a@example.invalid',emailVerified:true}]}));
 try{assert.equal((await s.request('/api/auth/firebase-login','POST',{idToken:'synthetic'})).status,403);}finally{globalThis.fetch=original;s.db.close();}
});
test('logout tombstone rejects a stale KV replica and stores no raw token',async()=>{
 const s=setup();assert.equal((await s.request('/api/auth/logout','POST',{})).status,200);
 assert.equal((await s.request('submissions')).status,401);
 const row=s.db.prepare('SELECT * FROM revoked_sessions').get();assert.equal(row.token_hash.length,64);assert.ok(!row.token_hash.includes('synthetic'));s.db.close();
});
test('untrusted path fragments never become raw audit metadata',async()=>{
 const s=setup();await s.request('/api/access/private-sentinel-name');
 await s.request('/api/data/submissions/private-sentinel-record');
 const text=JSON.stringify(s.db.prepare('SELECT * FROM security_audit').all());assert.ok(!text.includes('private-sentinel'));s.db.close();
});
