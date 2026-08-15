import { readFileSync, writeFileSync } from "node:fs";

const [path, part] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(path, "utf8"));
const version = manifest.version.split(".").map(Number);
const index = { major: 0, minor: 1, patch: 2 }[part];
if (index === undefined || version.length !== 3 || version.some(Number.isNaN)) {
  throw new Error("version must be major.minor.patch");
}
version[index] += 1;
for (let i = index + 1; i < 3; i += 1) version[i] = 0;
manifest.version = version.join(".");
writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
