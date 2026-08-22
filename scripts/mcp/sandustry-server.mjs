#!/usr/bin/env node

/**
 * Dependency-free MCP stdio server scaffold for a Sandustry debug session.
 * Phase 1 discovers the existing main-process and renderer debug targets.
 */
import http from "node:http";
import readline from "node:readline";

const HOST = "127.0.0.1";
const DEFAULT_MAIN_PORT = 9230;
const DEFAULT_RENDERER_PORT = 9222;
const MCP_PROTOCOL_VERSION = "2025-06-18";

const args = process.argv.slice(2);
const mainPort = numberArgument("--main-port", "SANDUSTRY_MAIN_DEBUG_PORT", DEFAULT_MAIN_PORT);
const rendererPort = numberArgument(
  "--renderer-port",
  "SANDUSTRY_RENDERER_DEBUG_PORT",
  DEFAULT_RENDERER_PORT,
);

const tools = [];

class McpServer {
  constructor(debugTargets) {
    this.debugTargets = debugTargets;
  }

  start() {
    const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    input.on("line", (line) => this.handleLine(line));
    input.on("close", () => this.debugTargets.close());
  }

  async handleLine(line) {
    if (!line.trim()) return;
    let request;
    try {
      request = JSON.parse(line);
    } catch (error) {
      this.writeError(null, -32700, `Invalid JSON: ${error.message}`);
      return;
    }

    if (
      request.method === "notifications/initialized" ||
      request.method === "notifications/cancelled"
    ) {
      return;
    }

    try {
      let result;
      if (request.method === "initialize") {
        result = {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "sandustry-debug", version: "0.1.0" },
        };
      } else if (request.method === "ping") {
        result = {};
      } else if (request.method === "tools/list") {
        result = { tools };
      } else {
        this.writeError(request.id ?? null, -32601, `Method not found: ${request.method}`);
        return;
      }
      if (request.id !== undefined) this.write({ jsonrpc: "2.0", id: request.id, result });
    } catch (error) {
      this.writeError(request.id ?? null, -32603, error.message);
    }
  }

  write(message) {
    process.stdout.write(`${JSON.stringify(message)}\n`);
  }

  writeError(id, code, message) {
    this.write({ jsonrpc: "2.0", id, error: { code, message } });
  }
}

class DebugTargets {
  constructor(mainDebugPort, rendererDebugPort) {
    this.mainDebugPort = mainDebugPort;
    this.rendererDebugPort = rendererDebugPort;
  }

  async status() {
    const [main, renderer] = await Promise.all([
      inspectPort(this.mainDebugPort),
      inspectPort(this.rendererDebugPort),
    ]);
    return {
      ok: main.reachable && renderer.reachable,
      host: HOST,
      main,
      renderer,
    };
  }

  close() {}
}

async function inspectPort(port) {
  try {
    const targets = await getJson(port, "/json/list");
    return {
      port,
      reachable: true,
      targets: Array.isArray(targets)
        ? targets.map((target) => ({
            id: target.id,
            type: target.type,
            title: target.title,
            url: target.url,
            webSocketDebuggerUrl: target.webSocketDebuggerUrl,
          }))
        : [],
    };
  } catch (error) {
    return { port, reachable: false, error: error.message, targets: [] };
  }
}

function getJson(port, path) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: HOST, port, path, timeout: 1500 }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => {
        if (response.statusCode !== 200) {
          reject(new Error(`debug endpoint returned HTTP ${response.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`invalid debug endpoint response: ${error.message}`));
        }
      });
    });
    request.on("timeout", () => request.destroy(new Error("debug endpoint timed out")));
    request.on("error", reject);
  });
}

function numberArgument(flag, environment, fallback) {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : process.env[environment];
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    console.error(`${flag} must be a valid TCP port`);
    process.exit(2);
  }
  return parsed;
}

if (args.includes("--print-tools")) {
  process.stdout.write(`${JSON.stringify(tools)}\n`);
  process.exit(0);
}

if (args.includes("--check-connections")) {
  const status = await new DebugTargets(mainPort, rendererPort).status();
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
  process.exit(status.ok ? 0 : 1);
}

const server = new McpServer(new DebugTargets(mainPort, rendererPort));
server.start();
