import { useEffect, useRef, useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { Button, Checkbox, Panel, Select, TextArea } from "@sandustry/ui/react";
import {
  decodeBlueprint,
  emptyBlueprint,
  encodeBlueprint,
  type Blueprint,
} from "../utils/blueprint";
import { catalogEntry } from "../utils/catalog";
import { debugComponent } from "../components/DebugComponentWrapper";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-sd-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-black/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
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
      <main className="mx-auto max-w-7xl px-6 py-10">
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
        <h1 className="font-mono text-3xl font-bold text-white">
          Read and convert your blueprints.
        </h1>
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
        <h1 className="mt-4 font-mono text-3xl font-bold text-white">Blueprint encode / decode</h1>
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

function tileColor(type: Blueprint["data"][number]["type"]) {
  if (typeof type === "number") return "#314158";
  let hash = 0;
  for (const character of type) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return ["#4b3c62", "#315a5e", "#66522f", "#563d46"][Math.abs(hash) % 4];
}

const REMEMBER_BLUEPRINT_KEY = "sandustry.blueprintInspector.remember";
const SAVED_BLUEPRINT_KEY = "sandustry.blueprintInspector.string";

function readLocalValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
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

function BlueprintMap({ blueprint }: { blueprint: Blueprint }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const padding = 2;
  const cell = 56;
  const xs = blueprint.data.length
    ? blueprint.data.flatMap((structure) => {
        const width = catalogEntry(structure.type)?.footprint.width ?? 1;
        return [structure.x, structure.x + width - 1];
      })
    : [0];
  const ys = blueprint.data.length
    ? blueprint.data.flatMap((structure) => {
        const height = catalogEntry(structure.type)?.footprint.height ?? 1;
        return [structure.y, structure.y + height - 1];
      })
    : [0];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = (maxX - minX + padding * 2 + 1) * cell;
  const height = (maxY - minY + padding * 2 + 1) * cell;
  const viewWidth = width / zoom;
  const viewHeight = height / zoom;
  const maxPanX = (width - viewWidth) / 2;
  const maxPanY = (height - viewHeight) / 2;
  const viewX = maxPanX + pan.x;
  const viewY = maxPanY + pan.y;
  const point = (x: number, y: number) => ({
    x: (x - minX + padding + 0.5) * cell,
    y: (y - minY + padding + 0.5) * cell,
  });
  const selected = selectedIndex === null ? null : blueprint.data[selectedIndex];
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setSelectedIndex(null);
  }, [blueprint]);
  const setMapZoom = (nextZoom: number) => {
    setZoom(nextZoom);
    setPan({ x: 0, y: 0 });
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div
        className="blueprint-map__viewport overflow-hidden rounded border border-slate-800 bg-[#33a8ff] p-3"
        translate="no"
      >
        <div className="mb-3 flex items-center justify-end gap-2 font-mono text-xs text-slate-500">
          <span className="mr-1">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="sd-button sd-button--compact"
            onClick={() => setMapZoom(Math.max(0.75, zoom / 1.25))}
            disabled={zoom <= 0.75}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="sd-button sd-button--compact"
            onClick={() => setMapZoom(1)}
            disabled={zoom === 1}
          >
            Fit
          </button>
          <button
            type="button"
            className="sd-button sd-button--compact"
            onClick={() => setMapZoom(Math.min(4, zoom * 1.25))}
            disabled={zoom >= 4}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
        <svg
          viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
          role="img"
          aria-label={`${blueprint.name} structure map`}
          preserveAspectRatio="xMidYMid meet"
          className="blueprint-map__canvas w-full"
          style={{
            cursor: dragRef.current ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
          }}
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            dragRef.current = {
              pointerId: event.pointerId,
              lastX: event.clientX,
              lastY: event.clientY,
              moved: false,
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const dx = event.clientX - drag.lastX;
            const dy = event.clientY - drag.lastY;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
              drag.moved = true;
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }
            const rect = event.currentTarget.getBoundingClientRect();
            setPan((current) => ({
              x: Math.max(-maxPanX, Math.min(maxPanX, current.x - (dx / rect.width) * viewWidth)),
              y: Math.max(-maxPanY, Math.min(maxPanY, current.y - (dy / rect.height) * viewHeight)),
            }));
            drag.lastX = event.clientX;
            drag.lastY = event.clientY;
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            suppressClickRef.current = drag.moved;
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          <defs>
            <pattern id="blueprint-grid" width={cell} height={cell} patternUnits="userSpaceOnUse">
              <path
                d={`M ${cell} 0 L 0 0 0 ${cell}`}
                fill="none"
                stroke="#17202c"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="#33a8ff" />
          <rect width={width} height={height} fill="url(#blueprint-grid)" />
          {(blueprint.signalLinks ?? []).map((link, index) => {
            const from = point(link.from.x, link.from.y);
            const to = point(link.to.x, link.to.y);
            return (
              <line
                key={`link-${index}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={link.on ? "#ffe700" : "#657082"}
                strokeDasharray={link.on ? undefined : "5 4"}
                strokeWidth="3"
                opacity=".8"
              />
            );
          })}
          {blueprint.data.map((structure, index) => {
            const entry = catalogEntry(structure.type);
            const footprint = entry?.footprint ?? { width: 1, height: 1 };
            const position = point(structure.x, structure.y);
            const left = (structure.x - minX + padding) * cell + 3;
            const top = (structure.y - minY + padding) * cell + 3;
            const tileWidth = footprint.width * cell - 6;
            const tileHeight = footprint.height * cell - 6;
            const labelX = left + tileWidth / 2;
            const labelY = top + tileHeight / 2 + 4;
            const isSelected = selectedIndex === index;
            return (
              <g
                key={`${index}-${structure.x}-${structure.y}`}
                role="button"
                tabIndex={0}
                aria-label={`Select ${structureLabel(structure.type)} at ${structure.x}, ${structure.y}`}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  setSelectedIndex(index);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setSelectedIndex(index);
                }}
                className="cursor-pointer"
              >
                <rect
                  x={left}
                  y={top}
                  width={tileWidth}
                  height={tileHeight}
                  rx="5"
                  fill={tileColor(structure.type)}
                  stroke={isSelected ? "#ffe700" : "#8491a3"}
                  strokeWidth={isSelected ? "4" : "1.5"}
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="11"
                  fontFamily="ui-monospace, monospace"
                >
                  {entry?.name ??
                    (typeof structure.type === "number"
                      ? structure.type
                      : structure.type.slice(0, 8))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <aside className="border-l border-slate-800 pl-4 text-xs text-slate-400">
        <p className="font-mono uppercase tracking-[0.18em] text-slate-500">Selected record</p>
        {selected ? (
          <div className="mt-3 space-y-3">
            <p className="break-all font-mono text-yellow-200">
              {catalogEntry(selected.type)?.name ?? structureLabel(selected.type)}
            </p>
            {catalogEntry(selected.type) ? (
              <p>
                Catalog footprint{" "}
                <strong className="text-white">
                  {catalogEntry(selected.type)!.footprint.width}×
                  {catalogEntry(selected.type)!.footprint.height}
                </strong>
              </p>
            ) : null}
            <p>
              Position{" "}
              <strong className="text-white">
                {selected.x}, {selected.y}
              </strong>
            </p>
            <p className="break-all whitespace-pre-wrap">
              {selected.filter ? `filter ${JSON.stringify(selected.filter, null, 2)}` : "No filter"}
            </p>
            <p className="break-all whitespace-pre-wrap">
              {selected.data !== undefined
                ? `data ${JSON.stringify(selected.data, null, 2)}`
                : "No structure data"}
            </p>
          </div>
        ) : (
          <p className="mt-3 leading-6">Choose a tile to inspect its raw blueprint record.</p>
        )}
      </aside>
    </div>
  );
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
      setSummary(summarizeBlueprint(value, decoded));
      setMessage(`Inspected ${decoded.data.length} structure(s) from ${decoded.name}.`);
    } catch (error) {
      setBlueprint(null);
      setSummary(null);
      setMessage(error instanceof Error ? error.message : "Unable to inspect blueprint.");
    }
  };
  const rememberHeader = debugComponent(Checkbox, {
    boxed: true,
    checked: remember,
    label: "remember",
    size: "small",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextRemember = event.target.checked;
      setRemember(nextRemember);
      writeLocalValue(REMEMBER_BLUEPRINT_KEY, String(nextRemember));
      if (nextRemember) writeLocalValue(SAVED_BLUEPRINT_KEY, encoded);
      else removeLocalValue(SAVED_BLUEPRINT_KEY);
    },
  });
  return (
    <section className="space-y-6">
      <div>
        <Link to="/" className="font-mono text-xs text-slate-500 hover:text-yellow-300">
          ← Home
        </Link>
        <h1 className="mt-4 font-mono text-3xl font-bold text-white">Blueprint inspector</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Inspect the decoded v2 records with a catalog-independent map. Unknown IDs remain visible
          instead of being discarded, and can be selected for their raw details.
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
          <Button accent onClick={inspect}>
            Inspect blueprint
          </Button>
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
          <Panel title="Blueprint map">
            <div className="p-4">
              <BlueprintMap blueprint={blueprint} />
              <p className="mt-4 text-xs text-slate-500">
                A small verified native/repository catalog supplies names and footprints. Other
                content remains visible through the unknown-ID fallback.
              </p>
            </div>
          </Panel>
          <Panel title="Structures">
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
