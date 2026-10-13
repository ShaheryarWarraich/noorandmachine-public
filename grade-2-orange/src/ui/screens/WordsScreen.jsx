import React, { useState } from 'react';
import { TopBar, Speaker, Letters, WordCard } from '../components/Bits.jsx';
import { Pic, Fox } from '../components/Pics.jsx';
import { playFr } from '../audio.js';

// The eleven words. Tap one to open it: letters with the tricky ones glowing, the tip, when to say it, how it sounds.
export default function WordsScreen({ ctx, params, go }) {
  const [open, setOpen] = useState(params.word ? ctx.wordById[params.word] : null);
  if (open) return <WordDetail ctx={ctx} w={open} onBack={() => setOpen(null)} onPick={setOpen} />;
  return (
    <div className="screen fade">
      <TopBar title="Words" onBack={() => go('home')} />
      <div className="wordlist">
        {ctx.words.map(w => <WordCard key={w.id} w={w} onOpen={(x) => { playFr(x.fr); setOpen(x); }} />)}
      </div>
    </div>
  );
}

function WordDetail({ ctx, w, onBack, onPick }) {
  const i = ctx.words.findIndex(x => x.id === w.id);
  const prev = ctx.words[i - 1], next = ctx.words[i + 1];
  return (
    <div className="screen fade" key={w.id}>
      <TopBar title="Words" onBack={onBack} />
      <div className="card detail">
        <div className="dtop"><Pic id={w.pic} size={110} /><div><div className="fr">{w.fr}</div><div className="en">{w.en}</div></div></div>
        <Letters word={w.fr} highlight={w.highlight} />
        <div className="tipnote">{w.tip}</div>
        <div className="row"><Speaker text={w.fr} size={64} /><Speaker text={w.fr} size={50} slow /><span className="muted hand" style={{ fontSize: '1.3rem' }}>sounds like <b>{w.say}</b></span></div>
        <div className="when"><Fox mood="happy" size={56} /><div><div className="muted tiny">When?</div><div className="hand" style={{ fontSize: '1.35rem' }}>{w.when}</div></div></div>
      </div>
      <div className="row">
        <button className="btn" disabled={!prev} onClick={() => { if (prev) { playFr(prev.fr); onPick(prev); } }}>Back one</button>
        <button className="btn orange" disabled={!next} onClick={() => { if (next) { playFr(next.fr); onPick(next); } }}>Next word</button>
      </div>
    </div>
  );
}
