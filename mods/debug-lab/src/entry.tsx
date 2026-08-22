import { DebugContext } from "./debug/common";
import { copyHotbar, pasteHotbarFromClipboard } from "./debug/hotbar";
import { copyTerrainCatalog } from "./debug/terrain";

const context: DebugContext = {
  api: sandkit.api,
  engine: sandkit.engine,
  sandkit,
};

function copyTerrainPalette(): void {
  copyTerrainCatalog(context);
}

function registerBinding(id: string, keys: string[], handler: () => void): void {
  context.api.input.registerBinding(id, keys, {
    displayName: id,
    category: "interface",
    handlers: { down: handler },
  });
}

registerBinding("Debug Lab - Copy Terrain Palette", ["F8"], copyTerrainPalette);
registerBinding("Debug Lab - Copy Hotbar JSON", ["F9"], () => copyHotbar(context));
registerBinding("Debug Lab - Paste Hotbar JSON", ["F10"], () => {
  void pasteHotbarFromClipboard(context);
});

setTimeout(() => {
  console.info(
    "[Sandustry Debug Lab] loaded. F8 copies the terrain palette needed by the save explorer; F9 copies hotbar JSON, and F10 pastes a complete hotbar snapshot.",
  );
}, 0);
