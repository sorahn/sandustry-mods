/*
 * Signal Gate Repair
 *
 * The native signalGate can restore its visual state while leaving its 4x4
 * Block terrain and ownership state out of sync. Reconcile both open and
 * closed doors without overwriting elements or other terrain.
 */

"use strict";

const api = sandkit.api;
const MOD_ID = "sorahn.sandustry-signal-gate-repair";
const SIGNAL_GATE_ID = "signalGate";
const BLOCK_TERRAIN_ID = "Block";
const SIZE = 4;
const RETRY_DELAYS_MS = [500, 1500, 3000, 6000];
let startupRepairScheduled = false;

const isEnabled = () => {
  const value = api.settings.get("enabled");
  return typeof value === "boolean" ? value : true;
};

const desiredOpen = (structure: SandustryStructure) => {
  const data = structure.data;
  if (typeof data?.desiredOpen === "boolean") return data.desiredOpen;
  return data?.spriteIndex === 1;
};

const repairOpenDoors = () => {
  if (!isEnabled()) return;

  const resolvedBlockType = api.terrains.getTypeFromId(BLOCK_TERRAIN_ID);
  const isBlockTerrain = (cellX: number, cellY: number) =>
    api.terrains.isTypeAtCell(cellX, cellY, BLOCK_TERRAIN_ID);

  let doorsSeen = 0;
  let cellsRemoved = 0;
  let cellsCreated = 0;
  let doorsTrapped = 0;

  api.structures.forEachOfType(SIGNAL_GATE_ID, (structure) => {
    doorsSeen += 1;
    const open = desiredOpen(structure);
    let blocked = false;

    api.grid.forEachCellInRect(structure.x, structure.y, SIZE, SIZE, (cellX, cellY) => {
      const isBlock = isBlockTerrain(cellX, cellY);

      if (open) {
        if (isBlock) {
          api.terrains.removeAtCellWhenIdle(cellX, cellY);
          cellsRemoved += 1;
        }
        return;
      }

      if (!isBlock) {
        if (!api.world.isCellEmptyAtCell(cellX, cellY)) blocked = true;
        else {
          api.terrains.createAtCellWhenIdle(cellX, cellY, BLOCK_TERRAIN_ID);
          cellsCreated += 1;
        }
      }
    });

    structure.trapped = open || !blocked ? undefined : true;
    api.structures.setData(
      structure,
      { ...structure.data, desiredOpen: open, ownsBlocks: !open },
      { propagateToWorkers: true },
    );
    api.structures.setSpritesheetIndex(structure, open ? 1 : blocked ? 2 : 0);
    api.structures.update(structure, { propagateToWorkers: true });
    if (blocked) doorsTrapped += 1;
  });

  console.info(
    `[${MOD_ID}] Block type=${String(resolvedBlockType)}; checked ${doorsSeen} door(s), cleared ${cellsRemoved} Block cell(s), created ${cellsCreated}, trapped ${doorsTrapped}`,
  );
};

const scheduleStartupRepairs = () => {
  if (startupRepairScheduled) return;
  startupRepairScheduled = true;
  repairOpenDoors();
  for (const delay of RETRY_DELAYS_MS) {
    setTimeout(() => {
      try {
        repairOpenDoors();
      } catch (error) {
        console.error(`[${MOD_ID}] delayed startup repair failed:`, error);
      }
    }, delay);
  }
};

api.events.on("game:ready", () => {
  try {
    scheduleStartupRepairs();
  } catch (error) {
    console.error(`[${MOD_ID}] startup repair failed:`, error);
  }
});

api.settings.onChange(() => {
  if (isEnabled()) repairOpenDoors();
});

// Also schedule independently in case this mod is loaded after game:ready or
// the event is emitted before the save's structures are restored.
setTimeout(() => {
  try {
    scheduleStartupRepairs();
  } catch (error) {
    console.error(`[${MOD_ID}] fallback startup repair failed:`, error);
  }
}, 1000);
