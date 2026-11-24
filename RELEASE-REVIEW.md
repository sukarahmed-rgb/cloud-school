# Cloud School: expanded repair review

Prepared 23 November 2026. Base: `3bd13bfb0d87eb6d919c88d5816dcce3132224e1`.
Source repository: https://github.com/sukarahmed-rgb/cloud-school

## Release status

**Local repair candidate. Not deployed, not pushed to GitHub, not yet approved for real student data.** This note supersedes the first limited review. The owner approved broad repair work, administrator-approved teachers limited to assigned classes, and administration-confirmed guardian invitations. Publication remains a separate decision after the remaining checks below.

## Completed repairs

### Access and identity

- Student submission/result reads now enforce record ownership. Parent visibility requires a confirmed guardian link, not a self-entered contact string.
- Teacher access requires administrator approval and class membership. Submission/result visibility is bounded to the work's own class, not merely a student who happens to share one class with the teacher.
- Ordinary edits cannot move ownership/class by reinterpreting conflicting legacy JSON. Stored columns control authorization and are pinned during updates.
- Students can create their own answers; owner/student IDs come from the authenticated session. The frontend's real answer fields are retained rather than discarded.
- Login resolves Firebase UID first. A different UID cannot inherit a known email account's role. Legacy email-only linking requires verified email and refuses conflicting UID records. Existing accounts are preserved on refusal.
- Administrator signup requires an invitation. Teacher signup alone confers no student-data access. Registration sends an email-verification request where supported; privileged registration failure no longer falls back to the requested local role.
- Added server-side age validation matching the existing minimum-age rule. The previous malformed age-group string is replaced with bounded groups.

### Approved school policy

New additive migration `0003_scoped_access.sql` creates teacher approvals, classes, memberships, guardian links and hashed expiring guardian invitations. It adds class columns to content/work tables. No users or old records are deleted. Existing teachers are unapproved until an administrator approves them, and unassigned content/work remains administrator-only until mapped. No contact string is automatically converted into a guardian grant.

`worker/access-policy.js` owns enforcement. `src/modules/access-controls.js` adds labeled forms for administrators to create classes, approve/revoke teachers, assign/remove members, issue guardian invitations, revoke guardian links and map legacy records. Parents can accept a matching verified-email invitation. Tokens are not emailed automatically and are displayed once to the administrator for delivery through the school's established channel. Existing admin accounts remain the bootstrap route; a genuinely new admin uses the server's configured admin invitation.

### Shared-device/offline protection

- Browser account data now uses account-specific keys. Switching accounts or logging out resets visible state; only the correct account's saved data is restored.
- Legacy unowned browser data remains stored but is not silently imported into a new account. It needs a deliberate recovery decision, not a guessed owner.
- Offline work is tagged with its owner. Sync only processes the current owner's entries and rechecks ownership between saves. Old ownerless entries are preserved but not auto-submitted.
- Rejected asynchronous teacher saves cannot queue an earlier account's payload under a later account.
- Private API responses are no longer cached by the service worker; the cache version changes so old caches are removed on activation. Worker responses use no-store.
- Delayed background sync responses do not overwrite a newly selected account's state.

Account-specific browser storage is not encryption against someone with direct access to the same browser profile or device. For shared school devices, use separate device/browser profiles and an operating-system lock as well. Logout hides/reset state but does not destroy recoverable account-specific offline work. No legacy recovery data was deleted by this repair.

### Student answer/grading flow

- AI proxy calls now include session credentials.
- Submission creation validates that the assignment is available in the student's class.
- MCQ scoring uses the server's stored answer key. Student assignment responses omit answer keys/model answers. The browser cannot set the authoritative score.
- Essay answers remain pending teacher review. Removed the previous hard-coded AI score of 95; AI feedback is a draft, not a confirmed grade.
- Added a teacher grading form that saves a bounded 0-100 grade and feedback through the authorized backend update route. Graded student submissions cannot be silently edited into a different answer.
- Student submission announcements distinguish confirmed sent, pending offline, and rejected/failed states. A browser-computed demo score is not announced as an official hosted grade.

### Request/build/UI reliability

- Mutation origins are checked beyond CRUD, and actual received bytes are limited rather than trusting Content-Length. AI payloads have a finite 8 MiB cap.
- General rate-limit identity no longer trusts arbitrary cookie strings. It uses the connection IP. Auth-specific limits remain. This is not a complete school-wide AI billing budget.
- AI cache keys now separate user and model.
- Disabled client analytics initialization by default instead of weakening CSP for blocked tracking requests.
- Restored the missing utility CSS build with a pinned Tailwind 3 dependency and explicit generation scripts. Corrected box sizing, auth-card width and logo sizing. Desktop/mobile login has no measured horizontal overflow at 1280px and 430px.
- Removed unsupported decorative login emoji in Arabic/English; labels remain complete text.
- Developer role-switch bar stays hidden in the production-facing login flow. Backend checks remain the security boundary.
- Administrator student-record UI no longer claims a local PIN record is a working authentication account.
- Local integration tests are now the default `test:integration`; live tests are a separate explicit `test:live`. Production deploy jobs require a manual workflow input plus the production environment, rather than deploy automatically on every push. Configure environment approval protection in GitHub before release.

## Verification performed

Node 22.23.5, locally with synthetic data:

| Check | Result |
| --- | --- |
| Existing and added unit tests | 72 suites, 714 tests passed |
| Actual Worker + actual SQLite migrations | 64 tests passed |
| Chromium browser tests | 41 tests passed |
| ESLint | Passed |
| TypeScript check | Passed |
| Production build | Passed with an existing nonfatal mixed static/dynamic `vision.js` import warning |
| Patch/ZIP | Integrity and clean application to the base checked at packaging |

The real-SQLite tests cover unrelated/own student reads, linked/unlinked parents, teacher approval revocation, shared-student cross-class isolation, safe creation, grade/ownership tampering, legacy JSON scope divergence, admin controls, guardian invitation acceptance/reuse, UID/email mismatch, unverified legacy claims, body limits, and server MCQ scoring.

New unit regressions cover account switching, legacy unowned storage, offline owner filtering, rejected-save account-switch races, and separate class selectors for the book/quiz forms. Four independently reported WIP findings were confirmed and fixed: the rejected-save race, cross-class work exposure, legacy JSON scope movement on PUT, and wrong-form class selection. Their scenarios are now covered by regression tests.

Browser checks include the existing automated accessibility rules and keyboard/focus behavior. They deliberately intercept backend requests and use synthetic identities. **They do not prove real Firebase authentication, real cross-site cookies, real AI responses, or usability with human screen-reader users.** Service workers are disabled in those browser tests; their source changes still require a staging offline lifecycle test.

Inspected updated screenshot pixels for desktop/mobile login, the new administrator controls the teacher-confirmed grading form and pending-grade report state with synthetic data. The revised login screenshots have no missing-glyph boxes. Some older application screens still contain decorative emoji and uneven legacy spacing; a full visual redesign was not attempted.

## Remaining release gates

Do not skip these because local tests pass:

1. Create a staging deployment only with the owner's approval and appropriate non-production accounts. Run actual Firebase registration/login, email verification, teacher approval, class assignment, student submission, teacher grade save, guardian invitation/acceptance and revocation end to end.
2. Test Safari/iPhone cookie behavior. Hosting and the Worker use different sites; `credentials: include` is necessary but may not overcome third-party-cookie restrictions. If the target Safari flow fails, use a same-site API route/custom domain before release. No domain/account configuration was changed here.
3. Have blind users test the narrow student journey with VoiceOver on iPhone and NVDA/keyboard on desktop. Automated rules cannot certify speech timing, microphone handling, Braille input, or teaching quality. Test denied microphone permission and interrupted speech too.
4. Back up production D1/KV and verify restore before migration. Apply migrations first. Verify the approved legacy administrator can sign in. Approve known teachers, create real classes, map users and content/work, and issue guardian invitations deliberately. Do not auto-import contact strings or guess mappings.
5. Review production Firebase/API restrictions, secrets, roles, existing records, dependency advisories and retention/deletion policy. These were not accessed or audited here. No secret is claimed leaked merely because Firebase web config is visible.
6. Exercise service-worker update/old cache cleanup, account switching offline, ownerless-queue recovery, reconnect and duplicate retries on staging. Retry identifiers now persist across offline retries and map to a deterministic owner/collection record ID. Replaying the same identifier returns the original record; atomic INSERT OR IGNORE prevents duplicate creation. Legacy ownerless queues remain withheld for manual recovery. Exercise concurrent/lost-response replay in staging as well.
7. Decide and enforce AI cost budget, retention/consent and moderation policy. There are request limits and finite body size, not a complete per-school spending ceiling or child-safety/content certification.
8. Review remaining legacy features and curriculum claims. Student/teacher grade averages and distributions now exclude pending/failed/ungraded answers; parent and recent-activity displays show pending rather than zero. Demo games and sample content remain separate from formal grading, and curriculum/report semantics still need educator review. Local PIN student records are not authentication accounts. The browser tests include a demo role-switch journey, not a real multi-account class journey.

## Deployment/rollback plan, not executed

- Keep the original commit and database export.
- Test this candidate in staging with isolated data and the gates above.
- Apply migration 0003 only once through Wrangler's migration tracking after earlier migrations. It uses additive ALTER TABLE statements; do not run it repeatedly as loose SQL.
- Deploy Worker and built hosting together in a controlled window, after approval. Old sessions still face the new DB approval/class rules; communicate that teachers may see no data until mapped.
- Verify all roles, then monitor errors and access failures without logging student answers/tokens.
- Roll back application code to the prior known version only with an explicit security decision: the prior version contains the reported access defect. Additive schema can remain. Never roll back by dropping data-bearing tables or deleting accounts. Prefer repairing forward or disabling access during investigation.

## Local commands

```sh
npm ci
npm run test:integration
npm test -- --runInBand
npm run lint
npm run typecheck
npm run test:ui
npm run build
```

The archive excludes dependencies, build output, Git history, credentials and logs. It contains source, migrations, tests, this review, and release gates. No external scanner upload, public issue/PR, account mutation, GitHub push or live deployment occurred.


## Follow-up: duplicate retries and reports

Approved continuation added stable client mutation IDs to new/queued saves. The server derives an ID from authenticated owner, collection and mutation ID, and uses an atomic insert-ignore plus replay lookup. Retrying a lost response returns the original answer rather than creating a second answer. The same ID is not a way to overwrite a previous answer. Regression coverage checks server replay and preservation of the queue key across a failed response.

Reporting now excludes pending, failed and ungraded answers from confirmed grade averages/distributions. Pending is not zero. Recent activity and parent views display a pending label. Teacher exports filter to confirmed marks; game scores remain practice, not school grades.

Hosted staging and sign-in are deferred at the owner's direction on 2026-11-23. No account identifiers or authentication are currently requested. No resources or accounts were created and nothing was deployed. Real service validation remains a later release gate, not current blocking work to pursue.

An isolated local validation harness is available through `npm run test:integration`: it uses real migrations in an in-memory SQLite database, synthetic identities and the real Worker handler. Browser tests intercept backend calls. This is preparation for staging, not a substitute for real Firebase/iPhone validation and not a claim of hosted staging deployment.


## Expanded isolated validation, 2026-11-23

Owner requested broader local testing and deferred hosted sign-in. All data and identities used in this pass are synthetic.

Two additional defects were reproduced with failing tests and repaired:

- Teacher lists for curriculum, assignments, students and notifications referred to a nonexistent student_id column. Direct scoped reads worked, but lists failed. Non-result lists now filter on approved teacher plus assigned class. Result lists retain their additional per-student membership checks. Four real-SQLite regressions cover scoped lists/direct reads and denial of unassigned records.
- Teacher grade updates allowed null marks and could hide an invalid score behind a valid initialScore. Every supplied grade field must now independently be a finite number from 0 to 100. Regression tests reject negative, excessive, string, null and conflicting invalid marks before checking a valid save.

Expanded integration coverage (44 passing tests) includes role-scoped list/detail access, forged ownership, cross-class work for a shared student, immediate approval/membership/guardian revocation, expired/absent/malformed sessions, guardian token expiry/email mismatch/reuse, retry-key owner/collection isolation, revoked-access replay rejection, malformed retry identifiers, hostile mutation origins, body byte limits, server MCQ grading and answer-key redaction. Administrator create/update/read/delete is exercised for all six data collections. These are selected cases, not proof of exhaustive security.

Expanded Chromium coverage (34 passing tests) adds real local IndexedDB behavior: an account cannot sync another account's queue, ownerless legacy data remains withheld, a lost-response retry keeps its mutation ID, switching accounts stops the next queued item, a late server-sync response cannot populate a different account, and private caches restore only for their owner. Role-view denial handling and a 360px keyboard/focus check are included. The narrow login screenshot was inspected directly and shows readable, unclipped controls with a visible password focus outline.

Limits: browser calls are intercepted and sessions are synthetic. No real Firebase, Cloudflare D1/KV concurrency, external AI, upload, microphone/camera permission, email delivery or payment flow was exercised. Browser service workers are blocked, so installed-app update/cache/reconnect lifecycle remains unverified. Chromium is the only installed browser engine used, not Safari/iPhone or Firefox. Automated accessibility and keyboard checks do not certify VoiceOver/NVDA usability. No production backup restore or migration on real records was performed. The source still needs owner-approved isolated live validation and deployment review before release.


## Development slice: a connected learning journey

This candidate extends the preserved 18:02 repair-only candidate. No service creation, GitHub write or deployment occurred. Subject selection remains open; the optional social-studies example is synthetic and is not an official grade/curriculum resource. It is offered only in local non-server teacher mode, never inserted into authenticated school accounts.

Implemented:
- Subject/unit/lesson metadata on lessons and assignments, teacher preview, draft-by-default authoring, a grouped content list and explicit publish/unpublish controls. Existing records without publication metadata stay visible under their prior class rules. Assignments can be linked to a lesson through a selector. This is metadata grouping on existing records, not a separate curriculum-tree database or reusable question bank.
- Server-enforced draft hiding for students/parents on list AND direct reads, plus rejection of submissions to draft assignments. Filtering occurs before pagination. Teachers retain their approval/class restrictions; drafts are private from learners, not from other authorized teachers in the class or administrators.
- A student next-step panel, a lesson reader with saved text-section position/completion, optional HTTPS recording playback with periodic saved audio position, and related assignment launch. Text speech resumes at the saved paragraph, not at an exact word. Audio resume is implemented but was not verified with real media playback on Safari or real school recordings.
- Per-account device-local answer drafts for MCQ and text, restored when reopening. Local-storage failure is reported. Drafts are not cloud-synced, encrypted or guaranteed after browser data cleanup. On account change active answers and timers are cleared; in-flight owners remain guarded.
- Visible saved/pending/sent/failed and confirmed-grade/teacher-feedback states. Reconnect sync updates the matching submission by mutation ID and removes its delivered draft; failures retain a reviewable answer. A synthetic browser regression covers this reconciliation.
- The ten-minute practice timer now prompts review instead of automatically sending an answer on expiry. Submission remains an explicit student action. This changes practice behavior, not a secure timed-exam policy. Formal timed exams need a separately defined server-side policy.

Verification at this revision: 70 suites / 708 unit tests; 50 Worker+SQLite integration tests; 39 Chromium browser tests; lint/typecheck/build pass. Added server tests cover draft read/list/submission denial, publication lifecycle and pagination. Added browser tests cover the lesson paragraph resume, draft reopen, feedback display, teacher preview/draft/publish, account-switch cleanup, reconnect status and selected automated accessibility rules on new panels. Confirmed feedback in the browser is synthetic fixture data, not a real teacher-to-student live-session test. Screenshots of the reader at desktop/mobile sizes and teacher studio were inspected directly for wrapping, contrast, focus outline and clipping.

This is a first useful vertical slice, not all suggested roadmap items. A reusable question bank, rich curriculum editing/reordering, skill diagnostics and parent weekly summaries are NOT implemented. Real Firebase auth/cross-site cookies, Cloudflare persistence/concurrency, end-to-end media playback, PWA installed/offline lifecycle, Safari/iPhone, human VoiceOver/NVDA, real teacher/student roundtrip and backup/restore checks remain unperformed. Existing vision and new studio mixed static/dynamic-import warnings are nonfatal bundle warnings. Hosted work remains deferred, with no new account-information request.


## Security pass after the learning-journey slice, 2026-11-23

Separate review copy; no live exploitation, real data, console sign-in, public issue, GitHub change or deployment. Findings below are source/local-test results, not evidence of compromise.

Reproduced and fixed:
1. Cross-class lesson metadata references: a teacher could attach an assignment to a lesson outside the assignment class. No foreign content was returned by that link, but integrity and journey routing were wrong. Create/update now require a real, readable lesson in the same class. Synthetic tests reject foreign links and retain the prior link after a rejected update.
2. Unknown registration role input fell through to the student role while skipping the student-age branch. Reject unknown/missing roles before any account insert. JSON primitive/null auth input is also rejected. This is not a replacement for an agreed child-consent/age-verification policy; login auto-provisioning still exists, so registration age checks alone do not establish age assurance.
3. Malformed percent-encoding in a cookie caused a 500. Invalid cookie values are now ignored and private reads return unauthenticated rather than triggering the server-error path.
4. Service-worker private API bypass only recognized the configured hostname. Alternate/same-origin /api/ routes could enter generic caching. All /api/ routes now bypass cache with no-store, and activation deletes old API caches. Source-level worker execution tests verify bypass and cleanup. Full installed-browser lifecycle remains untested.

Additional release-pipeline hardening:
- Preview deployment is manual opt-in with a preview environment and test/browser/build prerequisites, rather than automatic on pull requests. This avoids executing branch-controlled deployment steps with preview secrets by default.
- Credentials are provided through the process environment, written with restrictive permissions and removed afterward. Removed dynamic latest-version deployment CLI invocation in favor of the locked dependency. These are local workflow changes only; real repository environment protection and secret scope are unverified. The workflow parses as YAML but has not run in GitHub.

Dependency audit (npm registry audit, this lockfile, 2026-11-23): initially 74 affected package entries (1 critical, 34 high, 37 moderate, 2 low). Compatible, non-force updates reduced this to 58 (0 critical, 20 high, 36 moderate, 2 low). Updated Vite from 8.1.4 to 8.3.8 and proxy-addr to 2.0.8 among the compatible lockfile updates. Remaining findings involve development/build/deployment dependencies including Lighthouse CI, Firebase tools, Jest and live-server. Do not expose development servers or treat this as production-ready. Major/downgrade recommendations were not forced. Production-only npm audit returns 0, but nearly all dependencies here are classified as devDependencies; this is not a claim that browser code/build tooling has no vulnerability.

Observed advisory references:
- https://github.com/advisories/GHSA-jqcg-44mw-7w3h (proxy-addr, fixed by compatible update)
- https://github.com/advisories/GHSA-587h-7wmj-h5pm (Vite editor path issue, fixed by compatible update)
- https://github.com/advisories/GHSA-rq7h-c2jc-7f22 (Vite file allow-list issue, fixed by compatible update)

Further checks: new lesson/studio rendering uses textContent. A hostile-markup browser fixture stays literal, creates no image/script element, and a javascript audio URL is rejected. No private-key blocks or GitHub-token patterns were found in the current tracked source by a limited pattern scan. The Firebase web API key in public/config.js is expected client configuration, not a private server secret; restrictions and Firebase security rules cannot be verified without the deferred console access. This scan does not cover repository history or prove no secrets exist.

Final local verification: 71 suites / 710 unit tests; 54 real Worker+SQLite integration tests; 40 synthetic/intercepted Chromium browser tests; lint/typecheck/build pass. Old nonfatal chunk warnings remain. Security fixes introduced no intentional visual redesign. Remaining release gates include outstanding toolchain advisories, actual cloud access rules, secret rotation/history scan, rate-limit fail-open behavior during D1 failure, real auth/cookie/session revocation and multi-device tests, data retention/child-consent policy, backups/restore and installed service-worker lifecycle. No independent penetration test or security certification is claimed.


## Integrated security control layer, 2026-11-23 evening

This candidate extends the 18:40 security candidate with an additive control-plane migration (0004_security_controls.sql), D1-authoritative session-version/suspension and current-role checks, hashed logout tombstones, self revoke-all sessions, admin security status/event/account controls, metadata-only audit with request IDs, fail-closed rate checks, disabled-by-default legacy import and redacted error telemetry URLs/referrers. No changes were applied to the live site or GitHub. Deployment must apply migration 0004 before matching code; missing security tables fail closed.

Added offline encrypted/authenticated SQLite snapshot and isolated restore tooling, tested with synthetic data including tamper/overwrite/unsafe-key rejection and restored session-version rotation preserving suspension. This is NOT a scheduled D1 backup service or an independently audited encryption product. Key custody, offsite storage, RPO/RTO and real cloud recovery remain unconfigured.

Deployment workflows now require a security-gate with local release checks, restore drill and high-severity npm audit check. With the current 58 advisory-affected entries (20 high), that dependency gate correctly remains blocked. No suppression, force downgrade, cloud monitoring or scheduled backup was quietly enabled. Admin UI explicitly says those services are unverified.

Read SECURITY-SYSTEM.md for the implementation/configuration/decision matrix, activation order, incident/recovery procedures and remaining user-owned decisions. In particular: child consent/enrollment/age assurance, retention/deletion, backup/key custodian, incident owner/alert destination, and device-cache handling remain unresolved policies, not defaults claimed as approved. School accounts/provider MFA/cloud rules have not been inspected. Audit is metadata-only but not immutable or guaranteed atomic with business writes. Failures after a business commit preserve its success and emit an audit-degraded indicator/error instead of encouraging duplicate retries. Previously downloaded local data cannot be remotely erased through session revocation.

Final local checks: 71 suites / 710 unit tests, 64 Worker+SQLite tests, 41 intercepted Chromium browser tests, one multi-case synthetic encrypted backup/restore drill, lint/typecheck/build and release configuration checks. CI YAML parsed and dependency gates linked to every deploy job, not executed on GitHub. Security panel pixels inspected at 430px viewport and selected automated accessibility checks passed. Production authentication/cookies, D1/KV consistency/performance, actual backup/alert schedule, installed PWA lifecycle, Safari/VoiceOver/NVDA and independent penetration test remain outside verified coverage. No security certification or production go-ahead is implied.


## Latest follow-through: dependency blockers and safe tooling, 2026-11-23 21:49

Supersedes the earlier dependency-gate status in prior sections: 58 entries including 20 high are now 31 moderate, 0 high, 0 critical. The same npm audit --audit-level=high command returns success. No suppression/force downgrade was used, and this does not waive the remaining moderate findings or cloud/user-policy release gates.

Changes: remove unused live-server, upgrade Lighthouse CI to 0.16.1 and compatible transitive dependencies, preserve current Jest/Firebase major lines, remove outdated Dependabot ignore entries, correct obsolete secret-setup instructions to match the service-account workflow, and make BOTH Lighthouse configurations keep reports on local filesystem. No new service, public upload, GitHub write or deployment occurred. All earlier application security controls and migrations remain in this source candidate.

Verification: clean npm ci --ignore-scripts; 72 suites/712 unit tests; 64 real Worker+SQLite integration tests; 41 intercepted Chromium browser tests; lint/typecheck/build; local release checks; synthetic encrypted backup/restore drill; Firebase/Wrangler/Lighthouse CLI version checks; local Lighthouse collect/assert/filesystem output with external HTTPS blocked. No actual cloud deployment or real-provider login tested. Nonfatal bundle import warnings remain. Full control boundaries and the 31 moderate dependency-entry paths are recorded in SECURITY-SYSTEM.md.

Residual work is precise: assess/update the moderate Jest/Firebase transitive advisories without incompatible untested overrides; verify real cloud access/secrets/rules/required reviewers, auth/cookies/session revocation and restore/alert schedules; resolve child-data/retention/key-custody decisions; human/device/PWA validation. Passing the formerly blocked dependency gate is actual progress, not permission to publish or a claim that all security work is finished.


## Moderate dependency reachability and CI containment, 2026-11-23 22:07

No count reduction is claimed in this pass: still 31 moderate, 0 high/critical; unchanged high gate passes. DEPENDENCY-ASSESSMENT.md maps four underlying advisory families to their installed callers and safe upgrade boundaries. Inspected gaxios uses uuid v4, not the affected buffer-taking v3/v5/v6 API; Pub/Sub uses trace-context rather than baggage propagation on the inspected path. Glob/minimatch process local project/tooling patterns. These observations narrow exposure but do not prove global unreachability or justify suppressing findings. Supported same-major patch lines are exhausted; no unsafe broad overrides/downgrades applied.

Actual changes: all CI dependency installs skip lifecycle scripts, every checkout disables credential persistence, full audit JSON is retained as an artifact without weakening the severity gate, Node minimum/validated major is explicit, and regression/local release checks protect those settings. These reduce install-time/credential exposure, not all toolchain execution risk. Explicit build/test commands still run code. No GitHub workflow was executed or artifact uploaded by this task.

Verified in this pass after a fresh script-disabled install: 72 suites/714 unit tests; 64 Worker+SQLite tests; lint/typecheck/build, encrypted restore drill, release guard and YAML checks; provider CLI version startup. Prior 41 browser tests remain the browser baseline, not falsely rerun for CI-only changes. Application pixels are unchanged. No further safe patch-only remediation was found for the residual moderate dependencies. A broader tool migration needs a separate bounded design/testing effort, not an automatic substitute. All cloud, school-policy and real-device gates remain.
