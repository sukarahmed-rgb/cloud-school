import { getBrailleChar, getBraillePreview } from '../../src/braille.js';

describe('Braille Module', () => {
  const { getBrailleChar, getBraillePreview } = braille;

  test('getBrailleChar returns correct Arabic char for dot pattern', () => {
    const dots = new Set([1]);
    expect(getBrailleChar(dots)).toBe('ا');
  });

  test('getBrailleChar returns null for unknown pattern', () => {
    const dots = new Set([1, 2, 3, 4, 5, 6]);
    expect(getBrailleChar(dots)).toBe('ظ');
  });

  test('getBraillePreview returns correct preview text', () => {
    const dots = new Set([1, 2]);
    const result = getBraillePreview(dots);
    expect(result.mapped).toBe('ب');
    expect(result.keyString).toBe('1,2');
  });

  test('getBrailleChar returns null for incomplete pattern', () => {
    const dots = new Set([1, 6]);
    expect(getBrailleChar(dots)).toBeNull();
  });
});
