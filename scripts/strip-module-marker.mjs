import { readFileSync, writeFileSync } from "node:fs";

const path = process.argv[2];
const source = readFileSync(path, "utf8");
const output = source.replace(/\nexport \{\};\s*$/, "\n");
if (/\b(?:import|export)\b/.test(output)) {
  throw new Error(`Generated entry still contains module syntax: ${path}`);
}
writeFileSync(path, output);
