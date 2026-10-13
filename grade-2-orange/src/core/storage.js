// What the app saves. UI-free; takes an opened db wrapper.
import { summarizeRun, readiness, flattenAttempts, lastRuns, masteryByWord, stickerCount, weakestWords } from './scoring.js';

export function createStorage(db, now = () => new Date()) {
  return {
    // run: { focus, items: [records] } -> saved with timestamp and summary
    async saveRun({ focus = 'all', items }) {
      const d = now();
      const run = { ts: d.toISOString(), tsMs: d.getTime(), focus, items, summary: summarizeRun(items) };
      run.id = await db.add('results', run);
      return run;
    },
    async listRuns() { return (await db.all('results')).sort((a, b) => a.tsMs - b.tsMs); },
    async savePractice(rec, mode = 'practice') { const d = now(); return db.add('attempts', { ...rec, ts: d.toISOString(), tsMs: d.getTime(), mode }); },
    async listPractice() { return db.all('attempts'); },
    // lessons: one record per lesson id, updated when it is watched and when its check is passed
    async markLesson(id, patch) {
      const d = now();
      const cur = (await db.get('lessons', id)) || { id, watched: 0, passed: 0 };
      const next = { ...cur, ...patch, ts: d.toISOString(), tsMs: d.getTime() };
      await db.put('lessons', next);
      return next;
    },
    async listLessons() { return db.all('lessons'); },
    async numbers(wordIds) {
      const runs = await this.listRuns(); const practice = await this.listPractice(); const lessons = await this.listLessons();
      const attempts = flattenAttempts(runs, practice);
      const mastery = masteryByWord(attempts, wordIds);
      return {
        runs: runs.length,
        total: attempts.length,
        last: lastRuns(runs, 10),
        weakest: weakestWords(attempts, { minAttempts: 3, n: 5 }),
        mastery, stickers: stickerCount(mastery), words: wordIds.length,
        lessons: Object.fromEntries(lessons.map(l => [l.id, l])),
        readiness: readiness(runs),
      };
    },
    // profile: { name } — the student's name, typed once on the title page and kept on the device
    async getProfile() { return (await db.get('settings', 'profile')) || { id: 'profile', name: '' }; },
    async setProfile(patch) { const cur = await this.getProfile(); const next = { ...cur, ...patch, id: 'profile', tsMs: now().getTime() }; await db.put('settings', next); return next; },
    async exportAll() { return { exportedAt: now().toISOString(), app: 'grade-2-orange', student: (await this.getProfile()).name, ...(await db.dump()) }; },
  };
}
