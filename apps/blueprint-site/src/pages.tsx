import { useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { Button, Panel, Select, TextArea } from "@sandustry/ui/react";
import { decodeBlueprint, emptyBlueprint, encodeBlueprint, type Blueprint } from "./blueprint";

export function AppLayout() {
  return (
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
                  onChange={(event) => setFormat(event.target.value as "binary" | "text")}
                  className="ml-2"
                >
                  <option value="binary">v2 binary</option>
                  <option value="text">v2 text</option>
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
