/* Filtered Lenses: a native laser upgrade with an element whitelist picker. */

"use strict";

const api = sandkit.api;
const MOD_ID = "sorahn.sandustry-filtered-lenses";
const LASER_ID = "laser";
const UPGRADE_ID = "filteredLenses";
const FILTER_STORAGE_KEY = `${MOD_ID}.element`;
const CONFIGURE_BINDING_ID = `${MOD_ID}:configure`;
const PICKER_ID = `${MOD_ID}-element-picker`;
const NAV_SCOPE = `${PICKER_ID}-scope`;
const UIReact = sandkit.react ?? null;

type Selection = { id: string; type: number };
type Entry = Selection & { name: string; color: string };
type PickerState = {
  current: Selection;
  minimized: boolean;
  resolve: ((value: Selection | null) => void) | null;
};
type ButtonProps = {
  id: string;
  onActivate: () => void;
  neighbors?: Record<string, string | undefined>;
  className?: string;
  children?: any;
  [key: string]: unknown;
};

const TEXT: Record<string, string> = {
  "upgrades|laser|filteredLenses|name": "Filtered Lenses",
  "upgrades|laser|filteredLenses|description":
    "Mine only the selected terrain. Press L while the laser is selected to change the filter.",
  "mods|filteredLenses|configurePrompt": "Enter a terrain ID to mine (for example: stone).",
  "mods|filteredLenses|configured": "Laser filter set to {element}.",
  "mods|filteredLenses|notPurchased": "Purchase Filtered Lenses before configuring the laser.",
  "Filtered Lenses enabled": "Filtered Lenses enabled",
  "Allow the Filtered Lenses upgrade to affect the laser.":
    "Allow the Filtered Lenses upgrade to affect the laser.",
};

let pickerState: PickerState | null = null;
let pickerPromise: Promise<Selection | null> | null = null;
let pickerRepaint: ((update: (value: number) => number) => void) | null = null;
let pickerOverlayReady = false;

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch (error) {
    console.error(`[${MOD_ID}] picker operation failed:`, error);
    return fallback;
  }
};
const isEnabled = () => {
  const value = api.settings.get("enabled");
  return typeof value === "boolean" ? value : true;
};
const TERRAIN_IDS = [
  "auraliteCrystal",
  "bedrock",
  "blackrock",
  "caldera",
  "copper",
  "crackstone",
  "crystal",
  "dirt",
  "dissolvingTerrain",
  "dune",
  "earth",
  "florinolSoil",
  "fluxite",
  "frostbed",
  "gameOfLifeRandom",
  "gameOfLifeStrict",
  "glassTerrain",
  "golGrow",
  "grass",
  "ice",
  "limestone",
  "moss",
  "puffMushroom",
  "redsoil",
  "sand2",
  "sandstone",
  "scoria",
  "shatterstone",
  "solidite",
  "sporemound",
  "spreadingTerrain",
  "stone",
  "vine",
  "voidFlowerSoil",
];
const entries = (): Entry[] =>
  safe(
    () =>
      TERRAIN_IDS.map((id) => {
        const type = safe(() => api.terrains.getTypeFromId(id), null);
        if (type === null) return null;
        const name = safe(() => api.i18n.getName({ nameKey: `terrains|${id}|name` }), id);
        return { id, type, name: name || id, color: "#8f9aa6" };
      })
        .filter((entry): entry is Entry => entry !== null)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
const currentSelection = (): Selection => {
  const saved = api.storage.local.get(FILTER_STORAGE_KEY);
  if (typeof saved === "string" && saved.length > 0) {
    const id = saved.startsWith("terrain:") ? saved.slice(8) : saved;
    const type = safe(() => api.terrains.getTypeFromId(id), null);
    if (type !== null) return { id, type };
  }
  const type = safe(() => api.terrains.getTypeFromId("stone"), null);
  return { id: "stone", type: type ?? 0 };
};
const closePicker = (selection: Selection | null) => {
  if (!pickerState) return;
  const resolve = pickerState.resolve;
  const current = selection || pickerState.current;
  pickerState = { current, minimized: true, resolve: null };
  pickerPromise = null;
  resolve?.(selection);
  pickerRepaint?.((value) => value + 1);
};
const minimizePicker = () => {
  if (pickerState && !pickerState.minimized) {
    const resolve = pickerState.resolve;
    pickerState = { ...pickerState, minimized: true, resolve: null };
    pickerPromise = null;
    resolve?.(null);
    pickerRepaint?.((value) => value + 1);
  }
};

const FocusableButton = ({
  id,
  onActivate,
  neighbors,
  className = "",
  children,
  ...props
}: ButtonProps) => {
  if (!UIReact) return null;
  const focusable = api.ui.navigation.useFocusable({
    id,
    scope: NAV_SCOPE,
    onActivate,
    neighbors,
    scrollIntoView: true,
  });
  return (
    <button
      {...props}
      ref={focusable.ref}
      type="button"
      onClick={onActivate}
      className={`${className} ${api.ui.navigation.controllerFocusClass(focusable.focused)}`.trim()}
    >
      {children}
    </button>
  );
};

const ElementGridButton = ({
  entry,
  index,
  filtered,
  selected,
  onSelect,
}: {
  entry: Entry;
  index: number;
  filtered: Entry[];
  selected: boolean;
  onSelect: () => void;
}) => {
  if (!UIReact) return null;
  const key = (value: Entry) => `${PICKER_ID}-element-${value.id || `type-${value.type}`}`;
  const column = index % 4;
  const focusable = api.ui.navigation.useFocusable({
    id: key(entry),
    scope: NAV_SCOPE,
    onActivate: onSelect,
    scrollIntoView: true,
    neighbors: {
      left: column > 0 ? key(filtered[index - 1]) : undefined,
      right: column < 3 && filtered[index + 1] ? key(filtered[index + 1]) : undefined,
      up: index >= 4 ? key(filtered[index - 4]) : `${PICKER_ID}-search`,
      down: filtered[index + 4] ? key(filtered[index + 4]) : undefined,
    },
  });
  const className = selected
    ? "group flex items-center gap-2 px-2 py-1.5 text-left w-full rounded border border-[#ffe700] bg-[#ffe700]/10"
    : "group flex items-center gap-2 px-2 py-1.5 text-left w-full rounded border border-slate-700 bg-black/40";
  return (
    <button
      ref={focusable.ref}
      type="button"
      onClick={onSelect}
      className={`${className} ${api.ui.navigation.controllerFocusClass(focusable.focused)}`.trim()}
    >
      <span className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: entry.color }} />
      <span
        className={selected ? "text-xs truncate text-[#ffe700]" : "text-xs truncate text-slate-300"}
      >
        {entry.name}
      </span>
    </button>
  );
};

const ElementPicker = () => {
  if (!UIReact) return null;
  const [query, setQuery] = UIReact.useState("");
  const [, bump] = UIReact.useState(0);
  const picker = pickerState;
  api.ui.navigation.useFocusScope({
    id: NAV_SCOPE,
    active: !!picker,
    priority: 100,
    defaultId: picker?.minimized ? `${PICKER_ID}-selected` : `${PICKER_ID}-search`,
    onBack: () => {
      if (pickerState && !pickerState.minimized) {
        minimizePicker();
        return true;
      }
      closePicker(null);
      return true;
    },
  });
  UIReact.useEffect(() => {
    pickerRepaint = bump;
    return () => {
      if (pickerRepaint === bump) pickerRepaint = null;
    };
  }, []);
  const search = api.ui.navigation.useFocusable({
    id: `${PICKER_ID}-search`,
    scope: NAV_SCOPE,
    onActivate: (element: HTMLElement | null) => element?.focus(),
    neighbors: { up: `${PICKER_ID}-minimize`, down: `${PICKER_ID}-element-0` },
    scrollIntoView: true,
  });
  if (!picker) return null;
  if (picker.minimized) {
    const selected = entries().find((entry) => entry.type === picker.current.type);
    return (
      <div
        className="pointer-events-auto flex items-center gap-2 bg-black bg-opacity-75 border border-slate-700 rounded px-3 py-2 ui-box text-slate-300"
        style={{
          position: "fixed",
          left: "50%",
          bottom: 80,
          transform: "translateX(-50%)",
          zIndex: 10000,
        }}
        onClick={() => void openElementPicker(picker.current)}
      >
        <span className="text-white text-xs opacity-70">Laser filter</span>
        <FocusableButton
          id={`${PICKER_ID}-selected`}
          onActivate={() => void openElementPicker(picker.current)}
          className="flex items-center gap-2 text-xs text-white"
        >
          <span className="w-3 h-3" style={{ backgroundColor: selected?.color || "#9aa7b5" }} />
          {selected?.name || "No element"}
        </FocusableButton>
        <span className="text-xs text-slate-500">Click to expand</span>
      </div>
    );
  }
  const allEntries = entries();
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = allEntries.filter(
    (entry) =>
      !normalizedQuery ||
      entry.name.toLowerCase().includes(normalizedQuery) ||
      entry.id.toLowerCase().includes(normalizedQuery),
  );
  return (
    <div
      className="pointer-events-auto flex flex-col overflow-hidden bg-black bg-opacity-75 border border-slate-700 rounded ui-box text-slate-300"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 80,
        transform: "translateX(-50%)",
        zIndex: 10000,
        width: "640px",
        maxWidth: "92vw",
        maxHeight: "600px",
      }}
    >
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-white text-xs opacity-70">Laser filter</span>
        <FocusableButton
          id={`${PICKER_ID}-minimize`}
          onActivate={minimizePicker}
          neighbors={{ down: `${PICKER_ID}-search` }}
          className="text-xs px-2 py-0.5 text-white bg-black border rounded"
        >
          Minimize ▾
        </FocusableButton>
      </div>
      <div className="px-4 py-3 border-b border-slate-800 flex flex-col gap-2">
        <input
          ref={search.ref}
          autoFocus
          value={query}
          placeholder="Search elements..."
          maxLength={64}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") minimizePicker();
          }}
          className="w-full bg-black/60 border border-slate-700 px-3 py-1.5 rounded text-xs text-white"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2" style={{ maxHeight: 480 }}>
        <div className="grid grid-cols-4 gap-1.5 py-1.5">
          {filtered.map((entry, index) => (
            <ElementGridButton
              key={entry.id}
              entry={entry}
              index={index}
              filtered={filtered}
              selected={entry.type === picker.current.type}
              onSelect={() => closePicker(entry)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const registerPicker = () => {
  if (pickerOverlayReady) return true;
  if (!UIReact) return false;
  try {
    const dispose = api.ui.inject(PICKER_ID, ElementPicker);
    pickerOverlayReady = typeof dispose === "function";
    return pickerOverlayReady;
  } catch (error) {
    console.error(`[${MOD_ID}] element picker unavailable:`, error);
    return false;
  }
};
const openElementPicker = async (current: Selection) => {
  if (registerPicker()) {
    if (pickerPromise) return pickerPromise;
    pickerPromise = new Promise((resolve) => {
      pickerState = { current, minimized: false, resolve };
      pickerRepaint?.((value) => value + 1);
    });
    return pickerPromise;
  }
  const entered = await api.ui.prompt(TEXT["mods|filteredLenses|configurePrompt"]);
  if (!entered?.trim()) return null;
  const id = entered.trim();
  const type = safe(() => api.terrains.getTypeFromId(id), null);
  return type === null ? null : { id, type };
};
const syncPickerToSelectedAction = () => {
  if (!UIReact || !registerPicker()) return;
  const selected = safe(() => api.action?.getSelected(), null);
  if (selected?.id === LASER_ID && !pickerState) {
    pickerState = { current: currentSelection(), minimized: true, resolve: null };
    pickerRepaint?.((value) => value + 1);
    return;
  }
  if (selected?.id !== LASER_ID && pickerState) {
    const resolve = pickerState.resolve;
    pickerState = null;
    pickerPromise = null;
    resolve?.(null);
    pickerRepaint?.((value) => value + 1);
  }
};
const configure = async () => {
  if (!isEnabled()) return;
  if (api.upgrades.getLevelById(LASER_ID, UPGRADE_ID) < 1) {
    api.ui.toast(TEXT["mods|filteredLenses|notPurchased"]);
    return;
  }
  const selection = await openElementPicker(currentSelection());
  if (!selection) return;
  api.storage.local.set(FILTER_STORAGE_KEY, `terrain:${selection.id}`);
  api.ui.toast(TEXT["mods|filteredLenses|configured"].replace("{element}", selection.id));
};

api.i18n.register("en", TEXT);
api.upgrades.register({
  itemId: LASER_ID,
  itemNameKey: "items|laser|name",
  categoryId: "tools",
  upgrade: {
    id: UPGRADE_ID,
    nameKey: "upgrades|laser|filteredLenses|name",
    descriptionKey: "upgrades|laser|filteredLenses|description",
    maxLevel: 1,
    costs: [5000],
    oneOff: true,
  },
});

const laserTargetCell = (state: any) => {
  const player = state?.store?.player;
  const mouse = state?.session?.input?.mouse?.worldPosition;
  if (!player || !mouse) return null;
  const startX = player.x + player.width / 2;
  const startY = player.y + player.height / 2 + 2;
  const angle = Math.atan2(mouse.y - startY, mouse.x - startX);
  return api.raycast.castFromWorld(startX, startY, angle, 1000);
};

let filteredBeam: any = null;
let filteredChargeStart = 0;
let filteredShotFired = false;

const clearFilteredBeam = () => {
  filteredBeam?.destroy?.();
  filteredBeam = null;
  filteredChargeStart = 0;
  filteredShotFired = false;
};

const isFilteredTarget = (state: any) => {
  if (!isEnabled() || api.upgrades.getLevelById(LASER_ID, UPGRADE_ID) < 1) return false;
  const selected = currentSelection();
  const target = laserTargetCell(state);
  return target === null || !api.terrains.isTypeAtCell(target.x, target.y, selected.id);
};

const renderFilteredBeam = (state: any, target: { x: number; y: number } | null) => {
  const player = state?.store?.player;
  const mouse = state?.session?.input?.mouse?.worldPosition;
  const actionState = state?.session?.action?.state;
  if (!player || !mouse || !actionState?.[2]) {
    clearFilteredBeam();
    return;
  }

  const now = Number(state?.store?.meta?.time) || Date.now();
  if (!filteredChargeStart || actionState[1]) filteredChargeStart = now;
  const charge = Math.min((now - filteredChargeStart) / 1000, 1);
  const startX = player.x + player.width / 2;
  const startY = player.y + player.height / 2 + 2;
  const metrics = api.rendering.getGridMetrics();
  const angle = Math.atan2(mouse.y - startY, mouse.x - startX);
  const endX = target
    ? target.x * metrics.cellSize + metrics.cellSize / 2
    : startX + Math.cos(angle) * 1000;
  const endY = target
    ? target.y * metrics.cellSize + metrics.cellSize / 2
    : startY + Math.sin(angle) * 1000;

  filteredBeam?.destroy?.();
  filteredBeam = api.effects.createLaserAtWorld(startX, startY, endX, endY, {
    width: charge < 1 ? 1 + 2 * charge : 3,
    brightness: charge < 1 ? 0.1 + 0.4 * charge : 1,
    color: 0xff0000,
    glow: true,
  });

  if (charge >= 1 && !filteredShotFired) {
    api.energy.consume(60, { allOrNothing: true });
    filteredShotFired = true;
  }
};

let laserFilterInstalled = false;
const installLaserFilter = () => {
  if (laserFilterInstalled) return;
  const definition = api.items.getDefinitionById(LASER_ID);
  const originalHandleAction = definition?.handleAction;
  const originalAfterRender = definition?.afterRender;
  if (typeof originalHandleAction !== "function") {
    console.warn(`[${MOD_ID}] native laser action was not available to wrap`);
    return;
  }

  api.items.updateDefinition(LASER_ID, {
    handleAction: (state: any, action: any) => {
      if (isEnabled() && api.upgrades.getLevelById(LASER_ID, UPGRADE_ID) >= 1) {
        const target = laserTargetCell(state);
        if (isFilteredTarget(state)) {
          renderFilteredBeam(state, target);
          return;
        }
      }
      clearFilteredBeam();
      return originalHandleAction(state, action);
    },
    ...(typeof originalAfterRender === "function"
      ? {
          afterRender: (state: any) => {
            if (isFilteredTarget(state) && state?.store?.player?.action) {
              const previousAction = state.store.player.action;
              state.store.player.action = null;
              try {
                originalAfterRender(state);
              } finally {
                state.store.player.action = previousAction;
              }
              return;
            }
            originalAfterRender(state);
          },
        }
      : {}),
  });
  laserFilterInstalled = true;
};

installLaserFilter();
api.events.on("game:ready", installLaserFilter);
setTimeout(installLaserFilter, 1000);
api.triggers.register(`${MOD_ID}:picker`, {
  interval: 100,
  callback: syncPickerToSelectedAction,
});
syncPickerToSelectedAction();
api.input.registerBinding(CONFIGURE_BINDING_ID, ["KeyL"], {
  displayName: "Configure Filtered Lenses",
  category: "Filtered Lenses",
  handlers: {
    down: () => {
      if (api.action?.getSelected?.()?.id === LASER_ID) void configure();
    },
  },
});
