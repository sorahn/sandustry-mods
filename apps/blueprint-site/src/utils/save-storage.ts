import { readStorageValue, removeStorageValue, writeStorageValue } from "./storage";
import { SAVED_SAVE_EXPLORER_KEY, SAVED_SAVE_EXPLORER_NAME_KEY } from "./storage-keys";

export function encodeSaveBytes(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function decodeSaveBytes(encoded: string) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function readRememberedSave() {
  const encoded = readStorageValue(SAVED_SAVE_EXPLORER_KEY);
  if (!encoded) return null;
  try {
    return {
      bytes: decodeSaveBytes(encoded),
      name: readStorageValue(SAVED_SAVE_EXPLORER_NAME_KEY) || "remembered.save",
    };
  } catch {
    forgetRememberedSave();
    return null;
  }
}

export function rememberSave(bytes: Uint8Array, name: string) {
  writeStorageValue(SAVED_SAVE_EXPLORER_KEY, encodeSaveBytes(bytes));
  writeStorageValue(SAVED_SAVE_EXPLORER_NAME_KEY, name);
}

export function forgetRememberedSave() {
  removeStorageValue(SAVED_SAVE_EXPLORER_KEY);
  removeStorageValue(SAVED_SAVE_EXPLORER_NAME_KEY);
}
