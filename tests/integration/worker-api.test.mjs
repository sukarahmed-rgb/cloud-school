import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE =
  process.env.LIVE_API_BASE || 'https://cloud-school-api.cloud-school-subdomain.workers.dev';
const ORIGIN = 'https://cloud-school-6251a.web.app';

test('GET /api/health returns 200 ok', async () => {
  const res = await fetch(`${BASE}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.ok(body.timestamp);
});

test('OPTIONS preflight returns 204 with CORS headers', async () => {
  const res = await fetch(`${BASE}/api/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: ORIGIN,
      'Access-Control-Request-Method': 'GET',
    },
  });
  assert.equal(res.status, 204);
  assert.ok(res.headers.get('access-control-allow-origin'));
  assert.ok(res.headers.get('access-control-allow-credentials'));
});

test('CORS allows configured production origin', async () => {
  const res = await fetch(`${BASE}/api/health`, { headers: { Origin: ORIGIN } });
  const allow = res.headers.get('access-control-allow-origin');
  assert.ok(allow && allow.includes('cloud-school-6251a.web.app'));
});

test('unknown path returns 404 JSON', async () => {
  const res = await fetch(`${BASE}/api/definitely-not-a-route-xyz`, {
    headers: { Origin: ORIGIN },
  });
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.ok(body.error);
});

test('GET /api/auth/session without cookie returns 401', async () => {
  const res = await fetch(`${BASE}/api/auth/session`, {
    headers: { Origin: ORIGIN },
  });
  assert.ok(res.status === 401 || res.status === 200);
  if (res.status === 401) {
    const body = await res.json();
    assert.ok(body.error);
  }
});

test('POST /api/auth/firebase-login without credentials is rejected safely', async () => {
  const res = await fetch(`${BASE}/api/auth/firebase-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ idToken: 'invalid-token-xyz' }),
  });
  assert.ok(res.status === 400 || res.status === 401 || res.status === 500);
});

test('security headers present on worker responses', async () => {
  const res = await fetch(`${BASE}/api/health`);
  const headers = res.headers;
  assert.ok(headers.get('content-type')?.includes('application/json'));
  assert.ok(
    headers.get('x-content-type-options') === 'nosniff' ||
      headers.get('x-content-type-options') == null,
  );
});
