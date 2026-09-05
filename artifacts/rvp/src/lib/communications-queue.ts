export type QueuedCommunicationOperation = {
  id: string;
  method: "POST";
  url: string;
  body?: Record<string, unknown>;
  queuedAt: string;
};

const DB_NAME = "rvp-communications";
const STORE = "outbox";

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queuedOperations(): Promise<QueuedCommunicationOperation[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as QueuedCommunicationOperation[]);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOperation(operation: QueuedCommunicationOperation): Promise<void> {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(operation);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function removeOperation(id: string): Promise<void> {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function flushQueuedOperations(): Promise<{ delivered: number; retained: number }> {
  const items = await queuedOperations();
  let delivered = 0;
  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        credentials: "include",
        headers: item.body ? { "Content-Type": "application/json" } : undefined,
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      if (!response.ok) continue;
      await removeOperation(item.id);
      delivered += 1;
    } catch {
      // Retain network and server failures for a later operator retry.
    }
  }
  return { delivered, retained: items.length - delivered };
}