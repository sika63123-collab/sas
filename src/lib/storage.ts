/**
 * Storage abstraction layer.
 * Uses Electron SQLite database when running as desktop app,
 * falls back to localStorage when running in browser.
 * 
 * In Electron mode, writes are debounced and batched to prevent
 * IPC flooding that can freeze the renderer process.
 */

interface ElectronAPI {
  initialData: Record<string, string>;
  setData: (key: string, value: string) => Promise<boolean>;
  bulkSetData: (data: Record<string, string>) => Promise<boolean>;
  upsertRecord: (collection: string, id: string, data: string) => Promise<boolean>;
  deleteRecord: (collection: string, id: string) => Promise<boolean>;
  clearCollection: (collection: string) => Promise<boolean>;
  isElectron: boolean;
}

const electronAPI = (window as any).electronAPI as ElectronAPI | undefined;
export const isElectron = !!electronAPI?.isElectron;

// In-memory cache for Electron mode (populated from preload's initialData)
const cache: Record<string, string> = isElectron ? { ...electronAPI!.initialData } : {};

if (isElectron) {
  console.log('[Storage] Running in Electron mode — using SQLite database');
} else {
  console.log('[Storage] Running in browser mode — using localStorage');
}

// ===== Debounced batch writer for Electron (for app_data) =====
// Collects all pending writes and flushes them in a single IPC call
// after a short delay, preventing IPC flooding that freezes the UI.
const pendingWrites: Record<string, string> = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isWriting = false;

const FLUSH_DELAY_MS = 150; // Wait 150ms for more writes to accumulate

function scheduleFlush() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(flushPendingWrites, FLUSH_DELAY_MS);
}

async function flushPendingWrites() {
  flushTimer = null;

  // Grab all pending writes and clear the queue
  const toWrite = { ...pendingWrites };
  const keys = Object.keys(toWrite);
  if (keys.length === 0) return;

  // Clear pending before async write (new writes during flush go to next batch)
  for (const key of keys) {
    delete pendingWrites[key];
  }

  if (isWriting) {
    // If a previous write is still in progress, re-queue these writes
    for (const [key, value] of Object.entries(toWrite)) {
      pendingWrites[key] = value;
    }
    scheduleFlush();
    return;
  }

  isWriting = true;
  try {
    if (keys.length === 1) {
      // Single key — use setData for simplicity
      await electronAPI!.setData(keys[0], toWrite[keys[0]]);
    } else {
      // Multiple keys — batch them in a single transaction
      await electronAPI!.bulkSetData(toWrite);
    }
  } catch (err) {
    console.error('[Storage] Failed to write to database:', err);
  } finally {
    isWriting = false;

    // If new writes accumulated during the flush, schedule another flush
    if (Object.keys(pendingWrites).length > 0) {
      scheduleFlush();
    }
  }
}

/**
 * Read a value from storage (synchronous).
 * In Electron: reads from in-memory cache (loaded from SQLite at startup).
 * In Browser: reads from localStorage.
 */
export function getStorageItem(key: string): string | null {
  if (isElectron) {
    return cache[key] || null;
  }
  return localStorage.getItem(key);
}

/**
 * Write a value to storage.
 * In Electron: updates cache immediately, then debounced async write to SQLite.
 * In Browser: writes to localStorage synchronously.
 */
export function setStorageItem(key: string, value: string): void {
  if (isElectron) {
    cache[key] = value;
    pendingWrites[key] = value;
    scheduleFlush();
  } else {
    localStorage.setItem(key, value);
  }
}

// ===== Document-Store API =====

/**
 * Upsert a single record in a collection.
 * In Electron: Async write to app_records.
 * In Browser: Handled by the bulk fallback in store.tsx, so this does nothing.
 */
export function upsertRecord(collection: string, id: string, data: string): void {
  if (isElectron) {
    electronAPI!.upsertRecord(collection, id, data).catch(err => {
      console.error('[Storage] Error upserting record:', collection, id, err);
    });
  }
}

/**
 * Delete a single record in a collection.
 * In Electron: Async delete from app_records.
 * In Browser: Handled by the bulk fallback in store.tsx.
 */
export function deleteRecord(collection: string, id: string): void {
  if (isElectron) {
    electronAPI!.deleteRecord(collection, id).catch(err => {
      console.error('[Storage] Error deleting record:', collection, id, err);
    });
  }
}

/**
 * Clear an entire collection.
 * In Electron: Async delete from app_records.
 * In Browser: Handled by removing the localstorage key.
 */
export function clearCollection(collection: string): void {
  if (isElectron) {
    electronAPI!.clearCollection(collection).catch(err => {
      console.error('[Storage] Error clearing collection:', collection, err);
    });
  } else {
    localStorage.removeItem(collection);
  }
}

/**
 * Bulk write for backup restore.
 * In Electron: updates cache and writes all data to SQLite in a single transaction.
 * In Browser: writes to localStorage.
 * Returns a promise that resolves when all writes are complete.
 */
export async function restoreAllStorage(data: Record<string, string>): Promise<void> {
  if (isElectron) {
    for (const [key, value] of Object.entries(data)) {
      cache[key] = value;
    }
    await electronAPI!.bulkSetData(data);
  } else {
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, value);
    }
  }
}

/**
 * Session storage (stays in sessionStorage regardless of environment).
 */
export function getSessionItem(key: string): string | null {
  return sessionStorage.getItem(key);
}

export function setSessionItem(key: string, value: string): void {
  sessionStorage.setItem(key, value);
}

export function removeSessionItem(key: string): void {
  sessionStorage.removeItem(key);
}
