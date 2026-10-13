import React, { useEffect, useState } from 'react';
import { TopBar, Meter, Stars } from '../components/Bits.jsx';
import { Pic, Fox } from '../components/Pics.jsx';
import { SKILLS, SKILL_NAMES } from '../../core/scoring.js';
import { playFr } from '../audio.js';

// The sticker book: one sticker per word. It is earned when the word has been spelled, heard and understood enough times.
export default function StickersScreen({ ctx, store, go, profile }) {
  const [n, setN] = useState(null);
  const [open, setOpen] = useState(null);
  const wordIds = ctx.words.map(w => w.id);
  useEffect(() => { store.numbers(wordIds).then(setN).catch(() => setN(false)); }, []);

  const exportJson = async () => {
    const data = await store.exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `grade-2-orange-${(profile?.name || 'student').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  if (n === null) return <div className="screen center"><Fox mood="sleepy" size={110} /></div>;
  if (n === false) return <div className="screen"><TopBar title="Sticker book" onBack={() => go('home')} /><div className="card hand">The sticker book is not available here.</div></div>;

  const all = n.stickers === n.words;
  return (
    <div className="screen fade">
      <TopBar title="Sticker book" onBack={() => go('home')} />
      <div className="card tint">
        <div className="row"><Fox mood={all ? 'cheer' : 'happy'} size={80} /><div className="hand" style={{ fontSize: '1.8rem' }}>{profile?.name ? `${profile.name}: ` : ''}{n.stickers} of {n.words} stickers</div></div>
      </div>
      <div className="stickers">
        {ctx.words.map(w => {
          const m = n.mastery[w.id];
          return (
            <button key={w.id} className={`sticker ${m.sticker ? 'got' : ''} ${open === w.id ? 'open' : ''}`} onClick={() => { playFr(w.fr); setOpen(open === w.id ? null : w.id); }}>
              <Pic id={w.pic} size={72} />
              <div className="fr">{w.fr}</div>
              {!m.sticker && <div className="ring"><i style={{ width: `${Math.round(m.progress * 100)}%` }} /></div>}
              {open === w.id && <div className="skills">
                {SKILLS.map(s => <div key={s} className={`sk ${m[s].done ? 'done' : ''}`}><span>{SKILL_NAMES[s]}</span><b>{Math.min(m[s].correct, m[s].need)}/{m[s].need}</b></div>)}
              </div>}
            </button>
          );
        })}
      </div>
      <div className="card"><Meter readiness={n.readiness} /></div>
      {n.last.length > 0 && <div className="card">
        <div className="chart-t">Star rounds</div>
        <div className="runs">{n.last.map((r, i) => <div key={r.id ?? i} className="run"><Stars n={r.summary.stars} size={22} /><span className="muted small">{r.summary.correct}/{r.summary.total}</span></div>)}</div>
      </div>}
      <div className="stats" style={{ maxWidth: 520 }}>
        <div className="card stat"><div className="n">{n.total}</div><div className="l">questions answered</div></div>
        <div className="card stat"><div className="n">{n.runs}</div><div className="l">star rounds</div></div>
      </div>
      <button className="btn link" onClick={exportJson}>Export JSON</button>
    </div>
  );
}
