import { afterEach, describe, expect, test } from "bun:test";
import { copyToClipboard } from "../clipboard";

const originalNavigator = (globalThis as typeof globalThis & { navigator?: unknown }).navigator;

afterEach(() => {
  if (originalNavigator === undefined)
    delete (globalThis as typeof globalThis & { navigator?: unknown }).navigator;
  else
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
});

describe("clipboard utility", () => {
  test("returns false when the clipboard API is unavailable", async () => {
    delete (globalThis as typeof globalThis & { navigator?: unknown }).navigator;
    expect(await copyToClipboard("blueprint")).toBe(false);
  });

  test("writes text and reports success", async () => {
    const copied: string[] = [];
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { clipboard: { writeText: async (value: string) => copied.push(value) } },
    });

    expect(await copyToClipboard("SAND:blueprint")).toBe(true);
    expect(copied).toEqual(["SAND:blueprint"]);
  });

  test("returns false when writing fails", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        clipboard: {
          writeText: async () => {
            throw new Error("permission denied");
          },
        },
      },
    });

    expect(await copyToClipboard("blueprint")).toBe(false);
  });

  test("returns false when clipboard has no writeText method", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { clipboard: {} },
    });

    expect(await copyToClipboard("blueprint")).toBe(false);
  });
});
