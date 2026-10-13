import React, { useEffect, useRef, useState } from 'react';
import { checkAnswer, isTyped } from '../../core/check.js';
import { TYPE_NAMES } from '../../core/questions.js';
import Keyboard from './Keyboard.jsx';
import { Fox, Pic } from './Pics.jsx';
import { MicIcon } from './Art.jsx';
import { Speaker } from './Bits.jsx';
import { playFr } from '../audio.js';
import { canListen, listenOnce, stopListening } from '../speech.js';

// One question. mode: 'practice' (gentle, manual Next, retry) | 'round' (auto-advance) | 'check' (after a lesson: like practice).
// onAnswer({correct, nearly, ms}) fires once, for the first try only. onNext() moves on.
export default function QuestionView({ q, mode, onAnswer, onNext }) {
  const auto = mode === 'round';
  const [phase, setPhase] = useState('ask'); // ask | right | notyet
  const [nearly, setNearly] = useState(false);
  const [text, setText] = useState('');
  const [wrongPicks, setWrongPicks] = useState([]);
  const [placed, setPlaced] = useState([]); // tile ids in order
  const [played, setPlayed] = useState(null); // sound: which option was last played
  const [mic, setMic] = useState('idle'); // say: idle | listening | heard
  const [heard, setHeard] = useState('');
  const [tries, setTries] = useState(0);
  const t0 = useRef(performance.now());
  const answered = useRef(false);
  const inputRef = useRef(null);
  const typed = isTyped(q);
  const listening = canListen();

  useEffect(() => { // hear the word first for listening / typing questions
    if (q.hear) playFr(q.hear);
    return () => stopListening();
  }, [q]);
  useEffect(() => { if (typed && phase === 'ask') inputRef.current?.focus({ preventScroll: true }); }, [phase, typed]);
  useEffect(() => { // round: move on by itself
    if (!auto || phase === 'ask') return;
    const id = setTimeout(onNext, phase === 'right' ? 700 : 2200);
    return () => clearTimeout(id);
  }, [phase, auto]);

  const report = (correct, nearlyFlag) => {
    if (!answered.current) { answered.current = true; onAnswer({ correct, nearly: nearlyFlag, ms: performance.now() - t0.current }); }
  };
  const submit = (answer) => {
    const res = checkAnswer(q, answer);
    if (res.status === 'empty') return;
    const correct = res.status === 'correct';
    report(correct, res.status === 'nearly');
    setNearly(res.status === 'nearly');
    if (correct) { setPhase('right'); if (!auto && q.type !== 'say') playFr(q.fr); } else setPhase('notyet');
  };
  const retry = () => { setText(''); setPlaced([]); setWrongPicks([]); setHeard(''); setMic('idle'); setPhase('ask'); };
  const locked = phase === 'right' || (auto && phase === 'notyet');
  const pick = (value) => { if (locked) return; if (checkAnswer(q, value).status !== 'correct') setWrongPicks(w => [...w, value]); submit(value); };
  const place = (id) => {
    if (phase !== 'ask') return;
    const next = [...placed, id]; setPlaced(next);
    if (next.length === q.tiles.length) submit(next.map(i => q.tiles.find(t => t.id === i).text));
  };
  const onKey = (ch) => setText(t => (t + ch).slice(0, 24));
  const onBack = () => setText(t => Array.from(t).slice(0, -1).join(''));
  const optClass = (o) => `chip ${phase === 'right' && o === q.answer ? 'right' : ''} ${wrongPicks.includes(o) ? 'miss' : ''}`;

  // "Say it": microphone when the browser has one, otherwise an echo game (hear, say, hear again, tap "I said it").
  const listen = async () => {
    if (mic === 'listening' || locked) return;
    setMic('listening'); setHeard('');
    const got = await listenOnce();
    setMic('heard'); setHeard(got);
    const res = checkAnswer(q, got);
    const n = tries + 1; setTries(n);
    if (res.status === 'correct') { report(true, false); setPhase('right'); return; }
    if (n >= 2) { report(false, false); setPhase('notyet'); } // two tries, then we just hear it and move on
  };
  const echoDone = () => { report(true, false); setPhase('right'); };

  const input = (
    <input ref={inputRef} className="blank-input wideinput" value={text} disabled={locked}
      inputMode="none" autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} aria-label="your answer"
      onChange={(e) => setText(e.target.value.slice(0, 24))} onKeyDown={(e) => { if (e.key === 'Enter') submit(text); }} />
  );

  return (
    <div className="qwrap" key={q.id}>
      <span className="tag">{TYPE_NAMES[q.type]}</span>

      {q.type === 'type' && <>
        <div className="qpic"><Pic id={q.pic} size={92} /><Speaker text={q.fr} size={56} /></div>
        <div className="qen big">{q.en}</div>
        <div className="qline">{input}</div>
      </>}
      {q.type === 'pickspell' && <>
        <div className="qpic"><Pic id={q.pic} size={92} /><Speaker text={q.fr} size={56} /></div>
        <div className="qen big">{q.en}</div>
        <div className="qsub">Which spelling is right?</div>
      </>}
      {q.type === 'letter' && <>
        <div className="qpic"><Pic id={q.pic} size={80} /><Speaker text={q.fr} size={52} /></div>
        <div className="qen">{q.en}</div>
        <div className={`letters ${q.chars.length > 11 ? 'long' : ''}`}>
          {q.chars.map((ch, i) => <div key={i} className={`lt ${ch === ' ' ? 'gap' : ''} ${i === q.index ? (phase === 'right' ? 'hl' : 'hole') : ''}`}>{i === q.index ? (phase === 'right' ? q.answer : '') : (ch === ' ' ? '' : ch)}</div>)}
        </div>
      </>}
      {q.type === 'tiles' && <>
        <div className="qpic"><Pic id={q.pic} size={80} /><Speaker text={q.fr} size={52} /></div>
        <div className="qen">{q.en}</div>
        <div className="qline tiles-line"><span className="pn">{q.lead}</span>
          <span className="slot" aria-label="your letters">
            {placed.map(id => { const t = q.tiles.find(x => x.id === id); return <button key={id} className="chip tile" onClick={() => phase === 'ask' && setPlaced(p => p.filter(x => x !== id))}>{t.text}</button>; })}
            {placed.length < q.tiles.length && <span className="blank-slot" />}
          </span>
          <span className="pn">{q.tail}</span></div>
        <div className="tiles">{q.tiles.filter(t => !placed.includes(t.id)).map(t => <button key={t.id} className="chip tile" onClick={() => place(t.id)}>{t.text}</button>)}</div>
      </>}
      {q.type === 'meaning' && <>
        <div className="qline"><span>{q.prompt}</span><Speaker text={q.fr} size={52} /></div>
        <div className="qsub">What does it mean?</div>
      </>}
      {q.type === 'french' && <>
        <div className="qpic"><Pic id={q.pic} size={92} /></div>
        <div className="qen big">{q.en}</div>
        <div className="qsub">in French?</div>
      </>}
      {q.type === 'listen' && <>
        <div className="qpic"><Speaker text={q.hear} size={96} className="pulse" /></div>
        <div className="qsub">Which one did you hear?</div>
      </>}
      {q.type === 'sound' && <>
        <div className="qpic"><Pic id={q.pic} size={80} /></div>
        <div className="qline"><span>{q.fr}</span></div>
        <div className="qsub">Tap both. Which one sounds right?</div>
        <div className="opts two">
          {q.options.map((o, i) => (
            <button key={o.id} className={`chip ears ${optClass(o.id)} ${played === o.id ? 'playing' : ''}`} disabled={locked || wrongPicks.includes(o.id)}
              onClick={() => { setPlayed(o.id); playFr(o.text); }}>
              <span className="n">{i + 1}</span>
            </button>
          ))}
        </div>
        {phase === 'ask' && <div className="row">
          {q.options.map((o, i) => <button key={o.id} className="btn" disabled={locked || wrongPicks.includes(o.id)} onClick={() => pick(o.id)}>{i + 1} is right</button>)}
        </div>}
      </>}
      {q.type === 'say' && <>
        <div className="qpic"><Pic id={q.pic} size={80} /><Speaker text={q.fr} size={52} /></div>
        <div className="qline"><span>{q.fr}</span></div>
        <div className="qen">{q.en} · <b>{q.sayHint}</b></div>
        {phase === 'ask' && (listening
          ? <div className="col">
              <button className={`btn round mic ${mic === 'listening' ? 'live' : ''}`} onClick={listen} aria-label="Say it now"><MicIcon /></button>
              <div className="qsub">{mic === 'listening' ? 'Listening… say it!' : mic === 'heard' ? (heard ? 'Hmm, not quite. Try once more.' : 'I did not hear you. Tap and try again.') : 'Tap the mic and say it'}</div>
            </div>
          : <div className="col">
              <div className="qsub">Hear it. Say it out loud. Hear it again.</div>
              <div className="row"><Speaker text={q.fr} size={64} /><Speaker text={q.fr} size={52} slow /></div>
              <button className="btn orange" onClick={echoDone}>I said it!</button>
            </div>)}
      </>}

      {(q.type === 'pickspell' || q.type === 'meaning' || q.type === 'french' || q.type === 'listen') && (
        <div className="opts stack">{q.options.map(o => <button key={o} className={optClass(o)} disabled={locked || wrongPicks.includes(o)} onClick={() => pick(o)}>{o}</button>)}</div>
      )}
      {q.type === 'letter' && (
        <div className="opts three">{q.options.map(o => <button key={o} className={`${optClass(o)} letterchip`} disabled={locked || wrongPicks.includes(o)} onClick={() => pick(o)}>{o}</button>)}</div>
      )}

      {typed && !locked && <Keyboard onKey={onKey} onBack={onBack} onEnter={() => submit(text)} disabled={locked} />}

      <div className="feedback" aria-live="polite">
        {phase === 'right' && <><Fox mood="cheer" size={76} /><div><div className="big">Yes!</div>{q.why && <div className="why">{q.why}</div>}</div></>}
        {phase === 'notyet' && <>
          <Fox mood="think" size={76} />
          <div>
            <div className="big">{nearly ? 'Nearly! Watch the accent.' : q.type === 'say' ? "Let's hear it again." : 'Not yet.'}</div>
            <div className="ans">{q.reveal}</div>
            <div className="why">{q.type === 'meaning' ? q.fr : q.en}{q.why ? ` · ${q.why}` : q.tip ? ` · ${q.tip}` : ''}</div>
          </div>
          <Speaker text={q.fr} size={46} />
        </>}
      </div>

      {!auto && phase === 'notyet' && <div className="row"><button className="btn" onClick={retry}>Try again</button><button className="btn orange" onClick={onNext}>Next</button></div>}
      {!auto && phase === 'right' && <button className="btn orange big" onClick={onNext}>Next</button>}
    </div>
  );
}
