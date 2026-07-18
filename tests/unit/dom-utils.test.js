import { showLoading, trapFocus, focusElement } from '../../src/modules/dom-utils.js';

describe('dom-utils.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.escapeHtml = jest.fn((s) => s);
  });

  test('showLoading sets innerHTML with loading overlay', () => {
    document.body.innerHTML = '<div id="loader"></div>';
    showLoading('loader', 'جار التحميل...');
    const el = document.getElementById('loader');
    expect(el.innerHTML).toContain('loading-overlay');
    expect(el.innerHTML).toContain('جار التحميل...');
  });

  test('showLoading does nothing when element missing', () => {
    expect(() => showLoading('nonexistent', 'msg')).not.toThrow();
  });

  test('focusElement focuses and scrolls into view', () => {
    document.body.innerHTML = '<button id="my-btn"></button>';
    const btn = document.getElementById('my-btn');
    btn.focus = jest.fn();
    btn.scrollIntoView = jest.fn();
    focusElement('my-btn');
    expect(btn.focus).toHaveBeenCalled();
    expect(btn.scrollIntoView).toHaveBeenCalled();
  });

  test('focusElement does nothing for missing id', () => {
    expect(() => focusElement('nonexistent')).not.toThrow();
  });

  test('trapFocus traps Tab within container', () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="first">First</button>
        <button id="last">Last</button>
      </div>
    `;
    const container = document.getElementById('container');
    trapFocus(container);
    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    document.getElementById('last').focus();
    container.dispatchEvent(event);
    expect(document.activeElement.id).toBe('first');
  });

  test('trapFocus handles Shift+Tab from first element', () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="first">First</button>
        <button id="last">Last</button>
      </div>
    `;
    const container = document.getElementById('container');
    trapFocus(container);
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    document.getElementById('first').focus();
    container.dispatchEvent(event);
    expect(document.activeElement.id).toBe('last');
  });

  test('trapFocus does nothing for non-Tab key', () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="first">First</button>
      </div>
    `;
    const container = document.getElementById('container');
    trapFocus(container);
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    expect(() => container.dispatchEvent(event)).not.toThrow();
  });
});
