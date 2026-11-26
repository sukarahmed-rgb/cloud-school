// @ts-check
/**
 * Guards against raw translation keys leaking into the UI: every literal
 * __('key') referenced in source must exist in both locale files, and the
 * locale files must stay in sync with each other.
 */
const fs = require('fs');
const path = require('path');

const ar = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'public', 'i18n', 'ar.json'), 'utf8'),
);
const en = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'public', 'i18n', 'en.json'), 'utf8'),
);

function sourceFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(dir, f));
}

describe('i18n key coverage', () => {
  test('every literal __() key used in src exists in ar.json and en.json', () => {
    const keyRe = /__\(\s*'([A-Za-z0-9_]+)'/g;
    const missing = [];
    for (const file of [...sourceFiles('src'), 'index.html']) {
      const code = fs.readFileSync(file, 'utf8');
      for (const m of code.matchAll(keyRe)) {
        if (!(m[1] in ar)) {
          missing.push(`${file}: '${m[1]}' missing from ar.json`);
        }
        if (!(m[1] in en)) {
          missing.push(`${file}: '${m[1]}' missing from en.json`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('ar.json and en.json have identical key sets', () => {
    const onlyAr = Object.keys(ar).filter((k) => !(k in en));
    const onlyEn = Object.keys(en).filter((k) => !(k in ar));
    expect({ onlyAr, onlyEn }).toEqual({ onlyAr: [], onlyEn: [] });
  });
});
