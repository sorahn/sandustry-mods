import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [modDir, archive] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(`${modDir}/modinfo.json`, "utf8"));
if (manifest.entry !== "entry.js") throw new Error("manifest entry must be entry.js");
const listing = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" });
for (const required of ["entry.js", "modinfo.json"]) {
  if (!listing.split("\n").includes(required)) throw new Error(`archive is missing ${required}`);
}
