import { useEffect, useRef, useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { Button, Panel, Select, TextArea } from "@sandustry/ui/react";
import {
  decodeBlueprint,
  emptyBlueprint,
  encodeBlueprint,
  type Blueprint,
} from "../utils/blueprint";
import { debugComponent } from "../components/DebugComponentWrapper";
import {
  BlueprintMapPanel,
  SHOW_GRID_KEY,
  SHOW_MAP_SIDEBAR_KEY,
  SHOW_PNG_BACKGROUND_KEY,
} from "../components/BlueprintMapPanel";
import { PersistentCheckbox } from "../components/PersistentCheckbox";
import { BlueprintMap } from "../components/BlueprintMap";
import { catalogVisualFixture } from "../visual-fixtures/catalog";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-sd-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-black/50">
        <div className="site-shell mx-auto flex w-full items-center justify-between px-6 py-4">
          <Link to="/" className="font-mono text-sm font-bold tracking-[0.2em] text-yellow-300">
            SANDUSTRY / BLUEPRINT TOOLS
          </Link>
          <nav className="flex gap-4 font-mono text-xs text-slate-400">
            <Link to="/" activeProps={{ className: "text-yellow-300" }}>
              Home
            </Link>
            {debugComponent(Link, {
              to: "/inspect",
              activeProps: { className: "text-yellow-300" },
              children: "Inspect",
            })}
            <Link to="/codec" activeProps={{ className: "text-yellow-300" }}>
              Encode / Decode
            </Link>
          </nav>
        </div>
      </header>
      <main className="site-shell mx-auto w-full px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

export function HomePage() {
  return (
    <section className="grid min-h-[60vh] place-items-center">
      <Panel className="w-full max-w-2xl p-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-yellow-300/80">
          Sandustry blueprint tools
        </p>
        <h1 className="text-3xl font-bold text-white">Read and convert your blueprints.</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
          Paste a Sandustry blueprint string to inspect its contents, or turn readable JSON back
          into a string. Everything runs locally in your browser.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/codec" className="sd-button sd-button--accent">
            Open the codec
          </Link>
        </div>
        <div className="mt-8 grid gap-3 border-t border-slate-800 pt-5 text-xs text-slate-500 sm:grid-cols-3">
          <span>
            <strong className="text-slate-300">In the browser.</strong>
            <br />
            No upload or account required.
          </span>
          <span>
            <strong className="text-slate-300">Readable data.</strong>
            <br />
            View structures, filters, and links as JSON.
          </span>
          <span>
            <strong className="text-slate-300">Current formats.</strong>
            <br />
            Supports v2 binary, v2 text, and v1 strings.
          </span>
        </div>
      </Panel>
    </section>
  );
}

export function BlueprintCodecPage() {
  const [encoded, setEncoded] = useState("");
  const [json, setJson] = useState(JSON.stringify(emptyBlueprint, null, 2));
  const [message, setMessage] = useState("Paste a blueprint string or edit the normalized JSON.");
  const [format, setFormat] = useState<"binary" | "text" | "legacy">("binary");
  const decode = () => {
    try {
      const value = decodeBlueprint(encoded);
      setJson(JSON.stringify(value, null, 2));
      setMessage(`Decoded ${value.data.length} structure(s) from ${value.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to decode blueprint.");
    }
  };
  const encode = () => {
    try {
      const value = JSON.parse(json) as Blueprint;
      setEncoded(encodeBlueprint(value, format));
      setMessage(
        format === "legacy"
          ? `Encoded ${value.data.length} structure(s) as legacy v1. Legacy v1 is for browser conversion only.`
          : `Encoded ${value.data.length} structure(s) as ${format === "binary" ? "v2 binary" : "v2 text"}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to encode JSON.");
    }
  };
  return (
    <section className="space-y-6">
      <div>
        <Link to="/" className="font-mono text-xs text-slate-500 hover:text-yellow-300">
          ← Home
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Blueprint encode / decode</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Convert locally in your browser. Nothing is uploaded. The normalized JSON preserves
          structure IDs, filters, arbitrary structure data, and v4 signal links.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Blueprint string">
          <div className="space-y-4 p-4">
            <TextArea
              value={encoded}
              onChange={(event) => setEncoded(event.target.value)}
              placeholder="SAND:BP:v2:..."
              spellCheck={false}
              className="placeholder:text-slate-600"
            />
            <div className="flex flex-wrap gap-3">
              <Button accent onClick={decode}>
                Decode to JSON
              </Button>
              <Button onClick={() => navigator.clipboard?.writeText(encoded)}>Copy string</Button>
            </div>
          </div>
        </Panel>
        <Panel title="Normalized JSON">
          <div className="space-y-4 p-4">
            <TextArea
              value={json}
              onChange={(event) => setJson(event.target.value)}
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="font-mono text-xs text-slate-400">
                Format{" "}
                <Select
                  value={format}
                  onChange={(event) =>
                    setFormat(event.target.value as "binary" | "text" | "legacy")
                  }
                  className="ml-2"
                >
                  <option value="binary">v2 binary</option>
                  <option value="text">v2 text</option>
                  <option value="legacy">legacy v1 (conversion only)</option>
                </Select>
              </label>
              <Button accent onClick={encode}>
                Encode string
              </Button>
              <Button onClick={() => navigator.clipboard?.writeText(json)}>Copy JSON</Button>
            </div>
          </div>
        </Panel>
      </div>
      <p
        role="status"
        className="border-l-2 border-yellow-300/60 bg-black/40 px-3 py-2 font-mono text-xs text-slate-400"
      >
        {message}
      </p>
    </section>
  );
}

type BlueprintSummary = {
  format: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  types: number;
  numericTypes: number;
  stringTypes: number;
  filters: number;
  dataRecords: number;
  links: number;
};

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

function BlueprintInspectorEditorPage() {
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
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Inspect the your sandustry blueprints here. <br />
          Unknown IDs remain in place, and can be selected for their raw details.
        </p>
      </div>
      <Panel title="Blueprint string" header={rememberHeader}>
        <div className="space-y-4 p-4">
          <TextArea
            value={encoded}
            onChange={(event) => {
              const value = event.target.value;
              setEncoded(value);
              if (remember) writeLocalValue(SAVED_BLUEPRINT_KEY, value);
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                inspect();
              }
            }}
            placeholder="SAND:BP:v2:..."
            spellCheck={false}
            className="min-h-48 placeholder:text-slate-600"
          />
          <Button onClick={inspect}>Inspect blueprint</Button>
        </div>
      </Panel>
      <p
        role="status"
        className="border-l-2 border-yellow-300/60 bg-black/40 px-3 py-2 font-mono text-xs text-slate-400"
      >
        {message}
      </p>
      {blueprint && summary ? (
        <>
          <Panel title={`${blueprint.name} · ${summary.format}`}>
            <div className="grid gap-3 p-4 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
              <span>
                Structures <strong className="text-white">{blueprint.data.length}</strong>
              </span>
              <span>
                Types <strong className="text-white">{summary.types}</strong> (
                {summary.numericTypes} native / {summary.stringTypes} string)
              </span>
              <span>
                Bounds{" "}
                <strong className="text-white">
                  {summary.minX},{summary.minY}
                </strong>{" "}
                →{" "}
                <strong className="text-white">
                  {summary.maxX},{summary.maxY}
                </strong>
              </span>
              <span>
                Links <strong className="text-white">{summary.links}</strong> · Filters{" "}
                <strong className="text-white">{summary.filters}</strong> · Data{" "}
                <strong className="text-white">{summary.dataRecords}</strong>
              </span>
            </div>
          </Panel>
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
          <Panel title="Structures" collapsible defaultCollapsed>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left font-mono text-xs">
                <thead className="border-b border-slate-800 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">type</th>
                    <th className="px-4 py-3">position</th>
                    <th className="px-4 py-3">details</th>
                  </tr>
                </thead>
                <tbody>
                  {blueprint.data.map((structure, index) => (
                    <tr
                      key={`${index}-${structure.x}-${structure.y}`}
                      className="border-b border-slate-900 align-top text-slate-300"
                    >
                      <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                      <td className="px-4 py-3 break-all text-yellow-200">
                        {structureLabel(structure.type)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {structure.x}, {structure.y}
                      </td>
                      <td className="max-w-xl whitespace-pre-wrap break-all px-4 py-3 text-slate-500">
                        {structure.filter ? `filter ${JSON.stringify(structure.filter)}` : ""}
                        {structure.filter && structure.data !== undefined ? " · " : ""}
                        {structure.data !== undefined
                          ? `data ${JSON.stringify(structure.data)}`
                          : ""}
                        {structure.filter === undefined && structure.data === undefined ? "—" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}
    </section>
  );
}

export function BlueprintInspectorPage() {
  const visualParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const visualFixture = visualParams?.get("visualFixture");
  const visualBlueprintInput = visualParams?.get("visualBlueprint");
  const visualCapture = visualParams?.get("visualCapture") === "1";
  let visualBlueprint = visualFixture === "catalog" ? catalogVisualFixture : null;
  if (visualBlueprintInput) {
    try {
      visualBlueprint = decodeBlueprint(visualBlueprintInput);
    } catch (error) {
      return (
        <pre className="blueprint-visual-test-error">
          {error instanceof Error ? error.message : "Unable to decode visual blueprint."}
        </pre>
      );
    }
  }
  if (visualBlueprint) {
    return (
      <div
        className={`blueprint-visual-test${visualCapture ? " blueprint-visual-test--capture" : ""}`}
      >
        <BlueprintMap
          blueprint={visualBlueprint}
          remember={false}
          blueprintKey={`visual-${visualBlueprint.name}`}
          showSidebar={false}
          showGrid={true}
          showPngBackground={true}
          captureOnly={visualCapture}
        />
      </div>
    );
  }
  return <BlueprintInspectorEditorPage />;
}
