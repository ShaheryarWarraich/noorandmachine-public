// Audio map: every French item in greetings.json gets one clip, named by a slug of its text.
// Pure (no DOM), so the generator script, the app and the tests all share it.
export const slug = (t) => String(t)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/œ/gi, 'oe').replace(/æ/gi, 'ae')
  .toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '_');

// Ordered, de-duplicated (by slug) list of everything that needs a clip: { slug, text (what is spoken), key (what is looked up) }.
export function audioItems(content) {
  const seen = new Map();
  const add = (key, text = key) => { const s = slug(key); if (key && !seen.has(s)) seen.set(s, { slug: s, text, key }); };
  for (const w of content.words) add(w.fr, w.sayText || w.fr.replace(/\(e\)$/, 'e'));
  for (const w of content.words) for (const a of w.accept || []) add(a, a.replace(/\(e\)$/, 'e'));
  for (const w of content.words) if (w.wrongSay) add(w.wrongSay.text);
  return [...seen.values()];
}

// slug -> relative path (extension is chosen by the player: .mp3 first, .m4a for the offline fallback voice)
export function audioMap(content) {
  const map = {};
  for (const it of audioItems(content)) map[it.slug] = `audio/${it.slug}`;
  return map;
}
// Path for any French text, or null if that text has no clip (the app then falls back to speech synthesis).
export const audioPath = (text, map) => map[slug(text)] || null;
