# faceroll

Random, animated ASCII faces (asciimoji) for AI agents. Roll a character once and get a face for every state your agent can be in: idle, working, waiting, questioning, plus happy, sad, surprised, angry and sleepy.

```
ʕ•ᴥ•ʔ            idle (blinks, glances left and right)
ʕ•ᴥ•ʔ ...        working (eyes scan while dots run)
ʕ•ᴥ•ʔ ?         questioning
ʕ^▽^ʔ ♪         happy (dances)
```

- Zero runtime dependencies, works in browsers and Node 18+
- Editable characters: part locks, per-part reroll, undo, and reusable snapshots
- Standalone Node source export and browser integration demo
- ESM and CJS builds with full types
- Seeded: the same seed always gives the same character
- Compact: every frame is one short line (checked in tests)
- Every animation is plain data (`{ text, ms }` frames), so you can play it anywhere

## Install

```sh
npm install faceroll
```

## Quick start

```ts
import { rollCharacter, toSystemPrompt } from "faceroll";

const pixel = rollCharacter({ name: "Pixel", seed: "pixel", vibe: "cute" });

pixel.animations.idle.still;      // "ヽ(·_·)ﾉ"
pixel.animations.working.frames;  // [{ text: "ヽ(·_·)ﾉ .  ", ms: 150 }, ...]

// Tell the agent which face to use when
const systemPrompt = toSystemPrompt(pixel);
```

Save the seed (or the parts) and you can rebuild the same character later:

```ts
import { createCharacter } from "faceroll";

const same = createCharacter(pixel.parts, { name: "Pixel" });
```

## More faces and ready-made presets

Faceroll v0.3.0 includes **27 bodies, 16 eye styles, and 15 mouths**: 6,480 possible
part combinations, with all nine animated states per character. The 24 named
presets provide recognizable starting faces grouped by `cute`, `cool`, and `weird`.

```ts
import { FACE_PRESETS, getFacePreset, createPresetCharacter, createFaceroll } from "faceroll";

const names = FACE_PRESETS.map((preset) => preset.id);
const kitty = createPresetCharacter("kitty", { name: "Pixel" });
kitty.animations.idle.still; // "ฅ(≖ᆺ≖)ฅ"

const editor = createFaceroll({ name: "Pixel" });
editor.applyPreset("bunny");   // select a preset; undo history is retained
editor.undo();                 // restore your previous face
const style = getFacePreset("bunny").vibe; // "cute"
```

```sh
faceroll presets
faceroll roll --preset kitty
faceroll roll --preset bunny --body round --format json
```

Explicit `--body`, `--eyes`, and `--mouth` flags override a preset's parts.
When a preset is selected, seed and vibe do not change its predefined parts.
Visit `examples/browser.html` (after building and serving the project) to
browse the new **Face gallery**, including a style filter and preview.

## Play an animation

`createPlayer` is a small timer loop. It calls `onFrame` right away with frame 0, then follows each frame's `ms`.

```ts
import { createPlayer } from "faceroll";

const player = createPlayer((frame) => {
  statusEl.textContent = frame.text;
});

player.play(pixel.animations.working);
// later, when the agent state changes
player.play(pixel.animations.idle);
// when you are done
player.stop();
```

Respect reduced motion by showing the still instead of playing:

```ts
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduce) statusEl.textContent = pixel.animations.working.still;
else player.play(pixel.animations.working);
```

To drive your own render loop (for example `requestAnimationFrame`), use `frameAt(animation, elapsedMs)`.

### Keep the layout still

Frames have slightly different widths (a `...` tail grows, a glance adds a space). Each animation has a `width` in terminal columns, and in a browser you can render the face in a box that is as wide as the widest frame:

```ts
el.style.width = `${animation.width}ch`;
el.style.whiteSpace = "pre";
el.style.textAlign = "left";
```

`cellWidth(text)` estimates terminal columns, counting East Asian wide characters as 2. Fonts decide the real width, so measure in the DOM if you need pixel accuracy.

## Terminal

```ts
import { playInTerminal } from "faceroll/terminal";

const stop = playInTerminal(pixel.animations.working, { suffix: "  thinking" });
await doTheWork();
stop({ clear: true });
```

It redraws one line with `\r` and hides the cursor while it runs. On a non-TTY stream (CI logs, pipes) it prints the still face once instead of redrawing. Use `createTerminalPlayer()` to switch animations on the same line.

## CLI

```sh
npx faceroll roll --vibe cute --name Pixel
npx faceroll roll --seed pixel --format prompt     # also: markdown, json, node, text
npx faceroll play working --seed pixel --duration 3000
npx faceroll states
npx faceroll parts
```

Lock parts with `--body`, `--eyes` and `--mouth`.

## MCP server

The optional [MCP server](mcp/README.md) lets agents browse presets, create and
reroll characters, retrieve animation frames, and export system prompts,
Markdown, JSON or Node.js source. It uses
[nickytonline's TypeScript MCP template](https://github.com/nickytonline/mcp-typescript-template)
and runs as a separate Node.js 24+ package; the core stays dependency-free.

From a checkout, install and build it with:

```sh
npm ci
npm --prefix mcp ci
npm run build:mcp
npm run start:mcp           # HTTP: http://127.0.0.1:3000/mcp
```

For clients that launch a local stdio server, use
`node /absolute/path/to/faceroll/mcp/dist/index.js --stdio`.
See the [server guide](mcp/README.md) for client configuration and tool inputs.

Use `npm run inspect:mcp` to build and open MCP Inspector for the stdio server,
or `npm run inspect:mcp:http` to inspect an already running HTTP server.
For command-line checks, use `npm run inspect:mcp:cli` or
`npm run inspect:mcp:http:cli`. See the [Inspector guide](mcp/README.md#test-with-mcp-inspector)
for tool calls and custom ports.

## Framework components

Optional ESM adapters are available for React 18+, Vue 3.3+, and native Web
Components. Import only the framework you use: the core and CLI remain free
of runtime dependencies.

### React

```tsx
import { createPresetCharacter } from "faceroll";
import { AgentFace } from "faceroll/react";

const pixel = createPresetCharacter("kitty", { name: "Pixel" });
<AgentFace character={pixel} state="working" />;
```

### Vue 3

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

### Native Web Component

```ts
import { defineFacerollElement } from "faceroll/web-component";
defineFacerollElement();
```

```html
<faceroll-face preset="kitty" name="Pixel" state="working"></faceroll-face>
```

Pass a generated character via the element's `.character` property to override
the preset. React and Vue take `character`, `state`, and `paused` props.
All adapters show still frames during SSR, respect reduced motion and clean up
timers. The native element registers only when requested.

See [framework integration documentation](docs/frameworks.md).

## API

### Characters

| Function | What it does |
|---|---|
| `rollCharacter(options?)` | Roll a character. Options: `seed`, `rng`, `vibe`, `lock`, `name`. |
| `createCharacter(parts, options?)` | Build from exact parts. Throws `RangeError` on an unknown id. |
| `rerollPart(character, kind, options?)` | New body, eyes or mouth, keeping the rest. |
| `listParts()` | Every valid id for `body`, `eyes` and `mouth`. |
| `partPool(kind, vibe?)` | Ids that fit a vibe. |

A `Character` is deeply frozen animation data: `{ name, nameMode?, seed?, parts, animations }`. Rolling without a seed generates one and stores it on the character so you can reproduce it. If you pass your own `rng`, no seed is recorded.

`vibe` is `"any"`, `"cute"`, `"cool"` or `"weird"`. A bear body always **renders** with the `ᴥ` mouth, but `character.parts.mouth` retains your selected mouth (for example, `"w"`). When the body changes, the saved preference is restored. Serialized characters also preserve this choice.

### Automatic names

Omit `name` to give each face a cute, normal human name, such as **Milo Bennett**.
Every one of the 6,480 body/eyes/mouth configurations has a distinct full name.
The same parts always get the same name across seeds, presets, sessions, and integrations;
the selected mouth counts even when a bear renders its fixed mouth. Names do not
consume random draws or change seeded face results.

```ts
import { rollCharacter, nameForParts, createFaceroll } from "faceroll";
const face = rollCharacter({ seed: "my-agent" });
face.name;                 // automatic first name + surname
nameForParts(face.parts);  // the same name without building animations
const editor = createFaceroll();
editor.roll();             // automatic name follows the new parts
editor.setName("Pixel");   // custom name stays through rolls and edits
editor.setName("");        // return to automatic naming
```

`nameMode` is `"auto"` or `"custom"`. JSON exports and editor configs preserve it;
pass it back with the saved name and parts when restoring. Snapshots without
`nameMode` retain their existing nonblank names as custom names. Custom names
may repeat; uniqueness applies to automatic names per configuration, not every roll.
The playground shows human names on preset cards and supports searching by name
or preset label. The name field shows Automatic or Custom; choose **Use automatic
name** (or clear the field) to return to automatic naming.

### States

`idle`, `working`, `waiting`, `questioning`, `happy`, `sad`, `surprised`, `angry`, `sleepy`. `STATES` lists each with a label, kind (`state` or `emotion`), a `use` sentence and a sample `say` message.

An `Animation` has `name`, `still`, `frames`, `duration` (one loop in ms) and `width`.

### Playing

| Function | What it does |
|---|---|
| `createPlayer(onFrame, options?)` | Timer-driven loop with `play`, `stop`, `playing` and `current`. Pass `setTimeout` and `clearTimeout` in `options` for tests. |
| `frameAt(animation, ms)` | The frame showing `ms` into the loop. |
| `frameIndexAt(animation, ms)` | Same, as an index. |

### Exporting

| Function | What it does |
|---|---|
| `toSystemPrompt(character, { states? })` | Prompt text listing each face and when to use it. |
| `toMarkdown(character)` | A table of states, faces and use cases. |
| `serialize(character)` | Plain JSON data. Frames are `[text, ms]` pairs. |
| `deserialize(data)` | Rebuilds a character from `name` and `parts`. |
| `toNodeSource(character)` | Standalone, dependency-free Node.js animation code. |

## Interactive editor (persistent locks and undo)

Use `createFaceroll()` when building a character designer. This keeps editor
state separate from the existing immutable `Character` API:

```ts
import { createFaceroll, toSystemPrompt } from "faceroll";

const editor = createFaceroll({ name: "Pixel", vibe: "cute", seed: "my-agent" });
editor.setLocked("eyes", true);  // lock eyes through all rolls
editor.roll();                   // reroll the body and mouth
editor.reroll("body");          // reroll a single unlocked part
editor.undo();                   // undo the most recent roll

editor.getParts();               // editable selected part ids
editor.getLocks();               // boolean per-part locks
editor.getStill("idle");        // static face
editor.getFrameAt("working", 250); // a face frame at elapsed milliseconds
editor.getCharacter();           // immutable Character snapshot
editor.export("json");         // "prompt", "markdown", "json", "node"
```

By default, the editor retains the last 30 successful roll/reroll snapshots.
Override with `historyLimit` (0 disables undo). Locks and vibe remain in effect
after undo. Pass `{ seed: "..." }` for a deterministic sequence of rolls, or
pass a custom `rng` function. `getConfig()` returns a plain object containing
`name`, `nameMode`, `vibe`, `parts`, and `locks`, suitable for saving to localStorage in an app. You can also pass the earlier editor's `random` option; `rng` is the preferred name.

`setParts({ body: "bear", mouth: "w" })` keeps `"w"` as the selected mouth,
even though the bear renders with its special `ᴥ` glyph; changing the body
back to `"round"` restores the `(•ω•)` face.

### Node.js source export

```ts
import { rollCharacter, toNodeSource } from "faceroll";
import { writeFileSync } from "node:fs";
writeFileSync("animations.cjs", toNodeSource(rollCharacter({ seed: "pixel" })));
```

The emitted file defines a `play(state)` function that returns a stop function.
It includes all nine animations as `[face, ms]` tuples and requires no package.
Use `faceroll roll --format node` to generate the same output from the CLI.

### Playground

```sh
npm ci
npm run playground
```

Open **http://127.0.0.1:4173** to explore the interactive playground. Pick from
24 presets, search and filter styles, customize body/eyes/mouth, lock parts for
random rolls, and undo selections. Preview all nine moods, change playback speed,
pause or inspect individual frames, and copy a face or export the character as
a system prompt, JSON, Markdown, or standalone Node.js source.

Your character configuration stays in localStorage when available. Reduced-motion
preferences pause animations; playback can be enabled explicitly. The playground
uses the real library build and has no frontend runtime dependencies.

`npm run build:playground` creates a self-contained static site in
`playground-dist/`, ready to serve at a root URL or under a subdirectory.
Set `PORT` or `HOST` to override the development server defaults. After building,
`node scripts/serve-playground.mjs` serves without rebuilding. Source lives in
`playground/`; run `npm run test:playground` after building to check its model,
packaging, and preview server.

### Browser example

Run `npm run build`, serve the **project root** over HTTP (not `file://`),
and open `examples/browser.html`. It imports `../dist/index.js` directly.
The example has a state selector, vibe selector, roll, undo, per-part reroll and locks,
animated face preview, and export chooser. It saves the configuration in browser
localStorage and respects reduced-motion settings.

## Using the faces well

- Show one face per message, at the start or the end.
- Never put a face inside code, file contents or commit messages. The generated prompt says so.
- Use the still face in places that cannot animate (logs, markdown, chat).

## Development

Full guides in [docs/](docs/): [API](docs/api.md), [parts](docs/parts.md),
[animations](docs/animations.md), [CLI](docs/cli.md), [editor](docs/editor.md),
[integration](docs/integration.md), [development](docs/development.md).

```sh
npm install
npm test          # vitest
npm run typecheck
npm run build     # tsup: ESM + CJS + .d.ts + CLI
npm run test:smoke       # uses prebuilt dist and Node
npm run build:fallback   # uses tsc when tsup is unavailable
```

The tests cover every body, eye, and mouth combination; all nine states and the original timing; frozen frames; reproducible rolls; locks and undo; source exports; and terminal output.

TypeScript 5.x is required for the build (tsup's declaration bundler does not support TypeScript 7 yet).

## License

MIT (the original package supplied an MIT license; verify redistribution rights for any incorporated original HTML assets before publication).

