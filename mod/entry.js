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
// Match the demo Creative Spawner's 500 ms tick interval. The Source can add
// up to one 4x4 batch per tick, rather than refilling on every frame.
const TICK_MS = 500;
const DEFAULT_ELEMENT_ID = "sand";
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

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch (error) {
    return fallback;
  }
};

const sourceKey = (structure) => `${structure.x},${structure.y}`;

const elementIdFromSource = (structure) => {
  const requested = structure.data?.elementId || DEFAULT_ELEMENT_ID;
  return safe(() => {
    api.elements.getTypeFromId(requested);
    return requested;
  }, DEFAULT_ELEMENT_ID);
};

const configureSource = async (structure) => {
  const key = sourceKey(structure);
  if (configuringSources.has(key)) return;
  configuringSources.add(key);

  try {
    const current = structure.data?.elementId || DEFAULT_ELEMENT_ID;
    const value = await api.ui.prompt(
      `Enter an element ID to emit (default: ${current}).`,
      current,
      "Element ID",
      "Configure Infinite Source",
    );

    // Closing the dialog keeps the default. A bad ID is also rejected rather
    // than leaving a source that fails on every trigger tick.
    if (value === null || value.trim() === "") {
      disabledSources.add(key);
      return;
    }
    const elementId = value.trim();
    if (safe(() => api.elements.getTypeFromId(elementId), null) === null) {
      disabledSources.add(key);
      api.ui.toast(`Unknown element ID: ${elementId}`);
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
      const needsConfiguration = !structure.data?.elementId;
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

    const elementType = safe(
      () => api.elements.getTypeFromId(elementIdFromSource(structure)),
      null,
    );
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

  await api.sprites.loadFromMod(SOURCE_SPRITE, "assets/CreativeSpawner.png");
  await api.sprites.loadFromMod(TRASH_SPRITE, "assets/CreativeDeleter.png");

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
