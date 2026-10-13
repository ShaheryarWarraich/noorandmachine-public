// Scoring, round summaries, stickers and the quiz-ready rule. Pure.
export const ROUND_SIZE = 10;
export const READY = { minAccuracy: 90, runsInARow: 2 };
export const NEED = { spell: 3, sound: 2, mean: 2 }; // correct answers per skill to earn a word's sticker
export const SKILLS = ['spell', 'sound', 'mean'];
export const SKILL_NAMES = { spell: 'Spell it', sound: 'Say it', mean: 'Know it' };
export const FOCUS_NAMES = { all: 'Everything', spell: 'Spelling', sound: 'Sounds', mean: 'Meanings' };

// One per-item record, as stored inside a round (word, skill, type, correct, ms + display helpers).
export function makeRecord(q, { correct, nearly = false, skipped = false, ms = 0 }) {
  return { key: q.key, skill: q.skill, type: q.type, correct: !!correct, nearly: !!nearly, skipped: !!skipped, ms: Math.round(ms), prompt: q.prompt, reveal: q.reveal, en: q.en };
}

export const starsFor = (correct, total = ROUND_SIZE) => (correct >= total * 0.9 ? 3 : correct >= total * 0.7 ? 2 : correct >= total * 0.5 ? 1 : 0);

export function summarizeRun(records) {
  const attempted = records.filter(r => !r.skipped);
  const correct = attempted.filter(r => r.correct).length;
  const accuracy = attempted.length ? Math.round((correct / attempted.length) * 100) : 0;
  let best = 0, cur = 0;
  for (const r of records) { if (r.skipped) continue; if (r.correct) { cur++; best = Math.max(best, cur); } else cur = 0; }
  const skills = {};
  for (const r of attempted) { const v = (skills[r.skill] ||= { attempted: 0, correct: 0 }); v.attempted++; if (r.correct) v.correct++; }
  const missed = records.filter(r => !r.correct).map(r => ({ prompt: r.prompt, reveal: r.reveal, en: r.en, type: r.type, key: r.key, skipped: !!r.skipped, nearly: !!r.nearly }));
  return { correct, attempted: attempted.length, skipped: records.length - attempted.length, total: records.length, accuracy, bestStreak: best, stars: starsFor(correct, Math.max(records.length, 1)), skills, missed };
}

// A round counts toward "quiz-ready" when it was an "Everything" round with accuracy >= 90.
export const runQualifies = (run) => run.focus === 'all' && run.summary.accuracy >= READY.minAccuracy && run.summary.attempted >= ROUND_SIZE;
// runs: any order. Ready = the latest two rounds both qualify.
export function readiness(runs) {
  const sorted = runs.slice().sort((a, b) => a.tsMs - b.tsMs);
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) { if (runQualifies(sorted[i])) streak++; else break; }
  return { ready: streak >= READY.runsInARow, streak: Math.min(streak, READY.runsInARow), needed: READY.runsInARow, runs: sorted.length };
}

// ---- stickers (per-word mastery) ----
// attempts: flat list of records ({key, skill, correct, skipped}) from rounds, practice and lesson checks.
export function flattenAttempts(runs, practice = []) {
  return [...runs.flatMap(r => r.items || []), ...practice].filter(r => !r.skipped);
}
export function masteryByWord(attempts, wordIds) {
  const out = {};
  for (const id of wordIds) {
    const m = {};
    for (const s of SKILLS) {
      const a = attempts.filter(x => x.key === id && x.skill === s); const c = a.filter(x => x.correct).length;
      m[s] = { attempted: a.length, correct: c, need: NEED[s], done: c >= NEED[s] };
    }
    m.sticker = SKILLS.every(s => m[s].done);
    m.progress = SKILLS.reduce((t, s) => t + Math.min(m[s].correct, NEED[s]), 0) / SKILLS.reduce((t, s) => t + NEED[s], 0);
    out[id] = m;
  }
  return out;
}
export const stickerCount = (mastery) => Object.values(mastery).filter(m => m.sticker).length;

export const lastRuns = (runs, n = 10) => runs.slice().sort((a, b) => a.tsMs - b.tsMs).slice(-n);
export function weakestWords(attempts, { minAttempts = 3, n = 5 } = {}) {
  const by = {};
  for (const a of attempts) { const x = (by[a.key] ||= { key: a.key, attempted: 0, correct: 0 }); x.attempted++; if (a.correct) x.correct++; }
  return Object.values(by).filter(x => x.attempted >= minAttempts).map(x => ({ ...x, accuracy: Math.round((x.correct / x.attempted) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted).slice(0, n);
}
