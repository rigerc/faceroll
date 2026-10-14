import { McpServer } from "@modelcontextprotocol/server";
import { getConfig } from "./config.ts";
import { registerTools } from "./tools.ts";

/** A fresh server per HTTP request, or one server for a stdio connection. */
export function createFacerollServer(): McpServer {
  const config = getConfig();
  const server = new McpServer({ name: config.SERVER_NAME, version: config.SERVER_VERSION });
  registerTools(server);
  return server;
}
