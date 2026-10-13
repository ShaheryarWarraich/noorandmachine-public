import { readFileSync } from 'node:fs';
export const content = JSON.parse(readFileSync(new URL('../public/content/greetings.json', import.meta.url), 'utf8'));
let failed = 0;
export function ok(cond, msg) { if (!cond) { failed++; console.error('  FAIL: ' + msg); } }
export function done(name) { if (failed) { console.error(`${name}: ${failed} failure(s)`); process.exit(1); } console.log(`${name}: ok`); }
