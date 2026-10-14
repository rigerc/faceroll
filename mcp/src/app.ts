import express from "express";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { Effect } from "effect";
import { logger } from "./logger.ts";
import { createFacerollServer } from "./server.ts";
import { runMcpEffect } from "./lib/utils.ts";

/** Creates the Express app and MCP handler used by the production entrypoint. */
export function createApp() {
  // createMcpHandler runs the factory fresh per request (2026-07-28 spec: no
  // initialize/initialized handshake, no Mcp-Session-Id). It also answers
  // 2025-era clients automatically via a stateless per-request fallback.
  const handler = createMcpHandler(createFacerollServer, {
    onerror: (error) => {
      void runMcpEffect(
        logger.error({ error: error.message }, "Error handling MCP request"),
      );
    },
  });

  const nodeHandler = toNodeHandler(handler, {
    onerror: (error) => {
      void runMcpEffect(
        logger.error(
          { error: error.message },
          "Error adapting MCP request for Node",
        ),
      );
    },
  });

  const app = express();
  // Reject unexpected hosts and browser origins before parsing a request.
  app.use((req, res, next) => {
    const host = req.hostname;
    if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(host) || req.headers.origin) {
      res.status(403).json({ error: "Only local MCP clients are allowed" });
      return;
    }
    next();
  });
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.all("/mcp", (req, res) => {
    void runMcpEffect(
      Effect.tryPromise({
        try: () => nodeHandler(req, res, req.body),
        catch: (error) => error,
      }).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* logger.error(
              { error: error instanceof Error ? error.message : String(error) },
              "Unhandled error serving MCP request",
            );

            if (!res.headersSent) {
              res.status(500).json({
                jsonrpc: "2.0",
                error: { code: -32603, message: "Internal server error" },
                id: null,
              });
            } else {
              res.end();
            }
          }),
        ),
      ),
    );
  });

  return { app, handler };
}
