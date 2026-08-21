import { afterEach, describe, expect, test } from "bun:test";
import {
  readStorageValue,
  readStoredBoolean,
  removeStorageValue,
  writeStorageValue,
  writeStoredBoolean,
} from "../storage";

type StorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;

function installStorage(values: Record<string, string> = {}) {
  const stored = new Map(Object.entries(values));
  const localStorage: StorageMock = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: (key) => stored.delete(key),
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });
  return stored;
}

afterEach(() => {
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

describe("site storage utilities", () => {
  test("reads, writes, and removes values", () => {
    installStorage();

    expect(readStorageValue("mode")).toBeNull();
    writeStorageValue("mode", "dark");
    expect(readStorageValue("mode")).toBe("dark");
    removeStorageValue("mode");
    expect(readStorageValue("mode")).toBeNull();
  });

  test("round-trips boolean values and applies fallbacks", () => {
    installStorage();

    expect(readStoredBoolean("grid", true)).toBe(true);
    expect(readStoredBoolean("grid", false)).toBe(false);
    writeStoredBoolean("grid", false);
    expect(readStoredBoolean("grid", true)).toBe(false);
    writeStoredBoolean("grid", true);
    expect(readStoredBoolean("grid", false)).toBe(true);
  });

  test("treats any stored value except false as enabled", () => {
    installStorage({ enabled: "yes", disabled: "false" });

    expect(readStoredBoolean("enabled", false)).toBe(true);
    expect(readStoredBoolean("disabled", true)).toBe(false);
  });

  test("returns safe defaults when storage is unavailable", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(readStorageValue("mode")).toBeNull();
    expect(readStoredBoolean("grid", true)).toBe(true);
    writeStorageValue("mode", "dark");
    removeStorageValue("mode");
  });

  test("swallows localStorage failures", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: () => {
            throw new Error("blocked");
          },
          setItem: () => {
            throw new Error("blocked");
          },
          removeItem: () => {
            throw new Error("blocked");
          },
        },
      },
    });

    expect(readStorageValue("mode")).toBeNull();
    expect(readStoredBoolean("grid", false)).toBe(false);
    writeStorageValue("mode", "dark");
    removeStorageValue("mode");
  });
});
