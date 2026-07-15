-- Cloud School D1 Schema v2
-- Uses JSON data column for flexible document storage
-- Indexed columns for efficient queries

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  firebase_uid TEXT,
  email TEXT,
  name TEXT DEFAULT '',
  role TEXT DEFAULT 'student',
  age_group TEXT DEFAULT '7-12',
  parent_contact TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS curriculum_modules (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  title TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  grade_level TEXT DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  title TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  grade_level TEXT DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  assignment_id TEXT DEFAULT '',
  student_id TEXT DEFAULT '',
  student_name TEXT DEFAULT '',
  status TEXT DEFAULT 'submitted',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  title TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  is_read INTEGER DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  student_id TEXT DEFAULT '',
  exam_title TEXT DEFAULT '',
  score REAL DEFAULT 0,
  total REAL DEFAULT 100,
  created_by TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON exam_results(student_id);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  parent_email TEXT DEFAULT '',
  grade_level TEXT DEFAULT '',
  age_group TEXT DEFAULT '7-12',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_students_parent_email ON students(parent_email);
CREATE INDEX IF NOT EXISTS idx_students_created_by ON students(created_by);
