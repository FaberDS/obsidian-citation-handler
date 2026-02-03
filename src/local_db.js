export const LS_LAST_PATH = "vault:lastPath";

const IDB_DB = "vault";
const IDB_STORE = "kv";
export const IDB_DIRKEY = "dirHandle";

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadLastDirHandle() {
  return idbGet(IDB_DIRKEY);
}

export async function saveLastDirHandle(handle) {
  return idbSet(IDB_DIRKEY, handle);
}

export function loadLastPath() {
  return localStorage.getItem(LS_LAST_PATH) || "";
}

export function saveLastPath(path) {
  localStorage.setItem(LS_LAST_PATH, path);
}
