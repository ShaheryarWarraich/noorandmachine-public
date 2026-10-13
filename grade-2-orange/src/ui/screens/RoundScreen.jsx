import React, { useRef, useState } from 'react';
import QuestionView from '../components/QuestionView.jsx';
import { TopBar, Meter, Stars } from '../components/Bits.jsx';
import { Fox } from '../components/Pics.jsx';
import { createGenerator } from '../../core/questions.js';
import { makeRecord, summarizeRun, readiness, ROUND_SIZE, FOCUS_NAMES } from '../../core/scoring.js';

// A Star Round: ten questions, no clock. Three stars for 9 or more right.
export default function RoundScreen({ ctx, store, go, profile }) {
  const [phase, setPhase] = useState('setup'); // setup | run | done
  const [focus, setFocus] = useState('all');
  const [result, setResult] = useState(null);
  const start = (f) => { setFocus(f); setPhase('run'); };
  const finish = async (items) => {
    let run;
    try { run = await store.saveRun({ focus, items }); } catch { run = { summary: summarizeRun(items), focus, tsMs: Date.now(), items }; }
    let ready = null;
    try { ready = readiness(await store.listRuns()); } catch { /* keep going without the meter */ }
    setResult({ ...run, readiness: ready }); setPhase('done');
  };
  if (phase === 'setup') return (
    <div className="screen fade">
      <TopBar title="Star Round" onBack={() => go('home')} />
      <Fox mood="cheer" size={120} />
      <div className="hand muted" style={{ fontSize: '1.3rem' }}>{ROUND_SIZE} questions. Get 9 right for three stars.</div>
      <div className="focus">
        {Object.entries(FOCUS_NAMES).map(([id, label]) => <button key={id} className={`btn big ${id === 'all' ? 'yellow' : ''}`} onClick={() => start(id)}>{label}</button>)}
      </div>
    </div>
  );
  if (phase === 'run') return <Run ctx={ctx} focus={focus} onFinish={finish} onQuit={() => setPhase('setup')} />;
  return <Results ctx={ctx} run={result} onAgain={() => setPhase('setup')} go={go} name={profile?.name} />;
}

function Run({ ctx, focus, onFinish, onQuit }) {
  const gen = useRef(createGenerator(ctx.content, { mode: 'round', focus, seed: Date.now() }));
  const records = useRef([]);
  const [q, setQ] = useState(() => gen.current.next());
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const answeredThis = useRef(false);
  const next = () => {
    if (!answeredThis.current) records.current.push(makeRecord(q, { correct: false, skipped: true }));
    answeredThis.current = false;
    if (records.current.length >= ROUND_SIZE) return onFinish(records.current);
    setI(records.current.length); setQ(gen.current.next());
  };
  const onAnswer = (res) => { answeredThis.current = true; records.current.push(makeRecord(q, res)); if (res.correct) setCorrect(c => c + 1); };
  return (
    <div className="screen">
      <div className="progress">
        <div className="pips">{Array.from({ length: ROUND_SIZE }, (_, k) => <i key={k} className={k < i ? (records.current[k]?.correct ? 'on' : 'off') : k === i ? 'now' : ''} />)}</div>
        <div className="score">{correct}</div>
      </div>
      <QuestionView key={q.id} q={q} mode="round" onAnswer={onAnswer} onNext={next} />
      <div className="row">
        <button className="btn link" onClick={next}>Skip</button>
        <button className="btn link" onClick={onQuit}>Stop</button>
      </div>
    </div>
  );
}

function Results({ run, onAgain, go, name }) {
  const s = run.summary;
  const who = name ? `, ${name}` : '';
  const words = s.stars === 3 ? `Three stars${who}!` : s.stars === 2 ? `Two stars${who}!` : s.stars === 1 ? `One star${who}!` : `Keep going${who}!`;
  return (
    <div className="screen fade">
      <TopBar title={`${FOCUS_NAMES[run.focus] || 'Star'} round`} onBack={() => go('home')} />
      <div className="card tint">
        <div className="col">
          <Fox mood={s.stars >= 2 ? 'cheer' : 'happy'} size={100} />
          <Stars n={s.stars} size={54} />
          <div className="hand" style={{ fontSize: '2rem' }}>{words}</div>
          <div className="stats" style={{ maxWidth: 420 }}>
            <div className="stat"><div className="n">{s.correct}</div><div className="l">right</div></div>
            <div className="stat"><div className="n">{s.total}</div><div className="l">questions</div></div>
            <div className="stat"><div className="n">{s.bestStreak}</div><div className="l">in a row</div></div>
          </div>
        </div>
      </div>
      {run.readiness && run.focus === 'all' && <div className="card"><Meter readiness={run.readiness} /></div>}
      <div className="card">
        <h3 style={{ textAlign: 'left', marginBottom: 6 }}>{s.missed.length ? 'Look again' : 'All clear'}</h3>
        {s.missed.length > 0 && <div className="missed">
          {s.missed.map((m, i) => <div className="m" key={i}><div className="q">{m.prompt}</div><div className="a">{m.reveal}</div><div className="e">{m.en}{m.skipped ? ' · skipped' : ''}</div></div>)}
        </div>}
      </div>
      <div className="row">
        <button className="btn yellow big" onClick={onAgain}>Again</button>
        <button className="btn" onClick={() => go('stickers')}>Sticker book</button>
        <button className="btn" onClick={() => go('home')}>Home</button>
      </div>
    </div>
  );
}
