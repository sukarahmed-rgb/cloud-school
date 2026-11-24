-- Additive security controls. No student content is copied to audit records.
CREATE TABLE IF NOT EXISTS account_security (
 user_id TEXT PRIMARY KEY,
 session_version INTEGER NOT NULL DEFAULT 0,
 suspended INTEGER NOT NULL DEFAULT 0 CHECK(suspended IN (0,1)),
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS security_audit (
 id TEXT PRIMARY KEY,
 occurred_at TEXT NOT NULL,
 actor_id TEXT,
 action TEXT NOT NULL,
 resource_type TEXT NOT NULL,
 resource_id TEXT,
 outcome INTEGER NOT NULL,
 request_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_security_audit_time ON security_audit(occurred_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_actor ON security_audit(actor_id,occurred_at);
CREATE TABLE IF NOT EXISTS revoked_sessions (
 token_hash TEXT PRIMARY KEY,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revoked_expiry ON revoked_sessions(expires_at);
