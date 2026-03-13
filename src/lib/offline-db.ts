const DB_NAME = 'timetrack-offline';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pending_actions')) {
        db.createObjectStore('pending_actions', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface PendingAction {
  id?: number;
  table: string;
  type: 'insert' | 'update';
  data: Record<string, any>;
  timestamp: number;
}

export async function savePendingAction(action: Omit<PendingAction, 'id' | 'timestamp'>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('pending_actions', 'readwrite');
  tx.objectStore('pending_actions').add({ ...action, timestamp: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await openDB();
  const tx = db.transaction('pending_actions', 'readonly');
  const store = tx.objectStore('pending_actions');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingAction(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('pending_actions', 'readwrite');
  tx.objectStore('pending_actions').delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
