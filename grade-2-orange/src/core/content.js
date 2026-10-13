// Everything the app knows comes from public/content/greetings.json. This file only derives handy views of it.
export const PUNCT = new Set([' ', '(', ')']); // characters that are never asked as a "missing letter"

export function indexContent(content) {
  const words = content.words.map(w => ({
    ...w,
    key: w.id,
    accept: w.accept || [w.fr],
    sayText: w.sayText || w.fr.replace(/\(e\)$/, 'e'), // "Désolé(e)" is spoken as "Désolée"
    chars: Array.from(w.fr),
  }));
  const wordById = Object.fromEntries(words.map(w => [w.id, w]));
  // a rule may glow its own letters (rule.highlights[wordId]); otherwise the word's usual tricky letters glow
  const rules = (content.rules || []).map(r => ({ ...r, items: (r.words || []).map(id => wordById[id]).filter(Boolean).map(w => ({ ...w, highlight: r.highlights?.[w.id] || w.highlight })) }));
  const lessons = (content.lessons || []).map(l => ({ ...l, items: (l.words || []).map(id => wordById[id]).filter(Boolean) }));
  return { content, words, wordById, rules, lessons };
}

// Where a word's "tiles" word sits inside the expression: { lead, word, tail } or null when it is a variant (e.g. Désolée).
export function tilesSplit(w) {
  const i = w.fr.toLowerCase().indexOf(w.tiles.toLowerCase());
  if (i < 0) return null;
  return { lead: w.fr.slice(0, i), word: w.fr.slice(i, i + w.tiles.length), tail: w.fr.slice(i + w.tiles.length) };
}

// Returns a list of problems (empty = fine). Used by the test and as a runtime sanity check.
export function validateContent(c) {
  const errs = []; const err = m => errs.push(m);
  if (!c || typeof c !== 'object') return ['content is not an object'];
  if (!Array.isArray(c.words) || c.words.length < 5) err('need at least five words');
  const ids = new Set();
  const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
  for (const w of c.words || []) {
    for (const k of ['id', 'fr', 'en', 'when', 'say', 'pic', 'tip', 'tiles']) if (!w[k]) err(`word ${w.id || '?'}: missing ${k}`);
    if (ids.has(w.id)) err(`duplicate word id ${w.id}`); ids.add(w.id);
    const chars = Array.from(w.fr || '');
    if (!Array.isArray(w.highlight) || !w.highlight.length) err(`${w.id}: highlight missing`);
    else for (const i of w.highlight) if (!Number.isInteger(i) || i < 0 || i >= chars.length || PUNCT.has(chars[i])) err(`${w.id}: highlight ${i} is not a letter of "${w.fr}"`);
    const accept = w.accept || [w.fr];
    if (!accept.some(a => same(a, w.fr))) err(`${w.id}: accept must include the shown spelling`);
    const inAccept = accept.some(a => a.toLowerCase().includes((w.tiles || '').toLowerCase()));
    if (w.tiles && !inAccept) err(`${w.id}: tiles "${w.tiles}" is not part of any accepted spelling`);
    if (!Array.isArray(w.lookalikes) || w.lookalikes.length < 2) err(`${w.id}: need at least two lookalikes`);
    for (const l of w.lookalikes || []) if (accept.some(a => same(a, l))) err(`${w.id}: lookalike "${l}" is actually correct`);
    if (w.wrongSay && (!w.wrongSay.text || !w.wrongSay.why)) err(`${w.id}: wrongSay needs text and why`);
    if (w.wrongSay && same(w.wrongSay.text, w.fr)) err(`${w.id}: wrongSay must differ from the word`);
  }
  for (const r of c.rules || []) {
    for (const k of ['id', 'title', 'text']) if (!r[k]) err(`rule ${r.id || '?'}: missing ${k}`);
    for (const id of r.words || []) if (!ids.has(id)) err(`rule ${r.id}: unknown word ${id}`);
    for (const [id, hl] of Object.entries(r.highlights || {})) {
      const w = (c.words || []).find(x => x.id === id); const n = w ? Array.from(w.fr).length : 0;
      if (!w || !(r.words || []).includes(id)) err(`rule ${r.id}: highlights for a word not in the rule: ${id}`);
      else if (!Array.isArray(hl) || hl.some(i => !Number.isInteger(i) || i < 0 || i >= n)) err(`rule ${r.id}: highlight out of range for ${id}`);
    }
  }
  const lids = new Set();
  for (const l of c.lessons || []) {
    for (const k of ['id', 'title']) if (!l[k]) err(`lesson ${l.id || '?'}: missing ${k}`);
    if (l.file === undefined) err(`lesson ${l.id}: file missing (use null for a lesson without a video)`);
    if (l.file && !/^video\/[a-z0-9_]+\.mp4$/.test(l.file)) err(`lesson ${l.id}: file should be video/<name>.mp4`);
    if (l.file && !(Array.isArray(l.source?.segments) && l.source.segments.length && l.source.segments.every(s => Array.isArray(s) && s.length === 2 && s[1] > s[0]))) err(`lesson ${l.id}: source.segments must be [[start, end], ...] seconds`);
    if (lids.has(l.id)) err(`duplicate lesson id ${l.id}`); lids.add(l.id);
    if (!Array.isArray(l.words) || !l.words.length) err(`lesson ${l.id}: words missing`);
    for (const id of l.words || []) if (!ids.has(id)) err(`lesson ${l.id}: unknown word ${id}`);
    if (!l.source?.title || !l.source?.channel || (l.file && !l.source?.youtube)) err(`lesson ${l.id}: source needs youtube, title, channel`);
  }
  return errs;
}

// Gentle notes (not errors): content gaps the app copes with.
export function contentWarnings(c) {
  const out = [];
  const covered = new Set((c.lessons || []).flatMap(l => l.words || []));
  for (const w of c.words) if (!covered.has(w.id)) out.push(`${w.id}: no lesson video covers it`);
  for (const w of c.words) if (!w.wrongSay) out.push(`${w.id}: no wrongSay (sound-check questions skip it)`);
  return out;
}
