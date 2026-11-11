// Local database (IndexedDB). Everything a person posts lives on their own
// phone until the server is connected (see docs/BACKEND.md).
//
// Stores:
//   kv      - small settings: the signed-in user and their profile
//   proofs  - one record per proof (no photos/audio inside, just ids)
//   media   - the actual photo and voice files (Blobs), keyed by id
//   clubs   - the clubs this person created or joined

const NAME = 'proof-db';
const VERSION = 1;
let dbPromise;

// If IndexedDB is blocked (private window, some embedded views), keep data in
// memory so the app still works for this visit.
const mem = { kv: new Map(), proofs: new Map(), media: new Map(), clubs: new Map() };
let useMem = false;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no indexedDB'));
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('proofs')) db.createObjectStore('proofs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
      if (!db.objectStoreNames.contains('clubs')) db.createObjectStore('clubs', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function memOp(store, op) {
  const m = mem[store];
  const fake = {
    get: (k) => ({ result: m.get(k) }),
    put: (v, k) => { m.set(k ?? v.id, v); return { result: k ?? v.id }; },
    delete: (k) => { m.delete(k); return { result: undefined }; },
    getAll: () => ({ result: [...m.values()] }),
    clear: () => { m.clear(); return { result: undefined }; },
  };
  return op(fake).result;
}

// Runs one operation in its own transaction and resolves when it is saved.
function run(store, mode, op) {
  if (useMem) return Promise.resolve(memOp(store, op));
  return open().catch(() => { useMem = true; return null; }).then((db) => db === null ? memOp(store, op) : new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = op(tx.objectStore(store));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const get = (store, key) => run(store, 'readonly', (s) => s.get(key));
export const put = (store, value, key) =>
  run(store, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key)));
export const del = (store, key) => run(store, 'readwrite', (s) => s.delete(key));
export const all = (store) => run(store, 'readonly', (s) => s.getAll());
export const clear = (store) => run(store, 'readwrite', (s) => s.clear());
