# Framework components

Faceroll includes three optional **ESM-only** UI integration entry points.
The core package and CLI have no runtime dependencies. Install React or Vue
separately in apps that use their corresponding adapter.

| Import | Requirement | Export |
|---|---|---|
| `faceroll/react` | React 18+ | `AgentFace` |
| `faceroll/vue` | Vue 3.3+ | `AgentFace` |
| `faceroll/web-component` | Browser Custom Elements | `defineFacerollElement` |

## React

```tsx
import { createPresetCharacter } from "faceroll";
import { AgentFace } from "faceroll/react";

const pixel = createPresetCharacter("kitty", { name: "Pixel" });

export function AgentStatus({ state }: { state: "idle" | "working" }) {
  return <AgentFace character={pixel} state={state} className="face" />;
}
```

`AgentFace` accepts `character` (required), `state` (default `idle`),
`paused` (default `false`) and standard span attributes, such as `className`,
`style`, and `aria-label`. The animation is restarted on prop changes and the
timer is disposed when the component unmounts.

## Vue 3

```vue
<script setup lang="ts">
import { createPresetCharacter } from "faceroll";
import { AgentFace } from "faceroll/vue";
const pixel = createPresetCharacter("kitty", { name: "Pixel" });
</script>

<template>
  <AgentFace :character="pixel" state="working" class="face" />
</template>
```

The Vue component has matching `character`, `state`, and `paused` props.
Additional HTML attributes are forwarded to the underlying span. Animation
runs only after mounting and is cleaned up before unmounting.

## Native Web Component

Import from a browser application's bundler entry point or an import map:

```ts
import { defineFacerollElement } from "faceroll/web-component";
import { rollCharacter } from "faceroll";

defineFacerollElement(); // register once

const el = document.querySelector("faceroll-face")!;
el.character = rollCharacter({ seed: "pixel" });
el.state = "happy";
el.paused = false;
```

```html
<faceroll-face preset="kitty" name="Pixel" state="working"></faceroll-face>
<faceroll-face preset="hacker" paused></faceroll-face>
```

- `preset`: named preset ID, default `classic`.
- `name`: name for a preset-generated character, default `Agent`.
- `state`: one of the nine built-in state IDs, default `idle`.
- `paused`: Boolean attribute displaying a static face when present.
- `.character`: an optional immutable `Character` that takes precedence over
  `preset`. Assign `undefined` to return to preset mode.
- `::part(face)`: CSS hook for styling the shadow DOM's text span.
- `defineFacerollElement("my-face")`: register with a different custom tag.
  It returns true when newly registered, or false when the tag already exists
  or the function is called outside a browser.

The custom element is **not** registered as a side effect of importing the
module. Calling registration on the server is safe and does nothing; call
it again in the browser.

## Accessibility and reduced motion

All adapters show a representative still face on the server and default to
accessible `role="img"` labels with `aria-live="off"`, preventing screen
readers from announcing every animated frame. React and Vue accept custom
`aria-label` values. All three respond to changes in
`prefers-reduced-motion: reduce` and clean up their timers on
unmount/disconnect. Passing `paused` forces the still frame.

These adapters are ESM-only; the existing CommonJS core and terminal exports
are unchanged.
