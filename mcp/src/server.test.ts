import { afterEach, describe, expect, it } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { get } from "node:http";
import {
  FACE_PRESETS, STATES, STATE_NAMES, listParts, rollCharacter, serialize,
  createCharacter, deriveChildCharacter, deriveChildCharacters, toSystemPrompt, toMarkdown, toNodeSource,
} from "faceroll";
import { createApp } from "./app.ts";
import { createFacerollServer } from "./server.ts";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function setupHttp() {
  const { app, handler } = createApp();
  const http = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    http.once("listening", resolve);
    http.once("error", reject);
  });
  const address = http.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  cleanups.push(async () => {
    await handler.close();
    http.closeAllConnections();
    await new Promise<void>((resolve, reject) => http.close((error) => error ? reject(error) : resolve()));
  });
  return `http://127.0.0.1:${address.port}`;
}

async function setupClient(transport: "memory" | "http") {
  const client = new Client({ name: "faceroll-test", version: "1.0.0" });
  if (transport === "memory") {
    const server = createFacerollServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    cleanups.push(() => server.close());
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  } else {
    const baseUrl = await setupHttp();
    await client.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)));
  }
  cleanups.push(() => client.close());
  return client;
}

const parts = { body: "round", eyes: "dot", mouth: "w" } as const;

describe.each(["memory", "http"] as const)("Faceroll tools over %s", (transport) => {
  it("discovers the tools and their input/output schemas", async () => {
    const client = await setupClient(transport);
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "derive_child", "derive_children", "export_character", "get_animation", "list_parts", "list_presets", "list_states", "reroll_part", "roll_character",
    ]);
    for (const tool of tools) {
      expect(tool.outputSchema?.type).toBe("object");
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
    const roll = tools.find((tool) => tool.name === "roll_character");
    expect(roll?.inputSchema.properties).toHaveProperty("lock");
  });

  it("returns the library catalog and filters by vibe", async () => {
    const client = await setupClient(transport);
    expect((await client.callTool({ name: "list_states" })).structuredContent).toEqual({ states: STATES });
    expect((await client.callTool({ name: "list_parts", arguments: {} })).structuredContent).toEqual(listParts());
    const result = await client.callTool({ name: "list_presets", arguments: { vibe: "cool" } });
    const expected = FACE_PRESETS.filter((preset) => preset.vibe === "cool").map((preset) => ({
      ...preset, still: createCharacter(preset.parts).animations.idle.still,
    }));
    expect(result.structuredContent).toEqual({ presets: expected });
  });

  it("preserves automatic naming through rerolls and exports", async () => {
    const client = await setupClient(transport);
    const rolled = await client.callTool({ name: "roll_character", arguments: { preset: "classic" } });
    const snapshot = rolled.structuredContent as { name: string; nameMode: "auto"; parts: typeof parts };
    expect(snapshot.nameMode).toBe("auto");
    expect(snapshot.name).toBe(createCharacter(parts).name);
    const rerolled = await client.callTool({ name: "reroll_part", arguments: {
      name: snapshot.name, nameMode: snapshot.nameMode, parts: snapshot.parts, kind: "eyes", seed: "names",
    } });
    const next = rerolled.structuredContent as typeof snapshot;
    expect(next.nameMode).toBe("auto");
    expect(next.name).not.toBe(snapshot.name);
    expect(next.name).toBe(createCharacter(next.parts).name);
    const exported = await client.callTool({ name: "export_character", arguments: {
      name: next.name, nameMode: next.nameMode, parts: next.parts, format: "json",
    } });
    const data = JSON.parse((exported.structuredContent as { text: string }).text);
    expect(data.name).toBe(next.name);
    expect(data.nameMode).toBe("auto");
    const legacy = await client.callTool({ name: "reroll_part", arguments: {
      name: "Agent", parts, kind: "eyes", seed: "names",
    } });
    expect(legacy.structuredContent).toMatchObject({ name: "Agent", nameMode: "custom" });
  });

  it("reproduces a seeded character and emits matching JSON text", async () => {
    const client = await setupClient(transport);
    const args = { seed: "pixel", name: "Pixel", vibe: "cute", lock: { body: "bear" } };
    const first = await client.callTool({ name: "roll_character", arguments: args });
    const second = await client.callTool({ name: "roll_character", arguments: args });
    expect(first.structuredContent).toEqual(serialize(rollCharacter({ ...args, vibe: "cute", lock: { body: "bear" } })));
    expect(second.structuredContent).toEqual(first.structuredContent);
    const content = first.content[0];
    expect(content?.type).toBe("text");
    if (content?.type === "text") expect(JSON.parse(content.text)).toEqual(first.structuredContent);
  });

  it("supports presets with part overrides and preserves mouth preference", async () => {
    const client = await setupClient(transport);
    const result = await client.callTool({ name: "roll_character", arguments: {
      preset: "teddy", lock: { mouth: "w" }, name: "Pixel",
    } });
    const character = createCharacter({ body: "bear", eyes: "dot", mouth: "w" }, { name: "Pixel" });
    expect(result.structuredContent).toEqual(serialize(character));
    expect(character.parts.mouth).toBe("w");
    expect(character.animations.idle.still).toBe("ʕ•ᴥ•ʔ");
  });

  it("derives stable and visibly distinct thread children", async () => {
    const client = await setupClient(transport);
    const argumentsBase = { parts, seed: "project", count: 5 };
    const batch = await client.callTool({ name: "derive_children", arguments: argumentsBase });
    const expected = deriveChildCharacters(createCharacter(parts), { count: 5, seed: "project" }).map(serialize);
    expect(batch.structuredContent).toEqual({ children: expected });
    const child = await client.callTool({ name: "derive_child", arguments: { parts, seed: "project", index: 3 } });
    expect(child.structuredContent).toEqual(serialize(deriveChildCharacter(createCharacter(parts), { seed: "project", index: 3 })));
    expect((child.structuredContent as { parts: typeof parts }).parts).toEqual(expected[3]?.parts);
    const invalid = await client.callTool({ name: "derive_children", arguments: { parts, count: 21 } });
    expect(invalid.isError).toBe(true);
  });

  it("returns each animation with the original timing and width", async () => {
    const client = await setupClient(transport);
    const character = createCharacter(parts);
    for (const state of STATE_NAMES) {
      expect((await client.callTool({ name: "get_animation", arguments: { parts, state } })).structuredContent)
        .toEqual(character.animations[state]);
    }
  });

  it("rerolls just the requested part and is reproducible with a seed", async () => {
    const client = await setupClient(transport);
    const args = { parts, kind: "eyes", seed: "new-eyes", name: "Pixel" };
    const result = await client.callTool({ name: "reroll_part", arguments: args });
    expect(result.structuredContent).toMatchObject({
      name: "Pixel", parts: { body: "round", mouth: "w" },
    });
    expect(result.structuredContent).not.toMatchObject({ parts: { eyes: "dot" } });
    expect((await client.callTool({ name: "reroll_part", arguments: args })).structuredContent)
      .toEqual(result.structuredContent);
  });

  it("exports all four formats using the library implementations", async () => {
    const client = await setupClient(transport);
    const character = createCharacter(parts, { name: "Pixel", seed: "saved" });
    const expected = {
      prompt: toSystemPrompt(character), markdown: toMarkdown(character),
      json: JSON.stringify(serialize(character), null, 2), node: toNodeSource(character),
    };
    for (const [format, text] of Object.entries(expected)) {
      const result = await client.callTool({ name: "export_character", arguments: {
        parts, name: "Pixel", seed: "saved", format,
      } });
      expect(result.structuredContent).toEqual({ format, text });
    }
  });

  it("rejects invalid part IDs, states, vibes, presets and missing fields", async () => {
    const client = await setupClient(transport);
    for (const request of [
      { name: "roll_character", arguments: { lock: { body: "missing" } } },
      { name: "roll_character", arguments: { preset: "missing" } },
      { name: "roll_character", arguments: { vibe: "missing" } },
      { name: "get_animation", arguments: { parts, state: "missing" } },
      { name: "export_character", arguments: { format: "json" } },
    ]) {
      const result = await client.callTool(request);
      expect(result.isError).toBe(true);
    }
    expect((await client.callTool({ name: "roll_character", arguments: { seed: "still-alive" } })).isError).not.toBe(true);
  });
});

it("serves health and rejects unexpected hosts and browser origins", async () => {
  const baseUrl = await setupHttp();
  expect(await (await fetch(`${baseUrl}/health`)).json()).toEqual({ status: "ok" });
  const status = await new Promise<number | undefined>((resolve, reject) => {
    get(`${baseUrl}/health`, { headers: { Host: "attacker.example" } }, (response) => {
      response.resume();
      resolve(response.statusCode);
    }).once("error", reject);
  });
  expect(status).toBe(403);
  expect((await fetch(`${baseUrl}/mcp`, { headers: { Origin: "https://attacker.example" } })).status).toBe(403);
  expect((await fetch(`${baseUrl}/unknown`)).status).toBe(404);
});

it("connects to the built stdio executable without polluting stdout", async () => {
  const client = new Client({ name: "stdio-test", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/index.js", import.meta.url)), "--stdio"],
    stderr: "pipe",
  });
  cleanups.push(() => client.close());
  await client.connect(transport);
  expect((await client.listTools()).tools).toHaveLength(9);
  expect((await client.callTool({ name: "roll_character", arguments: { preset: "kitty" } })).structuredContent)
    .toEqual(serialize(createCharacter({ body: "cat", eyes: "cat", mouth: "cat" })));
});

it("exits when a stdio client closes stdin", async () => {
  const child = spawn(process.execPath, [fileURLToPath(new URL("../dist/index.js", import.meta.url)), "--stdio"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  const code = await new Promise<number | null>((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error("Stdio server did not exit on EOF")); }, 4000);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("exit", (exitCode) => { clearTimeout(timer); resolve(exitCode); });
    child.stdin.end();
  });
  expect(code).toBe(0);
});

