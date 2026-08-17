// @ts-expect-error The browser app intentionally does not include the full Node type package.
import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function gitCommit() {
  const githubSha = (
    globalThis as typeof globalThis & {
      process?: { env?: { GITHUB_SHA?: string } };
    }
  ).process?.env?.GITHUB_SHA;
  if (githubSha) return githubSha;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig(({ command, mode }) => ({
  base: command === "serve" || mode === "preview" ? "/" : "/sandustry-tools/",
  plugins: [react(), tailwindcss()],
  define: {
    __GIT_COMMIT__: JSON.stringify(gitCommit().slice(0, 7)),
  },
}));
