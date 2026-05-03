const DB_NAME = 'ambient-dream';
const DB_VERSION = 1;
const STORE = 'music_blobs';

const openDb = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE);
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const withStore = async (mode, fn) => {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = await fn(store);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
};

const reqToPromise = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export const putMusicBlob = (key, blob) => withStore('readwrite', (store) => reqToPromise(store.put(blob, key)));

export const getMusicBlob = (key) => withStore('readonly', (store) => reqToPromise(store.get(key)));

export const deleteMusicBlob = (key) => withStore('readwrite', (store) => reqToPromise(store.delete(key)));

