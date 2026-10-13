// Cuts the lesson clips listed in public/content/greetings.json out of the raw YouTube downloads.
//  raw/<youtube id>.mp4  (downloaded with yt-dlp, see README)  ->  public/video/<name>.mp4 (480p, h264+aac) + <name>.jpg poster
// Each lesson's source.segments is [[start, end], ...] in seconds; several segments are joined with a short fade.
// Existing clips are skipped unless --force. Usage: node scripts/make-clips.mjs [--force] [--raw <dir>]
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const force = args.includes('--force');
const rawDir = args.includes('--raw') ? args[args.indexOf('--raw') + 1] : join(root, 'raw');
const outDir = join(root, 'public', 'video');
mkdirSync(outDir, { recursive: true });
const content = JSON.parse(readFileSync(join(root, 'public', 'content', 'greetings.json'), 'utf8'));

const run = (a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' });
let made = 0, skipped = 0, missing = 0;
for (const l of content.lessons) {
  if (!l.file) continue;
  const out = join(root, 'public', l.file);
  const poster = out.replace(/\.mp4$/, '.jpg');
  if (existsSync(out) && !force) { skipped++; continue; }
  const raw = join(rawDir, `${l.source.youtube}.mp4`);
  if (!existsSync(raw)) { console.error(`missing raw video for ${l.id}: ${raw}`); missing++; continue; }
  const parts = [];
  l.source.segments.forEach(([s, e], i) => {
    const p = join(tmpdir(), `clip-${l.id}-${i}.mp4`);
    // re-encode each segment so cuts are frame-exact; 480p keeps every clip well under the offline-cache limit
    run(['-ss', String(s), '-to', String(e), '-i', raw, '-vf', 'scale=-2:480,fps=30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-ar', '44100', '-movflags', '+faststart', p]);
    parts.push(p);
  });
  if (parts.length === 1) run(['-i', parts[0], '-c', 'copy', out]);
  else {
    const list = join(tmpdir(), `clip-${l.id}.txt`);
    execFileSync('bash', ['-c', `printf "file '%s'\\n" ${parts.map(p => `"${p}"`).join(' ')} > "${list}"`]);
    run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
    rmSync(list, { force: true });
  }
  run(['-ss', '1', '-i', out, '-frames:v', '1', '-vf', 'scale=-2:360', '-q:v', '4', poster]);
  parts.forEach(p => rmSync(p, { force: true }));
  made++;
  console.log(`clip ${l.id}: ${l.source.segments.map(([s, e]) => `${s}-${e}`).join(' + ')} s from ${l.source.youtube}`);
}
console.log(`clips: ${made} made, ${skipped} already there, ${missing} missing raw videos`);
if (missing) process.exitCode = 1;
