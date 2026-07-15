// Unit tests for Worker D1 helper functions

function camelToSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function rowToItem(row) {
  if (!row) return null;
  let data = {};
  try { data = JSON.parse(row.data || '{}'); } catch (e) { data = {}; }
  const item = { ...data, id: row.id };
  if (!item.created_by && row.created_by) item.created_by = row.created_by;
  if (!item.created_at && row.created_at) item.created_at = row.created_at;
  if (!item.updated_at && row.updated_at) item.updated_at = row.updated_at;
  for (const [key, value] of Object.entries(row)) {
    if (key === 'id' || key === 'data') continue;
    const camel = snakeToCamel(key);
    if (item[camel] === undefined && value !== null) item[camel] = value;
  }
  return item;
}

const EXTRACT_COLUMNS = {
  users: ['firebase_uid', 'email', 'name', 'role', 'age_group', 'parent_contact'],
  curriculum_modules: ['title', 'content', 'audio', 'created_by', 'created_at']
};

function extractTypedFields(table, body) {
  const extracted = {};
  const cols = EXTRACT_COLUMNS[table] || [];
  for (const col of cols) {
    const camelKey = snakeToCamel(col);
    let val = body[camelKey] !== undefined ? body[camelKey] : body[col];
    if (val !== undefined) {
      extracted[col] = typeof val === 'string' ? val.slice(0, 10000) : val;
    }
  }
  return extracted;
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

describe('Worker D1 Helpers', () => {
  test('camelToSnake converts correctly', () => {
    expect(camelToSnake('firebaseUid')).toBe('firebase_uid');
    expect(camelToSnake('ageGroup')).toBe('age_group');
  });

  test('snakeToCamel converts correctly', () => {
    expect(snakeToCamel('firebase_uid')).toBe('firebaseUid');
    expect(snakeToCamel('age_group')).toBe('ageGroup');
  });

  test('rowToItem merges data and typed columns', () => {
    const row = {
      id: 'user1',
      data: JSON.stringify({ name: 'Ahmad', role: 'student' }),
      firebase_uid: 'fb123',
      created_by: 'admin1'
    };
    const item = rowToItem(row);
    expect(item.id).toBe('user1');
    expect(item.name).toBe('Ahmad');
    expect(item.role).toBe('student');
    expect(item.firebaseUid).toBe('fb123');
    expect(item.created_by).toBe('admin1');
  });

  test('extractTypedFields filters body fields properly', () => {
    const body = {
      firebaseUid: 'fb123',
      name: 'Sarah',
      role: 'student',
      extraField: 'shouldNotBeExtracted'
    };
    const extracted = extractTypedFields('users', body);
    expect(extracted.firebase_uid).toBe('fb123');
    expect(extracted.name).toBe('Sarah');
    expect(extracted.role).toBe('student');
    expect(extracted.extraField).toBeUndefined();
  });

  test('stripMetaFields removes internal meta fields', () => {
    const obj = {
      id: '123',
      title: 'Chemistry',
      _createdBy: 'admin',
      _createdAt: '2026'
    };
    const safe = stripMetaFields(obj);
    expect(safe.title).toBe('Chemistry');
    expect(safe.id).toBeUndefined();
    expect(safe._createdBy).toBeUndefined();
  });
});
