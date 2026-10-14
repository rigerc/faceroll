import type { Character } from "./character";
import { createCharacter } from "./character";
import type { NameMode } from "./names";
import type { Parts } from "./parts";
import { STATES, type StateName } from "./states";

export interface PromptOptions {
  /** Only include these states. Defaults to all nine. */
  states?: readonly StateName[];
}

/** A system-prompt snippet that tells an agent which face to show when. */
export function toSystemPrompt(character: Character, options: PromptOptions = {}): string {
  const wanted = options.states ? new Set(options.states) : undefined;
  const list = STATES.filter((s) => !wanted || wanted.has(s.id));
  const line = (s: (typeof STATES)[number]): string =>
    `- ${s.label} (${s.use}): ${character.animations[s.id].still}`;
  const sections: string[] = [];
  const states = list.filter((s) => s.kind === "state");
  const emotions = list.filter((s) => s.kind === "emotion");
  if (states.length) sections.push("States\n" + states.map(line).join("\n"));
  if (emotions.length) sections.push("Emotions\n" + emotions.map(line).join("\n"));
  return (
    `You are ${character.name}. Show your state with one of these ASCII faces. ` +
    `Use at most one per message, at the start or the end, and only when the situation matches.\n\n` +
    sections.join("\n\n") +
    `\n\nNever put a face inside code, file contents, or commit messages.`
  );
}

/** A Markdown table of states, faces and when to use them. */
export function toMarkdown(character: Character): string {
  const rows = STATES.map(
    (s) => `| ${s.label} | \`${character.animations[s.id].still}\` | ${s.use} |`,
  );
  return `### ${character.name}\n\n| State | Face | Use when |\n|---|---|---|\n${rows.join("\n")}`;
}

/** Plain data that survives `JSON.stringify`. Frames are `[text, ms]` pairs. */
export interface SerializedCharacter {
  name: string;
  nameMode?: NameMode;
  seed?: string;
  parts: Parts;
  animations: Record<StateName, { still: string; frames: [text: string, ms: number][] }>;
}

export function serialize(character: Character): SerializedCharacter {
  const animations = {} as SerializedCharacter["animations"];
  for (const s of STATES) {
    const a = character.animations[s.id];
    animations[s.id] = { still: a.still, frames: a.frames.map((f) => [f.text, f.ms] as [string, number]) };
  }
  return {
    name: character.name,
    ...(character.nameMode !== undefined ? { nameMode: character.nameMode } : {}),
    ...(character.seed !== undefined ? { seed: character.seed } : {}),
    parts: { ...character.parts },
    animations,
  };
}

/** Rebuild a character from `serialize` output. Animations are regenerated from the parts. */
export function deserialize(data: Pick<SerializedCharacter, "name" | "nameMode" | "parts"> & { seed?: string }): Character {
  return createCharacter(data.parts, {
    name: data.name,
    ...(data.nameMode !== undefined ? { nameMode: data.nameMode } : {}),
    ...(data.seed !== undefined ? { seed: data.seed } : {}),
  });
}

/**
 * Return standalone Node.js source for the character's nine animations.
 * The generated source is dependency-free and uses the original [face, ms]
 * tuples; call `play("working")` and retain its stop function.
 */
export function toNodeSource(character: Character): string {
  const animations = Object.fromEntries(STATES.map((state) => {
    const a = character.animations[state.id];
    return [state.id, { still: a.still, frames: a.frames.map((f) => [f.text, f.ms]) }];
  }));
  // Use JSON strings for all user-controlled data to avoid code injection.
  return [
    `// Faceroll animations for ${character.name.replace(/[\r\n\u2028\u2029]/g, " ")}`,
    `const animations = ${JSON.stringify(animations, null, 2)};`,
    "",
    "// Animate one state on one terminal line; returns a stop function.",
    "function play(state, stream = process.stdout) {",
    "  if (!Object.prototype.hasOwnProperty.call(animations, state)) {",
    '    throw new RangeError("Unknown animation: " + String(state));',
    "  }",
    "  const animation = animations[state];",
    "  let index = 0;",
    "  let timer;",
    "  function next() {",
    "    const [face, ms] = animation.frames[index++ % animation.frames.length];",
    '    stream.write("\\r\\x1b[K" + face);',
    "    timer = setTimeout(next, ms);",
    "  }",
    "  next();",
    "  return () => {",
    "    clearTimeout(timer);",
    '    stream.write("\\r\\x1b[K");',
    "  };",
    "}",
    "",
    '// Example: const stop = play("working");',
  ].join("\n");
}

