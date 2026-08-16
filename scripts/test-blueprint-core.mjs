import assert from "node:assert/strict";
import { build } from "esbuild";

const result = await build({
  bundle: true,
  entryPoints: ["packages/sandustry-blueprint-core/src/index.ts"],
  format: "esm",
  platform: "node",
  write: false,
});
const source = result.outputFiles[0].text;
const core = await import(`data:text/javascript,${encodeURIComponent(source)}`);

const fixture = {
  name: "Codec fixture",
  data: [
    { type: 12, x: 4, y: 7 },
    { type: "example.mod:machine", x: 9, y: 2, filter: { mode: "block", density: 3, elementType: 5 } },
    { type: "example.mod:machine", x: 10, y: 2, filter: { mode: "allow", elementType: [1, 2], affectsLiquid: true }, data: { setting: "fast", enabled: true } },
  ],
  signalLinks: [{ from: { x: 4, y: 7 }, to: { x: 9, y: 2 }, on: true }],
};

assert.deepEqual(core.decodeBlueprint(core.encodeBlueprint(fixture)), fixture);
assert.deepEqual(core.decodeBlueprint(core.encodeBlueprint(fixture, "text")), fixture);
assert.deepEqual(core.decodeBlueprint(core.encodeBlueprint({ name: "Empty", data: [], signalLinks: null })), { name: "Empty", data: [], signalLinks: [] });

const errors = [
  ["SAND:BP:v1:ignored", "Legacy v1 blueprint strings are not supported"],
  ["SAND:BP:v2:not-base64!", "Invalid base64 blueprint data"],
  ["SAND:BP:v2t:4,1", "Invalid or truncated"],
  ["SAND:UNKNOWN:value", "Unsupported blueprint prefix"],
];
for (const [input, message] of errors) {
  assert.throws(() => core.decodeBlueprint(input), new RegExp(message));
}

assert.throws(() => core.decodeBlueprint("SAND:BP:v2t:4,1,0,999"), /Invalid v2 text blueprint data/);
console.log("blueprint core tests passed");
