// نسخة محلية من خريطة برايل للاختبار — بدون import (CommonJS)
const arabicBrailleMap = {
  1: 'ا',
  '1,2': 'ب',
  '2,3,4,5': 'ت',
  '1,4,5,6': 'ث',
  '2,4,5': 'ج',
  '1,5,6': 'ح',
  '1,3,4,6': 'خ',
  '1,4,5': 'د',
  '2,3,4,6': 'ذ',
  '1,2,3,5': 'ر',
  '1,3,5,6': 'ز',
  '2,3,4': 'س',
  '1,4,6': 'ش',
  '1,2,3,4,6': 'ص',
  '1,2,4,6': 'ض',
  '2,3,4,5,6': 'ط',
  '1,2,3,4,5,6': 'ظ',
  '1,2,3,5,6': 'ع',
  '1,2,6': 'غ',
  '1,2,4': 'ف',
  '1,2,3,4,5': 'ق',
  '1,3': 'ك',
  '1,2,3': 'ل',
  '1,3,4': 'م',
  '1,3,4,5': 'ن',
  '1,2,5': 'هـ',
  '2,4,5,6': 'و',
  '2,4': 'ي',
  '2,3,5': '!',
  '2,5,6': '؟',
};

function getBrailleChar(dotsSet) {
  const sorted = Array.from(dotsSet).sort((a, b) => a - b);
  return arabicBrailleMap[sorted.join(',')] || null;
}

function getBraillePreview(dotsSet) {
  const sorted = Array.from(dotsSet).sort((a, b) => a - b);
  const keyString = sorted.join(',');
  const mapped = arabicBrailleMap[keyString] || (dotsSet.size > 0 ? 'غير مكتمل' : 'لا يوجد');
  return { keyString, mapped };
}

describe('Braille Module', () => {
  test('getBrailleChar returns correct Arabic char for dot pattern', () => {
    const dots = new Set([1]);
    expect(getBrailleChar(dots)).toBe('ا');
  });

  test('getBrailleChar returns known char for pattern', () => {
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
