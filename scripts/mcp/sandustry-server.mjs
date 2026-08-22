#!/usr/bin/env node

/**
 * Dependency-free MCP stdio server scaffold for a Sandustry debug session.
 * Phase 1 discovers the existing main-process and renderer debug targets.
 */
import crypto from "node:crypto";
import http from "node:http";
import net from "node:net";
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

const tools = [
  tool("sandustry_status", "Report debug-port and live target readiness.", {}, true),
  tool(
    "renderer_eval",
    "Evaluate JavaScript in the live renderer. Advanced debug escape hatch; it can mutate game state.",
    { code: { type: "string", minLength: 1 } },
    false,
    ["code"],
  ),
  tool(
    "inspect_dom",
    "Inspect matching renderer DOM nodes.",
    {
      selector: { type: "string", default: "body" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      html: { type: "boolean", default: false },
    },
    true,
    [],
  ),
  tool("capture_game_screenshot", "Capture the current renderer window as PNG.", {}, true),
  tool("discover_runtime", "Inspect the public sandkit and game API namespaces.", {}, true),
];

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
      } else if (request.method === "tools/call") {
        result = await this.callTool(request.params ?? {});
      } else {
        this.writeError(request.id ?? null, -32601, `Method not found: ${request.method}`);
        return;
      }
      if (request.id !== undefined) this.write({ jsonrpc: "2.0", id: request.id, result });
    } catch (error) {
      this.writeError(request.id ?? null, -32603, error.message);
    }
  }

  async callTool(params) {
    const name = params.name;
    const args = params.arguments ?? {};
    if (name === "sandustry_status") return textResult(await this.debugTargets.status());
    if (name === "renderer_eval") return textResult(await this.debugTargets.evaluate(args.code));
    if (name === "inspect_dom") {
      const selector = typeof args.selector === "string" ? args.selector : "body";
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
      const includeHtml = args.html === true;
      const script = `(() => {
        const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})].slice(0, ${limit});
        return nodes.map((node) => ({
          tag: node.tagName,
          text: (node.textContent || "").trim().slice(0, 1000),
          attributes: Object.fromEntries([...node.attributes].map((attribute) => [attribute.name, attribute.value])),
          rect: (() => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })(),
          ${includeHtml ? "html: node.outerHTML.slice(0, 10000)," : ""}
        }));
      })()`;
      return textResult(await this.debugTargets.evaluate(script));
    }
    if (name === "capture_game_screenshot") {
      const image = await this.debugTargets.screenshot();
      return { content: [{ type: "image", data: image, mimeType: "image/png" }] };
    }
    if (name === "discover_runtime") return textResult(await this.debugTargets.discoverRuntime());
    throw new Error(`Unknown tool: ${name}`);
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

  async evaluate(expression) {
    const target = await this.rendererTarget();
    if (!target) throw new Error("Sandustry renderer debug target is unavailable");
    return withTarget(target, (client) =>
      client.command("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true,
      }),
    );
  }

  async screenshot() {
    const target = await this.rendererTarget();
    if (!target) throw new Error("Sandustry renderer debug target is unavailable");
    const result = await withTarget(target, (client) =>
      client.command("Page.captureScreenshot", { format: "png" }),
    );
    return result.data;
  }

  async discoverRuntime() {
    const value = await this.evaluate(`(() => ({
      sandkit: typeof globalThis.sandkit,
      sandustryApi: typeof globalThis.sandkit?.api,
      apiNamespaces: typeof globalThis.sandkit?.api === "object" && globalThis.sandkit?.api
        ? Object.keys(globalThis.sandkit.api).sort()
        : [],
      globals: ["SMLN", "sandkit", "React", "electron", "webpackChunksand_v1"].filter((key) => key in globalThis),
      electronMembers: typeof globalThis.electron === "object"
        ? Object.fromEntries(Object.entries(globalThis.electron).map(([key, value]) => [key, typeof value]))
        : {},
      hmrHosts: globalThis.__sandustryDevHmrHosts__
        ? Object.fromEntries(Object.entries(globalThis.__sandustryDevHmrHosts__).map(([modId, host]) => [modId, {
            installed: host.installed,
            booted: host.booted,
            reloading: host.reloading,
            disposerCount: typeof host.disposers?.size === "number"
              ? host.disposers.size
              : Array.isArray(host.disposers) ? host.disposers.length : null
          }]))
        : {},
      webpackRuntime: globalThis.webpackChunksand_v1
        ? { type: typeof globalThis.webpackChunksand_v1, keys: Object.keys(globalThis.webpackChunksand_v1) }
        : null
    }))()`);
    return value;
  }

  async rendererTarget() {
    const result = await inspectPort(this.rendererDebugPort);
    return (
      result.targets.find((target) => target.webSocketDebuggerUrl && target.type === "page") ||
      result.targets.find((target) => target.webSocketDebuggerUrl) ||
      null
    );
  }

  close() {}
}

async function withTarget(target, callback) {
  const client = await WebSocketClient.connect(target.webSocketDebuggerUrl);
  try {
    const result = await callback(client);
    if (result?.exceptionDetails) {
      throw new Error(formatException(result.exceptionDetails));
    }
    if (result?.result?.subtype === "error") {
      throw new Error(result.result.description || "renderer evaluation failed");
    }
    return result?.result?.value ?? result?.result ?? result;
  } finally {
    client.close();
  }
}

function formatException(details) {
  return details.exception?.description || details.text || "renderer evaluation failed";
}

class WebSocketClient {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.handshake = false;
    this.messages = [];
    this.pending = new Map();
    this.nextId = 1;
    this.closed = false;
    socket.on("data", (chunk) => this.receive(chunk));
    socket.on("error", (error) => this.fail(error));
    socket.on("close", () => this.fail(new Error("debug target disconnected")));
  }

  static connect(address) {
    return new Promise((resolve, reject) => {
      let url;
      try {
        url = new URL(address);
        if (url.protocol !== "ws:") throw new Error(`unsupported debug protocol: ${url.protocol}`);
      } catch (error) {
        reject(error);
        return;
      }
      const socket = new net.Socket();
      const key = crypto.randomBytes(16).toString("base64");
      let header = "";
      let client;
      const fail = (error) => {
        socket.destroy();
        reject(error);
      };
      socket.setTimeout(3000, () => fail(new Error("debug WebSocket handshake timed out")));
      socket.once("error", fail);
      socket.once("data", (chunk) => {
        header += chunk.toString("latin1");
        const end = header.indexOf("\r\n\r\n");
        if (end < 0) return;
        const response = header.slice(0, end);
        if (!/^HTTP\/1\.1 101\b/.test(response)) {
          fail(new Error(`debug WebSocket handshake failed: ${response.split("\r\n", 1)[0]}`));
          return;
        }
        socket.setTimeout(0);
        client = new WebSocketClient(socket);
        const remainder = Buffer.from(header.slice(end + 4), "latin1");
        if (remainder.length) client.receive(remainder);
        resolve(client);
      });
      socket.connect(Number(url.port) || 80, url.hostname, () => {
        socket.write(
          `GET ${url.pathname}${url.search} HTTP/1.1\r\nHost: ${url.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
        );
      });
    });
  }

  command(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`debug command timed out: ${method}`));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      this.send(JSON.stringify({ id, method, params }));
    });
  }

  send(text) {
    const payload = Buffer.from(text);
    const length = payload.length;
    let header;
    if (length < 126) header = Buffer.from([0x81, 0x80 | length]);
    else if (length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }
    const mask = crypto.randomBytes(4);
    for (let index = 0; index < payload.length; index++) payload[index] ^= mask[index % 4];
    this.socket.write(Buffer.concat([header, mask, payload]));
  }

  receive(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      let offset = 2;
      let length = second & 0x7f;
      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        length = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }
      const masked = (second & 0x80) !== 0;
      if (masked) offset += 4;
      if (this.buffer.length < offset + length) return;
      let payload = this.buffer.subarray(offset, offset + length);
      this.buffer = this.buffer.subarray(offset + length);
      if (masked) {
        const mask = this.buffer.subarray(-length - 4, -length);
        payload = Buffer.from(payload);
        for (let index = 0; index < payload.length; index++) payload[index] ^= mask[index % 4];
      }
      const opcode = first & 0x0f;
      if (opcode === 0x1) this.message(payload.toString("utf8"));
      else if (opcode === 0x8) this.close();
      else if (opcode === 0x9) this.sendControl(0xa, payload);
    }
  }

  message(text) {
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (!message.id) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message || "debug command failed"));
    else pending.resolve(message.result);
  }

  sendControl(opcode, payload) {
    this.socket.write(Buffer.from([0x80 | opcode, payload.length]));
    this.socket.write(payload);
  }

  fail(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.socket.destroy();
  }
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

function tool(name, description, properties, readOnly, required = []) {
  return {
    name,
    description,
    inputSchema: { type: "object", properties, required, additionalProperties: false },
    annotations: { readOnlyHint: readOnly, destructiveHint: !readOnly },
  };
}

function textResult(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text }] };
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
