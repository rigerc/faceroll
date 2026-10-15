import type { McpServer, CallToolResult } from "@modelcontextprotocol/server";
import { Effect, Schema } from "effect";
import {
  PERSONALITY_TRAITS, FACE_PRESETS, STATES, STATE_NAMES, PART_KINDS,
  createCharacter, getFacePreset, listParts, partPool, rollCharacter, rerollPart,
  deriveChildCharacter, deriveChildCharacters,
  serialize, toMarkdown, toNodeSource, toSystemPrompt,
  type Character, type RollOptions,
} from "faceroll";
import { toMcpSchema } from "./lib/mcp-schema.ts";
import { createErrorResult, createTextResult, runMcpEffect } from "./lib/utils.ts";

const ids = listParts();
const Vibe = Schema.Literal("any", "cute", "cool", "weird");
const NameMode = Schema.Literal("auto", "custom");
const Seed = Schema.Union(Schema.String, Schema.Number);
const Parts = Schema.Struct({
  body: Schema.Literal(...ids.body),
  eyes: Schema.Literal(...ids.eyes),
  mouth: Schema.Literal(...ids.mouth),
});
const SelectionFields = {
  name: Schema.optional(Schema.String),
  nameMode: Schema.optional(NameMode),
  seed: Schema.optional(Seed),
  vibe: Schema.optional(Vibe),
  preset: Schema.optional(Schema.Literal(...FACE_PRESETS.map((preset) => preset.id))),
  lock: Schema.optional(Schema.partial(Parts)),
};
const Selection = Schema.Struct(SelectionFields);
const SnapshotFields = {
  name: Schema.optional(Schema.String),
  nameMode: Schema.optional(NameMode),
  parts: Parts,
  seed: Schema.optional(Schema.String),
};
const Frame = Schema.Tuple(Schema.String, Schema.Number);
const Animation = Schema.Struct({ still: Schema.String, frames: Schema.Array(Frame) });
const Trait = Schema.Struct({
  id: Schema.Literal(...PERSONALITY_TRAITS.map((trait) => trait.id)),
  label: Schema.String, description: Schema.String,
});
const Personality = Schema.Tuple(Trait, Trait, Trait);
const CharacterOutput = Schema.Struct({
  name: Schema.String,
  personality: Personality,
  nameMode: Schema.optional(NameMode),
  seed: Schema.optional(Schema.String),
  parts: Parts,
  animations: Schema.Struct(Object.fromEntries(STATE_NAMES.map((state) => [state, Animation]))),
});
const annotations = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };

type SelectionArgs = typeof Selection.Type;

function selectCharacter(args: SelectionArgs): Character {
  if (args.preset) {
    return createCharacter({ ...getFacePreset(args.preset).parts, ...args.lock },
      {
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.nameMode !== undefined ? { nameMode: args.nameMode } : {}),
      });
  }
  const options: RollOptions = {
    ...(args.name !== undefined ? { name: args.name } : {}),
    ...(args.nameMode !== undefined ? { nameMode: args.nameMode } : {}),
    ...(args.seed !== undefined ? { seed: args.seed } : {}),
    ...(args.vibe !== undefined ? { vibe: args.vibe } : {}),
    ...(args.lock !== undefined ? { lock: args.lock } : {}),
  };
  return rollCharacter(options);
}

/** Tool execution failures are returned in-band; schema failures stay at the SDK boundary. */
function execute(work: () => unknown): Promise<CallToolResult> {
  return runMcpEffect(Effect.try({ try: work, catch: (error) => error }).pipe(
    Effect.map(createTextResult),
    Effect.catchAll((error) => Effect.succeed(createErrorResult({
      error: error instanceof Error ? error.message : String(error),
    }))),
  ));
}

/** All tools are stateless: pass the returned parts into later calls. */
export function registerTools(server: McpServer): void {
  server.registerTool("list_presets", {
    title: "Browse face presets",
    description: "List named faceroll presets with their parts, style and idle face.",
    inputSchema: toMcpSchema(Schema.Struct({ vibe: Schema.optional(Vibe) })),
    outputSchema: toMcpSchema(Schema.Struct({ presets: Schema.Array(Schema.Struct({
      id: Schema.String, label: Schema.String, vibe: Schema.String, parts: Parts, still: Schema.String, personality: Personality,
    })) })),
    annotations,
  }, (args) => execute(() => ({ presets: FACE_PRESETS
    .filter((preset) => !args.vibe || args.vibe === "any" || preset.vibe === args.vibe)
    .map((preset) => {
      const character = createCharacter(preset.parts);
      return { ...preset, still: character.animations.idle.still, personality: character.personality };
    }) })));

  server.registerTool("list_parts", {
    title: "Browse face parts",
    description: "List valid body, eyes and mouth IDs, optionally filtered by style.",
    inputSchema: toMcpSchema(Schema.Struct({ vibe: Schema.optional(Vibe) })),
    outputSchema: toMcpSchema(Schema.Struct({
      body: Schema.Array(Schema.String), eyes: Schema.Array(Schema.String), mouth: Schema.Array(Schema.String),
    })),
    annotations,
  }, (args) => execute(() => Object.fromEntries(PART_KINDS.map((kind) => [kind, partPool(kind, args.vibe)]))));

  server.registerTool("list_states", {
    title: "Browse agent states",
    description: "List all ten agent states and emotions, with labels and guidance on when to use them.",
    outputSchema: toMcpSchema(Schema.Struct({ states: Schema.Array(Schema.Struct({
      id: Schema.String, label: Schema.String, kind: Schema.String, use: Schema.String, say: Schema.String,
    })) })),
    annotations,
  }, () => execute(() => ({ states: STATES })));

  server.registerTool("roll_character", {
    title: "Create an agent character",
    description: "Roll an animated ASCII character, or choose a named preset. The same seed and options reproduce a roll. Locked parts override preset parts. Returns an automatic name unless a custom name is supplied, plus three stable personality traits determined by the face parts. Save parts and nameMode for later tools.",
    inputSchema: toMcpSchema(Selection),
    outputSchema: toMcpSchema(CharacterOutput),
    annotations: { ...annotations, idempotentHint: false },
  }, (args) => execute(() => serialize(selectCharacter(args))));

  server.registerTool("reroll_part", {
    title: "Reroll one face part",
    description: "Replace a character's body, eyes or mouth while retaining the other parts and any custom name. Automatic names follow the new parts; pass nameMode from the saved snapshot. Pass saved parts and an optional seed for reproducibility.",
    inputSchema: toMcpSchema(Schema.Struct({
      ...SnapshotFields, seed: Schema.optional(Seed),
      kind: Schema.Literal(...PART_KINDS), vibe: Schema.optional(Vibe),
    })),
    outputSchema: toMcpSchema(CharacterOutput),
    annotations: { ...annotations, idempotentHint: false },
  }, (args) => execute(() => serialize(rerollPart(
    createCharacter(args.parts, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.nameMode !== undefined ? { nameMode: args.nameMode } : {}),
    }), args.kind, {
      ...(args.seed !== undefined ? { seed: args.seed } : {}),
      ...(args.vibe !== undefined ? { vibe: args.vibe } : {}),
    },
  ))));

  server.registerTool("derive_child", {
    title: "Derive one stable thread face",
    description: "Return the child at a zero-based thread slot for a given project parent. The same parent parts, optional family seed and index always give the same distinct visual face. Store the slot for stable identity.",
    inputSchema: toMcpSchema(Schema.Struct({
      parts: Parts, index: Schema.Number, seed: Schema.optional(Seed),
      name: Schema.optional(Schema.String),
    })),
    outputSchema: toMcpSchema(CharacterOutput),
    annotations,
  }, (args) => execute(() => serialize(deriveChildCharacter(createCharacter(args.parts), {
    index: args.index,
    ...(args.seed !== undefined ? { seed: args.seed } : {}),
    ...(args.name !== undefined ? { name: args.name } : {}),
  }))));

  server.registerTool("derive_children", {
    title: "Derive a family of thread faces",
    description: "Generate visibly distinct thread children from parent parts while keeping the body. First slots remain stable when more threads are added. At most 20 at once; use derive_child for any specific slot.",
    inputSchema: toMcpSchema(Schema.Struct({
      parts: Parts, count: Schema.Number, seed: Schema.optional(Seed),
    })),
    outputSchema: toMcpSchema(Schema.Struct({ children: Schema.Array(CharacterOutput) })),
    annotations,
  }, (args) => execute(() => {
    if (!Number.isSafeInteger(args.count) || args.count < 0 || args.count > 20) {
      throw new RangeError("count must be an integer between 0 and 20");
    }
    return { children: deriveChildCharacters(createCharacter(args.parts), {
      count: args.count,
      ...(args.seed !== undefined ? { seed: args.seed } : {}),
    }).map(serialize) };
  }));

  server.registerTool("get_animation", {
    title: "Get an animation",
    description: "Get a saved character's still face, timed frames, duration and terminal width for one state. Animation is returned as data for the client to render.",
    inputSchema: toMcpSchema(Schema.Struct({ ...SnapshotFields, state: Schema.Literal(...STATE_NAMES) })),
    outputSchema: toMcpSchema(Schema.Struct({
      name: Schema.String, still: Schema.String, duration: Schema.Number, width: Schema.Number,
      frames: Schema.Array(Schema.Struct({ text: Schema.String, ms: Schema.Number })),
    })),
    annotations,
  }, (args) => execute(() => createCharacter(args.parts).animations[args.state]));

  server.registerTool("export_character", {
    title: "Export an agent character",
    description: "Export saved parts as an agent system prompt, Markdown, serialized JSON or standalone Node.js animation source. Source is returned as text and never executed.",
    inputSchema: toMcpSchema(Schema.Struct({
      ...SnapshotFields, format: Schema.Literal("prompt", "markdown", "json", "node"),
    })),
    outputSchema: toMcpSchema(Schema.Struct({ format: Schema.String, text: Schema.String })),
    annotations,
  }, (args) => execute(() => {
    const character = createCharacter(args.parts, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.nameMode !== undefined ? { nameMode: args.nameMode } : {}),
      ...(args.seed !== undefined ? { seed: args.seed } : {}),
    });
    const text = args.format === "prompt" ? toSystemPrompt(character)
      : args.format === "markdown" ? toMarkdown(character)
      : args.format === "node" ? toNodeSource(character)
      : JSON.stringify(serialize(character), null, 2);
    return { format: args.format, text };
  }));
}

