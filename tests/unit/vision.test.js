import {
  previewVisionImage,
  speakVisionResponse,
  uploadedImageBase64,
  uploadedImageMime,
} from '../../src/modules/vision.js';

describe('vision.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="vision-preview-container" class="hidden">
        <img id="vision-image-preview" />
      </div>
      <div id="vision-response-text">some description</div>
    `;

    window.speak = jest.fn();
    window.__ = jest.fn((key) => {
      const map = { visionImageLoaded: 'image loaded' };
      return map[key] || key;
    });
  });

  describe('previewVisionImage', () => {
    test('sets base64 and mime from file input event', () => {
      const fileContent = 'fake-image-data';
      const blob = new Blob([fileContent], { type: 'image/png' });
      const file = new File([blob], 'test.png', { type: 'image/png' });
      const event = { target: { files: [file] } };

      previewVisionImage(event);

      expect(uploadedImageMime).toBe('image/png');
    });

    test('does nothing when no file', () => {
      const event = { target: { files: [] } };
      previewVisionImage(event);
      // Should not throw and no side effects beyond no-op
    });

    test('speaks image loaded message', (done) => {
      const fileContent = 'test';
      const blob = new Blob([fileContent], { type: 'image/jpeg' });
      const file = new File([blob], 'test.jpg', { type: 'image/jpeg' });
      const event = { target: { files: [file] } };

      previewVisionImage(event);

      // FileReader is async; wait for the next tick
      setTimeout(() => {
        expect(window.speak).toHaveBeenCalledWith('image loaded');
        done();
      }, 50);
    });
  });

  describe('speakVisionResponse', () => {
    test('reads response text and speaks it', () => {
      speakVisionResponse();
      expect(window.speak).toHaveBeenCalledWith('some description');
    });
  });
});
