// Plays a French clip: public/audio/<slug>.mp3 (ElevenLabs), then .m4a (offline fallback voice), then speech synthesis.
import { audioMap, audioPath } from '../core/audio.js';

let map = {};
export function initAudio(content) { map = audioMap(content); }
const base = import.meta.env.BASE_URL;
const good = new Map(); // text -> working url
let current = null;

export function stopAudio() { if (current) { current.pause(); current = null; } if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }

export function playFr(text, { slow = false } = {}) {
  stopAudio();
  return new Promise(resolve => {
    const path = audioPath(text, map);
    if (!path) return speak(text, slow).then(resolve);
    const urls = good.has(text) ? [good.get(text)] : [`${base}${path}.mp3`, `${base}${path}.m4a`];
    const attempt = (i) => {
      if (i >= urls.length) return speak(text, slow).then(resolve);
      const a = new Audio(urls[i]);
      current = a;
      a.playbackRate = slow ? 0.75 : 1;
      a.onended = () => resolve();
      a.onerror = () => attempt(i + 1);
      a.play().then(() => good.set(text, urls[i])).catch(() => attempt(i + 1));
    };
    attempt(0);
  });
}
function speak(text, slow) {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = slow ? 0.6 : 0.85;
    u.onend = resolve; u.onerror = resolve;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  });
}
// Unlock audio on the first tap (iOS).
export function primeAudio() {
  const a = new Audio(); a.muted = true; a.play().catch(() => {});
}
