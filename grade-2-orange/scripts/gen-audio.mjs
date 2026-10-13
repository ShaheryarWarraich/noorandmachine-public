// One clip per French item in public/content/greetings.json (each word, each accepted spelling, each wrong pronunciation).
//  Engine 1: ElevenLabs text-to-speech -> public/audio/<slug>.mp3   (key: ELEVENLABS_API_KEY in ~/Apps/video-factory/.env)
//  Engine 2 (no key, or --say): macOS `say -v Thomas` + afconvert   -> public/audio/<slug>.m4a
// Existing files are skipped. The key is read from the file and never printed.
// Usage: node scripts/gen-audio.mjs [--say]
import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { audioItems } from '../src/core/audio.js';

const content = JSON.parse(readFileSync(new URL('../public/content/greetings.json', import.meta.url), 'utf8'));
const dir = fileURLToPath(new URL('../public/audio/', import.meta.url));
mkdirSync(dir, { recursive: true });

function readKey() {
  const f = `${homedir()}/Apps/video-factory/.env`;
  if (!existsSync(f)) return null;
  const m = readFileSync(f, 'utf8').split('\n').map(l => l.trim()).find(l => l.startsWith('ELEVENLABS_API_KEY'));
  if (!m) return null;
  return m.slice(m.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') || null;
}
const VOICE = 'pFZP5JQG7iQjIQuC4Bku';
async function eleven(key, text, out) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.1 } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}`); // never include request headers in errors
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
}
function say(text, slug) {
  const tmp = dir + slug + '.aiff';
  execFileSync('say', ['-v', 'Thomas', '-r', '150', '-o', tmp, text]);
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', tmp, dir + slug + '.m4a']);
  unlinkSync(tmp);
}

const items = audioItems(content);
const key = process.argv.includes('--say') ? null : readKey();
console.log(key ? 'engine: ElevenLabs (eleven_multilingual_v2)' : 'engine: macOS say (Thomas)');
let made = 0, skipped = 0, failed = 0;
for (const { text, slug } of items) {
  if (existsSync(dir + slug + '.mp3') || existsSync(dir + slug + '.m4a')) { skipped++; continue; }
  try {
    if (key) await eleven(key, text, dir + slug + '.mp3'); else say(text, slug);
    made++;
  } catch (e) { failed++; console.error(`failed: "${text}" (${e.message})`); }
}
console.log(`audio: ${items.length} items, ${made} new, ${skipped} already there, ${failed} failed`);
if (failed) process.exitCode = 1;
