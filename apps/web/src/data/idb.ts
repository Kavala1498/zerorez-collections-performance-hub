import type { Account, Snapshot, Upload } from '@zerorez/shared';

const DB_NAME = 'zerorez-collections-hub';
const DB_VERSION = 1;
const STORE = 'portfolio';
const KEY = 'state';

export type StoredPortfolio = {
  accounts: Account[];
  uploads: Upload[];
  snapshots: Snapshot[];
};

const EMPTY: StoredPortfolio = {
  accounts: [],
  uploads: [],
  snapshots: [],
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

export async function loadPortfolio(): Promise<StoredPortfolio> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const value = req.result as StoredPortfolio | undefined;
        resolve(value ?? EMPTY);
      };
      req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
      tx.oncomplete = () => db.close();
    });
  } catch {
    // Fallback to localStorage if IndexedDB is unavailable.
    try {
      const raw = localStorage.getItem('zr_ar_portfolio');
      if (!raw) return EMPTY;
      return JSON.parse(raw) as StoredPortfolio;
    } catch {
      return EMPTY;
    }
  }
}

export async function savePortfolio(state: StoredPortfolio): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(state, KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
    });
  } catch {
    localStorage.setItem('zr_ar_portfolio', JSON.stringify(state));
  }
}

export async function clearPortfolio(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'));
    });
  } catch {
    localStorage.removeItem('zr_ar_portfolio');
  }
  try {
    localStorage.removeItem('zr_ar_portfolio');
  } catch {
    // ignore
  }
}
