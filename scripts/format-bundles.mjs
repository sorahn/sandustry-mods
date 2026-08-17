import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const repoRoot = resolve(import.meta.dirname, "..");
const resourcesDirectory = join(repoRoot, "resources");

const bundles = existsSync(resourcesDirectory)
  ? readdirSync(resourcesDirectory)
      .filter((name) => /^bundle.*\.js$/.test(name))
      .map((name) => join(resourcesDirectory, name))
  : [];

if (bundles.length === 0) {
  console.log("No bundle files found.");
  process.exit(0);
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "sandustry-bundles-"));
const temporaryFiles = bundles.map((bundle) => {
  const temporaryFile = join(temporaryRoot, basename(bundle));
  cpSync(bundle, temporaryFile);
  return { bundle, temporaryFile };
});

try {
  execFileSync("npx", [
    "oxfmt",
    "--write",
    "--config",
    join(repoRoot, ".oxfmtrc.json"),
    ...temporaryFiles.map(({ temporaryFile }) => temporaryFile),
  ], { cwd: repoRoot, stdio: "inherit" });

  for (const { bundle, temporaryFile } of temporaryFiles) cpSync(temporaryFile, bundle);
  console.log(`Formatted ${bundles.length} bundle file${bundles.length === 1 ? "" : "s"}.`);
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}
