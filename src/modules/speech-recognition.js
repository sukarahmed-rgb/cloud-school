// @ts-check
import { speak } from './speech.js';
import { __ } from './i18n.js';

let speechRecognition = null;
let isSpeechRecognitionActive = false;
let currentSpeechCallback = null;
let _speechResolved = false;
let _speechTimeoutId = null;

export function initSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    speak(__('micUnsupported'));
    return null;
  }
  const rec = new SR();
  rec.lang = 'ar-EG';
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  return rec;
}

export function startMicrophone() {
  if (!speechRecognition) {
    speechRecognition = initSpeechRecognition();
    if (!speechRecognition) {
      return null;
    }
    speechRecognition.onresult = handleSpeechResult;
    speechRecognition.onerror = handleSpeechError;
    speechRecognition.onend = handleSpeechEnd;
  }
  try {
    speechRecognition.start();
    isSpeechRecognitionActive = true;
    return speechRecognition;
  } catch (e) {
    speak(__('micError'));
    return null;
  }
}

function resolveSpeech(result) {
  if (_speechResolved) {
    return;
  }
  _speechResolved = true;
  if (_speechTimeoutId) {
    clearTimeout(_speechTimeoutId);
    _speechTimeoutId = null;
  }
  isSpeechRecognitionActive = false;
  if (currentSpeechCallback) {
    currentSpeechCallback(result);
    currentSpeechCallback = null;
  }
}

function handleSpeechResult(event) {
  const transcript = event.results[0][0].transcript;
  resolveSpeech(transcript);
}

function handleSpeechError(event) {
  const msg =
    event.error === 'no-speech'
      ? __('noSpeech')
      : event.error === 'aborted'
        ? ''
        : __('speechError');
  if (msg) {
    speak(msg);
  }
  resolveSpeech(null);
}

function handleSpeechEnd() {
  isSpeechRecognitionActive = false;
}

export function listenForSpeech(callback, timeoutMs = 10000) {
  if (currentSpeechCallback) {
    currentSpeechCallback(null);
    currentSpeechCallback = null;
  }
  _speechResolved = false;
  currentSpeechCallback = callback;
  const rec = startMicrophone();
  if (!rec) {
    if (callback) {
      callback(null);
    }
    return;
  }
  if (timeoutMs > 0) {
    _speechTimeoutId = setTimeout(() => {
      if (isSpeechRecognitionActive) {
        try {
          speechRecognition.stop();
        } catch (e) {}
        isSpeechRecognitionActive = false;
      }
      resolveSpeech(null);
    }, timeoutMs);
  }
}

export function stopSpeechRecognition() {
  if (isSpeechRecognitionActive) {
    try {
      speechRecognition.stop();
    } catch (e) {}
  }
  currentSpeechCallback = null;
  isSpeechRecognitionActive = false;
}

export function waitForSpeechEnd(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
