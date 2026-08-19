export function readStorageValue(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageValue(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage can be unavailable in private browsing contexts.
  }
}

export function removeStorageValue(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Local storage can be unavailable in private browsing contexts.
  }
}

export function readStoredBoolean(key: string, fallback: boolean) {
  const stored = readStorageValue(key);
  return stored === null ? fallback : stored !== "false";
}

export function writeStoredBoolean(key: string, value: boolean) {
  writeStorageValue(key, String(value));
}
