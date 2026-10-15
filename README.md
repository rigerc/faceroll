<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="playground/assets/logo-reversed.svg">
    <img src="playground/assets/logo-color.svg" alt="Faceroll logo" width="480">
  </picture>
</p>

# Faceroll

**Animated text faces for AI agents.** Give an agent a recognizable character, show what it's doing, and reuse the same face in messages, terminals, and interfaces.

```text
ʕ•ᴥ•ʔ        idle
ʕ•ᴥ•ʔ ...    working
ʕ•ᴥ•ʔ ?      questioning
ʕ^▽^ʔ ♪     happy
```

Each character has ten expressions: `idle`, `working`, `waiting`, `questioning`, `happy`, `sad`, `surprised`, `angry`, `sleepy`, and `dead` (static X eyes). The examples above are illustrative; generated faces depend on the chosen parts.

- **Make it yours:** 27 bodies, 16 eye styles, 15 mouths, and 24 ready-made presets.
- **Keep it recognizable:** use a seed or save the parts to recreate a character. Names are assigned automatically from the face's parts, or you can set your own.
- **Animate or stay still:** animations are timed text frames, with a still frame for Markdown, logs, or reduced-motion displays.
- **Use it where you work:** TypeScript/JavaScript, CLI, terminals, optional React/Vue/Web Component adapters, and an MCP server.
- **Keep the core small:** no runtime dependencies, ESM and CommonJS builds, and TypeScript declarations.

## Install

Requires **Node.js 18+** for the library and CLI.

```sh
npm install faceroll
```

## Create your first character

```ts
import { rollCharacter, toSystemPrompt } from "faceroll";

const agent = rollCharacter({ seed: "my-agent", vibe: "cute" });

console.log(agent.personality.map(trait => trait.label)); // Three stable personality traits
console.log(agent.name);                    // Automatic name for this face
console.log(agent.animations.idle.still);   // One-line idle expression
console.log(agent.animations.working.frames); // [{ text, ms }, ...]

const systemPrompt = toSystemPrompt(agent); // Faces and when the agent should use them
```

The same seed and options produce the same character. To restore a face from saved parts instead, use `createCharacter`:

```ts
import { createCharacter } from "faceroll";

const restored = createCharacter(agent.parts);
```

Every character contains immutable `parts`, `personality`, and `animations`. Personality is three traits with stable `id`, `label`, and `description` fields, assigned from the face parts. Renaming or changing expressions keeps the same traits; editing parts recalculates them. Different faces can share traits. System prompts include their communication guidance, and all character exports include the traits. Older saved characters gain traits automatically when restored. See the [personality API](docs/api.md#personality-srcpersonalityts). An animation includes `still`, `frames`, `duration`, and `width`, so you can render it with Faceroll's player or your own.

## Pick a preset or customize a face

Faceroll has **6,480 part combinations** and **24 named presets** grouped into `cute`, `cool`, and `weird` styles.

```ts
import { createPresetCharacter, createFaceroll } from "faceroll";

const kitty = createPresetCharacter("kitty", { name: "Pixel" });

const editor = createFaceroll({ seed: "my-agent", vibe: "cute" });
editor.applyPreset("bunny");
editor.setLocked("eyes", true); // Keep the eyes when rolling
editor.roll();                  // Reroll unlocked parts
editor.reroll("body");          // Change just the body
editor.undo();                  // Undo the last change

const chosen = editor.getCharacter();
const savedConfig = editor.getConfig();
```

The editor also supports part-by-part selection, persistent locks, custom names, and JSON, Markdown, system-prompt, and standalone Node.js exports. Use `editor.setName("")` to return to an automatic name. See the [editor guide](docs/editor.md) and [parts catalog](docs/parts.md).

### Give project threads related faces

Use one character as a project's parent, then derive stable variations for individual threads. Children keep the parent's body while varying the eyes and/or mouth.

```ts
import {
  rollCharacter,
  deriveChildCharacter,
  deriveChildCharacters,
  childCapacity,
} from "faceroll";

const project = rollCharacter({ seed: "my-project" });
const threads = deriveChildCharacters(project, { count: 5, seed: "family" });
const thirdThread = deriveChildCharacter(project, { index: 2, seed: "family" });

console.log(childCapacity(project));
```

Save the parent's `parts`, the family seed, and each thread's **zero-based index**. Reusing those values gives each thread the same face; adding another thread does not change earlier ones. Children are visually distinct within a family. Capacity depends on the parent's body (239 for most bodies, 15 for bear), and exceeding it throws a `RangeError`. Faceroll generates the faces but does not store project or thread metadata.

From the CLI:

```sh
npx faceroll children --preset kitty --seed my-project --count 5
npx faceroll children --preset kitty --seed my-project --index 2 --format json
```

## Play an animation

`createPlayer` calls your callback immediately with the first frame, then advances according to each frame's `ms`.

```ts
import { createPlayer } from "faceroll";

const statusEl = document.querySelector("#agent-status")!;

const player = createPlayer((frame) => {
  statusEl.textContent = frame.text;
});

player.play(agent.animations.working);
// Switch states when the agent's status changes:
player.play(agent.animations.idle);
player.stop();
```

For a custom render loop, use `frameAt(animation, elapsedMs)`. To avoid layout movement, reserve `animation.width` terminal columns (or measure the rendered text in a browser).

When implementing your own player, respect reduced-motion preferences by displaying the still face:

```ts
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (prefersReducedMotion) {
  statusEl.textContent = agent.animations.working.still;
} else {
  player.play(agent.animations.working);
}
```

The optional framework components handle reduced motion automatically.

### Terminal playback

```ts
import { playInTerminal } from "faceroll/terminal";

const stop = playInTerminal(agent.animations.working, { suffix: "  thinking" });
await doTheWork();
stop({ clear: true });
```

Terminal playback redraws a single line. In non-TTY output, such as CI logs or a pipe, it prints the still face instead. Use `createTerminalPlayer()` if you need to switch states without starting a new player.

## CLI

The CLI comes with the npm package. Use `npx` if you haven't installed it globally:

```sh
npx faceroll roll --vibe cute --name Pixel
npx faceroll roll --preset kitty --format json
npx faceroll roll --seed pixel --format prompt
npx faceroll play working --seed pixel --duration 3000
npx faceroll presets
npx faceroll states
npx faceroll parts
```

`roll` supports `text`, `prompt`, `markdown`, `json`, and `node` formats. The `node` format creates a standalone, dependency-free Node.js animation player. Use `--body`, `--eyes`, and `--mouth` to choose exact parts; these flags override preset parts.

See [CLI options and examples](docs/cli.md).

## Framework components

Optional **ESM-only** adapters expose a face that takes `character`, `state`, and `paused` props. React 18+ and Vue 3.3+ are optional peers; the core remains dependency-free.

**React**

```tsx
import { createPresetCharacter } from "faceroll";
import { AgentFace } from "faceroll/react";

const pixel = createPresetCharacter("kitty", { name: "Pixel" });

export function Status() {
  return <AgentFace character={pixel} state="working" />;
}
```

**Vue**

```vue
<script setup lang="ts">
import { createPresetCharacter } from "faceroll";
import { AgentFace } from "faceroll/vue";

const pixel = createPresetCharacter("kitty", { name: "Pixel" });
</script>

<template>
  <AgentFace :character="pixel" state="working" />
</template>
```

**Native Web Component**

```ts
import { defineFacerollElement } from "faceroll/web-component";

defineFacerollElement();
```

```html
<faceroll-face preset="kitty" name="Pixel" state="working"></faceroll-face>
```

Framework adapters display still faces during server rendering, respect reduced motion, and clean up animation timers. The Web Component is registered only when you call `defineFacerollElement()`. See [framework integration](docs/frameworks.md).

## Try the playground

The local playground shows personality badges and expandable trait descriptions. It lets you browse presets, roll and edit parts, lock selections, undo changes, and preview all ten expressions. You can inspect individual animation frames, explore thread families, and copy or download system prompts, JSON, Markdown, or Node.js source. Character settings are saved in local storage when available.

```sh
git clone https://github.com/rigerc/faceroll.git
cd faceroll
npm ci
npm run playground
```

Open **http://127.0.0.1:4173**. For a static build, use `npm run build:playground`; the output is written to `playground-dist/`. Cloudflare Workers deployment commands are `npm run deploy:cloudflare:dry` and `npm run deploy:cloudflare`.

You can also run `npm run build` and serve the repository root over HTTP to try [the browser integration example](examples/browser.html).

## MCP server

The optional [MCP server](mcp/README.md) gives AI agents tools to browse presets, create and reroll characters, derive thread faces, inspect animation frames, and export prompts or data. It is a **separate Node.js 24+ package**, not a dependency of the core library.

From the repository root:

```sh
npm ci
npm --prefix mcp ci
npm run build:mcp
npm run start:mcp
```

The HTTP endpoint is **http://127.0.0.1:3000/mcp**. For clients that launch a local stdio process, run `node /absolute/path/to/faceroll/mcp/dist/index.js --stdio`. The [MCP guide](mcp/README.md) covers client configuration, tools, and Inspector commands.

## API at a glance

| API | Purpose |
| --- | --- |
| `rollCharacter(options?)` | Roll a seeded or random character, with optional vibe and locked parts. |
| `createCharacter(parts, options?)` | Rebuild a face from exact parts. |
| `createPresetCharacter(id, options?)` | Create a face from a named preset. |
| `rerollPart(character, kind, options?)` | Change one part without mutating the original. |
| `createFaceroll(options?)` | Edit parts with locks, undo, and exports. |
| `deriveChildCharacter(parent, options)` | Derive a stable face for a thread slot. |
| `deriveChildCharacters(parent, options)` | Derive several related thread faces. |
| `createPlayer(onFrame, options?)` | Play timed text frames in an app. |
| `frameAt(animation, elapsedMs)` | Get the frame at a point in an animation. |
| `toSystemPrompt(character)` | Explain the expressions to an AI agent. |
| `toMarkdown(character)` | Export a table of expressions. |
| `serialize(character)` / `deserialize(data)` | Save or restore character data. |
| `toNodeSource(character)` | Export standalone Node.js animation code. |

See the [full API reference](docs/api.md), [animation guide](docs/animations.md), and [integration guide](docs/integration.md).

## Development

```sh
npm ci
npm test                 # Vitest
npm run typecheck
npm run build            # ESM, CommonJS, declarations, CLI
npm run check:size       # Check gzip size budgets (after build)
npm run test:smoke       # Test the built package with Node.js
npm run build:playground
npm run test:playground  # Test the built playground
```

Builds require **TypeScript 5.x**. Additional commands and project layout notes are in the [development guide](docs/development.md). Documentation starts at [docs/README.md](docs/README.md).

## License

[MIT](LICENSE). The original package supplied an MIT license; verify redistribution rights for any incorporated original HTML assets before publication.
