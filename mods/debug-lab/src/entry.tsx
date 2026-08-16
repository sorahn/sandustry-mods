import { ENABLED_PROBES } from "./debug/config";
import { DebugContext } from "./debug/common";
import { dumpEnums } from "./debug/enums";
import { copyHotbar, dumpHotbar, pasteHotbarFromClipboard } from "./debug/hotbar";
import { dumpClipboardCursor, startClipboardCursorWatch } from "./debug/clipboard-cursor";
import {
  dumpBlueprintNamespace,
  dumpClipboardNamespace,
  probeBlueprintReads,
  probeClipboardReads,
} from "./debug/namespace";
import { dumpRuntimeSurface } from "./debug/runtime-surface";
import {
  copyStructureCatalog,
  dumpCatalogNamespaces,
  probeCatalogReads,
  probeKnownStructureDefinitions,
} from "./debug/catalog";

const context: DebugContext = {
  api: sandkit.api,
  engine: sandkit.engine,
  sandkit,
};

function dumpEnabledProbes(): void {
  if (ENABLED_PROBES.runtimeSurface) dumpRuntimeSurface(context);
  if (ENABLED_PROBES.enums) dumpEnums(context);
  if (ENABLED_PROBES.hotbar) dumpHotbar(context);
  if (ENABLED_PROBES.clipboardCursor) dumpClipboardCursor(context);
  if (ENABLED_PROBES.blueprints) dumpBlueprintNamespace(context);
  if (ENABLED_PROBES.blueprintReads) probeBlueprintReads(context);
  if (ENABLED_PROBES.catalog) dumpCatalogNamespaces(context);
  if (ENABLED_PROBES.catalogReads) probeCatalogReads(context);
  if (ENABLED_PROBES.knownStructureDefinitions) probeKnownStructureDefinitions(context);
  if (ENABLED_PROBES.structureCatalog) copyStructureCatalog(context);
  if (ENABLED_PROBES.clipboard) dumpClipboardNamespace(context);
  if (ENABLED_PROBES.clipboardReads) probeClipboardReads(context);
}

function registerBinding(id: string, keys: string[], handler: () => void): void {
  context.api.input.registerBinding(id, keys, {
    displayName: id,
    category: "interface",
    handlers: { down: handler },
  });
}

registerBinding("Debug Lab - Dump Enabled Probes", ["F8"], dumpEnabledProbes);
registerBinding("Debug Lab - Copy Hotbar JSON", ["F9"], () => copyHotbar(context));
registerBinding("Debug Lab - Paste Hotbar JSON", ["F10"], () => {
  void pasteHotbarFromClipboard(context);
});

if (ENABLED_PROBES.clipboardCursorWatch) startClipboardCursorWatch(context);

setTimeout(() => {
  console.info(
    "[Sandustry Debug Lab] loaded. F8 runs enabled probes including structure catalog JSON, F9 copies hotbar JSON, and F10 pastes a complete hotbar snapshot.",
  );
}, 0);
