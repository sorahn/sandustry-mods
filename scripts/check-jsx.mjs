import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const outputDir = mkdtempSync(join(tmpdir(), "sandustry-jsx-"));
try {
  execFileSync(
    "npx",
    [
      "tsc",
      "--ignoreConfig",
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--jsx",
      "react",
      "--jsxFactory",
      "sandkit.react.createElement",
      "--removeComments",
      "--skipLibCheck",
      "--outDir",
      outputDir,
      "tests/tsx/fixture.tsx",
      "types/sandustry.d.ts",
    ],
    { stdio: "inherit" },
  );
  const output = readFileSync(join(outputDir, "fixture.js"), "utf8");
  if (!output.includes("sandkit.react.createElement")) {
    throw new Error("JSX fixture did not use the Sandustry JSX factory");
  }
  if (/\b(import|export)\s/.test(output)) {
    throw new Error("JSX fixture emitted module syntax");
  }
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
