# Integration

See [framework components](frameworks.md) for React, Vue and Web Components.

## System prompts (agent faces)

```ts
import { rollCharacter, toSystemPrompt } from "faceroll";

const pixel = rollCharacter({ name: "Pixel", seed: "pixel", vibe: "cute" });
const prompt = toSystemPrompt(pixel);                    // all nine states
const subset = toSystemPrompt(pixel, { states: ["idle", "working", "happy"] });
```

House rules (also emitted into the prompt): one face per message at the start
or end, never inside code/file contents/commit messages, still faces only in
static places. `STATES` gives each state's `use` sentence and sample `say` for
previews. Save the `seed` (or `parts`) to rebuild with `createCharacter`.

## Browser

Serve the project root over HTTP (not `file://`) and open
`examples/browser.html` — it imports `../dist/index.js` directly. Patterns:

```ts
import { createPlayer } from "faceroll";

const player = createPlayer((frame) => { el.textContent = frame.text; });
player.play(character.animations.working); // switch with .play(), end with .stop()
```

- Reserve width: `el.style.width = animation.width + "ch"` with `whiteSpace: "pre"`.
- Reduced motion: `matchMedia("(prefers-reduced-motion: reduce)")` → show `still`.
- Custom loops: `frameAt(animation, elapsedMs)` drives `requestAnimationFrame`.
- Persist designer state with `editor.getConfig()` → `localStorage`.

## Terminal (Node)

```ts
import { playInTerminal, createTerminalPlayer } from "faceroll/terminal";

const stop = playInTerminal(character.animations.working, { suffix: "  thinking" });
await doWork();
stop({ clear: true }); // or stop() to leave the last frame + newline
```

`createTerminalPlayer({ stream, prefix, suffix, hideCursor })` reuses one line
across `play()` calls. Non-TTY streams (CI, pipes) print the still once per
`play()` — safe for logs.

## Standalone Node export

```ts
import { toNodeSource } from "faceroll";
import { writeFileSync } from "node:fs";

writeFileSync("animations.cjs", toNodeSource(character));
// or: faceroll roll --seed pixel --format node > animations.cjs
```

The output is dependency-free, embeds all nine animations as `[face, ms]`
tuples (user data JSON-encoded), and defines `play(state, stream?)` returning a
stop function. Verified executable by the test suite.

## Serialization

```ts
import { serialize, deserialize } from "faceroll";

const json = JSON.stringify(serialize(character)); // frames as [text, ms]
const clone = deserialize(JSON.parse(json));       // animations rebuilt from parts
```

`deserialize` needs only `{ name, parts }` (plus optional `seed`).
