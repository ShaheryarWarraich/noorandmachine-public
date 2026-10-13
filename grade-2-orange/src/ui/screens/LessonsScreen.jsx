import React, { useEffect, useRef, useState } from 'react';
import { TopBar, Speaker, Stars } from '../components/Bits.jsx';
import { Pic, Fox } from '../components/Pics.jsx';
import { CheckIcon, PlayIcon } from '../components/Art.jsx';
import QuestionView from '../components/QuestionView.jsx';
import { createGenerator } from '../../core/questions.js';
import { makeRecord } from '../../core/scoring.js';
import { playFr } from '../audio.js';

export const CHECK_SIZE = 3; // questions after each video
const base = import.meta.env.BASE_URL;

// Lessons: short video clips, one card each. Watch, then a quick check of three questions earns the lesson's tick.
export default function LessonsScreen({ ctx, store, params, go }) {
  const [state, setState] = useState({});
  const [open, setOpen] = useState(params.lesson ? ctx.lessons.find(l => l.id === params.lesson) : null);
  const reload = () => store.listLessons().then(ls => setState(Object.fromEntries(ls.map(l => [l.id, l])))).catch(() => {});
  useEffect(() => { reload(); }, [open]);
  if (open) return <Lesson ctx={ctx} store={store} lesson={open} rec={state[open.id]} onBack={() => setOpen(null)} onNext={() => { const i = ctx.lessons.indexOf(open); setOpen(ctx.lessons[i + 1] || null); }} />;
  if (!ctx.lessons.length) return (
    <div className="screen fade"><TopBar title="Lessons" onBack={() => go('home')} /><div className="card placeholder"><Fox mood="sleepy" size={120} /><div className="hand">Coming soon</div></div></div>
  );
  return (
    <div className="screen fade">
      <TopBar title="Lessons" onBack={() => go('home')} />
      <div className="lessons">
        {ctx.lessons.map((l, i) => {
          const r = state[l.id];
          return (
            <button key={l.id} className={`card lesson ${r?.passed ? 'passed' : r?.watched ? 'watched' : ''}`} onClick={() => setOpen(l)}>
              <div className="num">{i + 1}</div>
              {l.file
                ? <div className="poster"><img src={`${base}${l.poster || l.file.replace(/\.mp4$/, '.jpg')}`} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /><span className="play"><PlayIcon size={34} /></span></div>
                : <div className="poster fox"><Fox mood="happy" size={70} /></div>}
              <div className="ltext">
                <div className="title">{l.title}</div>
                <div className="pics">{l.items.map(w => <Pic key={w.id} id={w.pic} size={34} />)}</div>
              </div>
              <div className={`tick ${r?.passed ? 'on' : ''}`}>{r?.passed ? <CheckIcon size={26} /> : ''}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Lesson({ ctx, store, lesson, rec, onBack, onNext }) {
  const [phase, setPhase] = useState('watch'); // watch | check | done
  const [missing, setMissing] = useState(false);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const startCheck = () => { store.markLesson(lesson.id, { watched: 1 }).catch(() => {}); videoRef.current?.pause(); setPhase('check'); };
  const finish = async (records) => {
    const correct = records.filter(r => r.correct).length;
    const passed = correct >= CHECK_SIZE - 1;
    if (passed) await store.markLesson(lesson.id, { passed: 1 }).catch(() => {});
    setResult({ correct, passed }); setPhase('done');
  };
  const i = ctx.lessons.indexOf(lesson);
  if (phase === 'check') return <Check ctx={ctx} store={store} lesson={lesson} onFinish={finish} onBack={() => setPhase('watch')} />;
  if (phase === 'done') return (
    <div className="screen fade">
      <TopBar title={`Lesson ${i + 1}`} onBack={onBack} />
      <div className="card tint col">
        <Fox mood={result.passed ? 'cheer' : 'happy'} size={110} />
        <Stars n={result.correct === CHECK_SIZE ? 3 : result.correct === CHECK_SIZE - 1 ? 2 : result.correct ? 1 : 0} size={50} />
        <div className="hand" style={{ fontSize: '1.9rem' }}>{result.passed ? 'Lesson done!' : 'Watch once more?'}</div>
      </div>
      <div className="row">
        {!result.passed && <button className="btn orange" onClick={() => setPhase('watch')}>Watch again</button>}
        {result.passed && i + 1 < ctx.lessons.length && <button className="btn orange big" onClick={onNext}>Next lesson</button>}
        <button className="btn" onClick={onBack}>All lessons</button>
      </div>
    </div>
  );
  return (
    <div className="screen fade">
      <TopBar title={`Lesson ${i + 1}`} onBack={onBack} />
      <h3>{lesson.title}</h3>
      {!lesson.file
        ? <div className="card foxlesson"><Fox mood="cheer" size={120} /><div className="hand" style={{ fontSize: '1.4rem', textAlign: 'center' }}>No video for these. Tap each word, say it three times, then do the quick check.</div></div>
        : missing
        ? <div className="card placeholder"><Fox mood="sleepy" size={120} /><div className="hand">Coming soon</div><div className="muted">This video is not here yet.</div></div>
        : <div className="video"><video ref={videoRef} key={lesson.id} controls playsInline autoPlay preload="metadata" poster={`${base}${lesson.poster || lesson.file.replace(/\.mp4$/, '.jpg')}`} onError={() => setMissing(true)} onEnded={() => store.markLesson(lesson.id, { watched: 1 }).catch(() => {})} src={`${base}${lesson.file}`} /></div>}
      <div className="wordlist compact">
        {lesson.items.map(w => (
          <div key={w.id} className="card wordcard compact" role="button" tabIndex={0} onClick={() => playFr(w.fr)}>
            <Pic id={w.pic} size={52} /><div className="wtext"><div className="fr">{w.fr}</div><div className="en">{w.en}</div></div><Speaker text={w.fr} size={44} />
          </div>
        ))}
      </div>
      <button className="btn orange big" onClick={startCheck}>{rec?.passed ? 'Quick check again' : 'Quick check'}</button>
      <div className="muted tiny source">From "{lesson.source.title}" by {lesson.source.channel} (YouTube)</div>
    </div>
  );
}

function Check({ ctx, store, lesson, onFinish, onBack }) {
  const gen = useRef(createGenerator(ctx.content, { mode: 'practice', focus: 'all', words: lesson.words, seed: Date.now(), retry: false }));
  const records = useRef([]);
  const [q, setQ] = useState(() => gen.current.next());
  const [k, setK] = useState(0);
  const onAnswer = (res) => { const r = makeRecord(q, res); records.current.push(r); store.savePractice(r, 'lesson').catch(() => {}); };
  const next = () => {
    if (records.current.length <= k) records.current.push(makeRecord(q, { correct: false, skipped: true }));
    if (records.current.length >= CHECK_SIZE) return onFinish(records.current);
    setK(records.current.length); setQ(gen.current.next());
  };
  return (
    <div className="screen fade">
      <TopBar title={`Quick check · ${k + 1} of ${CHECK_SIZE}`} onBack={onBack} />
      <QuestionView key={q.id} q={q} mode="check" onAnswer={onAnswer} onNext={next} />
    </div>
  );
}
