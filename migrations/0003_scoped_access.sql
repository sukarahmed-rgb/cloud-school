-- Additive access model. Existing data is preserved and remains admin-only
-- until an administrator assigns classes and approves teachers.
CREATE TABLE IF NOT EXISTS teacher_approvals (
  user_id TEXT PRIMARY KEY,
  approved INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS school_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS class_memberships (
  class_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  member_role TEXT NOT NULL CHECK(member_role IN ('student','teacher')),
  PRIMARY KEY(class_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_membership_user ON class_memberships(user_id,class_id);
CREATE TABLE IF NOT EXISTS guardian_links (
  parent_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  confirmed_by TEXT NOT NULL,
  confirmed_at TEXT NOT NULL,
  PRIMARY KEY(parent_id,student_id)
);
CREATE TABLE IF NOT EXISTS guardian_invitations (
  token_hash TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  created_by TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at TEXT
);
ALTER TABLE curriculum_modules ADD COLUMN class_id TEXT;
ALTER TABLE assignments ADD COLUMN class_id TEXT;
ALTER TABLE students ADD COLUMN class_id TEXT;
ALTER TABLE notifications ADD COLUMN class_id TEXT;
CREATE INDEX IF NOT EXISTS idx_curriculum_class ON curriculum_modules(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_notifications_class ON notifications(class_id);

ALTER TABLE notifications ADD COLUMN updated_at TEXT;

ALTER TABLE submissions ADD COLUMN class_id TEXT;
ALTER TABLE exam_results ADD COLUMN class_id TEXT;
CREATE INDEX IF NOT EXISTS idx_submissions_class ON submissions(class_id);
CREATE INDEX IF NOT EXISTS idx_results_class ON exam_results(class_id);
