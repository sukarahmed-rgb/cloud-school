# GitHub Secrets Required

| Secret | Used By | Required | How to Get |
|---|---|---|---|
| `FIREBASE_TOKEN` | `deploy`, `preview` jobs | ✅ Yes | `npx firebase-tools login:ci` → copy token |
| `CLOUDFLARE_API_TOKEN` | `deploy-cloudflare` job | ✅ Yes | Cloudflare Dashboard → API Tokens → Create (permissions: Workers, D1) |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-cloudflare` job | ✅ Yes | Cloudflare Dashboard → right sidebar → Account ID |

## Optional

| Secret | Used By | Notes |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_CLOUD_SCHOOL_6251A` | (legacy) | Not needed if `FIREBASE_TOKEN` is set |

## Setup

```bash
# 1. Generate Firebase CI token
npx firebase-tools login:ci

# 2. Go to GitHub repo → Settings → Secrets and variables → Actions
# 3. Add: FIREBASE_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
```
