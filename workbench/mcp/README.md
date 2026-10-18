# Agent access to the graph

The official [FalkorDB MCP server](https://github.com/FalkorDB/FalkorDB-MCPServer) is pinned to version 1.3.0 in this directory.

```sh
npm ci --prefix workbench/mcp
```

Register `sh /absolute/path/to/gimmikghoul/workbench/mcp/start.sh` as a stdio MCP server in your agent client. The script connects to localhost:6388, keeps the database writable, and requires no database password. It does not expose a network MCP endpoint. Client registration and tool approval are separate from starting the database.

Use read-only queries for the source catalog. Write exploratory ideas into `gk_*` graphs; this convention is not an access-control rule. The new JIT example defaults to `gk_gimmikghoul` to avoid overwriting the older lab's `gk_jit`.

The native Browser at http://localhost:4319 is a parallel human view. Agents can query the same database while a player explores nodes and sprites. The broader creative workflow in `docs/VISION.md` is still a design direction.
