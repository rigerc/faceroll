# Faceroll MCP server

An MCP server for [faceroll](../README.md), based on
[nickytonline/mcp-typescript-template](https://github.com/nickytonline/mcp-typescript-template).
It exposes character creation, catalogs, animation data and exports to MCP clients.

This is a separate Node.js **24+** package. The faceroll library still works in
browsers and Node.js 18+ without runtime dependencies. Installing the core package
does not install or start this server.

## Build and run from this repository

From the repository root:

```sh
npm ci
npm --prefix mcp ci
npm run build:mcp
npm run start:mcp
```

The default HTTP endpoint is **http://127.0.0.1:3000/mcp**.
`GET /health` returns `{ "status": "ok" }`. The server binds to loopback by
default, accepts local hostnames, and rejects browser Origin headers. It has no
authentication; use it with local MCP clients. `PORT` overrides the port:

```sh
PORT=3137 npm run start:mcp
```

The HTTP server uses the template's Express app, `createMcpHandler` and
`toNodeHandler`. Each request gets a fresh faceroll server; the SDK supports
current and older MCP clients. There is no server-side character session: keep
the returned `parts` and pass them into subsequent tools.

### Local stdio clients

Use the built entry point directly when a client launches its own server:

```json
{
  "mcpServers": {
    "faceroll": {
      "command": "node",
      "args": ["/absolute/path/to/faceroll/mcp/dist/index.js", "--stdio"]
    }
  }
}
```

Replace the absolute path with your checkout's location. Stdio mode starts no
HTTP listener and reserves stdout for MCP messages; logs go to stderr.
The executable accepts `--help`, and the server package defines a
`faceroll-mcp` binary for installation independently of the core library.

For HTTP clients, start the service first and use a Streamable HTTP configuration:

```json
{
  "mcpServers": {
    "faceroll": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

## Test with MCP Inspector

After installing the repository and MCP dependencies above, run from the
repository root:

```sh
npm run inspect:mcp          # build both packages and open Inspector for stdio
npm run inspect:mcp:cli      # build both packages and list the tools as JSON
```

The stdio commands let Inspector launch its own server. For interactive testing,
open the local URL printed by Inspector, connect to the faceroll server, and
use the Tools panel to list tools and call them with arguments.

For HTTP, start the built server in one terminal and run Inspector in another:

```sh
# Terminal 1
npm run build:mcp
npm run start:mcp

# Terminal 2 (choose the UI or the CLI)
npm run inspect:mcp:http
npm run inspect:mcp:http:cli
```

Both HTTP commands target `http://127.0.0.1:3000/mcp`. If you started the server
on another port, override the URL:

```sh
npm run inspect:mcp:http -- --server-url http://127.0.0.1:3137/mcp
```

The CLI commands default to `tools/list`. Override the method to call a tool:

```sh
npm run inspect:mcp:cli -- --method tools/call --tool-name roll_character --tool-arg preset=kitty
```

When working inside `mcp/`, the equivalent commands are `npm run inspect`,
`npm run inspect:http`, `npm run inspect:cli` and `npm run inspect:http:cli`;
build the library and server first. These scripts run Inspector **2.11.0** via
`npx` (downloaded on first use), so Inspector adds no package dependencies.
See the official [Inspector server configuration](https://github.com/modelcontextprotocol/inspector/blob/main/docs/mcp-server-configuration.md)
and [CLI testing guide](https://github.com/modelcontextprotocol/inspector/blob/main/docs/cli-smoke-testing.md).

## Tools

| Tool | Inputs | Result |
| --- | --- | --- |
| `list_presets` | Optional `vibe` | Named presets, parts, style and idle face |
| `list_parts` | Optional `vibe` | Valid body, eyes and mouth IDs |
| `list_states` | None | All nine states and emotions with usage guidance |
| `roll_character` | Optional `name`, `seed`, `vibe`, `preset`, `lock` | Serialized character with all animations |
| `reroll_part` | `parts`, `kind`; optional `name`, `seed`, `vibe` | Character with only the selected part replaced |
| `get_animation` | `parts`, `state` | Still face, `{ text, ms }` frames, duration and width |
| `export_character` | `parts`, `format`; optional `name`, `seed` | Text in `prompt`, `markdown`, `json` or `node` format |

`vibe` is `any`, `cute`, `cool` or `weird`. `lock` is a partial parts object,
for example `{ "body": "bear" }`. `parts` requires all three IDs.
Schemas advertise and validate the actual catalog IDs, states and formats.
Tools return both JSON text and structured content with declared output schemas.

Use `roll_character` with `{ "name": "Pixel", "seed": "pixel", "vibe": "cute" }`
to generate a reproducible character. Save its `parts`, then call
`get_animation` with those parts and `{ "state": "working" }`, or
`export_character` with `{ "name": "Pixel", "format": "prompt" }`.
A random roll returns its generated seed. When `preset` is supplied, its fixed
parts are used and `lock` overrides them; seed and vibe do not change the preset.
To create an exact face, put all three parts in `lock`.

Animations are returned as data for clients to render. Node.js source exports
are returned as text; the server does not run them or write files.

## Development

```sh
npm run build                 # from the repository root: build the peer library
npm --prefix mcp run dev      # template-style Node type stripping and watch mode
npm --prefix mcp run typecheck
npm run test:mcp             # builds the library and server, then runs integration tests
```

The tests exercise tool discovery, input validation, seeded rolls, presets,
rerolls, all states and exports through an in-memory MCP client and the real HTTP
adapter. They also connect to the built stdio executable and verify exit on EOF.

`SERVER_NAME`, `SERVER_VERSION`, `NODE_ENV` and `LOG_LEVEL` configure identity,
environment and logging. The defaults are `faceroll-mcp`, the server package
version, `development` and `info`. Supported log levels are `error`, `warn`,
`info` and `debug`. Keep `HOST` at its default `127.0.0.1` for local operation.

## Template provenance

Adapted from template revision
[`ec3afbd1311e5f3d73e482c16ed4163e9af551d0`](https://github.com/nickytonline/mcp-typescript-template/tree/ec3afbd1311e5f3d73e482c16ed4163e9af551d0).
The HTTP app, Effect configuration and logger, Effect-to-MCP schema adapter,
JSON helpers, startup/shutdown workflow and Vite build derive from the template.
Faceroll-specific tools and integration tests replace its example tools.
The template's MIT copyright notice is preserved in [LICENSE](LICENSE).
