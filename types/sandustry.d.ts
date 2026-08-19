interface SandustryStructureData {
  elementId?: string | null;
  elementType?: number | null;
  [key: string]: any;
}

interface SandustryStructure {
  x: number;
  y: number;
  trapped?: boolean;
  data?: SandustryStructureData;
}

interface SandustryElementDefinition {
  id?: string;
  nameKey?: string;
  hidden?: boolean;
  metaColor?: number;
  matterType?: number;
}

interface SandustryElementInfo {
  type?: number;
}

interface SandustryUpgradeDefinition {
  itemId: string;
  itemNameKey?: string;
  categoryId?: string;
  upgrade: {
    id: string;
    nameKey?: string;
    descriptionKey?: string;
    maxLevel: number;
    costs: number[];
    oneOff?: boolean;
  };
}

interface SandustryFocusable {
  focused: boolean;
  ref: (element: HTMLElement | null) => void;
  focus: () => void;
}

interface SandustryNavigation {
  useFocusable(options: Record<string, any>): SandustryFocusable;
  useFocusScope(options: Record<string, any>): void;
  controllerFocusClass(focused: boolean): string;
}

interface SandustryEvents {
  on(event: string, callback: (...args: unknown[]) => void): void;
}

interface SandustrySettings {
  get<T = unknown>(key: string): T;
  getAll(): Record<string, unknown>;
  onChange(callback: () => void): void;
}

interface SandustryStructureBuildMode {
  type: string;
  directions?: string[];
}

interface SandustryStructureVariant {
  id: string | number;
  angles: number[];
}

interface SandustryStructureRender {
  imageName?: string;
  size?: { width: number; height: number };
  offset?: { x: number; y: number };
}

interface SandustryStructureDefinition {
  id: string;
  nameKey?: string;
  descriptionKey?: string;
  categoryKey?: string;
  order?: number;
  buildModes?: SandustryStructureBuildMode[];
  shape?: number[][];
  variants?: SandustryStructureVariant[];
  render?: SandustryStructureRender;
}

interface SandustryInputBindingHandlers {
  down?: () => void;
  up?: () => void;
}

interface SandustryInputBindingDefinition {
  displayName: string;
  category: string;
  handlers: SandustryInputBindingHandlers;
}

interface SandustryPropagationOptions {
  propagateToWorkers?: boolean;
}

interface SandustryApi {
  elements: {
    getDefinitionByType(type: number | null | undefined): SandustryElementDefinition | null;
    getRegisteredTypes(): number[];
    getTypeFromId(id: string | null | undefined): number | null;
    createAtCellWhenIdle(x: number, y: number, type: number): void;
    getInfoAtCell(x: number, y: number): SandustryElementInfo | null;
    getResolvedTypeAtCell(x: number, y: number): number | null;
    removeAtCellWhenIdle(x: number, y: number): void;
  };
  effects: {
    createLaserAtWorld(
      startWorldX: number,
      startWorldY: number,
      endWorldX: number,
      endWorldY: number,
      options?: Record<string, unknown>,
    ): any;
  };
  energy: { consume(amount: number, options?: { allOrNothing?: boolean }): number };
  excavation: {
    registerProfile(
      id: string,
      definition: { pattern: number[][]; power: number; options?: Record<string, unknown> },
    ): void;
  };
  events: SandustryEvents;
  hooks: {
    modify(
      hookId: string,
      callback: (args: Record<string, any>) => void,
      options?: Record<string, unknown>,
    ): () => void;
  };
  grid: {
    forEachCellInRect(
      x: number,
      y: number,
      width: number,
      height: number,
      callback: (cellX: number, cellY: number) => void,
    ): void;
  };
  i18n: {
    register(locale: string, translations: Record<string, string>): void;
    getName(definition: SandustryElementDefinition): string;
  };
  items: {
    getDefinitionById(id: string): any;
    updateDefinition(id: string, partial: Record<string, unknown>): void;
  };
  player: { buildings: { unlockByType(id: string): void } };
  raycast: {
    castFromWorld(
      startWorldX: number,
      startWorldY: number,
      angle: number,
      maxDistance: number,
    ): { x: number; y: number; distance: number } | null;
  };
  settings: SandustrySettings;
  sprites: { loadFromMod(id: string, path: string): Promise<unknown> };
  storage: { local: { get(key: string): unknown; set(key: string, value: string): void } };
  structures: {
    forEachOfType(id: string, callback: (structure: SandustryStructure) => void): void;
    register(definition: SandustryStructureDefinition): void;
    setSpritesheetIndex(structure: SandustryStructure, index: number): void;
    update(structure: SandustryStructure, options?: SandustryPropagationOptions): void;
    setData(
      structure: SandustryStructure,
      data: SandustryStructureData,
      options?: SandustryPropagationOptions,
    ): void;
  };
  terrains: {
    getTypeFromId(id: string): number | null;
    getTypeAtCell(x: number, y: number): number | null;
    isCellIdTerrain(cellId: number): boolean;
    isTypeAtCell(x: number, y: number, type: string): boolean;
    createAtCellWhenIdle(x: number, y: number, type: string): void;
    removeAtCellWhenIdle(x: number, y: number, options?: SandustryPropagationOptions): void;
  };
  triggers: { register(id: string, definition: { interval: number; callback: () => void }): void };
  upgrades: {
    register(definition: SandustryUpgradeDefinition): void;
    getLevelById(itemId: string, upgradeId: string): number;
  };
  ui: {
    update(componentId: number | string, options?: Record<string, unknown>): void;
    openPauseMenu(): void;
    toast(message: string, options?: Record<string, unknown>): void;
    inject(id: string, component: () => unknown): unknown;
    navigation: SandustryNavigation;
    prompt(...args: string[]): Promise<string | null>;
  };
  rendering: {
    getGridMetrics(): { cellSize: number; snapGridCellSize: number };
  };
  world: { isCellEmptyAtCell(x: number, y: number): boolean };
  action?: { getSelected(): { id?: string } | null };
  input: {
    registerBinding(
      bindingId: string,
      defaultKeys: string[],
      definition: SandustryInputBindingDefinition,
    ): string;
  };
}

interface SandustryEngineState {
  session: {
    cinematic?: unknown;
    settings: { videoZoom: number };
    windows: {
      menu: { open: boolean };
      options: { open: boolean };
    };
  };
}

interface SandustryEngine {
  api: Record<string, unknown>;
  state: SandustryEngineState;
}

declare const sandkit: {
  api: SandustryApi;
  engine: SandustryEngine;
  react: typeof import("react") & { Fragment?: unknown };
};

declare const React: typeof import("react");

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: any;
  }
}
