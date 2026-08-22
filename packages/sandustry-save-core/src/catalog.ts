import type { SaveExplorerCellKind } from "./model";

const TERRAIN_NAMES: Readonly<Record<number, string>> = {
  2: "Dirt",
  3: "Spore Soil",
  4: "Fog",
  5: "Jetpack Fog",
  6: "Water Fog",
  7: "Freezing Ice Soil",
  8: "Divider",
  9: "Grass",
  10: "Moss",
  11: "Gold Soil",
  12: "Petal",
  13: "Lava Fog",
  14: "Fluxite",
  15: "Block",
  16: "Sliding Block",
  17: "Sliding Block Left",
  18: "Sliding Block Right",
  19: "Conveyor Left",
  20: "Conveyor Right",
  21: "Shaker Left",
  22: "Shaker Right",
  23: "Stone",
  24: "Velocity Soaker",
  25: "Ice",
  26: "Grower",
  27: "Nascent Water",
  28: "Sandium Soil",
  29: "Obsidian",
  30: "Crackstone",
  31: "Solidite",
  32: "Void Flower Soil",
  35: "Earth",
  38: "Crystal",
  40: "Dune",
  41: "Limestone",
  44: "Copper",
  51: "Auralite Crystal",
  52: "Vine",
};

const ELEMENT_NAMES: Readonly<Record<number, string>> = {
  1: "Sand",
  2: "Particle",
  3: "Water",
  4: "Wet Sand",
  5: "Sandium",
  6: "Residue",
  7: "Gold",
  8: "Gloom",
  9: "Shake",
  10: "Steam",
  11: "Fire",
  12: "Freezing Ice",
  13: "Flame",
  14: "Burnt Residue",
  15: "Seed",
  16: "Wet Seed",
  17: "Seedling",
  18: "Petalium",
  19: "Lava",
  20: "Basalt",
};

const STRUCTURE_NAMES: Readonly<Record<string, string>> = {
  "1": "Conveyor Left",
  "2": "Conveyor Right",
  "3": "Shaker Left",
  "4": "Shaker Right",
  "5": "Launcher Up",
  "6": "Launcher Left",
  "7": "Launcher Right",
  "8": "Splitter Left",
  "9": "Splitter Right",
  "10": "Dropper",
  "11": "Foundation",
  "12": "Angled Foundation Left",
  "13": "Triangle Foundation Left",
  "14": "Angled Foundation Right",
  "15": "Triangle Foundation Right",
  "16": "Collector",
  "17": "Filter Left",
  "18": "Filter Right",
  "19": "Sliding Foundation",
  "20": "Velocity Soaker",
  "21": "Planter Box",
  "22": "Sound Box",
  "23": "Pipe",
  "24": "Pump",
  "25": "Liquid Vent",
  "26": "Wall Light",
  "27": "Flux Emanator",
  aurixiteCrystallizer: "Aurixite Crystallizer",
  clearingFrameLeft: "Clearing Frame Left",
  clearingFrameRight: "Clearing Frame Right",
  conveyorLeftMk2: "Conveyor Left Mk2",
  conveyorRightMk2: "Conveyor Right Mk2",
  critterFence: "Critter Fence",
  electricityConnector: "Electricity Connector",
  filterLeftMk2: "Filter Left Mk2",
  filterRightMk2: "Filter Right Mk2",
  heatCannonDown: "Heat Cannon Down",
  heatCannonLeft: "Heat Cannon Left",
  heatCannonRight: "Heat Cannon Right",
  kineticFieldEmitter: "Kinetic Field Emitter",
  kineticFieldEmitterDownRight: "Kinetic Field Emitter Down Right",
  kineticFieldEmitterUp: "Kinetic Field Emitter Up",
  kineticFieldEmitterUpRight: "Kinetic Field Emitter Up Right",
  launcherLeftMk2: "Launcher Left Mk2",
  launcherRightMk2: "Launcher Right Mk2",
  launcherUpMk2: "Launcher Up Mk2",
  powerBrick: "Power Brick",
  quantumPortal: "Quantum Portal",
  quantumPortalExit: "Quantum Portal Exit",
  signalAnd: "Signal AND",
  signalBuffer: "Signal Buffer",
  signalButton: "Signal Button",
  signalGate: "Signal Gate",
  signalPulseSensor: "Signal Pulse Sensor",
  signalSensor: "Signal Sensor",
  signalToggle: "Signal Toggle",
  smelter: "Smelter",
  snowmaker: "Snowmaker",
  steamTurbine: "Steam Turbine",
  thermalRelay: "Thermal Relay",
  thermodryer: "Thermodryer",
  thermofroster: "Thermofroster",
  voidRift: "Void Rift",
};

export function saveExplorerTerrainName(type: number): string | undefined {
  return TERRAIN_NAMES[type];
}

export function saveExplorerElementName(type: number): string | undefined {
  return ELEMENT_NAMES[type];
}

export function saveExplorerStructureName(type: string | number): string | undefined {
  return STRUCTURE_NAMES[String(type)];
}

export function saveExplorerCellName(
  kind: SaveExplorerCellKind | undefined,
  type: number | undefined,
): string | undefined {
  if (type === undefined) return undefined;
  if (kind === "terrain") return saveExplorerTerrainName(type);
  if (kind === "settled-element" || kind === "moving-element" || kind === "moving-particle")
    return saveExplorerElementName(type);
  return undefined;
}
