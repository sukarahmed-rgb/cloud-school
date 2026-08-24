// @ts-check
/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

describe('public/config.js classic-script globals', () => {
  test('exposes runtime config as window properties for module consumers', () => {
    const code = fs.readFileSync(path.join(process.cwd(), 'public', 'config.js'), 'utf8');
    const script = document.createElement('script');
    script.textContent = code;
    document.body.appendChild(script);

    expect(window.__app_id).toBe('cloud-school-blind-v1');
    expect(window.__firebase_config).toEqual(
      expect.objectContaining({ projectId: 'cloud-school-6251a' }),
    );
    expect(window.__server_base).toContain('workers.dev');
    expect(typeof window.__SENTRY_DSN).toBe('string');
    expect(window.__initial_auth_token).toBeNull();
  });
});
