import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('public/cloud_school_styles.css', 'utf8');

describe('toolbar accessibility structure', () => {
  test('every toolbar group is a labelled group', () => {
    const groups = html.match(/<span class="toolbar-group[^>]*>/g) || [];
    expect(groups.length).toBeGreaterThanOrEqual(6);
    for (const g of groups) {
      expect(g).toContain('role="group"');
      expect(g).toMatch(/aria-label="[^"]+"/);
    }
  });
  test('logout sits in its own group, apart from settings', () => {
    const i = html.indexOf('data-action="logout"');
    const groupStart = html.lastIndexOf('<span class="toolbar-group', i);
    const between = html.slice(groupStart, html.lastIndexOf('<button', i));
    expect(between).toContain('toolbar-group-exit');
    expect(between.match(/<button/g)).toBeNull();
  });
  test('44px touch targets, visible focus and mobile compaction exist', () => {
    expect(css).toMatch(/min-height:\s*44px/);
    expect(css).toContain(':focus-visible');
    expect(css).toMatch(/max-width:\s*600px[\s\S]*header-extra/);
  });
  test('create-account button is secondary', () => {
    expect(html).toMatch(/id="btn-show-register" class="btn-secondary/);
  });
});
