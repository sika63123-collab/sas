/**
 * Storage abstraction layer.
 * Uses Electron SQLite database when running as desktop app,
 * falls back to localStorage when running in browser.
 */

interface ElectronAPI {
  initialData: Record<string, string>;
  setData: (key: string, value: string) => Promise<boolean>;
  bulkSetData: (data: Record<string, string>) => Promise<boolean>;
  isElectron: boolean;
}

const electronAPI = (window as any).electronAPI as ElectronAPI | undefined;
const isElectron = !!electronAPI?.isElectron;

// In-memory cache for Electron mode (populated from preload's initialData)
const cache: Record<string, string> = isElectron ? { ...electronAPI!.initialData } : {};

if (isElectron) {
  console.log('[Storage] Running in Electron mode — using SQLite database');
} else {
  console.log('[Storage] Running in browser mode — using localStorage');
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
 * In Electron: updates cache immediately, then async writes to SQLite.
 * In Browser: writes to localStorage synchronously.
 */
export function setStorageItem(key: string, value: string): void {
  if (isElectron) {
    cache[key] = value;
    electronAPI!.setData(key, value).catch(err => {
      console.error('[Storage] Failed to write to database:', key, err);
    });
  } else {
    localStorage.setItem(key, value);
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
