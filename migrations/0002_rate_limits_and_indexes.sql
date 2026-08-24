-- Migration: 0002_rate_limits_and_indexes.sql
-- Description:
--   1. rate_limits table backing the atomic (single-statement upsert)
--      fixed-window rate limiter, replacing the racy KV read-modify-write.
--   2. Missing indexes: users.parent_contact is queried by the parent→child
--      lookup and every list endpoint sorts by created_at DESC.

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_users_parent_contact ON users(parent_contact);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_curriculum_modules_created_at ON curriculum_modules(created_at);
CREATE INDEX IF NOT EXISTS idx_assignments_created_at ON assignments(created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_exam_results_created_at ON exam_results(created_at);

-- Note on foreign keys: submissions.assignment_id/student_id and similar columns
-- are unenforced TEXT references. Adding real FK constraints requires rebuilding
-- each child table and auditing for orphan rows first; that is tracked as a
-- follow-up migration once prod data has been validated.
