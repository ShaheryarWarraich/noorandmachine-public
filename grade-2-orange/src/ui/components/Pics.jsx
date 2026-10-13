import React from 'react';

// Hand-drawn pencil illustrations for the greetings notebook.
// Relies on <filter id="pencil-soft"> and --ink being defined elsewhere.

const INK = 'var(--ink)';
const ORANGE = '#f4934a';
const L_ORANGE = '#ffe3cc';
const YELLOW = '#fff1a8';
const PINK = '#f4a6c4';
const TEAL = '#129486';
const L_TEAL = '#d8f1ee';
const SKY = '#bcd3ea';
const WHITE = '#fff';

// Five-point star path centred on (cx, cy) with outer radius r.
function starPath(cx, cy, r) {
  const ri = r * 0.45;
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : ri;
    return `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join(' L')}Z`;
}

// Short rays around a centre, from radius r1 to r2.
function rays(cx, cy, r1, r2, n) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return `M${(cx + r1 * c).toFixed(1)} ${(cy + r1 * s).toFixed(1)} L${(cx + r2 * c).toFixed(1)} ${(cy + r2 * s).toFixed(1)}`;
  }).join(' ');
}

// A small pencil-drawn orange fox. mood: happy | cheer | think | sleepy
export function Fox({ mood = 'happy', size = 120, className = '' }) {
  const mouths = {
    happy: 'M52 77 Q56 82 60 77 Q64 82 68 77',
    cheer: 'M52 76 Q60 94 68 76 Z',
    think: 'M56 78 Q60 76 64 78',
    sleepy: 'M54 78 Q60 82 66 78',
  };
  const mouth = mouths[mood] || mouths.happy;
  return (
    <svg className={`mascot ${className}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="fox friend">
      <g filter="url(#pencil-soft)" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="60" cy="112" rx="32" ry="4.5" fill={INK} opacity=".1" />
        {/* tail */}
        <path d="M78 100 Q114 106 108 68 Q100 86 82 90Z" fill={ORANGE} stroke={INK} strokeWidth="2.5" />
        <path d="M108 68 Q109 80 104 90 Q94 94 90 88 Q102 82 108 68Z" fill={WHITE} stroke={INK} strokeWidth="2.2" />
        {/* body */}
        <ellipse cx="60" cy="96" rx="22" ry="16" fill={ORANGE} stroke={INK} strokeWidth="2.5" />
        <ellipse cx="60" cy="99" rx="12" ry="10" fill={WHITE} stroke={INK} strokeWidth="1.6" />
        {/* paws */}
        {mood === 'cheer' ? (
          <>
            <path d="M40 92 Q26 88 27 74" stroke={INK} strokeWidth="2.5" fill={ORANGE} />
            <path d="M80 92 Q94 88 93 74" stroke={INK} strokeWidth="2.5" fill={ORANGE} />
            <ellipse cx="27" cy="72" rx="5" ry="5.5" fill={ORANGE} stroke={INK} strokeWidth="2.4" />
            <ellipse cx="93" cy="72" rx="5" ry="5.5" fill={ORANGE} stroke={INK} strokeWidth="2.4" />
            <ellipse cx="50" cy="109" rx="7" ry="4" fill={WHITE} stroke={INK} strokeWidth="2.2" />
            <ellipse cx="70" cy="109" rx="7" ry="4" fill={WHITE} stroke={INK} strokeWidth="2.2" />
          </>
        ) : (
          <>
            <ellipse cx="50" cy="109" rx="7" ry="4" fill={WHITE} stroke={INK} strokeWidth="2.2" />
            <ellipse cx="70" cy="109" rx="7" ry="4" fill={WHITE} stroke={INK} strokeWidth="2.2" />
          </>
        )}
        {/* head */}
        <path d="M24 60 Q22 36 34 34 L44 16 L54 32 Q60 31 66 32 L76 16 L86 34 Q98 36 96 60 Q94 85 60 87 Q26 85 24 60Z" fill={ORANGE} stroke={INK} strokeWidth="2.6" />
        <path d="M39 32 L44 23 L50 31Z" fill={PINK} stroke={INK} strokeWidth="1.8" />
        <path d="M81 32 L76 23 L70 31Z" fill={PINK} stroke={INK} strokeWidth="1.8" />
        {/* white cheeks and muzzle */}
        <path d="M26 63 Q42 56 60 70 Q78 56 94 63 Q90 85 60 87 Q30 85 26 63Z" fill={WHITE} stroke={INK} strokeWidth="2" />
        <ellipse cx="38" cy="68" rx="5" ry="3" fill={PINK} opacity=".6" />
        <ellipse cx="82" cy="68" rx="5" ry="3" fill={PINK} opacity=".6" />
        {/* eyes */}
        {mood === 'sleepy' ? (
          <path d="M40 55 q5 4.5 10 0 M70 55 q5 4.5 10 0" stroke={INK} strokeWidth="2.4" fill="none" />
        ) : (
          <>
            <circle cx="46" cy="55" r="4" fill={INK} />
            <circle cx="74" cy="55" r="4" fill={INK} />
            <circle cx="47.5" cy="53.5" r="1.3" fill={WHITE} />
            <circle cx="75.5" cy="53.5" r="1.3" fill={WHITE} />
          </>
        )}
        {mood === 'think' && <path d="M67 45 q7 -6 14 -1" stroke={INK} strokeWidth="2.2" fill="none" />}
        {/* nose and mouth */}
        <path d="M55 69 Q60 66 65 69 Q60 74 55 69Z" fill={INK} stroke={INK} strokeWidth="1.4" />
        <path d="M60 72 V76" stroke={INK} strokeWidth="2.2" fill="none" />
        <path d={mouth} stroke={INK} strokeWidth="2.4" fill={mood === 'cheer' ? PINK : 'none'} />
        {mood === 'sleepy' && <path d="M96 26 h7 l-7 8 h7" stroke={INK} strokeWidth="2" fill="none" />}
        {/* pencil stub */}
        <g transform="rotate(-30 20 96)">
          <rect x="16" y="74" width="8" height="26" rx="1.5" fill={TEAL} stroke={INK} strokeWidth="2" />
          <path d="M16 100 L20 109 L24 100Z" fill="#f6d9a8" stroke={INK} strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}

function Art({ id }) {
  switch (id) {
    case 'monday':
      return (
        <>
          <rect x="16" y="20" width="68" height="66" rx="6" fill={WHITE} />
          <path d="M16 36 V26 Q16 20 22 20 H78 Q84 20 84 26 V36Z" fill={TEAL} />
          <path d="M32 12 V27 M68 12 V27" strokeWidth="3.4" />
          {[43, 56, 69].map((y) => [21, 37, 53, 69].map((x) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="10" height="9" rx="1.5" fill={x === 53 && y === 56 ? YELLOW : L_TEAL} strokeWidth="1.6" />
          )))}
          <ellipse cx="58" cy="60.5" rx="9.5" ry="8.5" strokeWidth="3" />
        </>
      );
    case 'phone':
      return (
        <>
          <rect x="14" y="80" width="72" height="12" rx="4" fill={L_ORANGE} />
          <path d="M16 66 Q16 56 24 54 Q50 30 76 54 Q84 56 84 66 L84 72 Q84 76 80 76 L70 76 Q66 76 66 72 L66 64 Q50 50 34 64 L34 72 Q34 76 30 76 L20 76 Q16 76 16 72Z" fill={TEAL} />
          <path d="M30 56 Q50 40 70 56" stroke={WHITE} strokeWidth="1.8" opacity=".7" />
          <path d="M30 16 Q50 6 70 16 M38 27 Q50 20 62 27" strokeWidth="2.8" />
        </>
      );
    case 'wave':
      return (
        <>
          <g transform="rotate(10 50 62)">
            <path d="M34 72 Q18 66 16 54 Q20 46 27 52 L35 62Z" fill={L_ORANGE} />
            <rect x="33" y="26" width="9" height="34" rx="4.5" fill={L_ORANGE} />
            <rect x="43" y="19" width="9" height="41" rx="4.5" fill={L_ORANGE} />
            <rect x="53" y="22" width="9" height="38" rx="4.5" fill={L_ORANGE} />
            <rect x="63" y="30" width="9" height="30" rx="4.5" fill={L_ORANGE} />
            <path d="M33 55 H72 V72 Q72 90 52 90 Q36 90 33 76Z" fill={L_ORANGE} stroke="none" />
            <path d="M33 56 V76 Q36 90 52 90 Q72 90 72 72 V56" fill="none" />
            <rect x="36" y="86" width="34" height="11" rx="3" fill={TEAL} />
          </g>
          <path d="M82 30 Q91 38 88 49 M89 19 Q100 32 95 47 M19 22 Q10 29 13 38" strokeWidth="2.8" />
        </>
      );
    case 'soon':
      return (
        <>
          <circle cx="66" cy="34" r="12" fill={YELLOW} />
          <path d={rays(66, 34, 16, 21, 10)} strokeWidth="2.6" />
          <circle cx="40" cy="60" r="26" fill={L_TEAL} />
          <path d="M40 38 V43 M62 60 H57 M40 82 V77 M18 60 H23" strokeWidth="2.6" />
          <path d="M40 60 V45 M40 60 L52 66" strokeWidth="3" />
          <circle cx="40" cy="60" r="2.6" fill={INK} />
        </>
      );
    case 'gift':
      return (
        <>
          <rect x="20" y="44" width="60" height="42" rx="3" fill={L_TEAL} />
          <rect x="16" y="32" width="68" height="14" rx="3" fill={TEAL} />
          <rect x="44" y="46" width="12" height="40" fill={YELLOW} />
          <rect x="44" y="32" width="12" height="14" fill={YELLOW} />
          <path d="M50 32 Q30 10 25 23 Q23 34 50 32Z" fill={PINK} />
          <path d="M50 32 Q70 10 75 23 Q77 34 50 32Z" fill={PINK} />
          <circle cx="50" cy="32" r="4.5" fill={YELLOW} />
        </>
      );
    case 'welcome':
      return (
        <>
          <path d="M50 49 C24 33 34 14 50 27 C66 14 76 33 50 49Z" fill={PINK} />
          <path d="M22 28 l-6 -3 M78 28 l6 -3 M50 10 v-5" strokeWidth="2.4" />
          <path d="M9 56 Q11 82 50 87 L50 71 Q30 69 22 57 Q15 50 9 56Z" fill={L_ORANGE} />
          <path d="M91 56 Q89 82 50 87 L50 71 Q70 69 78 57 Q85 50 91 56Z" fill={L_ORANGE} />
          <path d="M20 67 Q28 73 38 75 M17 74 Q27 80 38 82 M80 67 Q72 73 62 75 M83 74 Q73 80 62 82" strokeWidth="1.8" />
        </>
      );
    case 'oops':
      return (
        <>
          <path d="M30 76 Q14 71 10 77 Q8 86 24 85 Q40 86 48 80Z" fill={YELLOW} />
          <circle cx="20" cy="64" r="2.6" fill={YELLOW} strokeWidth="1.8" />
          <circle cx="12" cy="68" r="2" fill={YELLOW} strokeWidth="1.6" />
          <g transform="translate(8 6) rotate(-80 45 51)">
            <path d="M62 38 Q78 38 75 51 Q72 62 59 59" fill="none" strokeWidth="3" />
            <path d="M28 30 H62 L58 66 Q57 72 51 72 H39 Q33 72 32 66Z" fill={L_TEAL} />
            <ellipse cx="45" cy="30" rx="17" ry="4.5" fill={YELLOW} />
            <path d="M31 50 H59" stroke={TEAL} strokeWidth="2.4" />
          </g>
          <g transform="rotate(-35 58 56)">
            <rect x="44" y="50" width="28" height="12" rx="6" fill={L_ORANGE} />
            <rect x="53" y="50" width="10" height="12" fill={WHITE} strokeWidth="1.4" />
            <path d="M47 56 h2 M67 56 h2" strokeWidth="2" />
          </g>
        </>
      );
    case 'please':
      return (
        <>
          <ellipse cx="40" cy="83" rx="31" ry="7" fill={WHITE} />
          <path d="M24 62 H56 L52 80 H28Z" fill={TEAL} />
          <path d="M33 64 L34 78 M40 64 V78 M47 64 L46 78" stroke={WHITE} strokeWidth="1.6" opacity=".7" />
          <path d="M22 62 Q18 48 30 46 Q30 34 40 34 Q50 34 50 46 Q62 48 58 62Z" fill={PINK} />
          <circle cx="40" cy="31" r="4" fill={ORANGE} strokeWidth="2" />
          <path d="M32 50 l3 -2 M44 44 l3 2 M38 54 l3 1" stroke={YELLOW} strokeWidth="2.2" />
          <path d="M100 54 L80 54 Q72 54 66 57 Q61 60 64 64 Q66 67 72 66 L68 69 Q64 73 68 76 Q72 78 78 75 L100 76Z" fill={L_ORANGE} />
          <path d="M67 60 H75 M71 69 H79" strokeWidth="1.6" />
          <rect x="88" y="51" width="12" height="28" rx="2" fill={TEAL} />
        </>
      );
    case 'clover':
      return (
        <>
          <path d="M50 50 Q55 70 46 91" strokeWidth="3.2" />
          {[0, 90, 180, 270].map((r) => (
            <g key={r} transform={`rotate(${r} 50 50)`}>
              <path d="M50 50 C34 40 30 22 40 16 Q48 12 50 24 Q52 12 60 16 C70 22 66 40 50 50Z" fill={TEAL} />
              <path d="M50 46 V28" stroke={L_TEAL} strokeWidth="1.8" />
            </g>
          ))}
          <circle cx="50" cy="50" r="2.4" fill={L_TEAL} strokeWidth="1.6" />
        </>
      );
    case 'weekend':
      return (
        <>
          <circle cx="80" cy="26" r="10" fill={YELLOW} />
          <path d={rays(80, 26, 14, 19, 8)} strokeWidth="2.6" />
          <path d="M14 84 L50 28 L86 84Z" fill={ORANGE} />
          <path d="M50 50 L36 84 H64Z" fill={L_ORANGE} />
          <path d="M50 50 V84" strokeWidth="1.8" />
          <path d="M50 28 V19" strokeWidth="2.6" />
          <path d="M50 19 L61 23 L50 27Z" fill={YELLOW} strokeWidth="2" />
          <path d="M6 84 H94" strokeWidth="2.6" />
          <path d="M16 90 l-2 -5 M22 90 l1 -5 M78 90 l-1 -5 M85 90 l2 -5" strokeWidth="2" />
        </>
      );
    case 'trophy':
      return (
        <>
          <path d="M30 24 H22 Q14 24 15 34 Q16 46 33 48" fill="none" strokeWidth="3" />
          <path d="M70 24 H78 Q86 24 85 34 Q84 46 67 48" fill="none" strokeWidth="3" />
          <path d="M30 20 H70 V42 Q70 62 50 64 Q30 62 30 42Z" fill={YELLOW} />
          <rect x="45" y="64" width="10" height="12" fill={YELLOW} />
          <path d="M36 76 H64 V80 H68 V90 H32 V80 H36Z" fill={ORANGE} />
          <path d="M38 28 V42" stroke={WHITE} strokeWidth="2.4" />
          <path d={starPath(50, 38, 8)} fill={PINK} strokeWidth="1.8" />
          <path d={starPath(15, 12, 7)} fill={YELLOW} strokeWidth="1.8" />
          <path d={starPath(86, 14, 7)} fill={PINK} strokeWidth="1.8" />
        </>
      );
    default:
      return <path d={starPath(50, 52, 36)} />;
  }
}

// A pencil-style line illustration. See PIC_IDS for the ids.
export function Pic({ id, size = 96, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g filter="url(#pencil-soft)" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Art id={id} />
      </g>
    </svg>
  );
}

export const PIC_IDS = ['monday', 'phone', 'wave', 'soon', 'gift', 'welcome', 'oops', 'please', 'clover', 'weekend', 'trophy'];
