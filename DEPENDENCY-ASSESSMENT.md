# Moderate dependency assessment, 2026-11-23

This is a source-path and compatibility assessment, not a finding that every affected code path is unreachable. No production probing, cloud sign-in, real student data or dependency audit suppression was used.

## Current result

31 moderate affected package entries; 0 high, 0 critical. Same unchanged high-severity audit gate returns success. The count has NOT fallen in this pass. The 31 entries include parent packages affected through four underlying advisory families, not 31 independently demonstrated application vulnerabilities.

| Advisory family | Installed dependency path | Inspected use and impact | Safe upgrade boundary |
|---|---|---|---|
| glob cancellation after AbortSignal timeout | Jest reporters/config/runtime/test-exclude; Firebase archive/schema utilities and rimraf | Local filesystem traversal can continue beyond intended cancellation. Inspected Jest paths use sync traversal of project/module/coverage patterns. No student-input route to these tooling calls was found; a malicious repository/tree/config can still stress CI. Job timeouts remain necessary. | Current glob 10.x patch line ends at 10.5.0; fixed glob 14.0.2 is a new major outside declared ranges. Do not force it throughout the tree without upstream support and broader CLI tests. |
| minimatch pattern amplification | Same glob-related Jest/Firebase utilities | Untrusted patterns/path sets can consume resources. Project test/config patterns are locally defined; untrusted pull-request code remains inherently executable. This is not a runtime permission bypass. | Fixed minimatch 11.0.1 is outside installed 9/10 ranges. No unsupported global override applied. |
| OpenTelemetry W3C baggage allocation | Firebase tools > @google-cloud/pubsub 5.3.1 > @opentelemetry/core 1.30.1 | Pub/Sub's inspected telemetry-tracing module constructs W3CTraceContextPropagator, not W3CBaggagePropagator. No school browser/Worker dependency on it. This narrows the observed path; it is not proof no CLI/plugin path can invoke baggage extraction. | Pub/Sub declares core ^1.30.1, whose published patch line is exhausted; fix is core 2.8.0. Retain upstream constraints rather than force an unvalidated major. |
| uuid buffer validation for v3/v5/v6 | Firebase tools > gaxios 6.7.1 > uuid 9.x, also Google auth chain | Inspected gaxios multipart implementation calls v4() without a caller-supplied output buffer. The specific affected buffer API was not found in that caller. Not a demonstrated school-session-token weakness; school tokens use crypto.randomUUID. | gaxios 6 declares uuid ^9.0.1; patched uuid >=11.1.1 is outside range. Audit's Firebase 13.11.2/Jest 29.7.0 downgrade suggestions are not accepted solely to zero a count. |

Registry/advisory sources observed during this evaluation:
- https://github.com/advisories/GHSA-3g3m-2fjr-6pw4
- https://github.com/advisories/GHSA-g3hv-75wg-m249
- https://github.com/advisories/GHSA-8988-4f7v-96qf
- https://github.com/advisories/GHSA-w5hq-g745-h8pq

Local inspection anchors: node_modules/jest-config/build/index.js, jest-runtime/build/index.js, @jest/reporters/build/index.js, exegesis/lib/controllers/loadControllers.js, gaxios/build/src/gaxios.js and @google-cloud/pubsub/build/src/telemetry-tracing.js. These paths are reproducible from package-lock.json and are not bundled as source dependencies. Inspection was selective, not whole-program reachability analysis.

## Mitigations implemented in this pass

- Every CI npm ci step now uses --ignore-scripts. Dependency install lifecycle hooks do not automatically run. Explicit build/test/browser-install commands still execute trusted project/tool code; this does not sandbox arbitrary pull requests or packages.
- Every checkout step sets persist-credentials: false. The GitHub token is not left in the git checkout for later tooling. Deployment credentials still exist during their explicit authorized deploy steps, so least privilege and environment reviewers remain mandatory.
- Full npm audit JSON is retained as a workflow artifact while the existing high-severity gate remains unchanged. Moderate findings are visible, not suppressed. This artifact contains dependency metadata, not student data; no workflow or artifact was actually uploaded in this local task.
- Node requirement >=22.19.0 <23 is recorded in package.json to match the validated Node major and Lighthouse's minimum.
- Regression tests and the local release guard reject missing install-hook/checkout protections and missing full-audit artifact configuration.

## Evidence and limits

Fresh npm ci --ignore-scripts; 72 suites/714 unit tests; 64 real Worker+SQLite integration tests; lint/typecheck/build; synthetic encrypted restore drill; parsed workflow checks and local release guard all passed. Firebase 15.37.0, Wrangler 4.166.0 and Lighthouse 0.16.1 start locally. The previous candidate's 41 browser tests passed; this pass changes only CI/package-engine/docs/guard tests, so no new browser behavior or fresh browser run is claimed.

No further supported patch-only dependency remedy was found in the currently published lines. The remaining choices are upstream-compatible releases, a separately scoped test-runner/deploy-tool migration, or carefully justified package-specific major changes with broader testing. Those are not silently substituted for the current tooling in this candidate. No zero-risk claim or production approval follows from this assessment. Cloud settings, auth, real backup/alerts and school-owned child-data policies remain deferred and unresolved as documented in SECURITY-SYSTEM.md.
