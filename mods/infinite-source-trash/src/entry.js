/*
 * Infinite Source and Trash
 *
 * Sandustry v1 entry scripts are plain scripts compiled with `sandkit` already
 * in scope. Do not add import/export statements.
 */

"use strict";

const api = sandkit.api;
const MOD_ID = "sandustry-test-blocks.source-trash";

const SOURCE_ID = "sandustryTestBlocksSource";
const TRASH_ID = "sandustryTestBlocksTrash";
const SOURCE_SPRITE = "sandustryTestBlocksSourceSprite";
const TRASH_SPRITE = "sandustryTestBlocksTrashSprite";
const TICK_MS = 500;
const DEFAULT_ELEMENT_ID = "sand";
const LAST_ELEMENT_KEY = `${MOD_ID}.lastElement`;
// Add unfinished or unwanted element IDs here. The picker, manual fallback,
// and runtime source check all use this same list.
const BLACKLISTED_ELEMENT_IDS = new Set([
  "caulk",
  "cloud",
  "coolant",
  "growingVoidSeed",
  "hyperpressure",
  "oil",
  "pressurizedWater",
  "pyronol",
  "reactorCore",
  "retroConsoleCasing",
  "retroConsolePixelOff",
  "retroConsolePixelOn",
  "slowFlow",
  "sunsand",
  "waterPressure",
]);
// Core elements without a string ID are filtered by numeric type instead.
// Type 2 is the element reported as [NO KEY]/[NO NAME].
const BLACKLISTED_ELEMENT_TYPES = new Set([2]);
const SIZE = 4;
const FOOTPRINT = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

const TEXT = {
  "structures|source|name": "Infinite Source",
  "structures|source|description": "Creates an endless stream of the configured element.",
  "structures|trash|name": " Trash",
  "structures|trash|description": "An infinitely deep void for particle trash.",
};

const configuredSources = new Set();
const sourceSelections = new Map();
const configuringSources = new Set();
const disabledSources = new Set();
const PICKER_ID = `${MOD_ID}-element-picker`;
let pickerState = null;
let pickerOverlayReady = false;
let pickerRepaint = null;
let pickerPromise = null;
let lastElementSelection = null;
const UIReact = sandkit.react ?? null;

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch (error) {
    return fallback;
  }
};

const sourceKey = (structure) => `${structure.x},${structure.y}`;

const selectionData = (selection) => ({
  elementId: selection.id || null,
  elementType: selection.type,
});

const validElementSelection = (selection) => {
  if (!selection || !Number.isInteger(selection.type)) return null;
  const definition = safe(() => api.elements.getDefinitionByType(selection.type), null);
  if (!definition || !isElementTypeAllowed(selection.type)) return null;
  if (!isElementAllowed(selection.id, definition)) return null;
  return {
    id: definition.id || selection.id || null,
    type: selection.type,
  };
};

const getLastElement = () => {
  const saved = safe(() => api.storage.local.get(LAST_ELEMENT_KEY));
  let candidate = saved;
  if (typeof saved === "string") {
    if (saved.startsWith("type:")) {
      candidate = { type: Number(saved.slice(5)), id: null };
    } else if (saved.startsWith("id:")) {
      const id = saved.slice(3);
      candidate = {
        id,
        type: safe(() => api.elements.getTypeFromId(id), null),
      };
    }
  } else if (Number.isInteger(saved)) {
    candidate = { type: saved, id: null };
  }

  return validElementSelection(candidate) || validElementSelection(lastElementSelection);
};

const rememberElement = (selection) => {
  const valid = validElementSelection(selection);
  if (valid) {
    lastElementSelection = valid;
    const value = valid.id ? `id:${valid.id}` : `type:${valid.type}`;
    safe(() => api.storage.local.set(LAST_ELEMENT_KEY, value));
  }
  return valid;
};

const defaultElementSelection = () => {
  const remembered = getLastElement();
  if (remembered) return remembered;

  const type = safe(() => api.elements.getTypeFromId(DEFAULT_ELEMENT_ID), null);
  return (
    validElementSelection({ id: DEFAULT_ELEMENT_ID, type }) || {
      id: DEFAULT_ELEMENT_ID,
      type: null,
    }
  );
};

const sourceElementSelection = (structure) => {
  if (Number.isInteger(structure.data?.elementType)) {
    const storedId = structure.data?.elementId;
    const idMatchesType =
      storedId &&
      safe(() => api.elements.getTypeFromId(storedId), null) === structure.data.elementType;
    return validElementSelection({
      id: idMatchesType ? storedId : null,
      type: structure.data.elementType,
    });
  }

  if (structure.data?.elementId) {
    const id = structure.data.elementId;
    return validElementSelection({
      id,
      type: safe(() => api.elements.getTypeFromId(id), null),
    });
  }

  return defaultElementSelection();
};

const isElementAllowed = (elementId, definition = null) => {
  if (elementId && BLACKLISTED_ELEMENT_IDS.has(elementId)) return false;
  const resolved =
    definition ||
    safe(() => api.elements.getDefinitionByType(api.elements.getTypeFromId(elementId)), null);
  return !!resolved && resolved.hidden !== true;
};

const isElementTypeAllowed = (elementType) => !BLACKLISTED_ELEMENT_TYPES.has(elementType);

const elementIdFromSource = (structure) => {
  const requested = structure.data?.elementId || DEFAULT_ELEMENT_ID;
  return isElementAllowed(requested) ? requested : null;
};

const elementTypeFromSource = (structure) => {
  const storedType = structure.data?.elementType;
  if (Number.isInteger(storedType)) {
    const definition = safe(() => api.elements.getDefinitionByType(storedType), null);
    return definition && definition.hidden !== true && isElementTypeAllowed(storedType)
      ? storedType
      : null;
  }

  const elementId = elementIdFromSource(structure);
  const elementType =
    elementId === null ? null : safe(() => api.elements.getTypeFromId(elementId), null);
  return elementType !== null && isElementTypeAllowed(elementType) ? elementType : null;
};

const elementEntries = () =>
  safe(
    () =>
      api.elements
        .getRegisteredTypes()
        .map((type) => {
          if (!isElementTypeAllowed(type)) return null;
          const definition = api.elements.getDefinitionByType(type);
          const id = definition?.id || null;
          if (!definition || !isElementAllowed(id, definition)) return null;
          const name = safe(() => api.i18n.getName(definition), id || `[type ${type}]`);
          const color =
            typeof definition.metaColor === "number"
              ? `#${definition.metaColor.toString(16).padStart(6, "0")}`
              : "#9aa7b5";
          return { id, type, name, color, matterType: definition.matterType };
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

const matterName = (matterType) =>
  ({
    1: "Solid",
    2: "Liquid",
    3: "Particle",
    4: "Gas",
    5: "Static",
    6: "Slushy",
    7: "Wisp",
    8: "Powder",
  })[matterType] || "Other";

const closePicker = (value) => {
  const current = pickerState;
  if (!current) return;
  const selected =
    value && typeof value === "object" && Number.isInteger(value.type) ? value : null;
  pickerState = {
    ...current,
    current: selected?.id ?? current.current,
    currentType: selected?.type ?? current.currentType,
    minimized: current.minimized,
    resolve: null,
  };
  const resolve = current.resolve;
  pickerPromise = null;
  if (resolve) resolve(value);
  if (pickerRepaint) pickerRepaint((value) => value + 1);
};

const expandPicker = () => {
  if (!pickerState || !pickerState.minimized) return;
  pickerState = { ...pickerState, minimized: false };
  pickerPromise = new Promise((resolve) => {
    pickerState = { ...pickerState, resolve };
  });
  if (pickerRepaint) pickerRepaint((value) => value + 1);
};

const minimizePicker = () => {
  if (!pickerState || pickerState.minimized) return;
  pickerState = { ...pickerState, minimized: true };
  if (pickerRepaint) pickerRepaint((value) => value + 1);
};

const NAV_SCOPE = `${PICKER_ID}-scope`;

const FocusableButton = ({ id, onActivate, neighbors, className = "", children, ...props }) => {
  const navigation = api.ui.navigation;
  const focusable = navigation.useFocusable({
    id,
    scope: NAV_SCOPE,
    onActivate,
    neighbors,
    scrollIntoView: true,
  });
  const focusClass = navigation.controllerFocusClass(focusable.focused);

  return UIReact.createElement(
    "button",
    {
      ...props,
      ref: focusable.ref,
      type: "button",
      onClick: onActivate,
      className: `${className} ${focusClass}`.trim(),
    },
    children,
  );
};

const ElementGridButton = ({ entry, index, entries, selected, onSelect }) => {
  const id = `${PICKER_ID}-element-${entry.id || `type-${entry.type}`}`;
  const column = index % 4;
  const neighbors = {
    left:
      column > 0
        ? `${PICKER_ID}-element-${entries[index - 1].id || `type-${entries[index - 1].type}`}`
        : `${PICKER_ID}-matter-All`,
    right:
      column < 3 && entries[index + 1]
        ? `${PICKER_ID}-element-${entries[index + 1].id || `type-${entries[index + 1].type}`}`
        : undefined,
    up:
      index >= 4
        ? `${PICKER_ID}-element-${entries[index - 4].id || `type-${entries[index - 4].type}`}`
        : `${PICKER_ID}-matter-All`,
    down: entries[index + 4]
      ? `${PICKER_ID}-element-${entries[index + 4].id || `type-${entries[index + 4].type}`}`
      : undefined,
  };
  const focusable = api.ui.navigation.useFocusable({
    id,
    scope: NAV_SCOPE,
    onActivate: onSelect,
    neighbors,
    scrollIntoView: true,
  });
  const focusClass = api.ui.navigation.controllerFocusClass(focusable.focused);
  const className = selected
    ? "group flex items-center gap-2 px-2 py-1.5 text-left w-full rounded border transition-all duration-200 border-[#ffe700] bg-[#ffe700]/10"
    : "group flex items-center gap-2 px-2 py-1.5 text-left w-full rounded border transition-all duration-200 border-slate-700 hover:border-slate-500 bg-black/40 hover:bg-black/60";

  return UIReact.createElement(
    "button",
    {
      ref: focusable.ref,
      type: "button",
      onClick: onSelect,
      className: `${className} ${focusClass}`.trim(),
    },
    UIReact.createElement("span", {
      className: "w-3 h-3 flex-shrink-0",
      style: { backgroundColor: entry.color },
    }),
    UIReact.createElement(
      "span",
      {
        className: selected
          ? "text-xs truncate transition-colors text-[#ffe700]"
          : "text-xs truncate transition-colors text-slate-300 group-hover:text-white",
      },
      entry.name,
    ),
  );
};

const currentPickerEntry = () => {
  if (!pickerState) return null;
  return (
    elementEntries().find(
      (entry) =>
        entry.type === pickerState.currentType ||
        (entry.id !== null && entry.id === pickerState.current),
    ) || {
      id: pickerState.current,
      type: pickerState.currentType,
      name: pickerState.current || DEFAULT_ELEMENT_ID,
      color: "#9aa7b5",
    }
  );
};

const selectedActionIsSource = () => {
  if (!api.action) return null;
  const selected = safe(() => api.action.getSelected(), null);
  return selected?.id === SOURCE_ID;
};

const syncPickerToSelectedAction = () => {
  if (!UIReact || !registerPicker()) return;

  const sourceSelected = selectedActionIsSource();
  if (sourceSelected && !pickerState) {
    const current = defaultElementSelection();
    pickerState = {
      current: current.id,
      currentType: current.type,
      minimized: true,
      resolve: null,
    };
    if (pickerRepaint) pickerRepaint((value) => value + 1);
    return;
  }

  if (sourceSelected === false && pickerState && configuringSources.size === 0) {
    const resolve = pickerState.resolve;
    pickerState = null;
    pickerPromise = null;
    if (resolve) resolve(null);
    if (pickerRepaint) pickerRepaint((value) => value + 1);
  }
};

const ElementPicker = () => {
  const [query, setQuery] = UIReact.useState("");
  const [matter, setMatter] = UIReact.useState("All");
  const [, bump] = UIReact.useState(0);

  api.ui.navigation.useFocusScope({
    id: NAV_SCOPE,
    active: !!pickerState,
    priority: 100,
    defaultId: pickerState?.minimized ? `${PICKER_ID}-selected` : `${PICKER_ID}-search`,
    onBack: () => {
      if (pickerState && !pickerState.minimized) {
        minimizePicker();
        return true;
      }
      return false;
    },
  });

  UIReact.useEffect(() => {
    pickerRepaint = bump;
    return () => {
      if (pickerRepaint === bump) pickerRepaint = null;
    };
  }, []);

  const searchFocus = api.ui.navigation.useFocusable({
    id: `${PICKER_ID}-search`,
    scope: NAV_SCOPE,
    onActivate: (element) => element?.focus(),
    neighbors: {
      up: `${PICKER_ID}-minimize`,
      down: `${PICKER_ID}-matter-All`,
    },
    scrollIntoView: true,
  });

  if (!pickerState) return null;

  if (pickerState.minimized) {
    const selected = currentPickerEntry();
    return UIReact.createElement(
      "div",
      {
        className:
          "pointer-events-auto flex items-center gap-2 bg-black bg-opacity-75 border border-slate-700 rounded px-3 py-2 ui-box text-slate-300",
        style: {
          position: "fixed",
          left: "50%",
          bottom: 80,
          transform: "translateX(-50%)",
          zIndex: 10000,
        },
        onClick: expandPicker,
      },
      UIReact.createElement("span", { className: "text-white text-xs opacity-70" }, "Source"),
      UIReact.createElement(
        FocusableButton,
        {
          id: `${PICKER_ID}-selected`,
          onActivate: expandPicker,
          className: "flex items-center gap-2 text-xs text-white hover:text-[#ffe700]",
        },
        UIReact.createElement("span", {
          className: "w-3 h-3 flex-shrink-0",
          style: { backgroundColor: selected?.color || "#9aa7b5" },
        }),
        selected?.name || DEFAULT_ELEMENT_ID,
      ),
      UIReact.createElement("span", { className: "text-xs text-slate-500" }, "Click to expand"),
    );
  }

  const normalizedQuery = query.trim().toLowerCase();
  const entries = elementEntries().filter((entry) => {
    const matchesQuery =
      !normalizedQuery ||
      entry.name.toLowerCase().includes(normalizedQuery) ||
      (entry.id || "").toLowerCase().includes(normalizedQuery);
    return matchesQuery && (matter === "All" || matterName(entry.matterType) === matter);
  });
  const matters = [
    "All",
    ...new Set(elementEntries().map((entry) => matterName(entry.matterType))),
  ];
  const isSelected = (entry) =>
    (entry.id !== null && entry.id === pickerState.current) ||
    (pickerState.currentType !== null && entry.type === pickerState.currentType);
  const tabClass = (active) =>
    active
      ? "text-xs px-3 py-1 border rounded-tr-lg rounded-bl-lg item-button-transition border-slate-200 text-[#ffe700] border-opacity-50 bg-[#ffe700]/10"
      : "text-xs px-3 py-1 border rounded-tr-lg rounded-bl-lg item-button-transition border-slate-200 text-white border-opacity-25 hover:text-[#ffe700] hover:border-opacity-0 bg-black";

  return UIReact.createElement(
    "div",
    {
      className:
        "pointer-events-auto flex flex-col overflow-hidden bg-black bg-opacity-75 border border-slate-700 rounded ui-box text-slate-300",
      style: {
        position: "fixed",
        top: "auto",
        left: "50%",
        bottom: 80,
        transform: "translateX(-50%)",
        zIndex: 10000,
        width: "640px",
        maxWidth: "92vw",
        maxHeight: "600px",
      },
    },
    UIReact.createElement(
      "div",
      {
        className: "px-4 py-2 border-b border-slate-800 flex items-center justify-between",
      },
      UIReact.createElement("span", { className: "text-white text-xs opacity-70" }, "Source"),
      UIReact.createElement(
        "div",
        { className: "flex items-center gap-2" },
        UIReact.createElement(
          FocusableButton,
          {
            id: `${PICKER_ID}-minimize`,
            onActivate: minimizePicker,
            neighbors: { down: `${PICKER_ID}-search` },
            className:
              "text-xs px-2 py-0.5 text-white bg-black border rounded-tr-lg rounded-bl-lg item-button-transition hover:text-[#ffe700] border-slate-200 border-opacity-25 hover:border-opacity-0",
          },
          "Minimize ▾",
        ),
      ),
    ),
    UIReact.createElement(
      "div",
      {
        className: "px-4 py-3 border-b border-slate-800 flex flex-col gap-2 items-stretch",
      },
      UIReact.createElement(
        "div",
        { className: "flex items-center" },
        UIReact.createElement("input", {
          ref: searchFocus.ref,
          autoFocus: true,
          value: query,
          placeholder: "Search elements...",
          maxLength: 64,
          onChange: (event) => setQuery(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Escape") minimizePicker();
          },
          className:
            "w-full bg-black/60 border border-slate-700 px-3 py-1.5 rounded text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors",
        }),
      ),
      UIReact.createElement(
        "div",
        { className: "flex gap-1 flex-wrap" },
        matters.map((name, index) =>
          UIReact.createElement(
            FocusableButton,
            {
              key: name,
              id: `${PICKER_ID}-matter-${name}`,
              neighbors: {
                left: index > 0 ? `${PICKER_ID}-matter-${matters[index - 1]}` : undefined,
                right:
                  index + 1 < matters.length
                    ? `${PICKER_ID}-matter-${matters[index + 1]}`
                    : undefined,
                up: `${PICKER_ID}-search`,
                down: `${PICKER_ID}-element-0`,
              },
              className: tabClass(matter === name),
              onActivate: () => setMatter(name),
            },
            name,
          ),
        ),
      ),
    ),
    UIReact.createElement(
      "div",
      {
        className: "flex-1 overflow-y-auto px-4 py-2",
        style: { maxHeight: 480 },
      },
      UIReact.createElement(
        "div",
        { className: "grid grid-cols-4 gap-1.5 py-1.5" },
        entries.map((entry, index) =>
          UIReact.createElement(ElementGridButton, {
            key: entry.id || `type-${entry.type}`,
            entry,
            index,
            entries,
            selected: isSelected(entry),
            onSelect: () => closePicker(entry),
          }),
        ),
      ),
    ),
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

const openElementPicker = async (current) => {
  if (registerPicker()) {
    if (pickerState && pickerState.minimized) {
      return currentPickerEntry();
    }
    if (pickerPromise) return pickerPromise;

    pickerPromise = new Promise((resolve) => {
      pickerState = {
        current: current.id,
        currentType: current.type,
        minimized: false,
        resolve,
      };
      if (pickerRepaint) pickerRepaint((value) => value + 1);
    });
    return pickerPromise;
  }

  // Fallback for runtimes that do not expose React or the modal overlay slot.
  return api.ui.prompt(
    `Enter an element ID to emit (default: ${current.id || DEFAULT_ELEMENT_ID}).`,
    current.id || DEFAULT_ELEMENT_ID,
    "Element ID",
    "Configure Infinite Source",
  );
};

const configureSource = async (structure, initialSelection) => {
  const key = sourceKey(structure);
  if (configuringSources.has(key)) return;
  configuringSources.add(key);

  try {
    const current = initialSelection || sourceElementSelection(structure);
    const value = await openElementPicker(current);

    // Closing the dialog keeps the default. A bad ID is also rejected rather
    // than leaving a source that fails on every trigger tick.
    if (value === null || (typeof value === "string" && value.trim() === "")) {
      disabledSources.add(key);
      return;
    }
    if (typeof value === "object" && Number.isInteger(value.type)) {
      const definition = safe(() => api.elements.getDefinitionByType(value.type), null);
      if (!definition || !isElementAllowed(value.id, definition)) {
        disabledSources.add(key);
        return;
      }

      disabledSources.delete(key);
      const selection = validElementSelection(value);
      if (!selection) return;
      sourceSelections.set(key, selection);
      api.structures.setData(structure, selectionData(value), {
        propagateToWorkers: true,
      });
      rememberElement(selection);
      return;
    }

    const elementId = value.trim();
    const elementType = safe(() => api.elements.getTypeFromId(elementId), null);
    if (
      elementType === null ||
      !isElementTypeAllowed(elementType) ||
      !isElementAllowed(elementId)
    ) {
      disabledSources.add(key);
      return;
    }

    disabledSources.delete(key);
    const selection = validElementSelection({
      id: elementId,
      type: elementType,
    });
    if (!selection) return;
    sourceSelections.set(key, selection);
    api.structures.setData(structure, selectionData(selection), {
      propagateToWorkers: true,
    });
    rememberElement(selection);
  } catch (error) {
    console.error(`[${MOD_ID}] source configuration failed:`, error);
  } finally {
    configuringSources.delete(key);
  }
};

const sourceTick = () => {
  syncPickerToSelectedAction();
  const live = new Set();

  api.structures.forEachOfType(SOURCE_ID, (structure) => {
    const key = sourceKey(structure);
    live.add(key);

    // The default value is stored immediately so the structure has valid data,
    // but it must not be emitted while the configuration prompt is open.
    if (configuringSources.has(key) || disabledSources.has(key)) return;

    if (!configuredSources.has(key)) {
      configuredSources.add(key);
      const needsConfiguration =
        !structure.data?.elementId && !Number.isInteger(structure.data?.elementType);
      if (needsConfiguration) {
        const initialSelection = sourceElementSelection(structure);
        if (!initialSelection) return;
        sourceSelections.set(key, initialSelection);
        api.structures.setData(structure, selectionData(initialSelection), {
          propagateToWorkers: true,
        });
        void configureSource(structure, initialSelection);
        // Do not emit the default element while the placement configuration
        // prompt is still open.
        return;
      }
    }

    const elementType = sourceSelections.get(key)?.type ?? elementTypeFromSource(structure);
    if (elementType === null) return;

    // Fill one complete 4x4 batch directly below the structure. Occupied
    // output cells are left alone and retried on later trigger ticks.
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const outputX = structure.x + x;
        const outputY = structure.y + SIZE + y;
        if (api.world.isCellEmptyAtCell(outputX, outputY)) {
          api.elements.createAtCellWhenIdle(outputX, outputY, elementType);
        }
      }
    }
  });

  for (const key of configuredSources) {
    if (!live.has(key)) {
      configuredSources.delete(key);
      sourceSelections.delete(key);
      disabledSources.delete(key);
    }
  }
};

const trashTick = () => {
  api.structures.forEachOfType(TRASH_ID, (structure) => {
    api.grid.forEachCellInRect(structure.x, structure.y, SIZE, SIZE, (cellX, cellY) => {
      const info = api.elements.getInfoAtCell(cellX, cellY);
      if (info) api.elements.removeAtCellWhenIdle(cellX, cellY);
    });
  });
};

const setup = async () => {
  api.i18n.register("en", TEXT);
  registerPicker();

  await api.sprites.loadFromMod(SOURCE_SPRITE, "assets/SourceBlock.png");
  await api.sprites.loadFromMod(TRASH_SPRITE, "assets/Trash.png");

  const common = {
    categoryKey: "misc",
    buildModes: [
      { type: "single" },
      {
        type: "line",
        directions: ["horizontal", "vertical"],
      },
    ],
    shape: FOOTPRINT,
    render: {
      size: { width: 16, height: 16 },
      offset: { x: 0, y: 0 },
    },
  };

  api.structures.register({
    ...common,
    id: SOURCE_ID,
    nameKey: "structures|source|name",
    descriptionKey: "structures|source|description",
    order: 90,
    variants: [{ id: SOURCE_ID, angles: [0, 90, 180, 270] }],
    render: { ...common.render, imageName: SOURCE_SPRITE },
  });

  api.structures.register({
    ...common,
    id: TRASH_ID,
    nameKey: "structures|trash|name",
    descriptionKey: "structures|trash|description",
    order: 91,
    variants: [{ id: TRASH_ID, angles: [0, 90, 180, 270] }],
    render: { ...common.render, imageName: TRASH_SPRITE },
  });

  // These blocks are creative utility blocks, so they do not require a tech
  // node before appearing in the Misc build category.
  api.player.buildings.unlockByType(SOURCE_ID);
  api.player.buildings.unlockByType(TRASH_ID);

  api.triggers.register(`${MOD_ID}:tick`, {
    interval: TICK_MS,
    callback: () => {
      try {
        sourceTick();
        trashTick();
      } catch (error) {
        console.error(`[${MOD_ID}] tick failed:`, error);
      }
    },
  });
};

try {
  await setup();
} catch (error) {
  console.error(`[${MOD_ID}] load failed:`, error);
}
