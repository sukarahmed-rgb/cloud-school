#!/usr/bin/env python3
"""Local release guard. Read-only, does not connect or deploy. Not a secret-scanner certification."""
from pathlib import Path
import json
import re
import subprocess

root=Path(__file__).resolve().parents[2]
errors=[]
workflow=(root/'.github/workflows/ci.yml').read_text()
for value in ['environment: production','environment: preview','inputs.deployProduction','inputs.deployPreview','security-gate']:
    if value not in workflow:errors.append('Missing workflow guard: '+value)
if 'firebase-tools@latest' in workflow:errors.append('Unpinned deployment CLI')
for line in workflow.splitlines():
    if 'run: npm ci' in line and '--ignore-scripts' not in line:errors.append('Install lifecycle scripts enabled in CI')
if workflow.count('persist-credentials: false') != workflow.count('uses: actions/checkout@'):errors.append('Checkout credentials persistence not disabled everywhere')
if 'name: dependency-audit' not in workflow:errors.append('Full dependency audit artifact missing')
if 'ENABLE_LEGACY_MIGRATION = "true"' in (root/'wrangler.toml').read_text():errors.append('Legacy import enabled in tracked deployment config')
for filename in subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0'):
    path=root/filename
    if not filename or not path.is_file() or path.stat().st_size>2_000_000:continue
    if filename.startswith('scripts/security/'):continue
    text=path.read_text(errors='ignore')
    if re.search(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',text):errors.append('Private key pattern: '+filename)
    if re.search(r'gh[pousr]_[A-Za-z0-9]{30,}',text):errors.append('Token pattern: '+filename)
    if filename.endswith('service-account.json') or filename.endswith('.dev.vars'):errors.append('Sensitive filename tracked: '+filename)
headers=json.loads((root/'firebase.json').read_text())['hosting']['headers'][0]['headers']
csp=next(h['value'] for h in headers if h['key']=='Content-Security-Policy')
if "frame-ancestors 'none'" not in csp or "object-src 'none'" not in csp:errors.append('Missing CSP restrictions')
if errors:
    for error in errors:print(error)
    raise SystemExit(1)
print('Local release configuration/pattern checks passed. Cloud rules, history, secrets, MFA and approvals remain unverified.')
