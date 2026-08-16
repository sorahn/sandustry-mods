interface SandustryStructureData {
  elementId?: string | null;
  elementType?: number | null;
  [key: string]: any;
}

interface SandustryStructure {
  x: number;
  y: number;
  data?: SandustryStructureData;
}

interface SandustryElementDefinition {
  id?: string;
  hidden?: boolean;
  metaColor?: number;
  matterType?: number;
}

interface SandustryElementInfo {
  type?: number;
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

interface SandustryApi {
  elements: {
    getDefinitionByType(type: number | null | undefined): SandustryElementDefinition | null;
    getRegisteredTypes(): number[];
    getTypeFromId(id: string | null | undefined): number | null;
    createAtCellWhenIdle(x: number, y: number, type: number): void;
    getInfoAtCell(x: number, y: number): SandustryElementInfo | null;
    removeAtCellWhenIdle(x: number, y: number): void;
  };
  events: Record<string, any>;
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
  player: { buildings: { unlockByType(id: string): void } };
  settings: Record<string, any>;
  sprites: { loadFromMod(id: string, path: string): Promise<unknown> };
  storage: { local: { get(key: string): unknown; set(key: string, value: string): void } };
  structures: {
    forEachOfType(id: string, callback: (structure: SandustryStructure) => void): void;
    register(definition: Record<string, any>): void;
    setData(
      structure: SandustryStructure,
      data: SandustryStructureData,
      options?: Record<string, any>,
    ): void;
  };
  triggers: { register(id: string, definition: { interval: number; callback: () => void }): void };
  ui: {
    update(componentId: number | string, options?: Record<string, unknown>): void;
    openPauseMenu(): void;
    toast(message: string, options?: Record<string, unknown>): void;
    inject(id: string, component: () => unknown): unknown;
    navigation: SandustryNavigation;
    prompt(...args: string[]): Promise<string | null>;
  };
  world: { isCellEmptyAtCell(x: number, y: number): boolean };
  action?: { getSelected(): { id?: string } | null };
  input: {
    registerBinding(
      bindingId: string,
      defaultKeys: string[],
      definition: Record<string, unknown>,
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
