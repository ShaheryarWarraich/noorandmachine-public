// Answer checker. Pure.
const APOS = /[’‘ʼ`´]/g;
export const norm = (s) => String(s ?? '').replace(APOS, "'").replace(/\s+/g, ' ').trim().toLowerCase();
export const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae');
// Apostrophes (and the space after s') do not matter when the expected text has one: sil, s il, s'il all match s'il.
const key = (s, expected) => (expected.includes("'") ? s.replace(/['\s]/g, '') : s);

// accepted: string or array of strings (any one may be typed).
// -> { status: 'correct' | 'nearly' | 'wrong' | 'empty', matched? }
export function checkText(input, accepted) {
  const list = (Array.isArray(accepted) ? accepted : [accepted]).map(norm);
  const typed = norm(input);
  if (!typed) return { status: 'empty' };
  for (const acc of list) if (key(typed, acc) === key(acc, acc)) return { status: 'correct', matched: acc };
  for (const acc of list) if (stripAccents(key(typed, acc)) === stripAccents(key(acc, acc))) return { status: 'nearly', matched: acc };
  return { status: 'wrong' };
}

// What a speech recogniser heard vs. the word: letters only, no accents; equal, contained, or close enough.
const bare = (s) => stripAccents(norm(s)).replace(/[^a-z]/g, '');
function distance(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
export function checkSaid(heard, accepted) {
  const h = bare(heard); if (!h) return { status: 'empty' };
  for (const acc of (Array.isArray(accepted) ? accepted : [accepted])) {
    const t = bare(acc); if (!t) continue;
    if (h === t || h.includes(t)) return { status: 'correct', heard };
    const score = 1 - distance(h, t) / Math.max(h.length, t.length);
    if (score >= 0.72) return { status: 'correct', heard, score };
  }
  return { status: 'wrong', heard };
}

// Check a question's answer. `answer` depends on type:
//  type: typed string · tiles: array of characters · letter/pickspell/meaning/french/listen/sound: chosen option · say: text heard
export function checkAnswer(q, answer) {
  switch (q.type) {
    case 'type': return checkText(answer, q.accept);
    case 'tiles': { const built = (answer || []).join(''); return { status: built === q.target ? 'correct' : 'wrong' }; }
    case 'say': return checkSaid(answer, q.accept);
    default: return { status: answer === q.answer ? 'correct' : 'wrong' };
  }
}
export const isTyped = (q) => q.type === 'type';
