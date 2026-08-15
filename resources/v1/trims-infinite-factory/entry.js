/*
 * Trim's Infinite Factory
 *
 * Adds Auraline, a prismatic solid condensed from Prismite + Prismaline, and
 * wires it into five processing routes:
 *
 *   shake         -> Sand
 *   kinetic press -> Redsand (element id "sandium")
 *   burn          -> Copper
 *   smelt         -> Lava
 *   + water       -> Moonhop
 *
 * IMPORTANT: this file is compiled with `new Function`, not loaded as an ES
 * module. The runtime wraps it as:
 *
 *     const sandkit = __sandkit;
 *     return (async () => { <this file> })();
 *
 * So `sandkit` is already in scope, top-level `await` is legal, and `import` /
 * `export` are syntax errors. Do not add them.
 */

"use strict";

const api = sandkit.api;

const MOD_ID = "trim.infinite-factory";

// MatterType enum: Solid=1, Liquid=2, Particle=3, Gas=4, Static=5, Slushy=6,
// Wisp=7, Powder=8. Auraline is a Solid, so it piles and falls like sand.
const MATTER_SOLID = 1;

// StructureType enum, for the "interacts with" tooltips on the element.
const STRUCTURE_SHAKER_LEFT = 3;
const STRUCTURE_SHAKER_RIGHT = 4;

// Vanilla elements Auraline is built from and breaks down into. Prismite and
// Prismaline are themselves registered through sandkit at startup, so these are
// resolved lazily rather than at load time.
const NEEDS = [
  "prismite",
  "prismaline",
  "sand",
  "sandium", // displayed as "Redsand"
  "copper",
  "lava",
  "water",
  "moonhop",
];

const TEXT = {
  "elements|auraline|name": "Auraline",
  "elements|auraline|description":
    "A prismatic solid condensed where Prismite meets Prismaline. Unstable enough to become almost anything: shake it, press it, burn it, smelt it, or wet it.",
};

let auralineType = null;
let wired = false;

/* ------------------------------------------------------------------ */
/* Element                                                             */
/* ------------------------------------------------------------------ */

const registerAuraline = () => {
  api.i18n.register("en", TEXT);

  const result = api.elements.register({
    id: "auraline",
    nameKey: "elements|auraline|name",
    descriptionKey: "elements|auraline|description",

    // Denser than sand (150) so it settles beneath it, lighter than gold (300).
    density: 170,
    matterType: MATTER_SOLID,

    // Shown on the minimap and in UI chips.
    metaColor: 0xd8b4ff,

    // Per-cell colour variation. Aurora violet shot through with gold.
    colors: {
      variants: [
        [216, 180, 255, 255],
        [206, 168, 250, 255],
        [228, 196, 255, 255],
        [242, 214, 176, 255],
        [232, 200, 240, 255],
      ],
    },

    // Burn route. The fire system reads this directly: an ignited Auraline cell
    // leaves Copper behind. outputChance 1 means every burnt cell yields.
    flammable: {
      outputElementId: "copper",
      outputChance: 1,
      fireInheritsDuration: true,
      duration: [0.08, 0.25],
    },

    // Tooltip hints only; the recipes below are what actually do the work.
    interactions: [
      { kind: "structure", structures: [STRUCTURE_SHAKER_LEFT, STRUCTURE_SHAKER_RIGHT] },
      { kind: "structure", structures: ["smelter"] },
      { kind: "structure", structures: ["kineticPress"] },
      { kind: "flammable" },
    ],

    hidden: false,
    isGrabbable: true,
    isTransportable: true,
  });

  auralineType = result.elementType;
  api.discoveries.addElementByType(auralineType);
  return auralineType;
};

/* ------------------------------------------------------------------ */
/* Recipes                                                             */
/* ------------------------------------------------------------------ */

const wireRecipes = () => {
  if (wired || auralineType === null) return false;

  // Resolve every vanilla element up front. If any one is missing the game has
  // not finished registering its own content yet, so bail and retry later
  // rather than half-wiring the tree.
  const T = {};
  for (let i = 0; i < NEEDS.length; i++) {
    const id = NEEDS[i];
    try {
      T[id] = api.elements.getTypeFromId(id);
    } catch (error) {
      return false;
    }
  }

  wired = true;

  // Prismite + Prismaline -> Auraline.
  // Both inputs are consumed: outputA carries the product, outputB is null.
  // orientation "any" so it fires on any adjacency, not just vertical stacking.
  api.reactions.registerContact({
    inputA: T.prismite,
    inputB: T.prismaline,
    outputA: auralineType,
    outputB: null,
    orientation: "any",
  });

  // Auraline + Water -> Moonhop. Water is consumed too.
  api.reactions.registerContact({
    inputA: auralineType,
    inputB: T.water,
    outputA: T.moonhop,
    outputB: null,
    orientation: "any",
  });

  // Shaker -> Sand. Shakers split output between the cells above and below;
  // sending it all below keeps it on the belt line instead of spraying upward.
  api.processing.registerShaker({
    input: auralineType,
    outputsAbove: [],
    outputsBelow: [{ elementType: T.sand, chance: 1 }],
  });

  // Kinetic press -> Redsand. Needs real downward speed, so it only triggers on
  // a genuine drop rather than material trickling in.
  api.processing.registerKineticPress({
    input: auralineType,
    minimumDownwardVelocity: 60,
    outputs: [{ elementType: T.sandium, chance: 1 }],
  });

  // Smelter -> Lava. Weighted refinery recipe; chances must total <= 1.
  api.structures.recipes.register("smelter", {
    input: auralineType,
    outputs: [{ elementType: T.lava, chance: 1 }],
  });

  return true;
};

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

try {
  registerAuraline();

  // Try immediately in case native content is already registered, and hook
  // game:ready as the fallback for a cold start.
  if (!wireRecipes()) {
    api.events.on("game:ready", () => {
      try {
        wireRecipes();
      } catch (error) {
        console.error(`[${MOD_ID}] recipe wiring failed:`, error);
      }
    });
  }
} catch (error) {
  console.error(`[${MOD_ID}] load failed:`, error);
}
