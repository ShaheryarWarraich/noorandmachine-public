import React from 'react';
import { BackspaceIcon } from './Art.jsx';

const ACCENTS = ['é', 'è', 'ê', 'à', 'ô', 'î', 'ç', "'", '-'];
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

// On-screen keyboard with the French accent row. Keys fire on pointerdown and never steal focus.
export default function Keyboard({ onKey, onBack, onEnter, enterLabel = 'Check', disabled }) {
  const press = (fn) => (e) => { e.preventDefault(); if (!disabled) fn(); };
  const K = ({ ch, cls = '' }) => <button type="button" tabIndex={-1} className={`key ${cls}`} onPointerDown={press(() => onKey(ch))} onClick={(e) => e.preventDefault()}>{ch}</button>;
  return (
    <div className="kb" aria-label="keyboard">
      <div className="kbrow">{ACCENTS.map(c => <K key={c} ch={c} cls="acc" />)}</div>
      {ROWS.map((r, i) => (
        <div className="kbrow" key={r}>
          {[...r].map(c => <K key={c} ch={c} />)}
          {i === 2 && <button type="button" tabIndex={-1} className="key ghost" aria-label="Delete" onPointerDown={press(onBack)} onClick={(e) => e.preventDefault()}><BackspaceIcon /></button>}
        </div>
      ))}
      <div className="kbrow">
        <button type="button" tabIndex={-1} className="key space" aria-label="Space" onPointerDown={press(() => onKey(' '))} onClick={(e) => e.preventDefault()}>&nbsp;</button>
        <button type="button" tabIndex={-1} className="key go" onPointerDown={press(onEnter)} onClick={(e) => e.preventDefault()}>{enterLabel}</button>
      </div>
    </div>
  );
}
