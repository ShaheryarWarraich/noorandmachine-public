import React, { useState } from 'react';
import { TopBar, Speaker, Letters } from '../components/Bits.jsx';
import { Pic, Fox } from '../components/Pics.jsx';
import Keyboard from '../components/Keyboard.jsx';
import { checkText } from '../../core/check.js';
import { makeRecord } from '../../core/scoring.js';
import { playFr } from '../audio.js';

// The eleven words as cards. Tap one: it opens in place with the letters (tricky ones glowing), the tip, audio, when to say it,
// and a "Write it" box where she spells it with the keyboard (the word hides while she writes).
export default function WordsScreen({ ctx, store, params, go }) {
  const [openId, setOpenId] = useState(params.word || null);
  return (
    <div className="screen fade">
      <TopBar title="Words" onBack={() => go('home')} />
      <div className="wordlist">
        {ctx.words.map(w => <WordCard key={w.id} w={w} store={store} open={openId === w.id} onOpen={() => { playFr(w.fr); setOpenId(w.id); }} onClose={() => setOpenId(null)} />)}
      </div>
    </div>
  );
}

function WordCard({ w, store, open, onOpen, onClose }) {
  const [phase, setPhase] = useState('look'); // look | write | right | notyet
  const [text, setText] = useState('');
  const [nearly, setNearly] = useState(false);
  const [done, setDone] = useState(false);
  const writing = open && phase === 'write';
  const startWrite = () => { setText(''); setNearly(false); setPhase('write'); playFr(w.fr); };
  const submit = () => {
    const res = checkText(text, w.accept);
    if (res.status === 'empty') return;
    const correct = res.status === 'correct';
    store.savePractice(makeRecord({ key: w.id, skill: 'spell', type: 'type', prompt: w.en, reveal: w.fr, en: w.en }, { correct, nearly: res.status === 'nearly' }), 'words').catch(() => {});
    setNearly(res.status === 'nearly');
    if (correct) { setDone(true); playFr(w.fr); setPhase('right'); } else setPhase('notyet');
  };
  const close = () => { setPhase('look'); onClose(); };
  return (
    <div className={`card wordcard ${open ? 'open' : ''}`} role="button" tabIndex={0} onClick={() => { if (!open) onOpen(); }}>
      <div className="wtop">
        <Pic id={w.pic} size={open ? 96 : 84} />
        <div className="wtext"><div className="fr">{writing ? '· · ·' : w.fr}</div><div className="en">{w.en}</div></div>
        <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>{!open && done && <span className="pen done">Spelled it</span>}<Speaker text={w.fr} size={open ? 56 : 54} /></div>
      </div>
      {open && (
        <div className="wordopen" onClick={(e) => e.stopPropagation()}>
          {phase === 'look' && <>
            <Letters word={w.fr} highlight={w.highlight} />
            <div className="tipnote">{w.tip}</div>
            <div className="row"><Speaker text={w.fr} size={50} slow /><span className="muted" style={{ fontSize: '1.1rem' }}>slowly · sounds like <b>{w.say}</b></span></div>
            <div className="when"><Fox mood="happy" size={52} /><div><div className="muted tiny">When?</div><div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{w.when}</div></div></div>
            <div className="row"><button className="btn orange" onClick={startWrite}>Write it</button><button className="btn link" onClick={close}>Close</button></div>
          </>}
          {phase === 'write' && <>
            <div className="ask">Write it in French</div>
            <div className="qline" style={{ fontSize: '2rem' }}>
              <input className="blank-input wideinput" value={text} inputMode="none" autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} aria-label="your spelling"
                onChange={(e) => setText(e.target.value.slice(0, 24))} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
            </div>
            <Keyboard onKey={(ch) => setText(t => (t + ch).slice(0, 24))} onBack={() => setText(t => Array.from(t).slice(0, -1).join(''))} onEnter={submit} />
            <button className="btn link" onClick={() => setPhase('look')}>Show me the word</button>
          </>}
          {phase === 'right' && <>
            <div className="feedback"><Fox mood="cheer" size={70} /><div className="big">Yes!</div></div>
            <Letters word={w.fr} highlight={w.highlight} />
            <div className="row"><button className="btn" onClick={startWrite}>Write it again</button><button className="btn orange" onClick={close}>Done</button></div>
          </>}
          {phase === 'notyet' && <>
            <div className="feedback"><Fox mood="think" size={70} /><div><div className="big">{nearly ? 'Nearly! Watch the accent.' : 'Not yet.'}</div><div className="why">{w.tip}</div></div></div>
            <Letters word={w.fr} highlight={w.highlight} />
            <div className="row"><button className="btn orange" onClick={startWrite}>Try again</button><button className="btn" onClick={() => setPhase('look')}>Look again</button></div>
          </>}
        </div>
      )}
    </div>
  );
}
