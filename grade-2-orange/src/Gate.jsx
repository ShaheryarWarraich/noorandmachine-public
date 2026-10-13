import React, { useEffect, useState } from 'react';

// Temporary front door. public/gate.json { blocked, title, message } is fetched fresh on every open
// (never precached), so flipping "blocked" and redeploying is all it takes to open or close the app.
export default function Gate({ children }) {
  const [gate, setGate] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}gate.json?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { blocked: false }))
      .catch(() => ({ blocked: false }))
      .then(g => { if (alive) setGate(g); });
    return () => { alive = false; };
  }, []);
  if (gate === null) return null;
  if (!gate.blocked) return children;
  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="gate-card">
        <svg viewBox="0 0 120 110" width="140" height="128" aria-hidden="true">
          <ellipse cx="60" cy="104" rx="34" ry="5" fill="rgba(34,36,58,.12)" />
          <path d="M30 62c-6-18 6-40 30-40s36 22 30 40c8 10 2 30-12 32s-24-6-30-4-18-4-22-14 0-10 4-14z" fill="#fff" stroke="#3A3F52" strokeWidth="3" />
          <ellipse cx="48" cy="58" rx="4.5" ry="6" fill="#3A3F52" /><ellipse cx="72" cy="58" rx="4.5" ry="6" fill="#3A3F52" />
          <circle cx="46.5" cy="55.5" r="1.6" fill="#fff" /><circle cx="70.5" cy="55.5" r="1.6" fill="#fff" />
          <path d="M52 72q8 6 16 0" fill="none" stroke="#3A3F52" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="40" cy="68" rx="5" ry="3" fill="#F08FB0" opacity=".6" /><ellipse cx="80" cy="68" rx="5" ry="3" fill="#F08FB0" opacity=".6" />
          <path d="M34 32q26-16 54 0q-6-10-27-12t-27 12z" fill="#CF3B36" stroke="#3A3F52" strokeWidth="3" strokeLinejoin="round" />
        </svg>
        <h1 id="gate-title">{gate.title || 'Finish the quiz, please'}</h1>
        <p>{gate.message || ''}</p>
      </div>
    </div>
  );
}
