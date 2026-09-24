// Test with AI — local server. Agents (each a brand-new `claude -p` process) choose between options against a brief.
// Run: node server.js  →  http://127.0.0.1:4330
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { capture } = require("./capture");
const { runClaude, killAll, rateLimit, SYSTEM_PROMPT } = require("./runner");
const P = require("./prompts");
const { tally } = require("./tally");

const PORT = +process.env.PORT || 4330;
const HOST = "127.0.0.1";
const ROOT = __dirname;
const WORK = path.join(ROOT, "workspace");
const DB = path.join(ROOT, "data.json");
fs.mkdirSync(WORK, { recursive: true });

const FILE_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", pdf: "application/pdf",
  txt: "text/plain", md: "text/markdown", csv: "text/csv", json: "application/json", svg: "image/svg+xml", html: "text/html" };
const URL_RE = /https?:\/\/[^\s<>"'`)\]]+/g;
const MAX_PERSONAS = 3;

// ---------- persistence ----------
let db = { tests: [] };
try { db = JSON.parse(fs.readFileSync(DB, "utf8")); } catch {}
for (const t of db.tests) {
  if (["running", "preparing"].includes(t.status)) t.status = t.runs.length ? "stopped" : "draft";
  for (const c of t.calls) if (c.status === "running" || c.status === "queued") c.status = "cancelled";
}
let saveTimer;
const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => fs.writeFileSync(DB, JSON.stringify(db)), 300); };
const find = (id) => db.tests.find((t) => t.id === id);
const dirOf = (t) => path.join(WORK, t.id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- config ----------
function letterIds(used) {
  const gen = function* () { for (let n = 0; ; n++) { let s = "", k = n; do { s = String.fromCharCode(65 + (k % 26)) + s; k = Math.floor(k / 26) - 1; } while (k >= 0); yield s; } };
  const g = gen(); return () => { let v; do v = g.next().value; while (used.has(v)); used.add(v); return v; };
}
function saveUpload(t, up, base) {
  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(up.data || "");
  const ext = (path.extname(up.name || "").slice(1) || "").toLowerCase();
  if (!m || !FILE_TYPES[ext]) throw new Error(`"${up.name}" can't be used. Supported: ${Object.keys(FILE_TYPES).join(", ")}.`);
  let file = `${base}.${ext}`;
  for (let i = 2; fs.existsSync(path.join(dirOf(t), file)); i++) file = `${base}-${i}.${ext}`;
  fs.writeFileSync(path.join(dirOf(t), file), Buffer.from(m[2], "base64"));
  return { file, name: up.name, mime: FILE_TYPES[ext] };
}
const contentKey = (t) => JSON.stringify([t.brief, t.personas, t.vary, t.agentsPerPersona, t.rubric,
  t.options.filter((o) => !o.region).map((o) => [o.id, o.text, o.files.map((f) => f.file)]), t.sheets.map((s) => [s.id, s.url, s.files.map((f) => f.file)])]);

// Applies the brief form to a test. Uploaded files are written into the test's workspace under neutral names.
function applyConfig(t, b) {
  fs.mkdirSync(dirOf(t), { recursive: true });
  const before = t.options.length ? contentKey(t) : null;
  t.name = (b.name || "").trim() || t.name || "Untitled test";
  t.brief = String(b.brief || "").trim();
  t.personas = (b.personas || []).filter((p) => p.text?.trim()).slice(0, MAX_PERSONAS)
    .map((p, i) => ({ id: `p${i + 1}`, name: (p.name || "").trim() || `Persona ${i + 1}`, text: p.text.trim() }));
  t.vary = b.vary !== false;
  t.agentsPerPersona = Math.min(5, Math.max(1, +b.agentsPerPersona || 1));
  const crit = String(b.rubricText || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
    const m = /^(.*?)[\s:,-]+(\d{1,3})%?$/.exec(l);
    return { key: `c${i + 1}`, label: (m ? m[1] : l).trim(), weight: m ? +m[2] : 10 };
  });
  t.rubric = { on: !!b.rubricOn && crit.length > 0, criteria: crit.length ? crit : t.rubric?.criteria || [], text: b.rubricText || "" };
  t.model = b.model || t.model || "claude-opus-5-5";
  t.effort = b.effort || t.effort || "high";
  t.mode = b.mode === "combined" ? "combined" : "isolated";
  t.target = Math.max(1, +b.target || t.target || 50);
  t.concurrency = Math.min(6, Math.max(1, +b.concurrency || t.concurrency || 2));

  // Sheets: one image or page that holds many options.
  const oldSheets = new Map(t.sheets.map((s) => [s.id, s]));
  const usedS = new Set((b.sheets || []).map((s) => s.id).filter(Boolean));
  let sn = 1; const nextS = () => { while (usedS.has(`S${sn}`)) sn++; usedS.add(`S${sn}`); return `S${sn}`; };
  t.sheets = (b.sheets || []).map((s) => {
    const id = s.id && oldSheets.has(s.id) ? s.id : nextS();
    const old = oldSheets.get(id);
    const sheet = { id, kind: s.url ? "url" : "image", url: (s.url || "").trim() || null, expected: +s.expected || null,
      files: old?.files || [], detected: old?.detected || false, title: old?.title, log: old?.log || [] };
    if (s.file?.data) { sheet.files = [saveUpload(t, s.file, `sheet-${id}`)]; sheet.detected = false; }
    if (sheet.kind === "url" && old?.url !== sheet.url) { sheet.files = []; sheet.detected = false; }
    if (old && old.expected !== sheet.expected) sheet.detected = false;
    return sheet;
  }).filter((s) => s.url || s.files.length);

  // Manual options (region options are regenerated from sheets during prepare, unless the sheet is unchanged).
  const oldOpts = new Map(t.options.map((o) => [o.id, o]));
  const keepRegions = t.options.filter((o) => o.region && t.sheets.some((s) => s.id === o.region.sheetId && s.detected));
  const used = new Set([...keepRegions.map((o) => o.id), ...(b.options || []).map((o) => o.id).filter((id) => id && oldOpts.has(id))]);
  const next = letterIds(used);
  const manual = (b.options || []).map((o) => {
    const id = o.id && oldOpts.has(o.id) && !oldOpts.get(o.id).region ? o.id : next();
    const old = oldOpts.get(id);
    const text = String(o.text || "");
    const urls = [...new Set(text.match(URL_RE) || [])];
    const files = [];
    for (const f of o.files || []) {
      if (f.keep) { const k = old?.files.find((x) => x.file === f.keep); if (k) files.push(k); }
      else if (f.data) files.push(saveUpload(t, f, `opt-${id}-${files.length + 1}`));
    }
    return { id, name: (o.name || "").trim() || `Option ${id}`, text, bodyText: text.replace(URL_RE, "").trim(), urls, files,
      shots: (old?.shots || []).filter((s) => urls.includes(s.url)) };
  }).filter((o) => o.text.trim() || o.files.length);
  t.options = [...manual, ...keepRegions];
  if (before !== null && before !== contentKey(t)) { t.runs = []; t.failedRuns = 0; }
  cleanupWorkspace(t);
}

function cleanupWorkspace(t) {
  const keep = new Set([...t.sheets.flatMap((s) => s.files.map((f) => f.file)), ...t.options.flatMap((o) => [...o.files.map((f) => f.file), ...(o.shots || []).flatMap((s) => s.files.map((f) => f.file))])]);
  for (const f of fs.readdirSync(dirOf(t))) if (!keep.has(f)) try { fs.unlinkSync(path.join(dirOf(t), f)); } catch {}
}

function problems(t) {
  const p = [];
  if (!t.brief) p.push("Write a brief.");
  if (!t.personas.length) p.push("Add at least one persona.");
  if (t.options.length < 2) p.push("Add at least two options (or import a sheet that contains them).");
  if (t.rubric.on && !t.rubric.criteria.length) p.push("Add rubric criteria or turn the rubric off.");
  return p;
}

// ---------- prepare: capture web pages, detect sheet items ----------
function newCall(t, run, role, prompt, extra = {}) {
  const call = { id: crypto.randomUUID().slice(0, 8), run, role, status: "queued", prompt, events: [], createdAt: Date.now(), cost: 0, ...extra };
  t.calls.push(call); return call;
}
const plog = (t, text) => { t.prepareLog.push({ at: Date.now(), text }); save(); };

async function prepare(t) {
  t.status = "preparing"; t.error = null; t.prepareLog = []; save();
  try {
    for (const o of t.options) for (const [k, url] of (o.urls || []).entries()) {
      if ((o.shots || []).some((s) => s.url === url && s.files.every((f) => fs.existsSync(path.join(dirOf(t), f.file))))) continue;
      plog(t, `Option ${o.id}: capturing ${url}`);
      const r = await capture(url, dirOf(t), `opt-${o.id}-web${k + 1}`, (s) => plog(t, `  ${s}`));
      o.shots = [...(o.shots || []).filter((s) => s.url !== url), { url, title: r.title, files: r.slices }];
    }
    for (const s of t.sheets) {
      if (s.kind === "url" && !s.files.length) {
        plog(t, `Sheet ${s.id}: capturing ${s.url}`);
        const r = await capture(s.url, dirOf(t), `sheet-${s.id}`, (x) => plog(t, `  ${x}`));
        s.files = r.slices; s.title = r.title;
      }
      if (!s.detected) await detectSheet(t, s);
    }
    cleanupWorkspace(t);
    const p = problems(t);
    if (p.length) { t.status = "draft"; t.error = p.join(" "); }
    else { t.status = t.runs.length ? (t.runs.length >= t.target ? "done" : "stopped") : "ready"; plog(t, `Ready: ${t.options.length} options, ${t.personas.length} persona${t.personas.length === 1 ? "" : "s"}.`); }
  } catch (e) { t.status = "draft"; t.error = e.message; plog(t, "Failed: " + e.message); }
  save();
}

async function detectSheet(t, s) {
  plog(t, `Sheet ${s.id}: finding the options in it`);
  const call = newCall(t, 0, "detect", P.detectPrompt(s, dirOf(t)), { sheetId: s.id });
  const d = await runClaude(t, call, P.detectSchema, dirOf(t));
  t.cost += call.cost;
  t.options = t.options.filter((o) => o.region?.sheetId !== s.id);
  const used = new Set(t.options.map((o) => o.id));
  const next = letterIds(new Set(used));
  for (const item of d.options) {
    const clean = String(item.label).trim().replace(/[^\w.-]/g, "").slice(0, 12);
    const id = clean && !used.has(clean) ? clean : clean && !used.has(`${s.id}-${clean}`) ? `${s.id}-${clean}` : next();
    used.add(id);
    t.options.push({ id, name: `Item ${item.label}`, text: "", bodyText: "", urls: [], files: [], shots: [],
      region: { sheetId: s.id, label: item.label, position: item.position, parts: item.parts, description: item.description } });
  }
  s.detected = true;
  plog(t, `Sheet ${s.id}: found ${d.options.length} options${s.expected && s.expected !== d.options.length ? ` (expected ${s.expected}; check the list)` : ""}`);
}

// ---------- runs ----------
async function withRetry(t, makeCall, schema) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (t.status !== "running") throw new Error("stopped");
    const call = makeCall(attempt);
    try { const out = await runClaude(t, call, schema, dirOf(t)); t.cost += call.cost; save(); return { out, call }; }
    catch (e) {
      t.cost += call.cost; lastErr = e; save();
      if (e.rateLimited && t.status === "running") { // wait for the usage window instead of burning retries
        t.waitingUntil = rateLimit.resetsAt && rateLimit.resetsAt > Date.now() ? rateLimit.resetsAt : Date.now() + 5 * 60 * 1000; save();
        while (t.status === "running" && Date.now() < t.waitingUntil) await sleep(5000);
        t.waitingUntil = null; attempt--; save();
      }
    }
  }
  throw lastErr;
}

async function doRun(t, n) {
  const ids = t.options.map((o) => o.id), dir = dirOf(t);
  const agents = t.personas.flatMap((p) => Array.from({ length: t.agentsPerPersona }, (_, i) =>
    ({ persona: p, slot: i + 1, traits: t.vary ? P.drawTraits() : null, key: `${p.id}_${i + 1}` })));
  const run = { n, at: null, picks: [], rubric: [], callIds: [] };
  const record = (a, out, call) => run.picks.push({ personaId: a.persona.id, slot: a.slot, pick: out.pick, runner_up: out.runner_up, reason: out.reason,
    individual: out.individual || null, traits: a.traits, callId: call.id });
  if (t.mode === "combined") {
    const order = P.shuffle(t.options);
    const { out, call } = await withRetry(t, (att) => newCall(t, n, "combined", P.combinedPrompt(t, agents, order, dir),
      { attempt: att, order: order.map((o) => o.id), agents: agents.map((a) => ({ personaId: a.persona.id, slot: a.slot, traits: a.traits })) }), P.combinedSchema(ids, agents, t));
    run.callIds.push(call.id);
    agents.forEach((a) => record(a, out[a.key], call));
    run.rubric = out.rubric || [];
  } else {
    const jobs = agents.map((a) => {
      const order = P.shuffle(t.options);
      return withRetry(t, (att) => newCall(t, n, "persona", P.personaPrompt(t, a.persona, a.traits, order, dir),
        { attempt: att, personaId: a.persona.id, slot: a.slot, traits: a.traits, order: order.map((o) => o.id) }), P.personaSchema(ids, !!a.traits))
        .then(({ out, call }) => { record(a, out, call); run.callIds.push(call.id); });
    });
    if (t.rubric.on) {
      const order = P.shuffle(t.options);
      jobs.push(withRetry(t, (att) => newCall(t, n, "rubric", P.rubricPrompt(t, order, dir), { attempt: att, order: order.map((o) => o.id) }), P.rubricSchema(ids, t.rubric.criteria))
        .then(({ out, call }) => { run.rubric = out.rubric; run.callIds.push(call.id); }));
    }
    await Promise.all(jobs);
  }
  const order = Object.fromEntries(t.personas.map((p, i) => [p.id, i]));
  run.picks.sort((a, b) => order[a.personaId] - order[b.personaId] || a.slot - b.slot);
  run.at = Date.now();
  return run;
}

async function runJob(t) {
  t.status = "running"; t.error = null; save();
  let next = Math.max(0, ...t.runs.map((r) => r.n)) + 1, inProgress = 0, failuresInRow = 0;
  const worker = async () => {
    while (t.status === "running" && t.runs.length + inProgress < t.target) {
      const n = next++; inProgress++;
      try {
        const run = await doRun(t, n);
        if (t.status !== "running") break;
        t.runs.push(run); t.runs.sort((a, b) => a.n - b.n); failuresInRow = 0;
      } catch (e) {
        if (t.status !== "running") break;
        t.failedRuns++; failuresInRow++;
        if (failuresInRow >= 3) { t.status = "stopped"; t.error = "Stopped after 3 failed runs in a row: " + e.message; }
      } finally { inProgress--; }
      save();
    }
  };
  await Promise.all(Array.from({ length: t.concurrency }, worker));
  if (t.status === "running") t.status = "done";
  save();
}

function stop(t) {
  if (t.status === "running") t.status = "stopped";
  t.waitingUntil = null;
  for (const c of t.calls) if (c.status === "running" || c.status === "queued") c.status = "cancelled";
  killAll(t.id);
  save();
}

// ---------- views ----------
const personaName = (t, id) => t.personas.find((p) => p.id === id)?.name || id;
const callSummary = (t, x) => ({ id: x.id, run: x.run, role: x.role, personaId: x.personaId, slot: x.slot, sheetId: x.sheetId, status: x.status, attempt: x.attempt,
  sessionId: x.sessionId, pid: x.pid, apiKeySource: x.apiKeySource, startedAt: x.startedAt, endedAt: x.endedAt, thinkingTokens: x.thinkingTokens, cost: x.cost,
  pick: x.output?.pick, runnerUp: x.output?.runner_up,
  who: x.role === "persona" ? `${personaName(t, x.personaId)}${t.agentsPerPersona > 1 || x.slot > 1 ? ` #${x.slot}` : ""}` : x.role === "combined" ? `${(x.agents || []).length} agents, one call` : x.role === "detect" ? `Sheet ${x.sheetId || ""}` : "",
  individual: x.output?.individual || x.individualText || null, lastEvent: x.events[x.events.length - 1]?.text });
function view(t, full) {
  const { runs, calls, ...rest } = t;
  const v = { ...rest, completed: runs.length, inFlight: calls.filter((x) => x.status === "running").length, tally: tally(t),
    auth: calls.slice().reverse().find((x) => x.apiKeySource)?.apiKeySource ?? null,
    rateLimit: rateLimit.at ? { ...rateLimit } : null, problems: problems(t) };
  if (full) { v.calls = calls.slice(-500).reverse().map((x) => callSummary(t, x)); v.runs = runs.slice(-80); }
  return v;
}
const callDetail = (t, x) => ({ ...x, personaName: x.personaId ? personaName(t, x.personaId) : null, systemPrompt: x.systemPrompt || SYSTEM_PROMPT,
  agentsText: x.agents?.map((a) => `${personaName(t, a.personaId)} #${a.slot}${a.traits ? ` · traits: ${P.describeTraits(a.traits)}` : ""}`) });

// ---------- http ----------
const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); res.end(type === "application/json" ? JSON.stringify(body) : body); };
const readBody = (req) => new Promise((ok, bad) => { const b = []; let n = 0; req.on("data", (d) => { n += d.length; if (n > 300e6) { bad(new Error("Upload too large")); req.destroy(); } else b.push(d); }); req.on("end", () => ok(Buffer.concat(b))); });
const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const ALLOWED_ORIGINS = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);

http.createServer(async (req, res) => {
  // Only this machine's browser, on this exact host, may use the API (blocks other sites and DNS rebinding).
  if (!ALLOWED_HOSTS.has(req.headers.host)) return send(res, 403, { error: "Forbidden host" });
  if (req.method !== "GET" && req.headers.origin && !ALLOWED_ORIGINS.has(req.headers.origin)) return send(res, 403, { error: "Forbidden origin" });
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);
  try {
    if (req.method === "GET" && url.pathname === "/") return send(res, 200, fs.readFileSync(path.join(ROOT, "public", "index.html")), "text/html; charset=utf-8");
    if (req.method === "GET" && parts[0] === "files" && find(parts[1]) && /^[\w.-]+$/.test(parts[2] || "")) {
      const f = path.join(WORK, parts[1], parts[2]);
      return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f), FILE_TYPES[path.extname(f).slice(1).toLowerCase()] || "application/octet-stream") : send(res, 404, {});
    }
    if (req.method === "GET" && url.pathname === "/api/tests") return send(res, 200, db.tests.map((t) => view(t, false)));
    if (req.method === "GET" && parts[1] === "tests" && parts[2]) {
      const t = find(parts[2]); if (!t) return send(res, 404, {});
      if (parts[3] === "calls" && parts[4]) { const x = t.calls.find((k) => k.id === parts[4]); return x ? send(res, 200, callDetail(t, x)) : send(res, 404, {}); }
      if (parts[3] === "preview") { // a sample of exactly what the first persona's agent would receive
        if (!t.personas.length || t.options.length < 2) return send(res, 200, { prompt: null });
        const traits = t.vary ? P.drawTraits() : null, order = P.shuffle(t.options);
        return send(res, 200, { systemPrompt: SYSTEM_PROMPT, prompt: P.personaPrompt(t, t.personas[0], traits, order, dirOf(t)),
          rubricPrompt: t.rubric.on ? P.rubricPrompt(t, P.shuffle(t.options), dirOf(t)) : null });
      }
      return send(res, 200, view(t, true));
    }
    if (req.method === "POST" && url.pathname === "/api/tests") {
      const b = JSON.parse((await readBody(req)).toString());
      const t = { id: crypto.randomUUID().slice(0, 8), name: "", brief: "", personas: [], options: [], sheets: [], rubric: { on: false, criteria: [] },
        runs: [], calls: [], prepareLog: [], failedRuns: 0, cost: 0, status: "draft", error: null, createdAt: Date.now() };
      try { applyConfig(t, b); } catch (e) { try { fs.rmSync(dirOf(t), { recursive: true, force: true }); } catch {} return send(res, 400, { error: e.message }); }
      db.tests.push(t); save();
      prepare(t);
      return send(res, 200, view(t, true));
    }
    const t = parts[1] === "tests" && find(parts[2]);
    if (req.method === "POST" && t) {
      const action = parts[3];
      const b = JSON.parse((await readBody(req)).toString() || "{}");
      const busy = ["running", "preparing"].includes(t.status);
      if (action === "update") {
        if (busy) return send(res, 409, { error: "Stop the test before editing it." });
        try { applyConfig(t, b); } catch (e) { return send(res, 400, { error: e.message }); }
        save(); prepare(t);
      }
      if (action === "prepare" && !busy) { for (const s of t.sheets) if (b.redetect) s.detected = false; prepare(t); }
      if (action === "start" && !busy && ["ready", "stopped", "done"].includes(t.status)) {
        if (b.target) t.target = Math.max(1, +b.target);
        if (b.concurrency) t.concurrency = Math.min(6, Math.max(1, +b.concurrency));
        if (b.reset) { t.runs = []; t.failedRuns = 0; }
        runJob(t);
      }
      if (action === "stop") stop(t);
      if (action === "delete") {
        stop(t); db.tests = db.tests.filter((x) => x !== t);
        try { fs.rmSync(dirOf(t), { recursive: true, force: true }); } catch {}
        save(); return send(res, 200, {});
      }
      return send(res, 200, view(t, true));
    }
    send(res, 404, { error: "not found" });
  } catch (e) { send(res, 500, { error: e.message }); }
}).listen(PORT, HOST, () => {
  console.log(`Test with AI → http://${HOST}:${PORT}`);
  // Agents run through the Claude Code CLI, so say clearly if it isn't there.
  require("child_process").execFile("claude", ["--version"], (err, out) => {
    if (err) console.warn("Claude Code CLI not found. Install it, log in by running `claude` once, then restart. Tests can't run until then.");
    else console.log(`Using ${out.trim()}`);
  });
});
