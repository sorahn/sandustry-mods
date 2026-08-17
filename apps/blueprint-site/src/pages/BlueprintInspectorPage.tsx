import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { decodeBlueprint, type Blueprint } from "../utils/blueprint";
import { debugComponent } from "../components/DebugComponentWrapper";
import {
  BlueprintMapPanel,
  SHOW_GRID_KEY,
  SHOW_MAP_SIDEBAR_KEY,
  SHOW_PNG_BACKGROUND_KEY,
} from "../components/BlueprintMapPanel";
import { PersistentCheckbox } from "../components/PersistentCheckbox";
import {
  BlueprintSubmissionPanel,
  type BlueprintSummary,
} from "../components/BlueprintSubmissionPanel";
import { BlueprintStructuresPanel } from "../components/BlueprintStructuresPanel";

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

function structureLabel(type: Blueprint["data"][number]["type"]) {
  return typeof type === "number" ? `native ${type}` : type;
}

const REMEMBER_BLUEPRINT_KEY = "sandustry.blueprintInspector.remember";
const SAVED_BLUEPRINT_KEY = "sandustry.blueprintInspector.string";
const SAVED_MAP_VIEW_KEY = "sandustry.blueprintInspector.mapView";
function readLocalValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const stored = readLocalValue(key);
  return stored === null ? fallback : stored !== "false";
}

function writeLocalValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage can be unavailable in private browsing contexts.
  }
}

function removeLocalValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Local storage can be unavailable in private browsing contexts.
  }
}

export function BlueprintInspectorPage() {
  const [remember, setRemember] = useState(
    () => typeof window !== "undefined" && readLocalValue(REMEMBER_BLUEPRINT_KEY) === "true",
  );
  const [encoded, setEncoded] = useState(() => {
    if (typeof window === "undefined" || readLocalValue(REMEMBER_BLUEPRINT_KEY) !== "true") {
      return "";
    }
    return readLocalValue(SAVED_BLUEPRINT_KEY) ?? "";
  });
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [showMapSidebar, setShowMapSidebar] = useState(() =>
    readStoredBoolean(SHOW_MAP_SIDEBAR_KEY, true),
  );
  const [showGrid, setShowGrid] = useState(() => readStoredBoolean(SHOW_GRID_KEY, true));
  const [showPngBackground, setShowPngBackground] = useState(() =>
    readStoredBoolean(SHOW_PNG_BACKGROUND_KEY, false),
  );
  const [inspectedBlueprintKey, setInspectedBlueprintKey] = useState("");
  const [summary, setSummary] = useState<BlueprintSummary | null>(null);
  const [message, setMessage] = useState("Paste a v2 blueprint string to inspect it.");
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
  const rememberHeader = debugComponent(PersistentCheckbox, {
    boxed: true,
    defaultChecked: remember,
    storageKey: REMEMBER_BLUEPRINT_KEY,
    label: "remember",
    size: "small",
    onCheckedChange: (nextRemember: boolean) => {
      setRemember(nextRemember);
      if (nextRemember) writeLocalValue(SAVED_BLUEPRINT_KEY, encoded);
      else {
        removeLocalValue(SAVED_BLUEPRINT_KEY);
        removeLocalValue(SAVED_MAP_VIEW_KEY);
      }
    },
  });
  return (
    <section className="space-y-6">
      <div>
        <Link to="/" className="font-mono text-xs text-slate-500 hover:text-yellow-300">
          ← Home
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Blueprint Inspector</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Inspect the your sandustry blueprints here. <br />
          Unknown IDs remain in place, and can be selected for their raw details.
        </p>
      </div>
      <BlueprintSubmissionPanel
        encoded={encoded}
        message={message}
        rememberHeader={rememberHeader}
        summary={summary}
        blueprint={blueprint}
        onEncodedChange={(value) => {
          setEncoded(value);
          if (remember) writeLocalValue(SAVED_BLUEPRINT_KEY, value);
        }}
        onInspect={inspect}
      />
      {blueprint && summary ? (
        <>
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
          />
          <BlueprintStructuresPanel blueprint={blueprint} structureLabel={structureLabel} />
        </>
      ) : null}
    </section>
  );
}
