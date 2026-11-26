// @ts-check
/**
 * The deployed Content-Security-Policy (firebase.json) has script-src without
 * 'unsafe-inline', so inline event handlers and inline scripts are blocked on
 * the real site. These tests keep the shipped HTML CSP-clean.
 */
const fs = require('fs');
const path = require('path');

describe('CSP compatibility of shipped markup', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');

  test('index.html uses no inline event handler attributes', () => {
    const handlers = html.match(/\son[a-z]+\s*=/gi) || [];
    expect(handlers).toEqual([]);
  });

  test('index.html has no inline <script> bodies (only src/module tags)', () => {
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((m) => m[1].trim())
      .filter((body) => body.length > 0);
    expect(inlineScripts).toEqual([]);
  });

  test('app source writes no inline <script> into documents (print window inherits CSP)', () => {
    const app = fs.readFileSync(path.join(process.cwd(), 'src', 'cloud_school_app.js'), 'utf8');
    expect(app.includes('<scr')).toBe(false);
  });
});
