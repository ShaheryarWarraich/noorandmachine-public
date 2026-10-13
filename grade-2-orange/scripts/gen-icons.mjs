// Builds public/icons/icon.svg (an orange notebook page with the fox) and renders icon-192.png / icon-512.png.
// Rendering uses macOS `sips` (SVG -> PNG), no extra dependencies. Usage: node scripts/gen-icons.mjs
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const dir = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(dir, { recursive: true });
const lines = [150, 210, 270, 330, 390].map(y => `<path d="M64 ${y} H448" />`).join('');
const ink = '#3b3548';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#e8742a"/>
  <rect x="56" y="56" width="400" height="400" rx="34" fill="#fffdf7"/>
  <g stroke="#bcd3ea" stroke-width="5" fill="none">${lines}</g>
  <path d="M104 56 V456" stroke="#f2a6b5" stroke-width="6"/>
  <ellipse cx="268" cy="420" rx="110" ry="14" fill="${ink}" opacity=".12"/>
  <path d="M150 150 L205 230 L331 230 L386 150 L372 262 Q372 400 268 410 Q164 400 164 262 Z" fill="#f4934a" stroke="${ink}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M166 160 L205 230 L190 262 Z M370 160 L331 230 L346 262 Z" fill="#f4a6c4" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M268 410 Q190 400 186 320 Q226 300 268 345 Q310 300 350 320 Q346 400 268 410 Z" fill="#fff" stroke="${ink}" stroke-width="8" stroke-linejoin="round"/>
  <circle cx="226" cy="290" r="13" fill="${ink}"/><circle cx="310" cy="290" r="13" fill="${ink}"/>
  <circle cx="231" cy="285" r="4" fill="#fff"/><circle cx="315" cy="285" r="4" fill="#fff"/>
  <ellipse cx="268" cy="352" rx="18" ry="13" fill="${ink}"/>
  <path d="M248 378 Q268 392 288 378" stroke="${ink}" stroke-width="8" fill="none" stroke-linecap="round"/>
  <g transform="rotate(38 420 370)"><rect x="406" y="300" width="28" height="120" rx="4" fill="#129486" stroke="${ink}" stroke-width="6"/><path d="M406 420 L420 450 L434 420Z" fill="#f6d9a8" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/></g>
</svg>`;
writeFileSync(dir + 'icon.svg', svg);
for (const size of [192, 512]) {
  const out = `${dir}icon-${size}.png`;
  if (existsSync(out)) unlinkSync(out);
  execFileSync('sips', ['-s', 'format', 'png', '-z', String(size), String(size), dir + 'icon.svg', '--out', out], { stdio: 'ignore' });
}
console.log('icons: icon.svg, icon-192.png, icon-512.png');
