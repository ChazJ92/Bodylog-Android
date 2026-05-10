let revision = 0;
const listeners = new Set<() => void>();

export function subscribeStorageRevision(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getStorageRevision(): number {
  return revision;
}

/** Call after native SQLite writes complete (not used on Dexie web). */
export function notifyStorageMutation(): void {
  revision += 1;
  listeners.forEach((l) => l());
}
