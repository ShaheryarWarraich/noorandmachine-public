import { existsSync } from 'node:fs';
import { content, ok, done } from './_load.mjs';
import { validateContent, contentWarnings, indexContent, tilesSplit } from '../src/core/content.js';
import { audioItems, slug } from '../src/core/audio.js';

const errs = validateContent(content);
errs.forEach(e => ok(false, e));
contentWarnings(content).forEach(w => console.log('  note: ' + w));
const ctx = indexContent(content);
ok(ctx.words.length === 11, `11 words (got ${ctx.words.length})`);
const TEACHER = ['À lundi', 'Allô', 'Au revoir', 'À bientôt', 'Merci beaucoup', 'De rien', 'Désolé(e)', "S'il vous plaît", 'Bonne chance', 'Bon week-end', 'Félicitations'];
for (const t of TEACHER) ok(ctx.words.some(w => w.fr === t), `teacher's word present exactly: ${t}`);
ok(ctx.wordById.desole.sayText === 'Désolée', 'Désolé(e) is spoken as Désolée');
ok(ctx.wordById.desole.accept.includes('Désolé') && ctx.wordById.desole.accept.includes('Désolée'), 'both Désolé and Désolée accepted');
for (const w of ctx.words) {
  const s = tilesSplit(w);
  ok(s === null || s.lead + s.word + s.tail === w.fr, `tiles split cleanly: ${w.fr}`);
  ok(w.lookalikes.every(l => l !== w.fr), `lookalikes differ: ${w.fr}`);
  ok(/^[A-ZÀ]/.test(w.fr), `starts with a capital: ${w.fr}`);
  ok(w.tip.length <= 70 && w.when.length <= 40, `short text for a 7-year-old: ${w.id}`);
}
ok(ctx.wordById.bonne_chance.highlight.includes(3) && ctx.wordById.bon_weekend.highlight.includes(8), 'bonne nn and week-end hyphen glow');
ok(ctx.rules.length >= 6 && ctx.rules.every(r => r.items.length === (r.words || []).length), 'rules resolve to words');
ok(ctx.lessons.length >= 8, `lessons present (${ctx.lessons.length})`);
const covered = new Set(ctx.lessons.flatMap(l => l.words));
ok(ctx.words.every(w => covered.has(w.id)), 'every word is in at least one lesson');
for (const l of ctx.lessons) if (l.file) ok(l.source.segments.reduce((t, [s, e]) => t + (e - s), 0) <= 90, `lesson ${l.id} is 90 s or less`);
// audio: one clip per slug, no collisions with different text; every sound-check pair has two different clips
const items = audioItems(content);
ok(new Set(items.map(i => i.slug)).size === items.length, 'audio slugs unique');
for (const w of content.words) if (w.wrongSay) ok(slug(w.wrongSay.text) !== slug(w.fr) && !(w.accept || []).some(a => slug(a) === slug(w.wrongSay.text)), `wrong-sound clip has its own slug: ${w.id}`);
ok(items.length >= 15, `about 19 clips (got ${items.length})`);
ok(slug('Désolé(e)') === 'desolee' && slug("S'il vous plaît") === 'sil_vous_plait' && slug('Bon week-end') === 'bon_weekend', 'slug rules');
const have = items.filter(i => existsSync(new URL(`../public/audio/${i.slug}.mp3`, import.meta.url)) || existsSync(new URL(`../public/audio/${i.slug}.m4a`, import.meta.url)));
if (have.length !== items.length) console.log(`  note: ${items.length - have.length} audio clip(s) not generated yet (npm run audio)`);
// a deliberately broken copy is rejected
const bad = JSON.parse(JSON.stringify(content)); bad.words[0].highlight = [99];
ok(validateContent(bad).length > 0, 'validator catches a bad highlight');
const bad2 = JSON.parse(JSON.stringify(content)); bad2.words[1].lookalikes.push(bad2.words[1].fr);
ok(validateContent(bad2).length > 0, 'validator catches a correct lookalike');
done('content');
