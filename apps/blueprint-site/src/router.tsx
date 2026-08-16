import { useState } from "react";
import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router";
import { Button, Panel } from "@sandustry/ui/react";
import { decodeBlueprint, emptyBlueprint, encodeBlueprint, type Blueprint } from "./blueprint";

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-sd-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-black/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-mono text-sm font-bold tracking-[0.2em] text-yellow-300">
            SANDUSTRY / BLUEPRINTS
          </Link>
          <nav className="flex gap-4 font-mono text-xs text-slate-400">
            <Link to="/" activeProps={{ className: "text-yellow-300" }}>
              Home
            </Link>
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
  ),
});

function BlueprintCodecPage() {
  const [encoded, setEncoded] = useState("");
  const [json, setJson] = useState(JSON.stringify(emptyBlueprint, null, 2));
  const [message, setMessage] = useState("Paste a blueprint string or edit the normalized JSON.");
  const [format, setFormat] = useState<"binary" | "text">("binary");
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
        `Encoded ${value.data.length} structure(s) as ${format === "binary" ? "v2 binary" : "v2 text"}.`,
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
            <textarea
              value={encoded}
              onChange={(event) => setEncoded(event.target.value)}
              placeholder="SAND:BP:v2:..."
              spellCheck={false}
              className="min-h-80 w-full resize-y border border-slate-700 bg-black/70 p-3 font-mono text-xs leading-6 text-slate-200 placeholder:text-slate-600"
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
            <textarea
              value={json}
              onChange={(event) => setJson(event.target.value)}
              spellCheck={false}
              className="min-h-80 w-full resize-y border border-slate-700 bg-black/70 p-3 font-mono text-xs leading-6 text-slate-200"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="font-mono text-xs text-slate-400">
                Format{" "}
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value as "binary" | "text")}
                  className="ml-2 border border-slate-700 bg-black px-2 py-1 text-xs text-slate-200"
                >
                  <option value="binary">v2 binary</option>
                  <option value="text">v2 text</option>
                </select>
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

const codecRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/codec",
  component: BlueprintCodecPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <section className="grid min-h-[60vh] place-items-center">
      <Panel className="w-full max-w-2xl p-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-slate-500">
          Universal blueprint renderer
        </p>
        <h1 className="font-mono text-3xl font-bold text-white">Blueprint tools are loading in.</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
          This is the standalone browser workspace. Blueprint decoding, catalogs, rendering, and
          import/export will be added here without depending on the Sandustry mod runtime.
        </p>
        <div className="mt-8 flex gap-3">
          <Button accent>Open blueprint</Button>
          <Button>Documentation</Button>
        </div>
      </Panel>
    </section>
  ),
});

const routeTree = rootRoute.addChildren([indexRoute, codecRoute]);
export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
