export function escapeHtml(str) {
  if (!str && str !== 0) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function pcmToWav(pcmBuffer, sampleRate) {
  const buf = new ArrayBuffer(44 + pcmBuffer.byteLength);
  const v = new DataView(buf);
  const w = (o, s, l) => { if (l) v.setUint32(o, s, true); else v.setUint32(o, s, false); };
  w(0, 0x52494646, false);
  w(4, 36 + pcmBuffer.byteLength, true);
  w(8, 0x57415645, false);
  w(12, 0x666d7420, false);
  w(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  w(24, sampleRate, true);
  w(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 0x64617461, false);
  w(40, pcmBuffer.byteLength, true);
  const pcm = new Int16Array(pcmBuffer);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, pcm[i], true);
  return new Blob([buf], { type: 'audio/wav' });
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
