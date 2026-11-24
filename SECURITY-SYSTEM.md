# Cloud School security system, local candidate

Status: implemented and locally tested, not installed on the live school. No production or GitHub change was made. This document separates code controls from operations that still need an owner and cloud setup.

## Control map

| Area | Implemented in this candidate | Not established by this work |
|---|---|---|
| Identity | Firebase token lookup, UID binding, verified-email legacy linking safeguards | Provider account settings, MFA, recovery, child age/consent assurance |
| Sessions | HttpOnly/Secure cookie; expiry; D1 role revalidation, session-version revocation, account suspension; hashed logout tombstones reject stale KV copies | Real cross-site Safari behavior, cloud replication latency and provider token revocation |
| Authorization | Teacher approval and class scopes; linked guardians; learner draft exclusion; owner checks; same-class lesson links | Final school role policies and an independent penetration test |
| Request safety | Byte limits, allowed mutation origins, parameterized values, fail-closed rate checks, generic errors, no-store API responses | Edge WAF/DDOS settings, real load testing and IP provenance outside Cloudflare |
| Evidence | Request IDs and metadata-only D1 audit; admin event view; structured audit-degraded error | External alert service, tamper-proof archive, retention duration, guaranteed audit delivery |
| Response | Self revoke-all sessions; admin suspend/reactivate; disabled legacy import by default | On-call owner, contact route, incident notification duties |
| Recovery | Offline authenticated encrypted SQLite snapshot/restore tool; synthetic roundtrip/tamper/overwrite/key-permission checks; restore invalidates session versions | Scheduled cloud backup, offsite destination, key custody, recovery-time/data-loss objectives, production restore |
| Release | Manual environment-scoped deployment, locked CLI, limited workflow permissions, security gate | Actual GitHub environment reviewers/secrets, cloud access rules, deployment approval |

## Required migration and activation sequence

1. Keep the current site unchanged. Obtain separate deployment approval before any live action.
2. Re-run the dependency security gate on the actual release lockfile. At the latest local revision it passes the unchanged high-severity threshold: 31 moderate affected package entries, zero high/critical. Moderate findings remain in Firebase/Jest toolchains and require assessment. A passing dependency gate is not production approval. Do not force major/downgrade fixes or suppress findings merely to turn a report green.
3. Prepare a verified isolated backup and restoration route for the actual service. The local tool is not a replacement for a supported D1 export/restore route.
4. Apply migrations 0000 through 0004 to a separate test database, then deploy the matching Worker there. Migration 0004 is additive and required before this Worker can authenticate sessions. Do not deploy code first: missing control tables fail closed and users cannot authenticate.
5. New code accepts pre-existing sessions at version zero unless the account was revoked/suspended. School-approved initial cutover can deliberately invalidate all sessions, but this candidate has not done that on anyone's account.
6. Use only synthetic accounts/data to test student, approved/unapproved teacher, parent, admin, denied draft access, logout/revoke/suspend and retry behavior. Test Safari cross-site cookies and installed-app updates separately.
7. Verify cloud environment reviewer gates, secret permissions, Firebase rules/key restrictions, D1/KV bindings, and cloud error/log collection. None was inspected through a signed-in console in this task.
8. Obtain explicit owner release approval only after those gates pass.

## Session and incident procedures

- A user can select 'sign out of all devices' and then confirm. D1 increments their session version. Old KV session values are rejected when the API next checks D1. This does not erase previously downloaded data from a device, stop an already authorized in-flight request, revoke Firebase provider sessions, or end an external browser session.
- Admins can suspend an account by its exact internal ID. It increments the version and rejects API sessions and new login. Re-enabling does not make old sessions valid. Self suspension is refused to reduce accidental lockout; another admin is needed.
- A single logout deletes KV state and records only a SHA256 token hash plus expiry in D1. This stops stale KV replicas from authenticating that token. Revoked token rows and audit rows have no automatic deletion policy yet. Approve retention before real student use.
- On suspected compromise: preserve minimal event evidence and request IDs; confirm the affected account ID; suspend/revoke as appropriate; use the provider's supported recovery/rotation controls under separate authority; verify recovery before reinstatement. Do not paste tokens, answers, student emails or credentials into incident tickets.
- Do not re-enable `/api/admin/migrate` as a shortcut. It is disabled unless an operator explicitly sets ENABLE_LEGACY_MIGRATION=true. Legacy data imports require backup, isolated rehearsal and a specific approved mapping.

## Audit and monitoring behavior

Events record time, actor internal ID, normalized action/resource category, SHA256 resource-ID fingerprint, HTTP outcome and generated request ID. They do not record request/response bodies, answers, names, emails, IP addresses, raw session tokens or URL query strings. A student/teacher/parent cannot read the audit API. Admin view returns the newest 100 records.

If a save succeeds and the audit insert fails, the response remains success with `X-Security-Audit: degraded`, and a structured error with request ID is emitted. This avoids a false failed-save response and duplicate retries after commit. It is explicitly not an atomic tamper-proof audit trail. An admin with database access can modify it. Anonymous rate-denied events are not written to D1, to avoid an audit-write amplification loop.

Monitoring integration is NOT active. Proposed checks to configure later with the owner: any audit-degraded error; repeated 5xx/429 changes; repeated denied privileged actions; backup failure or expired successful restore drill. Select the actual alert recipient, channel and thresholds during cloud rollout; the status endpoint truthfully reports monitoring/backup verification as false. Audit itself contains account metadata and needs access control and approved retention.

## Offline backup and recovery preparation

Prerequisites: Python 3, OpenSSL and a local SQLite database the operator is authorized to export. This script never connects to Cloudflare/Firebase and cannot restore them. Use a fresh isolated output path; it refuses overwrite.

```
python3 scripts/security/backup.py backup --input /approved/export.sqlite --output /approved/export.sealed --key-file /secure/backup.key
python3 scripts/security/backup.py restore --input /approved/export.sealed --output /isolated/restore.sqlite --key-file /secure/backup.key
python3 scripts/security/test_backup.py
```

The key must be generated/stored through an approved secret-management route, at least 32 random bytes, owner-only file permissions. Never send it in chat or put it in the repository. Do not store the only key alongside the only backup. Loss of the key means loss of recovery. The tool derives independent encryption/authentication keys, encrypts a SQLite snapshot, authenticates ciphertext before decrypting, then validates its manifest, SQLite integrity and table counts before writing an isolated restore. It uses a project-specific authenticated envelope, not a third-party audited backup product. Use a supported reviewed cloud backup product/route before relying on production recovery.

Restoration rotates account session versions, preserving suspension state, so old KV tokens do not automatically regain access after rollback. Reconcile provider sessions, guardian/class/teacher changes and events after the backup point before service reopening. Integrity/table counts alone do not prove application-level correctness. Validate permission cases and expected record counts again. The synthetic drill passed; no real database was backed up or restored.

## Decisions left to Ahmed/the school

These are not guessed or silently enabled:
- Which ages/classes may register, school enrollment approval, guardian consent and provider MFA requirements. Current login auto-provisioning is not age assurance.
- Student-content, local-draft and audit retention/deletion/export rules; legal/jurisdiction responsibilities.
- Backup destination, operator/key custodian, schedule, acceptable data loss and recovery time.
- Incident owner, approved alert route and thresholds.
- Whether private drafts/progress may remain on a shared device after logout. Current caches remain device-local and are not encrypted or remotely erasable.

Structural implementation can be reviewed now without answering every policy choice, but no real-student rollout should proceed until they are resolved.

## Verification in this candidate

- 72 unit suites, 714 tests passed.
- 64 real Worker+SQLite integration tests passed, including role/suspension/revoke/logout stale-KV refusal, sensitive failures, metadata audit/privacy, audit sink degradation and all earlier scope/draft/retry regressions.
- 41 intercepted Chromium browser tests passed, including the new security panel and selected automated accessibility checks. The mobile panel pixels were inspected for readable wrapping, labels and unclipped controls.
- Synthetic encrypted restore drill passes roundtrip, content confidentiality sentinel, tamper refusal, overwrite refusal, unsafe key-file refusal, and post-restore session-version rotation with suspension preserved.
- Lint, typecheck, build and local release configuration/pattern checks pass. The unchanged high-advisory dependency release gate now passes; 31 moderate entries remain disclosed. CI workflow syntax is parsed locally, not executed on GitHub.

No exhaustive security claim, certification, real-provider validation, human screen-reader test, cloud backup schedule or active external monitoring is implied.


## Latest dependency compatibility pass

The 21:49 candidate supersedes earlier 20-high dependency status. Removed live-server because it had no script or workflow caller and Vite already provides development/preview. Upgraded Lighthouse CI 0.15.1 to 0.16.1 after checking its Node >=22.19 requirement, then applied compatible transitive updates. CI uses Node 22 and must resolve to at least 22.19. No audit suppression, forced major downgrade or vulnerable-path exclusion was used. Retained Jest/Firebase current major lines rather than blindly following audit's older-major recommendations.

Clean npm ci --ignore-scripts, all tests/build and CLI version smoke checks passed. This validates the dependency tree install, not every package install lifecycle hook. Firebase CLI 15.37.0 and Wrangler 4.166.0 launch; no provider command was authenticated or deployed. Lighthouse 0.16.1 collects and asserts against the local built page with external HTTPS blocked. It reports performance/accessibility/best-practices 1.0 and SEO 0.91 in that synthetic offline-limited run, not evidence of live-site quality or human accessibility. Both Lighthouse config entry points now write reports to local filesystem instead of temporary public storage. Two regression checks protect local-only report output and removal of the unused legacy server. Removed stale Dependabot ignore entries for those upgrades.

Remaining moderate root advisories and dependency paths:
- glob/minimatch resource-consumption issues occur under Jest report/config/runtime and Firebase archive/schema utilities. Audit suggests Jest 29.7.0, a major downgrade that has not been adopted. Forcing a new transitive major without support is not an established fix.
- OpenTelemetry baggage allocation and uuid buffer validation findings occur through Firebase tooling dependencies. Audit suggests Firebase tools 13.11.2, a substantial downgrade. That is not blindly installed merely for a zero count.
- Sources observed in registry audit: https://github.com/advisories/GHSA-3g3m-2fjr-6pw4 , https://github.com/advisories/GHSA-g3hv-75wg-m249 , https://github.com/advisories/GHSA-8988-4f7v-96qf , https://github.com/advisories/GHSA-w5hq-g745-h8pq .

These are development/deployment findings, not demonstrated live-site exploits, but the toolchain handles source and deployment credentials and still merits cleanup/upstream updates. Avoid processing untrusted glob/archive inputs or exposing dev servers. No zero-risk claim is made. Cloud security, policy, monitoring and backup gates remain unchanged.


## Residual moderate advisory boundary

See DEPENDENCY-ASSESSMENT.md for exact paths and selective caller inspection. The count remains 31 moderate in the 22:07 candidate; no findings were suppressed. CI now skips install lifecycle scripts, avoids persisted checkout credentials and retains the full audit report. Node >=22.19 <23 matches the validated toolchain. These controls are tested locally, not deployed. No supported same-major fix was found for the remaining four advisory families; unsupported transitive major overrides or major tool downgrades were not made. This is a concrete boundary, not a claim that moderate findings are harmless. Broader runner/deployer replacement would require its own scoped compatibility work. Cloud and school-policy gates remain unchanged.
