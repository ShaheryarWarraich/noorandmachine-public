import React from 'react';
import { Back, SpeakerIcon } from './Art.jsx';
import { Pic } from './Pics.jsx';
import { playFr } from '../audio.js';

export const TopBar = ({ title, onBack, children }) => (
  <div className="topbar">
    <button className="back" onClick={onBack} aria-label="Back"><Back /></button>
    <h2>{title}</h2>
    {children}
  </div>
);

export const Speaker = ({ text, size = 54, slow = false, className = '', onPlay }) => (
  <button className={`btn round orange ${className}`} style={{ width: size, height: size }} aria-label={`Hear ${text}`}
    onClick={(e) => { e.stopPropagation(); onPlay?.(); playFr(text, { slow }); }}>
    <SpeakerIcon size={Math.round(size * 0.5)} />
  </button>
);

// word shown as separate letter boxes; highlighted ones glow
export const Letters = ({ word, highlight = [], small = false }) => (
  <div className={`letters ${small ? 'small' : ''} ${Array.from(word).length > 11 ? 'long' : ''}`}>
    {Array.from(word).map((ch, i) => <div key={i} className={`lt ${ch === ' ' ? 'gap' : ''} ${highlight.includes(i) ? 'hl' : ''}`}>{ch === ' ' ? '' : ch}</div>)}
  </div>
);

// A word card: picture, French, English, speaker. Tap the French to hear it.
export const WordCard = ({ w, onOpen, compact = false, badge = null }) => (
  <div className={`card wordcard ${compact ? 'compact' : ''}`} role="button" tabIndex={0} onClick={() => (onOpen ? onOpen(w) : playFr(w.fr))}>
    <Pic id={w.pic} size={compact ? 56 : 84} />
    <div className="wtext">
      <div className="fr">{w.fr}</div>
      <div className="en">{w.en}</div>
    </div>
    {badge}
    <Speaker text={w.fr} size={compact ? 46 : 54} />
  </div>
);

export const Stars = ({ n, of = 3, size = 34 }) => (
  <div className="stars" aria-label={`${n} of ${of} stars`}>
    {Array.from({ length: of }, (_, i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5 L14.9 8.6 L21.5 9.4 L16.6 14 L17.9 20.6 L12 17.4 L6.1 20.6 L7.4 14 L2.5 9.4 L9.1 8.6 Z" fill={i < n ? 'var(--yellow-d)' : '#fff'} stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ))}
  </div>
);

export const Meter = ({ readiness }) => {
  const { streak, needed, ready } = readiness;
  return (
    <div className="meter">
      <div className="dots">{Array.from({ length: needed }, (_, i) => <div key={i} className={`dot ${i < streak ? 'on' : ''}`} />)}</div>
      <div className={`lbl ${ready ? 'ready' : ''}`}>{ready ? 'Quiz-ready!' : `Quiz-ready: ${streak} of ${needed}`}</div>
    </div>
  );
};
