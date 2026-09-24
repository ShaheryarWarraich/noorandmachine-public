// Full-page screenshots with headless Chrome over the DevTools protocol (no dependencies).
// The page is saved as overlapping vertical slices so the model sees it at full resolution.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const VIEW_W = 1440, SLICE_H = 1100, OVERLAP = 100, MAX_H = 24000;
// Set CHROME_PATH to use a specific browser; otherwise the usual install locations are tried.
const CHROME = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => p && fs.existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Returns { title, slices: [{ file, part, y, h }] }. Files are written to dir as `${prefix}-partNN.png`.
async function capture(url, dir, prefix, log = () => {}) {
  if (!CHROME) throw new Error("Google Chrome, Microsoft Edge or Chromium is needed to screenshot web pages. Install one, or set CHROME_PATH to its executable.");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "test-with-ai-"));
  const proc = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--hide-scrollbars", "--no-first-run",
    "--no-default-browser-check", `--window-size=${VIEW_W},900`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  let ws;
  try {
    const wsUrl = await new Promise((ok, bad) => {
      let e = ""; proc.stderr.on("data", (d) => { e += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(e); if (m) ok(m[1]); });
      setTimeout(() => bad(new Error("Chrome did not start")), 20000);
    });
    const port = new URL(wsUrl).port;
    const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page");
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
    let seq = 0; const pending = new Map(), listeners = [];
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.bad(new Error(d.error.message)) : p.ok(d.result); }
      else listeners.forEach((f) => f(d));
    };
    const cdp = (method, params = {}) => new Promise((ok, bad) => { const id = ++seq; pending.set(id, { ok, bad }); ws.send(JSON.stringify({ id, method, params })); });
    const js = async (expression) => (await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

    await cdp("Page.enable");
    await cdp("Emulation.setDeviceMetricsOverride", { width: VIEW_W, height: 900, deviceScaleFactor: 1, mobile: false });
    const loaded = new Promise((r) => listeners.push((d) => d.method === "Page.loadEventFired" && r()));
    log(`Opening ${url} in headless Chrome at ${VIEW_W}px wide`);
    const nav = await cdp("Page.navigate", { url });
    if (nav.errorText) throw new Error(`Could not load ${url}: ${nav.errorText}`);
    await Promise.race([loaded, sleep(30000)]);
    await sleep(1500);
    log("Page loaded; scrolling through it so lazy-loaded images appear");
    await js(`(async () => { for (let y = 0; y < Math.min(document.documentElement.scrollHeight, ${MAX_H}); y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); } window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 1000)); })()`);
    const title = await js("document.title");
    const fullH = await js("Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)");
    const height = Math.min(fullH, MAX_H);
    log(`Page is ${fullH}px tall${fullH > MAX_H ? ` (capturing the first ${MAX_H}px)` : ""}`);
    const slices = [];
    for (let y = 0, i = 1; y < height; y += SLICE_H - OVERLAP, i++) {
      const h = Math.min(SLICE_H, height - y);
      if (h < 150 && i > 1) break;
      const { data } = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y, width: VIEW_W, height: h, scale: 1 } });
      const file = `${prefix}-part${String(i).padStart(2, "0")}.png`;
      fs.writeFileSync(path.join(dir, file), Buffer.from(data, "base64"));
      slices.push({ file, part: i, y, h });
      log(`Saved ${file} (pixels ${y}–${y + h})`);
    }
    return { title, slices };
  } finally {
    try { ws?.close(); } catch {}
    proc.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { capture, OVERLAP, VIEW_W };
