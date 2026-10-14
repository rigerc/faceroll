import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { JSONSchema, ParseResult, Schema } from "effect";
import { type JsonObject, JsonObjectSchema, type JsonValue } from "./json.ts";

/** Some MCP clients require object schemas for tuple tails, including Inspector. */
function portableTupleSchemas(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(portableTupleSchemas);
  if (value === null || typeof value !== "object") return value;
  const tuple = Object.entries(value).some(([key, entry]) =>
    (key === "items" || key === "prefixItems") && Array.isArray(entry));
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    tuple && (key === "items" || key === "additionalItems") && entry === false
      ? { not: {} }
      : portableTupleSchemas(entry),
  ]));
}

type McpJsonSchemaOptions = Parameters<
  StandardSchemaWithJSON["~standard"]["jsonSchema"]["input"]
>[0];

function toEffectJsonSchemaTarget(
  target: McpJsonSchemaOptions["target"],
): "jsonSchema7" | "jsonSchema2020-12" {
  switch (target) {
    case "draft-07":
      return "jsonSchema7";
    case "draft-2020-12":
      return "jsonSchema2020-12";
    default:
      throw new Error(
        `Unsupported MCP JSON Schema target: ${String(target)}. Effect supports draft-07 and draft-2020-12.`,
      );
  }
}

function makeMcpJsonSchema<Output, Input>(
  schema: Schema.Schema<Output, Input>,
  options: McpJsonSchemaOptions,
): JsonObject {
  const json = ParseResult.decodeUnknownSync(JsonObjectSchema)(
    JSONSchema.make(schema, {
      target: toEffectJsonSchemaTarget(options.target),
    }),
  );
  return ParseResult.decodeUnknownSync(JsonObjectSchema)(
    portableTupleSchemas(json),
  );
}

/**
 * Adapts an Effect Schema to the Standard Schema + JSON Schema contract used
 * by the MCP SDK for tool input and output schemas.
 *
 * Effect already implements Standard Schema validation. The MCP SDK also
 * needs the companion JSON Schema converter to advertise schemas over the
 * wire, so this adapter supplies that one additional capability.
 */
export function toMcpSchema<Output, Input = Output>(
  schema: Schema.Schema<Output, Input>,
): StandardSchemaWithJSON<Input, Output> {
  const standard = Schema.standardSchemaV1(schema);

  const adapted = {
    ...standard,
    "~standard": {
      ...standard["~standard"],
      jsonSchema: {
        input: (options) => makeMcpJsonSchema(schema, options),
        output: (options) => makeMcpJsonSchema(schema, options),
      },
    },
  } satisfies StandardSchemaWithJSON<Input, Output>;

  return adapted;
}
