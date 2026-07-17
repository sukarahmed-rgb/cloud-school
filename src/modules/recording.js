// @ts-check
import { blobToBase64 } from './helpers.js';
import { transcribeAudio } from './gemini-client.js';

/** @type {MediaRecorder|null} */
export let mediaRecorder = null;
/** @type {Blob[]} */
export let audioChunks = [];
/** @type {boolean} */
export let isRecording = false;

/** Stop all audio tracks from the media recorder */
export function stopAudioTracks() {
  if (mediaRecorder && mediaRecorder.stream) {
    mediaRecorder.stream.getTracks().forEach(function (t) {
      t.stop();
    });
  }
}

/** Toggle audio recording on/off */
export function toggleAudioRecording() {
  const micBtn = document.getElementById('btn-mic-input');
  if (isRecording) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    stopAudioTracks();
    isRecording = false;
    if (micBtn) {
      micBtn.classList.remove('bg-red-600', 'animate-pulse');
    }
    window.speak(window.__('micStop'));
  } else {
    if (!navigator.mediaDevices?.getUserMedia) {
      window.speak(window.__('micUnsupported'));
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = function (e) {
          if (e.data.size > 0) {
            audioChunks.push(e.data);
          }
        };
        mediaRecorder.onstop = async function () {
          const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
          audioChunks = [];
          try {
            const base64 = await blobToBase64(blob);
            const text = await transcribeAudio(base64, mediaRecorder.mimeType);
            if (text?.trim()) {
              const ans = document.getElementById('assignment-student-answer');
              if (ans) {
                const ansInput = /** @type {HTMLInputElement} */ (ans);
                ansInput.value += (ansInput.value ? ' ' : '') + text.trim();
              }
              const aiQ = document.getElementById('ai-tutor-query');
              if (
                aiQ &&
                document.getElementById('student-sub-ai-tutor') &&
                !document.getElementById('student-sub-ai-tutor').classList.contains('hidden')
              ) {
                /** @type {HTMLInputElement} */ (aiQ).value = text.trim();
              }
              window.speak(window.__('micCaptureOk'));
            }
          } catch (e) {
            window.speak(window.__('micError'));
          }
          stopAudioTracks();
        };
        mediaRecorder.start();
        isRecording = true;
        if (micBtn) {
          micBtn.classList.add('bg-red-600', 'animate-pulse');
        }
        window.speak(window.__('micStart'));
      })
      .catch(function () {
        window.speak(window.__('micPermission'));
      });
  }
}
