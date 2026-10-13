import React, { useEffect, useRef, useState } from 'react';
import { Fox } from '../components/Pics.jsx';
import { Squiggle } from '../components/Art.jsx';

const MAX_NAME = 20;

// Title page. The first time, it asks for the student's name; the name is kept on the device and used everywhere.
export default function HomeScreen({ ctx, store, go, profile, saveName }) {
  const app = ctx.content.app || {};
  const [n, setN] = useState(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => { store.numbers(ctx.words.map(w => w.id)).then(setN).catch(() => setN(false)); }, []);
  const lessonsDone = n ? ctx.lessons.filter(l => n.lessons[l.id]?.passed).length : 0;
  const name = (profile?.name || '').trim();
  const askName = !name || editing;
  return (
    <div className="screen fade">
      <div className="hero">
        <Fox mood={askName ? 'think' : 'happy'} size={120} />
        <div><h1>{app.title || 'Grade 2 Orange'}</h1><Squiggle color="var(--orange)" width={200} /><div className="sub">{app.subtitle || 'French hellos'}</div></div>
      </div>
      {askName
        ? <NameForm initial={name} onDone={(v) => { saveName(v); setEditing(false); }} onCancel={name ? () => setEditing(false) : null} />
        : <button className="btn link who" onClick={() => setEditing(true)} aria-label="Change name"><span className="hand">Hi, <b>{name}</b></span></button>}
      <div className={`mainbtns ${askName ? 'dim' : ''}`}>
        <button className="btn orange big" disabled={askName} onClick={() => go('lessons')}>Lessons<small>{n ? `${lessonsDone} of ${ctx.lessons.length} done` : ' '}</small></button>
        <button className="btn sky big" disabled={askName} onClick={() => go('words')}>Words<small>{ctx.words.length} to learn</small></button>
        <button className="btn teal big" disabled={askName} onClick={() => go('practice')}>Practice<small>no clock</small></button>
        <button className="btn yellow big" disabled={askName} onClick={() => go('round')}>Star Round<small>10 questions</small></button>
      </div>
      <div className="links">
        <button className="btn link" disabled={askName} onClick={() => go('rules')}>Rules</button>
        <button className="btn link" disabled={askName} onClick={() => go('stickers')}>Sticker book{n ? ` · ${n.stickers} of ${n.words}` : ''}</button>
      </div>
      <div className="signature hand">{app.signature || 'Designed by Anya Shaheryar'}</div>
    </div>
  );
}

function NameForm({ initial, onDone, onCancel }) {
  const [v, setV] = useState(initial);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const ok = v.trim().length > 0;
  const submit = (e) => { e?.preventDefault(); if (ok) onDone(v.trim().slice(0, MAX_NAME)); };
  return (
    <form className="card nameform" onSubmit={submit}>
      <div className="hand" style={{ fontSize: '1.6rem' }}>What is your name?</div>
      <input ref={ref} className="nameinput hand" value={v} maxLength={MAX_NAME} autoCapitalize="words" autoComplete="off" spellCheck={false} aria-label="your name"
        onChange={(e) => setV(e.target.value)} placeholder="type it here" />
      <div className="row">
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Keep it</button>}
        <button type="submit" className="btn orange" disabled={!ok}>That's me</button>
      </div>
    </form>
  );
}
