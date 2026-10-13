import React from 'react';
import { TopBar, Letters, Speaker } from '../components/Bits.jsx';
import { Fox } from '../components/Pics.jsx';

// Best practices, one card each: a title, one line, and the words it applies to with the tricky letters glowing.
export default function RulesScreen({ ctx, go }) {
  return (
    <div className="screen fade">
      <TopBar title="Rules" onBack={() => go('home')} />
      {ctx.rules.map(r => (
        <div key={r.id} className="card rule">
          <h3>{r.title}</h3>
          <div className="hand" style={{ fontSize: '1.35rem', lineHeight: 1.3 }}>{r.text}</div>
          {r.items.length === 0 && <div className="row" style={{ marginTop: 8 }}><Fox mood="cheer" size={70} /></div>}
          {r.items.map(w => (
            <div key={w.id} className="ruleword">
              <Letters word={w.fr} highlight={w.highlight} small />
              <div className="row" style={{ gap: 8 }}><span className="muted small">{w.en}</span><Speaker text={w.fr} size={40} /></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
