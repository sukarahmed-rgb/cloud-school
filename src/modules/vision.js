// @ts-check
/** @type {string|null} */
export let uploadedImageBase64 = null;
/** @type {string|null} */
export let uploadedImageMime = null;
// Sync to window for lazy-loaded consumers
Object.defineProperty(window, '_visionBase64', { get: () => uploadedImageBase64 });
Object.defineProperty(window, '_visionMime', { get: () => uploadedImageMime });

/**
 * @param {Event} event
 */
export function previewVisionImage(event) {
  const file = /** @type {HTMLInputElement} */ (event.target).files?.[0];
  if (!file) {
    return;
  }

  uploadedImageMime = file.type;
  const reader = new FileReader();
  reader.onloadend = function () {
    if (typeof reader.result === 'string') {
      uploadedImageBase64 = reader.result.split(',')[1];
      document.getElementById('vision-preview-container').classList.remove('hidden');
      /** @type {HTMLImageElement} */ (document.getElementById('vision-image-preview')).src =
        reader.result;
    }
    window.speak(window.__('visionImageLoaded'));
  };
  reader.readAsDataURL(file);
}

/** Speak the vision response text */
export function speakVisionResponse() {
  const text = document.getElementById('vision-response-text').textContent;
  window.speak(text);
}
