#!/usr/bin/env node
import { createCharacter, listParts, rollCharacter, type Character } from "./character";
import { FACE_PRESETS, getFacePreset } from "./presets";
import type { Parts } from "./parts";
import { serialize, toMarkdown, toNodeSource, toSystemPrompt } from "./export";
import { STATES, STATE_NAMES, getState } from "./states";
import { createTerminalPlayer } from "./terminal";
import type { Vibe } from "./types";

const HELP = `faceroll: random animated ASCII faces for AI agents

Usage
  faceroll roll [options]            Print a rolled character
  faceroll play <state> [options]    Animate one state in the terminal
  faceroll states                    List the states and emotions
  faceroll parts                     List body, eyes and mouth ids
  faceroll presets                   Browse 24 named faces

Options
  --seed <text>      Same seed, same character
  --preset <id>      Choose a named face (see "faceroll presets")
  --vibe <any|cute|cool|weird>
  --name <text>      Custom name (default: automatic face name)
  --body <id>        Lock the body
  --eyes <id>        Lock the eyes
  --mouth <id>       Lock the mouth
  --format <text|prompt|markdown|json|node>   For roll (default text)
  --duration <ms>    For play (default 4000)
  -h, --help
`;

const VIBES = ["any", "cute", "cool", "weird"];
const FORMATS = ["text", "prompt", "markdown", "json", "node"];

class UsageError extends Error {}

function parseArgs(argv: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === "-h") flags["help"] = "true";
    else if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      const key = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
      if (key === "help") flags["help"] = "true";
      else if (eq !== -1) flags[key] = arg.slice(eq + 1);
      else {
        const value = argv[++i];
        if (value === undefined) throw new UsageError(`Missing value for --${key}`);
        flags[key] = value;
      }
    } else positional.push(arg);
  }
  return { positional, flags };
}

function roll(flags: Record<string, string>): Character {
  const vibe = flags["vibe"] ?? "any";
  if (!VIBES.includes(vibe)) throw new UsageError(`Unknown vibe "${vibe}". Use one of: ${VIBES.join(", ")}`);
  const lock: Record<string, string> = {};
  for (const k of ["body", "eyes", "mouth"]) if (flags[k]) lock[k] = flags[k] as string;
  try {
    // Named presets choose fixed parts; explicit --body/--eyes/--mouth flags override them.
    if (flags["preset"] !== undefined) {
      const preset = getFacePreset(flags["preset"]);
      const parts: Parts = { ...preset.parts, ...lock } as Parts;
      return createCharacter(parts, {
        ...(flags["name"] !== undefined ? { name: flags["name"] } : {}),
      });
    }
    return rollCharacter({
      vibe: vibe as Vibe,
      lock: lock as never,
      ...(flags["seed"] !== undefined ? { seed: flags["seed"] } : {}),
      ...(flags["name"] !== undefined ? { name: flags["name"] } : {}),
    });
  } catch (e) {
    if (e instanceof RangeError) throw new UsageError(e.message);
    throw e;
  }
}

function describe(c: Character): string {
  const p = c.parts;
  const width = Math.max(...STATES.map((s) => s.label.length));
  const rows = STATES.map((s) => `${s.label.padEnd(width)}  ${c.animations[s.id].still}`);
  return [`${c.name}  (seed ${c.seed}, ${p.body} / ${p.eyes} / ${p.mouth})`, "", ...rows].join("\n");
}

async function main(): Promise<void> {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [command, arg] = positional;
  if (flags["help"] || !command) {
    process.stdout.write(HELP);
    return;
  }

  switch (command) {
    case "roll": {
      const format = flags["format"] ?? "text";
      if (!FORMATS.includes(format)) throw new UsageError(`Unknown format "${format}". Use one of: ${FORMATS.join(", ")}`);
      const c = roll(flags);
      const out =
        format === "prompt" ? toSystemPrompt(c)
        : format === "markdown" ? toMarkdown(c)
        : format === "json" ? JSON.stringify(serialize(c), null, 2)
        : format === "node" ? toNodeSource(c)
        : describe(c);
      process.stdout.write(out + "\n");
      return;
    }
    case "play": {
      if (!arg) throw new UsageError(`Pick a state: ${STATE_NAMES.join(", ")}`);
      let state;
      try {
        state = getState(arg);
      } catch (e) {
        throw new UsageError((e as Error).message);
      }
      const ms = Number(flags["duration"] ?? 4000);
      if (!Number.isFinite(ms) || ms < 0) throw new UsageError("--duration must be a number of milliseconds");
      const c = roll(flags);
      const player = createTerminalPlayer({ suffix: `  ${c.name} is ${state.label.toLowerCase()}` });
      player.play(c.animations[state.id]);
      await new Promise((resolve) => setTimeout(resolve, ms));
      player.stop();
      return;
    }
    case "states":
      process.stdout.write(STATES.map((s) => `${s.label.padEnd(12)} ${s.kind.padEnd(8)} ${s.use}`).join("\n") + "\n");
      return;
    case "presets": {
      process.stdout.write(FACE_PRESETS.map((preset) => {
        const still = createCharacter({ ...preset.parts }).animations.idle.still;
        return `${preset.id.padEnd(11)} ${preset.vibe.padEnd(6)} ${still.padEnd(16)} ${preset.label}`;
      }).join("\n") + "\n");
      return;
    }
    case "parts": {
      const parts = listParts();
      process.stdout.write(
        (Object.keys(parts) as (keyof typeof parts)[]).map((k) => `${k.padEnd(6)} ${parts[k].join(", ")}`).join("\n") + "\n",
      );
      return;
    }
    default:
      throw new UsageError(`Unknown command "${command}"`);
  }
}

main().catch((e: unknown) => {
  if (e instanceof UsageError) {
    process.stderr.write(`faceroll: ${e.message}\n\n${HELP}`);
    process.exit(2);
  }
  process.stderr.write(`faceroll: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});

