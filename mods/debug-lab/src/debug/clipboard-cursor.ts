import {
  DebugContext,
  UnknownRecord,
  LOG_PREFIX,
  jsonSafe,
  logCopyable,
  rawEngine,
  rawState,
  toast,
} from "./common";

const MODIFIER_KEYS = [
  "Control",
  "ControlLeft",
  "ControlRight",
  "Shift",
  "ShiftLeft",
  "ShiftRight",
  "Alt",
  "AltLeft",
  "AltRight",
  "Meta",
  "MetaLeft",
  "MetaRight",
];

function targetCellReport(context: DebugContext, input: UnknownRecord | undefined): UnknownRecord {
  const mouse = input?.mouse as UnknownRecord | undefined;
  const cell = mouse?.cellPosition as UnknownRecord | undefined;
  const x = cell?.x;
  const y = cell?.y;
  if (typeof x !== "number" || typeof y !== "number") return { available: false };

  const structures = context.api.structures as unknown as UnknownRecord;
  let structure: unknown = null;
  try {
    structure = structures.getAtCell?.(x, y) ?? null;
  } catch (error) {
    structure = { error: error instanceof Error ? error.message : String(error) };
  }

  let element: unknown = null;
  try {
    element = context.api.elements.getInfoAtCell(x, y);
  } catch (error) {
    element = { error: error instanceof Error ? error.message : String(error) };
  }

  return { x, y, structure, element };
}

function activeKeys(keys: unknown): UnknownRecord {
  if (!keys || typeof keys !== "object") return {};
  return Object.fromEntries(
    Object.entries(keys as UnknownRecord)
      .filter(([, value]) => value === 2 || value === 3)
      .map(([key, value]) => [key, value]),
  );
}

export function dumpClipboardCursor(context: DebugContext): void {
  const state = rawState(context);
  const session = state.session as UnknownRecord | undefined;
  const input = session?.input as UnknownRecord | undefined;
  const action = session?.action as UnknownRecord | undefined;
  const customData = action?.customData as UnknownRecord | null | undefined;
  const construction = session?.construction as UnknownRecord | undefined;
  const rawApi = rawEngine(context).api as UnknownRecord | undefined;
  const clipboard = rawApi?.clipboard as UnknownRecord | undefined;

  let clipboardData: unknown = null;
  let signalLinks: unknown = null;
  try {
    clipboardData = clipboard?.get?.();
    signalLinks = clipboard?.getSignalLinks?.();
  } catch (error) {
    clipboardData = { error: error instanceof Error ? error.message : String(error) };
  }

  const keys = input?.keys;
  const report = {
    action: {
      state: action?.state,
      customData: customData
        ? {
            mode: customData.mode,
            marqueeSelected: customData.marqueeSelected,
            selectedCount: Array.isArray(customData.selectedStructures)
              ? customData.selectedStructures.length
              : null,
            mouseOffset: customData.mouseOffset,
            start: customData.start,
            end: customData.end,
          }
        : null,
    },
    clipboard: {
      structureCount: Array.isArray(clipboardData) ? clipboardData.length : null,
      data: clipboardData,
      signalLinks,
    },
    modifiers: Object.fromEntries(
      MODIFIER_KEYS.map((key) => [key, (keys as UnknownRecord | undefined)?.[key] ?? 0]),
    ),
    activeKeys: activeKeys(keys),
    mouse: input?.mouse,
    construction: {
      marqueeActive: construction?.marqueeActive,
      marqueeToggle: construction?.marqueeToggle,
      demolisherActive: construction?.demolisherActive,
      demolisherToggle: construction?.demolisherToggle,
    },
    targetCell: targetCellReport(context, input),
  };

  console.group(`${LOG_PREFIX} clipboard cursor`);
  console.log("copyable report follows:");
  logCopyable("CLIPBOARD_CURSOR", report);
  console.log("report", jsonSafe(report));
  console.groupEnd();
  toast(context, "clipboard cursor state dumped to the console");
}

function cursorEventReport(context: DebugContext): UnknownRecord {
  const state = rawState(context);
  const session = state.session as UnknownRecord | undefined;
  const input = session?.input as UnknownRecord | undefined;
  const action = session?.action as UnknownRecord | undefined;
  const customData = action?.customData as UnknownRecord | null | undefined;
  const construction = session?.construction as UnknownRecord | undefined;
  const keys = input?.keys as UnknownRecord | undefined;
  const rawApi = rawEngine(context).api as UnknownRecord | undefined;
  const clipboard = rawApi?.clipboard as UnknownRecord | undefined;
  let clipboardData: unknown = null;

  try {
    clipboardData = clipboard?.get?.();
  } catch {}

  return {
    actionMode: customData?.mode ?? null,
    marqueeSelected: customData?.marqueeSelected ?? false,
    selectedCount: Array.isArray(customData?.selectedStructures)
      ? customData.selectedStructures.length
      : null,
    activeKeys: activeKeys(keys),
    control: {
      Control: keys?.Control ?? 0,
      ControlLeft: keys?.ControlLeft ?? 0,
      ControlRight: keys?.ControlRight ?? 0,
    },
    shift: {
      Shift: keys?.Shift ?? 0,
      ShiftLeft: keys?.ShiftLeft ?? 0,
      ShiftRight: keys?.ShiftRight ?? 0,
    },
    mouse: input?.mouse,
    construction: {
      marqueeActive: construction?.marqueeActive,
      marqueeToggle: construction?.marqueeToggle,
    },
    clipboardCount: Array.isArray(clipboardData) ? clipboardData.length : null,
    targetCell: targetCellReport(context, input),
  };
}

export function startClipboardCursorWatch(context: DebugContext): void {
  let previous = "";
  window.setInterval(() => {
    const report = cursorEventReport(context);
    const mouse = report.mouse as UnknownRecord | undefined;
    const activeKeysValue = report.activeKeys as UnknownRecord;
    const eventActive =
      mouse?.pressed ||
      mouse?.clicked ||
      mouse?.released ||
      Object.keys(activeKeysValue).some((key) => MODIFIER_KEYS.includes(key));
    if (!eventActive) return;

    const signature = JSON.stringify({
      actionMode: report.actionMode,
      selectedCount: report.selectedCount,
      activeKeys: report.activeKeys,
      mouse: {
        pressed: mouse?.pressed,
        clicked: mouse?.clicked,
        released: mouse?.released,
      },
      construction: report.construction,
    });
    if (signature === previous) return;
    previous = signature;
    logCopyable("CLIPBOARD_CURSOR_EVENT", report);
  }, 25);
}
