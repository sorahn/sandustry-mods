import {
  DebugContext,
  UnknownRecord,
  LOG_PREFIX,
  inspect,
  jsonSafe,
  logCopyable,
  rawEngine,
  rawState,
  toast,
} from "./common";

const runtimeEnums = (sandkit as unknown as UnknownRecord).enums as
  | { ComponentId?: Record<string, number> }
  | undefined;
// ComponentId is available through sandkit.enums. The numeric fallbacks match
// the current bundle in case an older runtime lacks the enum object.
const UI_COMPONENT_HOTBAR = runtimeEnums?.ComponentId?.Hotbar ?? 1;
const UI_COMPONENT_HOTBAR_OVERLAYS = runtimeEnums?.ComponentId?.HotbarOverlays ?? 19;
const HOTBAR_OVERLAY_ID = "hotbar";

export function hotbar(context: DebugContext): UnknownRecord | null {
  const state = rawState(context);
  const candidates = [
    (state.store as UnknownRecord | undefined)?.player,
    state.player,
    state.store,
  ];

  for (const candidate of candidates) {
    const value = (candidate as UnknownRecord | undefined)?.hotbar;
    if (value && typeof value === "object") return value;
  }

  return null;
}

export function hotbarPath(context: DebugContext): string | null {
  const state = rawState(context);
  const candidates: Array<[string, unknown]> = [
    ["state.store.player.hotbar", (state.store as UnknownRecord | undefined)?.player],
    ["state.player.hotbar", state.player],
    ["state.store.hotbar", state.store],
  ];

  for (const [path, candidate] of candidates) {
    if ((candidate as UnknownRecord | undefined)?.hotbar) return path;
  }

  return null;
}

export function dumpHotbar(context: DebugContext): void {
  const value = hotbar(context);
  if (!value) {
    console.warn(`${LOG_PREFIX} engine.state.store.player.hotbar is unavailable`);
    toast(context, "hotbar state was not found");
    return;
  }

  inspect("hotbar snapshot", value);
  console.log("copy the following line for the complete hotbar snapshot:");
  logCopyable("HOTBAR", value);
  console.table(
    ((value.bars as unknown[]) ?? []).map((bar, barIndex) => ({
      bar: barIndex,
      slots: Array.isArray(bar)
        ? bar.map((slot: unknown, slotIndex: number) =>
            slot ? `${slotIndex}: ${(slot as UnknownRecord).id ?? "?"}` : `${slotIndex}: empty`,
          )
        : "not an array",
    })),
  );
  toast(context, "hotbar snapshot dumped to the console");
}

export function copyHotbar(context: DebugContext): void {
  const value = hotbar(context);
  if (!value) {
    toast(context, "hotbar state was not found");
    return;
  }

  const text = JSON.stringify(jsonSafe(value), null, 2);
  const compactText = JSON.stringify(jsonSafe(value));
  console.log(`${LOG_PREFIX} HOTBAR_JSON ${compactText}`);
  console.log(`${LOG_PREFIX} formatted hotbar JSON\n${text}`);
  void navigator.clipboard
    ?.writeText(text)
    .then(() => toast(context, "hotbar JSON copied to the clipboard"))
    .catch(() => toast(context, "hotbar JSON logged; clipboard access failed"));
}

export function refreshHotbar(context: DebugContext): void {
  const rawApi = rawEngine(context).api as UnknownRecord | undefined;
  const candidates = [
    [
      `public api.ui.update Hotbar (${UI_COMPONENT_HOTBAR})`,
      () => context.api.ui.update(UI_COMPONENT_HOTBAR),
    ],
    [
      `public api.ui.update HotbarOverlays (${UI_COMPONENT_HOTBAR_OVERLAYS})`,
      () => context.api.ui.update(UI_COMPONENT_HOTBAR_OVERLAYS),
    ],
    [
      `engine api.ui.update Hotbar (${UI_COMPONENT_HOTBAR})`,
      () => rawApi?.ui?.update?.(UI_COMPONENT_HOTBAR),
    ],
    [
      `engine api.ui.update HotbarOverlays (${UI_COMPONENT_HOTBAR_OVERLAYS})`,
      () => rawApi?.ui?.update?.(UI_COMPONENT_HOTBAR_OVERLAYS),
    ],
    [
      `engine api.ui.overlays.update ${HOTBAR_OVERLAY_ID}`,
      () => rawApi?.ui?.overlays?.update?.(HOTBAR_OVERLAY_ID),
    ],
  ] as const;

  for (const [name, callback] of candidates) {
    try {
      const result = callback();
      console.log(`${LOG_PREFIX} refresh candidate succeeded: ${name}`, result);
    } catch (error) {
      console.log(`${LOG_PREFIX} refresh candidate failed: ${name}`, error);
    }
  }
}

export async function pasteHotbarFromClipboard(context: DebugContext): Promise<void> {
  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch (error) {
    console.warn(`${LOG_PREFIX} could not read the system clipboard`, error);
    toast(context, "clipboard read failed; grant browser clipboard permission");
    return;
  }

  let parsed: UnknownRecord;
  try {
    parsed = JSON.parse(text) as UnknownRecord;
  } catch {
    toast(context, "clipboard does not contain valid hotbar JSON");
    return;
  }

  if (
    !parsed ||
    !Array.isArray(parsed.bars) ||
    !parsed.bars.every((bar: unknown) => Array.isArray(bar))
  ) {
    toast(context, "clipboard JSON is not a complete hotbar snapshot");
    return;
  }

  const value = hotbar(context);
  if (!value || !Array.isArray(value.bars)) {
    toast(context, "hotbar state was not found");
    return;
  }

  logCopyable("HOTBAR_BEFORE_PASTE", value);
  value.bars.splice(0, value.bars.length, ...parsed.bars);
  if (typeof parsed.activeSlotIndex === "number" || parsed.activeSlotIndex === null) {
    value.activeSlotIndex = parsed.activeSlotIndex;
  }
  if (typeof parsed.hotbarIndex === "number") value.hotbarIndex = parsed.hotbarIndex;
  logCopyable("HOTBAR_AFTER_PASTE", value);
  refreshHotbar(context);
  dumpHotbar(context);
  toast(context, "complete hotbar snapshot pasted; compare before/after in the console");
}
