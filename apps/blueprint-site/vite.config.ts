import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function runGit(command: string) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function gitInfo() {
  const githubSha = (
    globalThis as typeof globalThis & {
      process?: { env?: { GITHUB_SHA?: string } };
    }
  ).process?.env?.GITHUB_SHA;
  if (githubSha) {
    return { label: githubSha.slice(0, 7), commit: githubSha };
  }
  try {
    const branch = runGit("git symbolic-ref --short HEAD");
    const commit = runGit("git rev-parse HEAD");
    const dirty = runGit("git status --porcelain").length > 0;
    return dirty
      ? { label: `[${branch}] HEAD`, commit: null }
      : { label: commit.slice(0, 7), commit };
  } catch {
    return { label: "[detached] HEAD", commit: null };
  }
}

export default defineConfig(({ command, mode }) => ({
  base: command === "serve" || mode === "preview" ? "/" : "/sandustry-tools/",
  plugins: [react(), tailwindcss()],
  define: {
    __GIT_INFO__: JSON.stringify(gitInfo()),
  },
}));
