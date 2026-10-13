import React, { useEffect, useState } from 'react';
import { openDB, memoryDB } from './core/db.js';
import { createStorage } from './core/storage.js';
import { indexContent, validateContent } from './core/content.js';
import { PencilDefs } from './ui/components/Art.jsx';
import { Fox } from './ui/components/Pics.jsx';
import { initAudio, primeAudio, stopAudio } from './ui/audio.js';
import HomeScreen from './ui/screens/HomeScreen.jsx';
import WordsScreen from './ui/screens/WordsScreen.jsx';
import LessonsScreen from './ui/screens/LessonsScreen.jsx';
import RulesScreen from './ui/screens/RulesScreen.jsx';
import PracticeScreen from './ui/screens/PracticeScreen.jsx';
import RoundScreen from './ui/screens/RoundScreen.jsx';
import StickersScreen from './ui/screens/StickersScreen.jsx';

export default function App() {
  const [boot, setBoot] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState({ name: 'home', params: {} });
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const content = await fetch(`${import.meta.env.BASE_URL}content/greetings.json`).then(r => r.json());
        const errs = validateContent(content);
        if (errs.length) console.warn('content problems', errs);
        initAudio(content);
        let db; try { db = await openDB(); } catch { db = memoryDB(); }
        try { navigator.storage?.persist?.(); } catch { /* optional */ }
        const store = createStorage(db);
        let prof = { name: '' }; try { prof = await store.getProfile(); } catch { /* memory only */ }
        setProfile(prof);
        setBoot({ ctx: indexContent(content), store });
      } catch (e) { setError(String(e)); }
    })();
    const f = () => { primeAudio(); window.removeEventListener('pointerdown', f); };
    window.addEventListener('pointerdown', f);
  }, []);

  const go = (name, params = {}) => { stopAudio(); setView({ name, params }); window.scrollTo(0, 0); };
  const body = (() => {
    if (error) return <div className="screen center"><h2>Something broke</h2><div className="muted">{error}</div></div>;
    if (!boot) return <div className="screen center"><Fox mood="sleepy" size={110} /></div>;
    const saveName = async (name) => { const next = { ...profile, name }; setProfile(next); try { await boot.store.setProfile({ name }); } catch { /* keeps the name for this visit */ } };
    const p = { ctx: boot.ctx, store: boot.store, go, params: view.params, profile, saveName };
    switch (view.name) {
      case 'words': return <WordsScreen {...p} />;
      case 'lessons': return <LessonsScreen {...p} />;
      case 'rules': return <RulesScreen {...p} />;
      case 'practice': return <PracticeScreen {...p} />;
      case 'round': return <RoundScreen {...p} />;
      case 'stickers': return <StickersScreen {...p} />;
      default: return <HomeScreen {...p} />;
    }
  })();
  return <><PencilDefs />{body}</>;
}
