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
const configuringSources = new Set();
const disabledSources = new Set();
const PICKER_ID = `${MOD_ID}-element-picker`;
let pickerState = null;
let pickerOverlayReady = false;
let pickerRepaint = null;
const UIReact = sandkit.react ?? null;

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch (error) {
    return fallback;
  }
};

const sourceKey = (structure) => `${structure.x},${structure.y}`;

const isElementAllowed = (elementId, definition = null) => {
  if (elementId && BLACKLISTED_ELEMENT_IDS.has(elementId)) return false;
  const resolved = definition || safe(() => api.elements.getDefinitionByType(api.elements.getTypeFromId(elementId)), null);
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
    return definition && definition.hidden !== true && isElementTypeAllowed(storedType) ? storedType : null;
  }

  const elementId = elementIdFromSource(structure);
  const elementType = elementId === null ? null : safe(() => api.elements.getTypeFromId(elementId), null);
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
  ({ 1: "Solid", 2: "Liquid", 3: "Particle", 4: "Gas", 5: "Static", 6: "Slushy", 7: "Wisp", 8: "Powder" }[
    matterType
  ] || "Other");

const closePicker = (value) => {
  const current = pickerState;
  pickerState = null;
  if (current) current.resolve(value);
  if (pickerRepaint) pickerRepaint((value) => value + 1);
};

const ElementPicker = () => {
  const [query, setQuery] = UIReact.useState("");
  const [matter, setMatter] = UIReact.useState("All");
  const [, bump] = UIReact.useState(0);

  UIReact.useEffect(() => {
    pickerRepaint = bump;
    return () => {
      if (pickerRepaint === bump) pickerRepaint = null;
    };
  }, []);

  if (!pickerState) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const entries = elementEntries().filter((entry) => {
    const matchesQuery =
      !normalizedQuery ||
      entry.name.toLowerCase().includes(normalizedQuery) ||
      (entry.id || "").toLowerCase().includes(normalizedQuery);
    return matchesQuery && (matter === "All" || matterName(entry.matterType) === matter);
  });
  const matters = ["All", ...new Set(elementEntries().map((entry) => matterName(entry.matterType)))];
  const buttonStyle = (active) => ({
    background: active ? "rgba(255, 231, 0, 0.1)" : "#000",
    border: `1px solid ${active ? "rgba(255, 231, 0, 0.5)" : "rgba(226, 232, 240, 0.25)"}`,
    borderRadius: "4px 0 4px 0",
    color: active ? "#ffe700" : "#cbd5e1",
    cursor: "pointer",
    padding: "4px 10px",
    fontSize: 12,
  });

  return UIReact.createElement(
    "div",
    {
      style: {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10000,
        width: 640,
        maxWidth: "92vw",
        maxHeight: 600,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "rgba(0, 0, 0, 0.75)",
        border: "1px solid #334155",
        borderRadius: 8,
        color: "#cbd5e1",
        fontFamily: "inherit",
      },
    },
    UIReact.createElement(
      "div",
      {
        style: {
          padding: "8px 16px",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        },
      },
      UIReact.createElement("span", { style: { color: "#fff", fontSize: 12, opacity: 0.7 } }, "Source"),
      UIReact.createElement("button", { style: buttonStyle(false), onClick: () => closePicker(null) }, "Cancel"),
    ),
    UIReact.createElement(
      "div",
      {
        style: {
          padding: "12px 16px",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          gap: 16,
          alignItems: "center",
        },
      },
      UIReact.createElement(
        "div",
        { style: { display: "flex", gap: 4, flexShrink: 0 } },
        UIReact.createElement("button", { style: buttonStyle(matter === "All"), onClick: () => setMatter("All") }, "✓ Allow"),
        UIReact.createElement("button", { style: buttonStyle(false), onClick: () => closePicker(null) }, "✕ Cancel"),
      ),
      UIReact.createElement(
        "div",
        { style: { display: "flex", gap: 4, flexShrink: 0 } },
      matters.map((name) =>
        UIReact.createElement(
          "button",
          { key: name, style: buttonStyle(matter === name), onClick: () => setMatter(name) },
          name,
        ),
      ),
      ),
      UIReact.createElement("input", {
        autoFocus: true,
        value: query,
        placeholder: "Search elements...",
        maxLength: 64,
        onChange: (event) => setQuery(event.target.value),
        style: {
          flex: 1,
          minWidth: 0,
          boxSizing: "border-box",
          padding: "6px 12px",
          background: "rgba(0, 0, 0, 0.6)",
          border: "1px solid #334155",
          borderRadius: 4,
          color: "#fff",
          fontSize: 12,
          outline: "none",
        },
      }),
    ),
    UIReact.createElement(
      "div",
      {
        style: {
          flex: 1,
          overflowY: "auto",
          maxHeight: 480,
          padding: "8px 16px",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 6,
        },
      },
      entries.map((entry) =>
        UIReact.createElement(
          "button",
          {
            key: entry.id || `type-${entry.type}`,
            onClick: () => closePicker(entry),
            style: {
              display: "flex",
              alignItems: "center",
              gap: 12,
              minHeight: 32,
              padding: "6px 8px",
              textAlign: "left",
              background: entry.id === pickerState.current ? "rgba(255, 231, 0, 0.1)" : "rgba(0, 0, 0, 0.4)",
              border: `1px solid ${entry.id === pickerState.current ? "#ffe700" : "#334155"}`,
              borderRadius: 4,
              color: entry.id === pickerState.current ? "#ffe700" : "#cbd5e1",
              cursor: "pointer",
              fontSize: 12,
            },
          },
          UIReact.createElement("span", {
            style: { width: 12, height: 12, flex: "0 0 auto", background: entry.color },
          }),
          UIReact.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, entry.name),
          entry.id === pickerState.current ? UIReact.createElement("span", { style: { marginLeft: "auto", color: "#ffe700", fontSize: 10 } }, "✓") : null,
        ),
      ),
    ),
    UIReact.createElement(
      "div",
      { style: { padding: "8px 16px", borderTop: "1px solid #1e293b", minHeight: 28 } },
      pickerState.current
        ? UIReact.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12 } },
            UIReact.createElement("span", { style: { width: 12, height: 12, background: elementEntries().find((entry) => entry.id === pickerState.current)?.color || "#f4a460" } }),
            UIReact.createElement("span", { style: { color: "#fff" } }, pickerState.current),
            UIReact.createElement("span", { style: { color: "#34d399", marginLeft: 8 } }, "✓ Allow"),
          )
        : null,
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
    return new Promise((resolve) => {
      pickerState = { current, resolve };
      if (pickerRepaint) pickerRepaint((value) => value + 1);
    });
  }

  // Fallback for runtimes that do not expose React or the modal overlay slot.
  return api.ui.prompt(
    `Enter an element ID to emit (default: ${current}).`,
    current,
    "Element ID",
    "Configure Infinite Source",
  );
};

const configureSource = async (structure) => {
  const key = sourceKey(structure);
  if (configuringSources.has(key)) return;
  configuringSources.add(key);

  try {
    const current = structure.data?.elementId || DEFAULT_ELEMENT_ID;
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
        api.ui.toast(`Element unavailable for spawning: ${value.name || value.type}`);
        return;
      }

      disabledSources.delete(key);
      api.structures.setData(
        structure,
        { elementType: value.type, elementId: value.id },
        { propagateToWorkers: true },
      );
      api.ui.toast(`Source configured to emit ${value.name}`);
      return;
    }

    const elementId = value.trim();
    const elementType = safe(() => api.elements.getTypeFromId(elementId), null);
    if (elementType === null || !isElementTypeAllowed(elementType) || !isElementAllowed(elementId)) {
      disabledSources.add(key);
      api.ui.toast(`Element unavailable for spawning: ${elementId}`);
      return;
    }

    disabledSources.delete(key);
    api.structures.setData(structure, { elementId }, { propagateToWorkers: true });
    api.ui.toast(`Source configured to emit ${elementId}`);
  } catch (error) {
    console.error(`[${MOD_ID}] source configuration failed:`, error);
  } finally {
    configuringSources.delete(key);
  }
};

const sourceTick = () => {
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
        api.structures.setData(
          structure,
          { elementId: DEFAULT_ELEMENT_ID },
          { propagateToWorkers: true },
        );
        void configureSource(structure);
        // Do not emit the default element while the placement configuration
        // prompt is still open.
        return;
      }
    }

    const elementType = elementTypeFromSource(structure);
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
    buildModes: [{ type: "single" }],
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
    render: { ...common.render, imageName: SOURCE_SPRITE },
  });

  api.structures.register({
    ...common,
    id: TRASH_ID,
    nameKey: "structures|trash|name",
    descriptionKey: "structures|trash|description",
    order: 91,
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
