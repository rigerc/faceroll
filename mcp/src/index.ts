#!/usr/bin/env node
import type { Server as HttpServer } from "node:http";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { Effect } from "effect";
import { logger } from "./logger.ts";
import { getConfig } from "./config.ts";
import { createApp } from "./app.ts";
import { createFacerollServer } from "./server.ts";
import { runMcpEffect } from "./lib/utils.ts";

/**
 * Starts the HTTP server as an Effect workflow. The MCP SDK remains the
 * transport boundary; Effect owns startup, request failure handling, and
 * graceful shutdown around it.
 */
const main = Effect.gen(function* () {
  const config = getConfig();
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write("Usage: faceroll-mcp [--stdio]\n\nDefault: HTTP at http://127.0.0.1:3000/mcp (PORT controls the port).\n--stdio: JSON-RPC over stdin/stdout for local MCP clients.\n");
    return;
  }
  if (args.some((arg) => arg !== "--stdio")) {
    return yield* Effect.fail(new Error("Unknown option. Use --help or --stdio."));
  }
  if (args.includes("--stdio")) {
    const handle = yield* Effect.try({ try: () => serveStdio(createFacerollServer), catch: (error) => error });
    const shutdown = () => { void handle.close().finally(() => process.exit(0)); };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
    process.stdin.once("end", shutdown);
    yield* Effect.never;
    return;
  }
  const { app, handler } = createApp();

  const httpServer = yield* Effect.async<HttpServer, unknown>((resume) => {
    const server = app.listen(config.PORT, config.HOST, () => {
      resume(Effect.succeed(server));
    });

    server.once("error", (error) => resume(Effect.fail(error)));
  });

  const closeHttpServer = Effect.tryPromise({
    try: () =>
      new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      }),
    catch: (error) => error,
  });

  const shutdown = (signal: string) => {
    const shutdownEffect = Effect.gen(function* () {
      yield* logger.info(`${signal} received, shutting down gracefully`);
      yield* Effect.all(
        [
          Effect.tryPromise({
            try: () => handler.close(),
            catch: (error) => error,
          }),
          closeHttpServer,
        ],
        { concurrency: "unbounded" },
      ).pipe(Effect.asVoid);
    });

    void runMcpEffect(
      shutdownEffect.pipe(
        Effect.matchEffect({
          onSuccess: () => Effect.sync(() => process.exit(0)),
          onFailure: (error) =>
            logger
              .error(
                {
                  error: error instanceof Error ? error.message : String(error),
                },
                "Error during graceful shutdown",
              )
              .pipe(Effect.andThen(Effect.sync(() => process.exit(1)))),
        }),
      ),
    );
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  yield* logger.info(
    {
      environment: config.NODE_ENV,
      serverName: config.SERVER_NAME,
      version: config.SERVER_VERSION,
    },
    `Faceroll MCP server listening on ${config.HOST}:${config.PORT}`,
  );

  yield* Effect.never;
});

runMcpEffect(main).catch((error) => {
  void runMcpEffect(
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Server startup error",
    ),
  ).finally(() => process.exit(1));
});
