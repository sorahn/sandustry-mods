# Sandustry debug MCP server

This is a standalone, dependency-free MCP stdio server for the repository's
debug launch workflow. It discovers and connects to the two loopback debug endpoints used
by VS Code and `make dev`:

- main-process Node inspector: `127.0.0.1:9230`
- renderer CDP endpoint: `127.0.0.1:9222`

Start the server through an MCP client's local stdio configuration:

```json
{
  "command": "npm",
  "args": ["run", "mcp:sandustry"]
}
```

The game must be running with debug ports enabled, for example:

```sh
make dev MOD=test-blocks TAKEOVER=1 DEBUG=1
```

The current tools include status, DOM inspection, screenshots, and public
runtime discovery. `renderer_eval` is an explicitly advanced tool that can
mutate the running game and is annotated accordingly in the MCP schema.

Local smoke checks:

```sh
npm run mcp:sandustry -- --print-tools
npm run mcp:sandustry -- --check-connections
```

The server writes only MCP responses to stdout. Diagnostics and future bridge
logging belong on stderr. It binds no network listeners; all connections are
outbound loopback requests to the game debug endpoints.
