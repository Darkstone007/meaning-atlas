import type { Account } from "./types.ts";

const DB_NAME = "meaning-atlas-v1";
const STORE = "accounts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local storage is unavailable."));
  });
}

export async function loadStored(): Promise<Account[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const query = db.transaction(STORE).objectStore(STORE).getAll();
    query.onsuccess = () => resolve(query.result as Account[]);
    query.onerror = () => reject(query.error ?? new Error("Could not read the local archive."));
  });
}

export async function persistAccounts(items: Account[]): Promise<void> {
  if (!items.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    items.forEach((item) => store.put(item));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Storage transaction aborted."));
  });
}

export async function deleteStored(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove the account."));
  });
}
