import React, { useRef, useState } from 'react';
import QuestionView from '../components/QuestionView.jsx';
import { TopBar } from '../components/Bits.jsx';
import { createGenerator } from '../../core/questions.js';
import { makeRecord, FOCUS_NAMES } from '../../core/scoring.js';

// No clock, no pressure. Pick what to practise (or everything); a wrong answer comes back a few questions later.
export default function PracticeScreen({ ctx, store, go }) {
  const [focus, setFocus] = useState(null);
  const gen = useRef(null);
  const [q, setQ] = useState(null);
  const start = (f) => { gen.current = createGenerator(ctx.content, { mode: 'practice', focus: f, seed: Date.now() }); setFocus(f); setQ(gen.current.next()); };
  const onAnswer = (res) => {
    store.savePractice(makeRecord(q, res)).catch(() => {});
    if (!res.correct) gen.current.markMissed(q);
  };
  if (!focus) return (
    <div className="screen fade">
      <TopBar title="Practice" onBack={() => go('home')} />
      <div className="focus">
        {Object.entries(FOCUS_NAMES).map(([id, label]) => <button key={id} className={`btn big ${id === 'all' ? 'orange' : ''}`} onClick={() => start(id)}>{label}</button>)}
      </div>
    </div>
  );
  return (
    <div className="screen fade">
      <TopBar title={`Practice · ${FOCUS_NAMES[focus]}`} onBack={() => setFocus(null)} />
      <QuestionView key={q.id} q={q} mode="practice" onAnswer={onAnswer} onNext={() => setQ(gen.current.next())} />
    </div>
  );
}
