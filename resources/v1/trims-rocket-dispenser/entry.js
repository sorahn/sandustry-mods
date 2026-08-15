/*
 * Trim's Rocket Dispenser
 *
 * A directional turret structure modelled directly on the vanilla Pyro
 * Dispenser (internal id "heatCannon"), but firing Rocket projectiles instead
 * of Fire, and paying in energy instead of thermal charge.
 *
 * Same compile rules as any sandkit entry: this file is wrapped in
 * `new Function` with `sandkit` already in scope. No import, no export.
 */

"use strict";

const api = sandkit.api;

const MOD_ID = "trim.rocket-dispenser";

/* ------------------------------------------------------------------ */
/* Tuning                                                              */
/* ------------------------------------------------------------------ */

// Milliseconds between shots. The vanilla Pyro Dispenser fires every 3000ms;
// rockets hit far harder, so this is slower.
const FIRE_INTERVAL_MS = 5000;

// Energy drawn per rocket, all-or-nothing. A dispenser with no power sits idle
// rather than firing weak shots.
const ENERGY_PER_SHOT = 400;

// How often the tick trigger runs. Finer than the fire interval so shots land
// close to schedule without polling every frame.
const TICK_MS = 100;

// Structure footprint, in cells. Matches the Pyro Dispenser's 4x4.
const SIZE = 4;

// The rocket itself, copied from the Rocket Launcher's projectile blueprint.
// ProjectileType: Bullet=1, Rocket=2, GrapplingHook=3, Fire=4, Digger=5, Mod=6
const ROCKET = {
  opts: {
    speed: 100,
    duration: 3,
    tracerLight: { brightness: 0.8, duration: -1, size: 40 },
  },
  type: 2,
  attributes: {
    cooldowns: { emitSmoke: { time: 100, last: 0 } },
  },
};

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

const ID_UP = "trimRocketDispenserUp";
const ID_DOWN = "trimRocketDispenserDown";
const ID_LEFT = "trimRocketDispenserLeft";
const ID_RIGHT = "trimRocketDispenserRight";

const DIRECTION = {
  [ID_UP]: "up",
  [ID_DOWN]: "down",
  [ID_LEFT]: "left",
  [ID_RIGHT]: "right",
};

// Firing angle in degrees, matching the game's convention.
const ANGLE = { up: -90, down: 90, left: 180, right: 0 };

// Which variant the build-mode rotation lands on at each angle.
const VARIANTS = [
  { id: ID_RIGHT, angles: [0] },
  { id: ID_DOWN, angles: [90] },
  { id: ID_LEFT, angles: [180, -180] },
  { id: ID_UP, angles: [-90] },
];

const SPRITE = {
  up: "trimRocketDispenserSpriteUp",
  down: "trimRocketDispenserSpriteDown",
  left: "trimRocketDispenserSpriteLeft",
  right: "trimRocketDispenserSpriteRight",
};

const TEXT = {
  "structures|trimRocketDispenser|name": "Rocket Dispenser",
  "structures|trimRocketDispenser|description":
    "Fires a rocket every {seconds} seconds in the direction it was placed. Each shot draws {energy} energy from the power network.",
  "tech|trimRocketDispenser|name": "Rocket Dispenser",
  "tech|trimRocketDispenser|description":
    "Unlocks the {t:structures|trimRocketDispenser|name}, an automated turret that fires a rocket every {seconds} seconds in the direction it was placed. Each shot draws {energy} energy.",
};

// Tech node. Sits directly under Copper Molds in the electricity branch, so it
// becomes reachable as soon as Copper Molds is bought.
const TECH_ID = "trimRocketDispenser";
const TECH_PARENT = "copperMold";
const TECH_COST = 5000;

/* ------------------------------------------------------------------ */
/* Firing                                                              */
/* ------------------------------------------------------------------ */

// Muzzle position in world coordinates: centre of the structure, pushed out to
// the face it fires from, so the rocket spawns clear of its own chassis.
const muzzleAt = (structure, direction, cellSize) => {
  const midX = (structure.x + SIZE / 2) * cellSize;
  const midY = (structure.y + SIZE / 2) * cellSize;
  switch (direction) {
    case "up":
      return { x: midX, y: structure.y * cellSize };
    case "down":
      return { x: midX, y: (structure.y + SIZE) * cellSize };
    case "left":
      return { x: structure.x * cellSize, y: midY };
    default:
      return { x: (structure.x + SIZE) * cellSize, y: midY };
  }
};

// Per-dispenser next-fire time, keyed by cell position. Dispensers placed on
// different grid squares are phase-offset so a bank of them staggers its shots
// instead of firing in one thunderclap.
const schedule = new Map();

const keyOf = (structure) => `${structure.x},${structure.y}`;

const phaseOf = (structure, snapGridCellSize) => {
  const gx = structure.x / snapGridCellSize;
  const gy = structure.y / snapGridCellSize;
  return ((((gx + gy) % 4) + 4) % 4) * (FIRE_INTERVAL_MS / 4);
};

const fire = (structure, direction, cellSize) => {
  // Respect the structure's on/off toggle.
  if (!api.structures.processing.isEnabledAt(structure.x, structure.y)) {
    return false;
  }

  // All-or-nothing: a brownout means no shot, not a half-powered one.
  if (api.energy.consume(ENERGY_PER_SHOT, { allOrNothing: true }) < ENERGY_PER_SHOT) {
    return false;
  }

  const muzzle = muzzleAt(structure, direction, cellSize);
  api.projectiles.spawnAtWorld(muzzle.x, muzzle.y, ANGLE[direction], ROCKET);

  // Launch plume.
  api.effects.createParticlesAtWorld(muzzle.x, muzzle.y, {
    count: 14,
    minSpeed: 24,
    maxSpeed: 70,
    color: 0xd0d4dc,
    minSize: 0.6,
    maxSize: 1.8,
    minLifetime: 0.3,
    maxLifetime: 0.8,
  });

  api.sound.play("dig", { volume: 0.35, playbackRate: 0.6 });
  return true;
};

const tick = () => {
  const now = api.time.getTimeMs();
  const metrics = api.rendering.getGridMetrics();
  const cellSize = metrics.cellSize;
  const snap = metrics.snapGridCellSize || 1;

  const live = new Set();

  for (const structureId of Object.keys(DIRECTION)) {
    const direction = DIRECTION[structureId];

    api.structures.forEachOfType(structureId, (structure) => {
      const key = keyOf(structure);
      live.add(key);

      let readyAt = schedule.get(key);
      if (readyAt === undefined) {
        // First sighting: offset by grid phase, then start the clock.
        readyAt = now + phaseOf(structure, snap);
        schedule.set(key, readyAt);
        return;
      }

      if (now < readyAt) return;

      // Whether or not the shot goes off, push the clock forward. A dispenser
      // that is out of power retries on the next cycle rather than firing the
      // instant power returns and burning the whole backlog at once.
      fire(structure, direction, cellSize);
      schedule.set(key, now + FIRE_INTERVAL_MS);
    });
  }

  // Drop timers for dispensers that no longer exist, so the map does not grow
  // without bound across a long session.
  if (schedule.size > live.size) {
    for (const key of Array.from(schedule.keys())) {
      if (!live.has(key)) schedule.delete(key);
    }
  }
};

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

let techRegistered = false;

const registerTech = () => {
  if (techRegistered) return true;

  // registerNode throws if the parent is not in the grid yet, which is the
  // signal to retry later rather than an error worth reporting.
  try {
    api.tech.registerNode(
      TECH_ID,
      {
        nameKey: "tech|trimRocketDispenser|name",
        descriptionKey: "tech|trimRocketDispenser|description",
        descriptionParams: {
          seconds: FIRE_INTERVAL_MS / 1000,
          energy: ENERGY_PER_SHOT,
        },
        cost: TECH_COST,
        currencyType: "gold",
        isElectricity: true,
        electricityNodeStyle: true,
        branch: "electricity",
        requires: [TECH_PARENT],
        // Only the base variant is listed; the other three directions are
        // reached by rotating during placement.
        unlocks: { structures: [ID_UP] },
      },
      { parentId: TECH_PARENT },
    );
    techRegistered = true;
    return true;
  } catch (error) {
    return false;
  }
};

const setup = async () => {
  api.i18n.register("en", TEXT);

  // Load the four directional sprites. Registering a separate structure per
  // direction with its own sprite avoids needing a custom rotating draw
  // callback the way the vanilla Pyro Dispenser does.
  for (const direction of Object.keys(SPRITE)) {
    try {
      await api.sprites.loadFromMod(
        SPRITE[direction],
        `assets/rocket_dispenser_${direction}.png`,
      );
    } catch (error) {
      console.error(`[${MOD_ID}] sprite load failed (${direction}):`, error);
    }
  }

  for (const structureId of Object.keys(DIRECTION)) {
    const direction = DIRECTION[structureId];

    api.structures.register({
      id: structureId,
      nameKey: "structures|trimRocketDispenser|name",
      descriptionKey: "structures|trimRocketDispenser|description",
      descriptionParams: {
        seconds: FIRE_INTERVAL_MS / 1000,
        energy: ENERGY_PER_SHOT,
      },
      categoryKey: "thermal",
      order: 71,
      buildModes: [{ type: "singleDirectional" }],
      ignoreAngleLock: true,
      variants: VARIANTS,
      shape: [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
      ],
      render: {
        imageName: SPRITE[direction],
        size: { width: 16, height: 16 },
        offset: { x: 0, y: 0 },
      },
    });
  }

  api.triggers.register("trimRocketDispenserTick", {
    interval: TICK_MS,
    callback: () => {
      try {
        tick();
      } catch (error) {
        console.error(`[${MOD_ID}] tick failed:`, error);
      }
    },
  });

  // The tech grid is built by the game's own content, which may not have
  // registered Copper Molds yet. Try now, fall back to game:ready.
  if (!registerTech()) {
    api.events.on("game:ready", () => {
      try {
        registerTech();
      } catch (error) {
        console.error(`[${MOD_ID}] tech registration failed:`, error);
      }
    });
  }
};

try {
  await setup();
} catch (error) {
  console.error(`[${MOD_ID}] load failed:`, error);
}
