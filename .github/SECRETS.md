# Deployment credentials and boundaries

No deployment credentials are included in this repository. Never paste a private key or token into an issue, chat, workflow source or tracked file.

Current workflows use FIREBASE_SERVICE_ACCOUNT through the process environment for Firebase Hosting. Store the least-privilege service account JSON in the relevant GitHub environment secret, not a legacy FIREBASE_TOKEN. Restrict the preview identity to the approved preview resource. Production and preview identities should not be interchangeable. Enable required environment reviewers in GitHub; the YAML alone does not prove that protection is configured.

Cloudflare uses CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. Restrict the token to the intended Worker/database/account; do not use an account-wide global API key. Worker secrets such as FIREBASE_API_KEY, GEMINI_API_KEY and an administrator invitation secret belong in the provider secret store, not wrangler.toml or public/config.js.

The deployment workflows are manual opt-in, depend on security-gate, write a temporary credential file with owner-only permissions and remove it afterward. Do not reuse that file as an artifact. No cloud credentials or permissions were verified during local development, and no setup is authorized by this document.

Before activation: verify bindings and environment separation, required reviewers, secret rotation/recovery owner, audit permissions and backup restore route. Follow SECURITY-SYSTEM.md and obtain explicit owner deployment approval. Firebase web client configuration is visible by design; verify its provider restrictions and database rules separately.
