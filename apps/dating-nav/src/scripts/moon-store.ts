// 月老红线本地存储（PRD §8–§9）：IndexedDB 优先，localStorage 兜底。
// 只保存人物 id，不复制资料；按无序对去重（同一对人只记一次）。

export interface MatchLine {
  from: string;
  to: string;
  createdAt: number;
}

export interface LocalMoonData {
  version: number;
  lines: MatchLine[];
}

const DB_NAME = 'moon-lines-db';
const STORE = 'lines';
const LS_KEY = 'moon-lines';
const VERSION = 1;

const pairKey = (a: string, b: string) => [a, b].sort().join('|');

function readLS(): LocalMoonData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as LocalMoonData;
  } catch {
    /* ignore */
  }
  return { version: VERSION, lines: [] };
}

function writeLS(d: LocalMoonData): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(d));
  } catch {
    /* ignore quota / disabled */
  }
}

const hasIDB = () => typeof indexedDB !== 'undefined';

function openDB(): Promise<IDBDatabase | null> {
  if (!hasIDB()) return Promise.resolve(null);
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, VERSION);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'pair' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function loadLines(): Promise<LocalMoonData> {
  const db = await openDB();
  if (!db) return readLS();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const all = tx.objectStore(STORE).getAll();
    all.onsuccess = () => {
      const lines = (all.result || []).map((r: any) => ({
        from: r.from,
        to: r.to,
        createdAt: r.createdAt,
      }));
      resolve({ version: VERSION, lines });
    };
    all.onerror = () => resolve(readLS());
  });
}

export async function addLine(from: string, to: string): Promise<{ existed: boolean; data: LocalMoonData }> {
  const pk = pairKey(from, to);
  const now = Date.now();
  const db = await openDB();
  if (!db) {
    const d = readLS();
    const existed = d.lines.some((l) => pairKey(l.from, l.to) === pk);
    if (!existed) d.lines.push({ from, to, createdAt: now });
    writeLS(d);
    return { existed, data: d };
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(pk);
    getReq.onsuccess = () => {
      const existed = !!getReq.result;
      if (!existed) store.put({ pair: pk, from, to, createdAt: now });
      const all = store.getAll();
      all.onsuccess = () => {
        const lines = (all.result || []).map((r: any) => ({
          from: r.from,
          to: r.to,
          createdAt: r.createdAt,
        }));
        resolve({ existed, data: { version: VERSION, lines } });
      };
      all.onerror = () => resolve({ existed, data: readLS() });
    };
    getReq.onerror = () => resolve({ existed: false, data: readLS() });
  });
}
