// Microphone: the browser's own speech recogniser (French). Safari and Chrome have it; it needs the internet.
// When it is missing the "Say it" question becomes an echo game (hear it, say it, hear it again) instead.
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const canListen = () => !!SR && (typeof navigator === 'undefined' || navigator.onLine !== false);

let active = null;
export function stopListening() { try { active?.abort(); } catch { /* already stopped */ } active = null; }

// Resolves with the best guess (string, possibly ''), never rejects. Gives up after `maxMs`.
export function listenOnce({ lang = 'fr-FR', maxMs = 6000 } = {}) {
  return new Promise(resolve => {
    if (!SR) return resolve('');
    stopListening();
    const r = new SR(); active = r;
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
    let done = false;
    const finish = (text) => { if (done) return; done = true; clearTimeout(timer); if (active === r) active = null; resolve(text || ''); };
    const timer = setTimeout(() => { try { r.stop(); } catch { /* fine */ } finish(''); }, maxMs);
    r.onresult = (e) => {
      const alts = [];
      for (const res of e.results) for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
      finish(alts.join(' | '));
    };
    r.onerror = () => finish('');
    r.onend = () => finish('');
    try { r.start(); } catch { finish(''); }
  });
}
