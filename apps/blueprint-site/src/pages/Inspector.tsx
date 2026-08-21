import { useEffect, useRef, useState } from "react";
import { structureLabel } from "@sandustry/blueprint-core";
import { decodeBlueprint, type Blueprint } from "../utils/blueprint";
import { debugComponent } from "../components/DebugComponentWrapper";
import { BlueprintMapPanel } from "../components/BlueprintMapPanel";
import { PersistentCheckbox } from "../components/PersistentCheckbox";
import {
  BlueprintSubmissionPanel,
  type BlueprintSummary,
} from "../components/BlueprintSubmissionPanel";
import { BlueprintStructuresPanel } from "../components/BlueprintStructuresPanel";
import { PageHeader } from "../components/PageHeader";
import {
  readStorageValue,
  readStoredBoolean,
  removeStorageValue,
  writeStorageValue,
} from "../utils/storage";
import {
  REMEMBER_BLUEPRINT_KEY,
  SAVED_BLUEPRINT_KEY,
  SAVED_MAP_VIEW_KEY,
  SHOW_GRID_KEY,
  SHOW_MAP_SIDEBAR_KEY,
  SHOW_PNG_BACKGROUND_KEY,
  SHOW_DEBUG_CELLS_KEY,
  SHOW_NAMES_KEY,
  SHOW_SPRITES_KEY,
  SHOW_CUSTOM_SHAPES_KEY,
  SHOW_FOUNDATION_OUTLINES_KEY,
  SHOW_SIGNAL_LINKS_KEY,
  SHOW_RAW_STRUCTURES_KEY,
} from "../utils/storage-keys";

function summarizeBlueprint(input: string, blueprint: Blueprint): BlueprintSummary {
  const xs = blueprint.data.length ? blueprint.data.map(({ x }) => x) : [0];
  const ys = blueprint.data.length ? blueprint.data.map(({ y }) => y) : [0];
  const types = new Set(blueprint.data.map(({ type }) => type));
  const numericTypes = [...types].filter((type) => typeof type === "number").length;
  return {
    format: input.trim().startsWith("SAND:BP:v2t:") ? "v2 text" : "v2 binary",
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    types: types.size,
    numericTypes,
    stringTypes: types.size - numericTypes,
    filters: blueprint.data.filter(({ filter }) => filter !== undefined).length,
    dataRecords: blueprint.data.filter(({ data }) => data !== undefined).length,
    links: blueprint.signalLinks?.length ?? 0,
  };
}

const MAP_PANEL_SCROLL_OFFSET = 16;
export function BlueprintInspectorPage() {
  const [remember, setRemember] = useState(
    () => readStorageValue(REMEMBER_BLUEPRINT_KEY) === "true",
  );
  const [encoded, setEncoded] = useState(() => {
    if (readStorageValue(REMEMBER_BLUEPRINT_KEY) !== "true") {
      return "";
    }
    return readStorageValue(SAVED_BLUEPRINT_KEY) ?? "";
  });
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [showMapSidebar, setShowMapSidebar] = useState(() =>
    readStoredBoolean(SHOW_MAP_SIDEBAR_KEY, true),
  );
  const [showGrid, setShowGrid] = useState(() => readStoredBoolean(SHOW_GRID_KEY, true));
  const [showPngBackground, setShowPngBackground] = useState(() =>
    readStoredBoolean(SHOW_PNG_BACKGROUND_KEY, false),
  );
  const [resetVersion, setResetVersion] = useState<number | undefined>(undefined);
  const resetMapOptions = () => {
    setShowMapSidebar(true);
    setShowGrid(true);
    setShowPngBackground(false);
    for (const key of [
      SHOW_MAP_SIDEBAR_KEY,
      SHOW_GRID_KEY,
      SHOW_PNG_BACKGROUND_KEY,
      SHOW_DEBUG_CELLS_KEY,
      SHOW_NAMES_KEY,
      SHOW_SPRITES_KEY,
      SHOW_CUSTOM_SHAPES_KEY,
      SHOW_FOUNDATION_OUTLINES_KEY,
      SHOW_SIGNAL_LINKS_KEY,
      SHOW_RAW_STRUCTURES_KEY,
      SAVED_MAP_VIEW_KEY,
    ]) {
      removeStorageValue(key);
    }
    setResetVersion((version) => (version ?? 0) + 1);
  };
  const [inspectedBlueprintKey, setInspectedBlueprintKey] = useState("");
  const [summary, setSummary] = useState<BlueprintSummary | null>(null);
  const [message, setMessage] = useState("Paste a v2 blueprint string to inspect it.");
  const mapPanelRef = useRef<HTMLDivElement>(null);
  const inspect = () => {
    const value = encoded.trim();
    if (value.startsWith("SAND:BP:v1:") || value.startsWith("SAND:BACKUP:v1:")) {
      setBlueprint(null);
      setSummary(null);
      setMessage(
        "Legacy v1 strings are available in the codec, but are not supported by the renderer inspector.",
      );
      return;
    }
    try {
      const decoded = decodeBlueprint(value);
      setBlueprint(decoded);
      setInspectedBlueprintKey(value);
      setSummary(summarizeBlueprint(value, decoded));
      setMessage(`Inspected ${decoded.data.length} structure(s) from ${decoded.name}.`);
    } catch (error) {
      setBlueprint(null);
      setSummary(null);
      setMessage(error instanceof Error ? error.message : "Unable to inspect blueprint.");
    }
  };
  useEffect(() => {
    if (remember && encoded.trim()) inspect();
    // The initial remembered value should be inspected once after the page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!blueprint || !summary || !mapPanelRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const panel = mapPanelRef.current;
      if (!panel) return;
      const top = window.scrollY + panel.getBoundingClientRect().top - MAP_PANEL_SCROLL_OFFSET;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [blueprint, inspectedBlueprintKey, summary]);
  const rememberHeader = debugComponent(PersistentCheckbox, {
    boxed: true,
    defaultChecked: remember,
    storageKey: REMEMBER_BLUEPRINT_KEY,
    label: "remember",
    size: "small",
    onCheckedChange: (nextRemember: boolean) => {
      setRemember(nextRemember);
      if (nextRemember) writeStorageValue(SAVED_BLUEPRINT_KEY, encoded);
      else {
        removeStorageValue(SAVED_BLUEPRINT_KEY);
        removeStorageValue(SAVED_MAP_VIEW_KEY);
      }
    },
  });
  return (
    <section className="space-y-6">
      <PageHeader title="Blueprint Inspector">
        Inspect your Sandustry blueprints here. <br />
        Browse and share your prints with the community at the{" "}
        <a rel="noopener noreferrer" target="_blank" href="https://sandustryvault.com/">
          Sandustry Vault
        </a>
        !
      </PageHeader>
      <BlueprintSubmissionPanel
        encoded={encoded}
        message={message}
        rememberHeader={rememberHeader}
        summary={summary}
        blueprint={blueprint}
        onEncodedChange={(value) => {
          setEncoded(value);
          if (remember) writeStorageValue(SAVED_BLUEPRINT_KEY, value);
        }}
        onClear={() => {
          setEncoded("");
          if (remember) writeStorageValue(SAVED_BLUEPRINT_KEY, "");
        }}
        onInspect={inspect}
      />
      {blueprint && summary ? (
        <>
          <div ref={mapPanelRef} className="scroll-mt-4">
            <BlueprintMapPanel
              blueprint={blueprint}
              remember={remember}
              blueprintKey={inspectedBlueprintKey}
              showSidebar={showMapSidebar}
              onShowSidebarChange={setShowMapSidebar}
              showGrid={showGrid}
              onShowGridChange={setShowGrid}
              showPngBackground={showPngBackground}
              onShowPngBackgroundChange={setShowPngBackground}
              resetVersion={resetVersion}
              onResetMapOptions={resetMapOptions}
            />
          </div>
          <BlueprintStructuresPanel blueprint={blueprint} structureLabel={structureLabel} />
        </>
      ) : null}
    </section>
  );
}
