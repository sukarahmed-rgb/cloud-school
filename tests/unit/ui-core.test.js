import { showToast, announceToScreenReader, shortcutRow } from '../../src/modules/ui-core.js';

describe('showToast', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="toast-message"></div>';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('shows toast message', () => {
    showToast('Test message');
    const toast = document.getElementById('toast-message');
    expect(toast.textContent).toBe('Test message');
    expect(toast.classList.contains('hidden')).toBe(false);
  });

  test('uses error styling for errors', () => {
    showToast('Error!', true);
    const toast = document.getElementById('toast-message');
    expect(toast.className).toContain('bg-red-600');
    expect(toast.className).toContain('text-white');
  });

  test('uses normal styling by default', () => {
    showToast('Info');
    const toast = document.getElementById('toast-message');
    expect(toast.className).toContain('bg-yellow-400');
    expect(toast.className).toContain('text-black');
  });

  test('hides toast after 4 seconds', () => {
    showToast('Timed');
    const toast = document.getElementById('toast-message');
    expect(toast.classList.contains('hidden')).toBe(false);
    jest.advanceTimersByTime(4000);
    expect(toast.classList.contains('hidden')).toBe(true);
  });

  test('does nothing if toast element missing', () => {
    document.body.innerHTML = '';
    expect(() => showToast('noop')).not.toThrow();
  });
});

describe('announceToScreenReader', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="aria-live"></div>';
  });

  test('sets text content via requestAnimationFrame', (done) => {
    announceToScreenReader('New alert');
    requestAnimationFrame(() => {
      const el = document.getElementById('aria-live');
      expect(el.textContent).toBe('New alert');
      done();
    });
  });

  test('does nothing if aria-live element missing', () => {
    document.body.innerHTML = '';
    expect(() => announceToScreenReader('noop')).not.toThrow();
  });
});

describe('shortcutRow', () => {
  test('generates HTML for a shortcut row', () => {
    const html = shortcutRow('Ctrl+K', 'Open search');
    expect(html).toContain('Ctrl+K');
    expect(html).toContain('Open search');
    expect(html).toContain('font-mono');
    expect(html).toContain('text-yellow-300');
  });
});
