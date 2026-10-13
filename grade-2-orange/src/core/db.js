// Tiny promise wrapper over IndexedDB. `idb` may be injected (fake-indexeddb in tests).
const STORES = {
  results: { keyPath: 'id', autoIncrement: true, indexes: [['date', 'ts']] }, // one record per star round
  attempts: { keyPath: 'id', autoIncrement: true, indexes: [['date', 'ts']] }, // one record per practice answer
  lessons: { keyPath: 'id' }, // one record per lesson: watched / passed
  settings: { keyPath: 'id' },
};
export function openDB(idb = globalThis.indexedDB, name = 'anyas-french-greetings') {
  return new Promise((resolve, reject) => {
    const req = idb.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [store, opt] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(store)) {
          const os = db.createObjectStore(store, { keyPath: opt.keyPath, autoIncrement: !!opt.autoIncrement });
          for (const [n, k] of opt.indexes || []) os.createIndex(n, k);
        }
      }
    };
    req.onsuccess = () => resolve(wrap(req.result));
    req.onerror = () => reject(req.error);
  });
}
function wrap(raw) {
  const run = (store, mode, fn) => new Promise((resolve, reject) => {
    const tx = raw.transaction(store, mode);
    const r = fn(tx.objectStore(store));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return {
    raw,
    get: (s, k) => run(s, 'readonly', os => os.get(k)),
    put: (s, v) => run(s, 'readwrite', os => os.put(v)),
    add: (s, v) => run(s, 'readwrite', os => os.add(v)),
    del: (s, k) => run(s, 'readwrite', os => os.delete(k)),
    all: (s) => run(s, 'readonly', os => os.getAll()),
    clear: (s) => run(s, 'readwrite', os => os.clear()),
    stores: Object.keys(STORES),
    async dump() { const out = {}; for (const s of Object.keys(STORES)) out[s] = await this.all(s); return out; },
  };
}

// Fallback when IndexedDB is unavailable (e.g. some private windows): same interface, lives in memory only.
export function memoryDB() {
  const data = Object.fromEntries(Object.keys(STORES).map(s => [s, new Map()])); const seq = {};
  const keyOf = (s, v) => v[STORES[s].keyPath];
  return {
    memory: true,
    get: async (s, k) => data[s].get(k),
    put: async (s, v) => { data[s].set(keyOf(s, v), v); return keyOf(s, v); },
    add: async (s, v) => { if (STORES[s].autoIncrement && v[STORES[s].keyPath] == null) v[STORES[s].keyPath] = (seq[s] = (seq[s] || 0) + 1); data[s].set(keyOf(s, v), v); return keyOf(s, v); },
    del: async (s, k) => { data[s].delete(k); },
    all: async (s) => [...data[s].values()],
    clear: async (s) => data[s].clear(),
    stores: Object.keys(STORES),
    async dump() { const out = {}; for (const s of Object.keys(STORES)) out[s] = await this.all(s); return out; },
  };
}
