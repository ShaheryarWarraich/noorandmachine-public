import { ok, done } from './_load.mjs';
import { makeRecord, summarizeRun, starsFor, readiness, masteryByWord, stickerCount, flattenAttempts, weakestWords, ROUND_SIZE, NEED } from '../src/core/scoring.js';

const q = (key, type, skill) => ({ key, type, skill, prompt: 'p', reveal: 'r', en: 'e' });
const rec = (key, skill, correct, extra = {}) => makeRecord(q(key, 'type', skill), { correct, ...extra });

ok(starsFor(10) === 3 && starsFor(9) === 3 && starsFor(8) === 2 && starsFor(7) === 2 && starsFor(5) === 1 && starsFor(4) === 0, 'stars thresholds');
const items = [...Array.from({ length: 9 }, (_, i) => rec('w' + (i % 3), 'spell', true)), rec('w1', 'mean', false)];
const s = summarizeRun(items);
ok(s.correct === 9 && s.total === 10 && s.accuracy === 90 && s.stars === 3 && s.bestStreak === 9 && s.missed.length === 1, 'summary of a 9/10 round');
const sk = summarizeRun([rec('a', 'spell', true), rec('a', 'sound', true, { skipped: true })]);
ok(sk.attempted === 1 && sk.skipped === 1 && sk.total === 2, 'skipped counted separately');

const run = (focus, correct, t) => ({ focus, tsMs: t, summary: summarizeRun([...Array.from({ length: correct }, () => rec('a', 'spell', true)), ...Array.from({ length: ROUND_SIZE - correct }, () => rec('a', 'spell', false))]) });
ok(!readiness([]).ready && readiness([]).streak === 0, 'nothing yet');
ok(readiness([run('all', 9, 1)]).streak === 1, 'one good round');
ok(readiness([run('all', 9, 1), run('all', 10, 2)]).ready, 'two good rounds: ready');
ok(!readiness([run('all', 10, 1), run('all', 7, 2)]).ready && readiness([run('all', 10, 1), run('all', 7, 2)]).streak === 0, 'a poor round resets');
ok(!readiness([run('all', 10, 1), run('spell', 10, 2)]).ready, 'spelling-only rounds do not count');
ok(readiness([run('all', 10, 3), run('all', 7, 1), run('all', 10, 2)]).ready, 'order by time, not by list');

// stickers
const ids = ['a', 'b'];
const att = [
  ...Array.from({ length: NEED.spell }, () => rec('a', 'spell', true)), ...Array.from({ length: NEED.sound }, () => rec('a', 'sound', true)), ...Array.from({ length: NEED.mean }, () => rec('a', 'mean', true)),
  rec('b', 'spell', true), rec('b', 'spell', false),
];
const m = masteryByWord(att, ids);
ok(m.a.sticker && !m.b.sticker && stickerCount(m) === 1, 'sticker when every skill is done');
ok(m.b.spell.correct === 1 && m.b.spell.attempted === 2 && m.b.progress > 0 && m.b.progress < 1, 'partial progress');
ok(m.a.progress === 1, 'full progress');
const flat = flattenAttempts([{ items: [rec('a', 'spell', true), rec('a', 'spell', true, { skipped: true })] }], [rec('b', 'mean', false)]);
ok(flat.length === 2, 'flatten drops skipped');
const weak = weakestWords([rec('a', 'spell', false), rec('a', 'spell', false), rec('a', 'spell', true), rec('b', 'spell', true), rec('b', 'spell', true), rec('b', 'spell', true)], { minAttempts: 3, n: 5 });
ok(weak[0].key === 'a' && weak[0].accuracy === 33, 'weakest first');
done('scoring');
