import { content, ok, done } from './_load.mjs';
import { createGenerator, TYPES, SKILL_OF, weightsFor } from '../src/core/questions.js';
import { checkAnswer } from '../src/core/check.js';
import { PUNCT } from '../src/core/content.js';

// practice: 600 questions, every word and every type, never the same word twice in a row, answers check out
const gen = createGenerator(content, { mode: 'practice', seed: 7 });
const qs = Array.from({ length: 600 }, () => gen.next());
const byWord = {}, byType = {};
let repeats = 0, prev = null;
for (const q of qs) {
  byWord[q.key] = (byWord[q.key] || 0) + 1; byType[q.type] = (byType[q.type] || 0) + 1;
  if (q.key === prev) repeats++; prev = q.key;
  ok(TYPES.includes(q.type) && q.skill === SKILL_OF[q.type], `type and skill: ${q.type}`);
  ok(q.id && q.key && q.fr && q.en && q.pic && q.reveal && q.prompt, `question complete: ${q.type}`);
  switch (q.type) {
    case 'type': ok(checkAnswer(q, q.fr).status === 'correct', 'typing the word is right'); break;
    case 'pickspell': ok(q.options.length === 3 && q.options.includes(q.answer) && new Set(q.options).size === 3, 'three different spellings'); break;
    case 'letter': ok(q.options.length === 3 && q.options.includes(q.answer) && !PUNCT.has(q.chars[q.index]) && q.chars[q.index] === q.answer, `letter options for ${q.fr}`); break;
    case 'tiles': ok(q.tiles.map(t => t.text).sort().join('') === Array.from(q.target).sort().join('') && checkAnswer(q, Array.from(q.target)).status === 'correct', `tiles for ${q.fr}`); break;
    case 'meaning': ok(q.options.length === 3 && q.options.includes(q.en) && q.answer === q.en, 'meaning options'); break;
    case 'french': ok(q.options.length === 3 && q.options.includes(q.fr) && q.answer === q.fr, 'french options'); break;
    case 'listen': ok(q.hear === q.fr && q.options.length === 3 && q.options.includes(q.fr), 'listen options'); break;
    case 'sound': ok(q.options.length === 2 && q.options.some(o => o.id === 'good' && o.text === q.fr) && q.options.some(o => o.id === 'bad') && q.why, 'sound pair'); break;
    case 'say': ok(q.sayHint && checkAnswer(q, q.fr).status === 'correct', 'say question'); break;
  }
}
const counts = Object.values(byWord);
ok(counts.length === content.words.length, 'every word asked');
ok(Math.max(...counts) - Math.min(...counts) <= 2, `words balanced (${Math.min(...counts)}-${Math.max(...counts)})`);
ok(repeats === 0, 'same word never twice in a row');
for (const t of TYPES) ok(byType[t] > 0, `type used: ${t} (${byType[t] || 0})`);
console.log('  practice mix:', JSON.stringify(byType));

// rounds: the microphone type never appears; focus limits the skill
for (const focus of ['all', 'spell', 'sound', 'mean']) {
  const g = createGenerator(content, { mode: 'round', focus, seed: 3 });
  const rq = Array.from({ length: 200 }, () => g.next());
  ok(rq.every(q => q.type !== 'say'), `no microphone in rounds (${focus})`);
  if (focus !== 'all') ok(rq.every(q => q.skill === focus), `focus ${focus} keeps to its skill`);
  else ok(['spell', 'sound', 'mean'].every(s => rq.some(q => q.skill === s)), 'everything round mixes skills');
}
ok(weightsFor('round', 'all').say === 0 && weightsFor('practice', 'all').say > 0, 'say weight only in practice');
// a lesson check restricted to a few words only asks those
const lg = createGenerator(content, { mode: 'practice', words: ['de_rien', 'bonne_chance'], seed: 1, retry: false });
ok(Array.from({ length: 30 }, () => lg.next()).every(q => ['de_rien', 'bonne_chance'].includes(q.key)), 'lesson check keeps to its words');
// a missed word comes back soon in practice
const rg = createGenerator(content, { mode: 'practice', seed: 5 });
const first = rg.next(); rg.markMissed(first);
const nextKeys = Array.from({ length: 8 }, () => rg.next().key);
ok(nextKeys.includes(first.key), 'missed word returns within 8 questions');
// deterministic
const a = createGenerator(content, { seed: 42 }), b = createGenerator(content, { seed: 42 });
ok(JSON.stringify(Array.from({ length: 20 }, () => a.next())) === JSON.stringify(Array.from({ length: 20 }, () => b.next())), 'same seed, same questions');
done('questions');
