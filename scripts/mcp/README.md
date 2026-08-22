# Sandustry Chrome DevTools MCP

Use the pinned `chrome-devtools-mcp` project dependency to connect to the
renderer exposed by the Sandustry debug launch workflow. It provides runtime
evaluation, console messages, DOM inspection, screenshots, network inspection,
and the other standard Chrome DevTools tools against `127.0.0.1:9222`.

```json
{
  "mcpServers": {
    "sandustry": {
      "command": "npm",
      "args": ["run", "--silent", "mcp:chrome-devtools"]
    }
  }
}
```

Start Sandustry with F5 or `make dev ... DEBUG=1` first. The game must be
running with debug ports enabled, for example:

```sh
make dev MOD=test-blocks TAKEOVER=1 DEBUG=1
```
