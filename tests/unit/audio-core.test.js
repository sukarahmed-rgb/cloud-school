import { speakToUser } from '../../src/modules/audio-core.js';

describe('audio-core.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="aria-live"></div>';
    window.__speechLang = 'ar-EG';
    window.speechSynthesis = { speak: jest.fn() };
    window.SpeechSynthesisUtterance = jest.fn(() => ({}));
    document.dispatchEvent(new Event('click', { bubbles: true }));
  });

  test('speakToUser sets aria-live text content', () => {
    speakToUser('test message');
    expect(document.getElementById('aria-live').textContent).toBe('test message');
  });

  test('speakToUser creates utterance with correct language', () => {
    speakToUser('مرحبا');
    expect(window.SpeechSynthesisUtterance).toHaveBeenCalledWith('مرحبا');
  });

  test('speakToUser calls speechSynthesis.speak', () => {
    speakToUser('hello');
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  test('speakToUser does not throw when aria-live missing', () => {
    document.body.innerHTML = '';
    expect(() => speakToUser('test')).not.toThrow();
  });
});
