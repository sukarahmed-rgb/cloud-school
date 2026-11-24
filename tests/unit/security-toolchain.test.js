/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const loadConfig = createRequire(`${process.cwd()}/package.json`);

test('both Lighthouse entry configs keep reports in the local filesystem', () => {
  for (const path of ['./lighthouserc.cjs', './.lighthouserc.cjs']) {
    const config = loadConfig(path);
    expect(config.ci.upload.target).toBe('filesystem');
    expect(config.ci.upload.outputDir).toBe('./reports/lighthouse');
  }
});
test('unused legacy static server is removed without removing Vite dev/preview', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(pkg.devDependencies['live-server']).toBeUndefined();
  expect(pkg.scripts.dev).toBe('vite');
  expect(pkg.scripts.preview).toBe('vite preview');
});

test('CI does not execute dependency install hooks or retain checkout credentials', () => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const installs = workflow.split('\n').filter(line => line.includes('run: npm ci'));
  expect(installs.length).toBeGreaterThan(0);
  expect(installs.every(line => line.includes('--ignore-scripts'))).toBe(true);
  const checkoutCount = (workflow.match(/uses: actions\/checkout@/g) || []).length;
  expect((workflow.match(/persist-credentials: false/g) || []).length).toBe(checkoutCount);
  expect(workflow).toContain('run: npm audit --audit-level=high');
  expect(workflow).toContain('name: dependency-audit');
});

test('tooling Node requirement matches the validated major and Lighthouse minimum', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(pkg.engines.node).toBe('>=22.19.0 <23');
});
