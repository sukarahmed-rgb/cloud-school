export function speakToUser(message) {
  const ariaLive = document.getElementById('aria-live');
  if (ariaLive) ariaLive.textContent = message;
  try {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = window.__speechLang || 'ar-SA';
    window.speechSynthesis.speak(utterance);
  } catch { }
}
