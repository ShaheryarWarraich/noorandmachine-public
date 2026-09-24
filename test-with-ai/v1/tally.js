// Turns completed runs into results: votes (overall and per persona), runner-ups, rubric, final score, isolation stats.
function tally(t) {
  if (!t.options?.length) return null;
  const criteria = t.rubric?.criteria || [];
  const totalWeight = criteria.reduce((a, c) => a + c.weight, 0) || 1;
  const rows = Object.fromEntries(t.options.map((o) => [o.id, {
    id: o.id, name: o.name, votes: 0, byPersona: Object.fromEntries(t.personas.map((p) => [p.id, 0])), runnerUp: 0,
    sums: Object.fromEntries(criteria.map((c) => [c.key, 0])), totals: [] }]));
  const personaVotes = Object.fromEntries(t.personas.map((p) => [p.id, 0]));
  let votes = 0, unanimous = 0;
  for (const run of t.runs) {
    const ps = run.picks.map((p) => p.pick);
    if (ps.length > 1 && ps.every((p) => p === ps[0])) unanimous++;
    for (const p of run.picks) {
      votes++; personaVotes[p.personaId] = (personaVotes[p.personaId] || 0) + 1;
      const r = rows[p.pick];
      if (r) { r.votes++; r.byPersona[p.personaId] = (r.byPersona[p.personaId] || 0) + 1; }
      if (rows[p.runner_up]) rows[p.runner_up].runnerUp++;
    }
    for (const s of run.rubric || []) {
      const r = rows[s.id]; if (!r) continue;
      let tot = 0; for (const c of criteria) { r.sums[c.key] += s[c.key]; tot += s[c.key] * c.weight; }
      r.totals.push((tot / totalWeight) * 10);
    }
  }
  const hasRubric = Object.values(rows).some((r) => r.totals.length);
  const out = Object.values(rows).map((r) => {
    const n = r.totals.length;
    const avg = Object.fromEntries(criteria.map((c) => [c.key, n ? r.sums[c.key] / n : 0]));
    const rubricScore = n ? r.totals.reduce((a, b) => a + b, 0) / n : 0;
    const rubricSd = n ? Math.sqrt(r.totals.reduce((a, b) => a + (b - rubricScore) ** 2, 0) / n) : 0;
    const voteShare = votes ? (r.votes / votes) * 100 : 0;
    const { sums, totals, ...rest } = r;
    return { ...rest, avg, rubricScore, rubricSd, voteShare, final: hasRubric ? 0.5 * voteShare + 0.5 * rubricScore : voteShare };
  }).sort((a, b) => b.final - a.final || b.votes - a.votes || b.runnerUp - a.runnerUp);

  // How settled each persona is: share of its votes going to its own favourite.
  const personas = t.personas.map((p) => {
    const fav = [...out].sort((a, b) => b.byPersona[p.id] - a.byPersona[p.id])[0];
    const n = personaVotes[p.id] || 0;
    return { id: p.id, name: p.name, votes: n, favorite: n ? fav.id : null, consistency: n ? (fav.byPersona[p.id] / n) * 100 : 0 };
  });
  const favorite = [...out].sort((a, b) => b.votes - a.votes || b.runnerUp - a.runnerUp)[0];
  const done = t.calls.filter((x) => x.status === "done" && x.role !== "detect");
  return {
    rows: out, criteria, hasRubric, runs: t.runs.length, votes, unanimous, favorite: favorite?.id, personas,
    isolation: { calls: done.length, uniqueSessions: new Set(done.map((x) => x.sessionId).filter(Boolean)).size, uniquePids: new Set(done.map((x) => x.pid)).size },
  };
}

module.exports = { tally };
