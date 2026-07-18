import { shortcutRow, showKeyboardHelp } from '../../src/modules/ui-core.js';

jest.mock('../../src/modules/dom-utils.js', () => ({
  trapFocus: jest.fn(),
}));

describe('keyboard-help.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.__ = jest.fn((k) => k);
    window.speak = jest.fn();
  });

  test('shortcutRow generates HTML', () => {
    const html = shortcutRow('Ctrl+K', 'Open search');
    expect(html).toContain('Ctrl+K');
    expect(html).toContain('Open search');
    expect(html).toContain('font-mono');
    expect(html).toContain('text-yellow-300');
  });

  test('showKeyboardHelp creates overlay with shortcuts', () => {
    showKeyboardHelp();
    const overlay = document.getElementById('shortcuts-help-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.innerHTML).toContain('keyboardHelp');
    expect(overlay.querySelector('[role="dialog"]')).toBeTruthy();
  });

  test('showKeyboardHelp removes existing overlay on second call', () => {
    showKeyboardHelp();
    expect(document.getElementById('shortcuts-help-overlay')).toBeTruthy();
    showKeyboardHelp();
    expect(document.getElementById('shortcuts-help-overlay')).toBeFalsy();
  });

  test('close button removes overlay', () => {
    showKeyboardHelp();
    const btn = document.getElementById('btn-close-help');
    btn.click();
    expect(document.getElementById('shortcuts-help-overlay')).toBeFalsy();
  });
});
