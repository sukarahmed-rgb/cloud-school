/**
 * Unit tests for Cloudflare Worker pure functions
 */

// Pure functions extracted from worker/index.js
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return str
    .replace(/[<>&"'`]/g, '')
    .trim()
    .slice(0, 10000);
}

function stripMetaFields(obj) {
  const safe = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('_') && key !== 'id') {
      safe[key] = typeof value === 'string' ? value.slice(0, 10000) : value;
    }
  }
  return safe;
}

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach((pair) => {
    const [key, ...val] = pair.trim().split('=');
    if (key) {
      cookies[key.trim()] = decodeURIComponent(val.join('='));
    }
  });
  return cookies;
}

function setCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.httpOnly) {
    parts.push('HttpOnly');
  }
  if (opts.secure) {
    parts.push('Secure');
  }
  if (opts.sameSite) {
    parts.push(`SameSite=${opts.sameSite}`);
  }
  if (opts.path) {
    parts.push(`Path=${opts.path}`);
  }
  if (opts.maxAge) {
    parts.push(`Max-Age=${opts.maxAge}`);
  }
  return parts.join('; ');
}

function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`;
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function parseRole(role, adminInviteCode, envAdminCode) {
  const allowed = ['student', 'teacher', 'parent'];
  if (role === 'admin' && adminInviteCode && adminInviteCode === envAdminCode) {
    return 'admin';
  }
  return allowed.includes(role) ? role : 'student';
}

const ALLOWED_COLLECTIONS = new Set([
  'curriculum_modules',
  'assignments',
  'submissions',
  'students',
  'notifications',
  'exam_results',
]);

const COLLECTION_PERMISSIONS = {
  curriculum_modules: {
    read: ['student', 'teacher', 'admin', 'parent'],
    write: ['teacher', 'admin'],
  },
  assignments: { read: ['student', 'teacher', 'admin', 'parent'], write: ['teacher', 'admin'] },
  submissions: { read: ['teacher', 'admin'], writeOwn: ['student'], write: ['teacher', 'admin'] },
  students: { read: ['teacher', 'admin'], write: ['teacher', 'admin'] },
  notifications: { read: ['student', 'teacher', 'admin', 'parent'], write: ['admin'] },
  exam_results: { read: ['teacher', 'admin'], writeOwn: ['student'], write: ['teacher', 'admin'] },
};

function checkAccess(session, collection, method, item) {
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return { allowed: false, error: 'Unknown collection' };
  }
  const perms = COLLECTION_PERMISSIONS[collection];
  const role = session.role;

  function canRead() {
    return perms.read.includes(role);
  }
  function canWrite(targetItem) {
    if (perms.write.includes(role)) {
      return true;
    }
    if (perms.writeOwn && perms.writeOwn.includes(role) && targetItem) {
      return targetItem.studentId === session.userId || targetItem._createdBy === session.userId;
    }
    return false;
  }

  if (method === 'GET') {
    if (!canRead()) {
      return { allowed: false, error: 'Forbidden' };
    }
    return { allowed: true };
  }
  if (method === 'POST') {
    if (!canWrite(null)) {
      return { allowed: false, error: 'Forbidden' };
    }
    return { allowed: true };
  }
  if (method === 'PUT' || method === 'DELETE') {
    if (!item) {
      return { allowed: false, error: 'Item not found' };
    }
    if (!canWrite(item)) {
      return { allowed: false, error: 'Forbidden' };
    }
    return { allowed: true };
  }
  return { allowed: false, error: 'Unknown method' };
}

describe('sanitizeString', () => {
  test('removes HTML special chars', () => {
    expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });
  test('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });
  test('truncates long strings', () => {
    const long = 'x'.repeat(20000);
    expect(sanitizeString(long).length).toBe(10000);
  });
  test('returns empty for non-string', () => {
    expect(sanitizeString(123)).toBe('');
    expect(sanitizeString(null)).toBe('');
  });
  test('preserves safe characters', () => {
    expect(sanitizeString('Hello, world! 123')).toBe('Hello, world! 123');
  });
});

describe('stripMetaFields', () => {
  test('removes underscore-prefixed keys', () => {
    const result = stripMetaFields({
      name: 'test',
      _secret: 'hidden',
      _createdBy: 'admin',
      data: 'value',
    });
    expect(result).toEqual({ name: 'test', data: 'value' });
  });
  test('removes id field', () => {
    const result = stripMetaFields({ id: 'abc123', name: 'test' });
    expect(result).toEqual({ name: 'test' });
  });
  test('truncates long string values', () => {
    const long = 'x'.repeat(20000);
    const result = stripMetaFields({ name: long });
    expect(result.name.length).toBe(10000);
  });
  test('preserves non-string types', () => {
    const result = stripMetaFields({ count: 42, active: true, tags: ['a', 'b'] });
    expect(result).toEqual({ count: 42, active: true, tags: ['a', 'b'] });
  });
});

describe('parseCookies', () => {
  test('parses single cookie', () => {
    expect(parseCookies('foo=bar')).toEqual({ foo: 'bar' });
  });
  test('parses multiple cookies', () => {
    expect(parseCookies('foo=bar; baz=qux')).toEqual({ foo: 'bar', baz: 'qux' });
  });
  test('handles URL-encoded values', () => {
    expect(parseCookies('sess=hello%20world')).toEqual({ sess: 'hello world' });
  });
  test('returns empty object for empty header', () => {
    expect(parseCookies('')).toEqual({});
    expect(parseCookies(null)).toEqual({});
  });
});

describe('setCookie', () => {
  test('basic cookie', () => {
    const result = setCookie('test', 'value');
    expect(result).toContain('test=value');
  });
  test('with options', () => {
    const result = setCookie('sess', 'token123', {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 3600,
    });
    expect(result).toContain('HttpOnly');
    expect(result).toContain('Secure');
    expect(result).toContain('SameSite=Lax');
    expect(result).toContain('Path=/');
    expect(result).toContain('Max-Age=3600');
  });
});

describe('clearCookie', () => {
  test('returns cookie clearing string', () => {
    const result = clearCookie('test');
    expect(result).toContain('test=');
    expect(result).toContain('Max-Age=0');
    expect(result).toContain('HttpOnly');
  });
});

describe('generateId', () => {
  test('generates UUID format', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  test('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('parseRole (admin invite code)', () => {
  const ADMIN_CODE = 'admin2026!Cloud';

  test('admin with correct invite code returns admin', () => {
    expect(parseRole('admin', ADMIN_CODE, ADMIN_CODE)).toBe('admin');
  });
  test('admin with wrong invite code falls back to student', () => {
    expect(parseRole('admin', 'wrong', ADMIN_CODE)).toBe('student');
  });
  test('teacher returns teacher', () => {
    expect(parseRole('teacher', null, ADMIN_CODE)).toBe('teacher');
  });
  test('student returns student', () => {
    expect(parseRole('student', null, ADMIN_CODE)).toBe('student');
  });
  test('unknown role falls back to student', () => {
    expect(parseRole('superadmin', null, ADMIN_CODE)).toBe('student');
  });
  test('admin without invite code falls back to student', () => {
    expect(parseRole('admin', null, ADMIN_CODE)).toBe('student');
  });
});

describe('RBAC - checkAccess', () => {
  const adminSession = { userId: 'a1', role: 'admin' };
  const teacherSession = { userId: 't1', role: 'teacher' };
  const studentSession = { userId: 's1', role: 'student' };
  const parentSession = { userId: 'p1', role: 'parent' };

  describe('curriculum_modules', () => {
    test('student can read', () => {
      expect(checkAccess(studentSession, 'curriculum_modules', 'GET').allowed).toBe(true);
    });
    test('student cannot write', () => {
      expect(checkAccess(studentSession, 'curriculum_modules', 'POST').allowed).toBe(false);
    });
    test('teacher can write', () => {
      expect(checkAccess(teacherSession, 'curriculum_modules', 'POST').allowed).toBe(true);
    });
  });

  describe('submissions', () => {
    test('teacher can read all', () => {
      expect(checkAccess(teacherSession, 'submissions', 'GET').allowed).toBe(true);
    });
    test('student can update own submission', () => {
      const ownItem = { studentId: 's1' };
      expect(checkAccess(studentSession, 'submissions', 'PUT', ownItem).allowed).toBe(true);
    });
    test('student cannot update others submission', () => {
      const otherItem = { studentId: 's2' };
      expect(checkAccess(studentSession, 'submissions', 'PUT', otherItem).allowed).toBe(false);
    });
    test('student cannot delete others submission', () => {
      const otherItem = { studentId: 's2' };
      expect(checkAccess(studentSession, 'submissions', 'DELETE', otherItem).allowed).toBe(false);
    });
    test('student cannot POST (only read own and write own)', () => {
      expect(checkAccess(studentSession, 'submissions', 'POST').allowed).toBe(false);
    });
  });

  describe('students', () => {
    test('student cannot read student list', () => {
      expect(checkAccess(studentSession, 'students', 'GET').allowed).toBe(false);
    });
    test('teacher can read student list', () => {
      expect(checkAccess(teacherSession, 'students', 'GET').allowed).toBe(true);
    });
    test('student cannot write students', () => {
      expect(checkAccess(studentSession, 'students', 'POST').allowed).toBe(false);
    });
  });

  describe('notifications', () => {
    test('student can read notifications', () => {
      expect(checkAccess(studentSession, 'notifications', 'GET').allowed).toBe(true);
    });
    test('parent can read notifications', () => {
      expect(checkAccess(parentSession, 'notifications', 'GET').allowed).toBe(true);
    });
    test('student cannot write notifications', () => {
      expect(checkAccess(studentSession, 'notifications', 'POST').allowed).toBe(false);
    });
    test('admin can write notifications', () => {
      expect(checkAccess(adminSession, 'notifications', 'POST').allowed).toBe(true);
    });
    test('teacher cannot write notifications', () => {
      expect(checkAccess(teacherSession, 'notifications', 'POST').allowed).toBe(false);
    });
  });

  describe('exam_results', () => {
    test('student cannot read exam_results list (teacher/admin only)', () => {
      expect(checkAccess(studentSession, 'exam_results', 'GET').allowed).toBe(false);
    });
    test('student cannot update others exam', () => {
      const other = { studentId: 's2' };
      expect(checkAccess(studentSession, 'exam_results', 'PUT', other).allowed).toBe(false);
    });
    test('teacher can update any exam', () => {
      const other = { studentId: 's2' };
      expect(checkAccess(teacherSession, 'exam_results', 'PUT', other).allowed).toBe(true);
    });
  });

  describe('unknown collection', () => {
    test('returns error for unknown collection', () => {
      expect(checkAccess(adminSession, 'secret_data', 'GET').error).toBe('Unknown collection');
    });
  });
});
