// Question generator. Pure: give it the content, get an endless balanced stream of questions.
//  Word-first: the next word is the least-asked one that is not the one just asked, so all eleven stay balanced
//  and the same word never comes twice in a row. The type is then drawn by weight among the types that fit.
import { indexContent, tilesSplit, PUNCT } from './content.js';
import { mulberry32, pick, shuffle, weightedPick } from './rng.js';

export const TYPES = ['type', 'pickspell', 'letter', 'tiles', 'meaning', 'french', 'listen', 'sound', 'say'];
export const SKILL_OF = { type: 'spell', pickspell: 'spell', letter: 'spell', tiles: 'spell', meaning: 'mean', french: 'mean', listen: 'sound', sound: 'sound', say: 'sound' };
export const TYPE_NAMES = { type: 'Type it', pickspell: 'Pick the spelling', letter: 'Missing letter', tiles: 'Build it', meaning: 'What does it mean?', french: 'Say it in French', listen: 'Listen', sound: 'Which sounds right?', say: 'Say it' };
const BASE = { type: 2.2, pickspell: 1.6, letter: 1.8, tiles: 1.4, meaning: 1.4, french: 1.2, listen: 1.6, sound: 1.6, say: 1.4 };
// focus: all | spell | sound | mean. "say" (microphone) is practice-only; rounds never depend on the recogniser.
export function weightsFor(mode, focus = 'all') {
  const w = {};
  for (const t of TYPES) {
    const inFocus = focus === 'all' || SKILL_OF[t] === focus;
    w[t] = inFocus ? BASE[t] : 0;
    if (t === 'say' && mode !== 'practice') w[t] = 0;
  }
  if (mode === 'round' && focus === 'all') { w.type *= 1.6; w.listen *= 1.2; }
  return w;
}

// Which other letters a "missing letter" question offers next to the right one.
const CONFUSE = {
  à: ['a', 'â'], a: ['à', 'e'], â: ['a', 'à'], é: ['e', 'è'], è: ['e', 'é'], ê: ['e', 'é'], e: ['é', 'a'], ô: ['o', 'ö'], o: ['ô', 'au'], î: ['i', 'ï'], i: ['y', 'î'],
  c: ['s', 'k'], s: ['c', 'z'], t: ['d', 'th'], d: ['t', 'b'], p: ['b', 'pe'], b: ['p', 'd'], n: ['m', 'nn'], m: ['n', 'mm'], l: ['ll', 'r'], r: ['rr', 'l'],
  u: ['o', 'ou'], h: ['k', 'g'], w: ['v', 'ou'], k: ['c', 'q'], f: ['ph', 'v'], v: ['f', 'w'], g: ['j', 'k'], j: ['g', 'y'], y: ['i', 'j'], "'": ['-', '’'], '-': ['_', "'"],
};
const letterOptions = (ch) => {
  const low = ch.toLowerCase(); const alts = CONFUSE[low] || ['e', 'a'];
  const up = ch !== low; const fix = (x) => (up ? x.charAt(0).toUpperCase() + x.slice(1) : x);
  return [ch, ...alts.map(fix).filter(x => x !== ch)].slice(0, 3);
};

export function createGenerator(content, { mode = 'practice', focus = 'all', seed = Date.now(), retry = mode === 'practice', words = null } = {}) {
  const ctx = indexContent(content);
  const pool = words ? ctx.words.filter(w => words.includes(w.id)) : ctx.words;
  const rng = mulberry32(seed);
  const weights = weightsFor(mode, focus);
  const counts = Object.fromEntries(pool.map(w => [w.key, 0]));
  const queue = [];
  let last = null, lastType = null, n = 0, nextId = 1;

  const others = (w, k = 2) => shuffle(rng, ctx.words.filter(x => x.id !== w.id)).slice(0, k);

  function build(type, w) {
    const base = { id: nextId++, type, skill: SKILL_OF[type], mode, key: w.key, fr: w.fr, en: w.en, pic: w.pic, when: w.when, tip: w.tip, reveal: w.fr, accept: w.accept };
    switch (type) {
      case 'type':
        return { ...base, hear: w.fr, prompt: w.en };
      case 'pickspell':
        return { ...base, options: shuffle(rng, [w.fr, ...shuffle(rng, w.lookalikes).slice(0, 2)]), answer: w.fr, prompt: w.en };
      case 'letter': {
        const cands = w.highlight.filter(i => !PUNCT.has(w.chars[i]));
        const index = pick(rng, cands.length ? cands : w.chars.map((c, i) => i).filter(i => !PUNCT.has(w.chars[i])));
        const ch = w.chars[index];
        return { ...base, chars: w.chars, index, options: shuffle(rng, letterOptions(ch)), answer: ch, prompt: w.en };
      }
      case 'tiles': {
        const split = tilesSplit(w);
        const chars = Array.from(w.tiles);
        let tiles = shuffle(rng, chars.map((text, i) => ({ id: i, text })));
        for (let tries = 0; tries < 6 && chars.length > 1 && tiles.every((t, i) => t.id === i); tries++) tiles = shuffle(rng, tiles);
        return { ...base, lead: split?.lead ?? '', tail: split?.tail ?? '', target: w.tiles, tiles, reveal: split ? w.fr : w.tiles, prompt: w.en };
      }
      case 'meaning':
        return { ...base, options: shuffle(rng, [w.en, ...others(w).map(x => x.en)]), answer: w.en, prompt: w.fr, reveal: w.en };
      case 'french':
        return { ...base, options: shuffle(rng, [w.fr, ...others(w).map(x => x.fr)]), answer: w.fr, prompt: w.en };
      case 'listen':
        return { ...base, hear: w.fr, options: shuffle(rng, [w.fr, ...others(w).map(x => x.fr)]), answer: w.fr, prompt: 'Which one did you hear?' };
      case 'sound': {
        const opts = shuffle(rng, [{ id: 'good', text: w.fr }, { id: 'bad', text: w.wrongSay.text }]);
        return { ...base, options: opts, answer: 'good', why: w.wrongSay.why, prompt: w.fr };
      }
      case 'say':
        return { ...base, prompt: w.fr, sayHint: w.say };
      default: throw new Error('unknown type ' + type);
    }
  }

  function chooseWord() {
    const due = queue.findIndex(r => r.due <= n && r.key !== last);
    if (due >= 0) return ctx.wordById[queue.splice(due, 1)[0].key];
    const fresh = pool.filter(w => w.key !== last);
    const cands = fresh.length ? fresh : pool; // a one-word lesson check has to repeat
    const min = Math.min(...cands.map(w => counts[w.key]));
    return pick(rng, cands.filter(w => counts[w.key] === min));
  }
  const feasible = (w) => TYPES.filter(t => weights[t] > 0 && (t !== 'sound' || w.wrongSay) && (t !== 'letter' || w.highlight.length));

  return {
    ctx, counts,
    next() {
      const w = chooseWord();
      let types = feasible(w);
      if (types.length > 1) types = types.filter(t => t !== lastType);
      const type = weightedPick(rng, types.map(t => [t, weights[t]]));
      counts[w.key]++; last = w.key; lastType = type; n++;
      return build(type, w);
    },
    // Gentle repeat: the word comes back a few questions later (practice only by default).
    markMissed(q) {
      if (!retry || queue.some(r => r.key === q.key)) return;
      queue.push({ key: q.key, due: n + 3 + Math.floor(rng() * 3) });
    },
  };
}
