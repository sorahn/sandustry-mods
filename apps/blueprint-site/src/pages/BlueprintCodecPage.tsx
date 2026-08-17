import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button, Panel, Select, TextArea } from "@sandustry/ui/react";
import {
  decodeBlueprint,
  emptyBlueprint,
  encodeBlueprint,
  type Blueprint,
} from "../utils/blueprint";

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
