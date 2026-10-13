import 'fake-indexeddb/auto';
import { content, ok, done } from './_load.mjs';
import { openDB } from '../src/core/db.js';
import { createStorage } from '../src/core/storage.js';
import { createGenerator } from '../src/core/questions.js';
import { makeRecord, ROUND_SIZE } from '../src/core/scoring.js';

const db = await openDB(globalThis.indexedDB, 'test-fg-' + Math.random());
let t = Date.UTC(2026, 9, 13, 10, 0, 0);
const store = createStorage(db, () => new Date(t));
const W = content.words.map(w => w.id);

// simulate star rounds by a pupil who answers (almost) everything right
const gen = createGenerator(content, { mode: 'round', seed: 11 });
async function play(focus, wrongEvery) {
  const items = [];
  for (let i = 0; i < ROUND_SIZE; i++) { const q = gen.next(); items.push(makeRecord(q, { correct: !(wrongEvery && i % wrongEvery === 0), ms: 3800 })); }
  t += 3600_000; return store.saveRun({ focus, items });
}
let n0 = await store.numbers(W);
ok(n0.runs === 0 && n0.total === 0 && !n0.readiness.ready && n0.stickers === 0, 'fresh start is empty');
const r1 = await play('all', 0);
ok(r1.id && r1.ts && r1.summary.accuracy === 100 && r1.summary.stars === 3 && r1.items.length === ROUND_SIZE, 'round saved with id, timestamp, summary, items');
ok(r1.items[0].key && r1.items[0].skill && r1.items[0].type && 'correct' in r1.items[0] && r1.items[0].ms === 3800, 'per-item record fields');
let n1 = await store.numbers(W);
ok(n1.readiness.streak === 1 && !n1.readiness.ready, 'one good round: not ready yet');
await play('all', 2); // 50%
let n2 = await store.numbers(W);
ok(n2.runs === 2 && n2.readiness.streak === 0, 'a poor round resets the meter');
await play('all', 0); await play('all', 0);
const n3 = await store.numbers(W);
ok(n3.readiness.ready, 'two good rounds in a row: ready');
ok(n3.last.length === 4 && n3.total === 4 * ROUND_SIZE, `last runs and total (${n3.total})`);
// practice attempts and lesson checks count toward stickers
const g2 = createGenerator(content, { mode: 'practice', words: ['allo'], seed: 2, retry: false });
for (let i = 0; i < 12; i++) { const q = g2.next(); await store.savePractice(makeRecord(q, { correct: true, ms: 900 }), i < 6 ? 'practice' : 'lesson'); }
const n4 = await store.numbers(W);
ok(n4.total === 4 * ROUND_SIZE + 12, 'practice answers count too');
ok(n4.mastery.allo.sticker === true || n4.mastery.allo.progress > 0.5, 'allo sticker progress after practice');
// lessons
await store.markLesson('allo', { watched: 1 });
await store.markLesson('allo', { passed: 1 });
const n5 = await store.numbers(W);
ok(n5.lessons.allo.watched === 1 && n5.lessons.allo.passed === 1 && n5.lessons.allo.ts, 'lesson watched and passed');
// the student's name lives in the settings store and goes into the export
ok((await store.getProfile()).name === '', 'no name yet');
await store.setProfile({ name: 'Anya' });
ok((await store.getProfile()).name === 'Anya', 'name saved on the device');
const ex = await store.exportAll();
ok(ex.student === 'Anya', 'export names the student');
ok(ex.results.length === 4 && ex.attempts.length === 12 && ex.lessons.length === 1 && ex.exportedAt, 'export has rounds, attempts and lessons');
ok(JSON.parse(JSON.stringify(ex)).results[0].summary.total === ROUND_SIZE, 'export is valid JSON');
done('storage');
