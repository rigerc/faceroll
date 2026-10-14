# Faceroll — Character Studio Design System

## Intent
The playground is an **Operate** surface: developers choose a character, change parts, inspect its nine expressions, and export portable text. The interface should behave like a small typographic specimen studio: the character itself is the artifact, while tools and presets stay legible and subordinate.

## Visual direction
A clean, editorial workspace with an expressive lilac specimen area, parchment-toned application surround, and violet primary actions. The UI uses the system sans for controls and the existing broad-coverage monospace fallback for actual faces. These choices do not affect the runtime-free Faceroll library.

## Spatial hierarchy
- **Desktop (over 1150px):** three columns—searchable face library (225–255px), fluid live preview, customization panel (274–305px).
- **Tablet (761–1150px):** live preview plus customization above a four-column preset browser.
- **Mobile (up to 760px):** stacked preview, customization, and preset library; two-column preset grid. Main controls remain at least 44px at the existing mobile breakpoint.
- Animation frames stay immediately below the live preview rather than forming a disconnected page section.
- The current thread-family generator remains a dedicated panel below the studio; it uses the same neutral controls and specimen typography.
- Export remains a full-width, dark code workspace after editing.

## Color tokens
Tokens live in `playground/studio.css`, deliberately layered over `playground/style.css` to leave a clear fallback.

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--background` | `#f5f2e9` | `#151921` | Application surround |
| `--foreground` | `#242932` | `#f3f1eb` | Primary text |
| `--surface` | `#fffefa` | `#222833` | Preview and controls |
| `--editor-surface` | `#f2f0ea` | `#1c222c` | Side panels |
| `--stage` | `#e6e7ff` | `#403d6b` | Specimen viewport |
| `--stage-text` | `#333764` | `#f2eefe` | Face and stage copy |
| `--accent` | `#4a43cc` | `#a59dff` | Selected controls |
| `--code-surface` | `#252b39` | `#111620` | Export area |
| `--focus` | `#5550c9` | `#c5c0ff` | Visible keyboard focus |

## Interaction behavior
- Presets are selectable specimens, searchable by generated name or preset label and filtered by vibe.
- The live preview labels its current expression; its frame strip can pause on a specific animation frame.
- Existing play/pause, cycle moods, speed, edit-part controls, locks, reroll, undo, naming, copy, thread-family generation, and export are unchanged.
- The primary `Roll face` action is visually distinct. Pressed selections, hover, focus, and disabled states remain visible.
- Animations respect `prefers-reduced-motion`; users can explicitly enable playback as before.

## Accessibility and constraints
Preserve semantic section headings, explicit labels, `aria-pressed` for toggles and selections, skip navigation, visible focus rings, and horizontal overflow in code and frame strips rather than page-wide overflow. Preserve the project's strict CSP and self-hosted assets: the redesign adds **no runtime dependency, external image, font, or network request**.

## Implementation map
- `playground/index.html`: reordered library / preview / editor, new page framing and dynamic expression label.
- `playground/studio.css`: surface, theme, and responsive design layer.
- `playground/app.js`: reflects the selected state label.
- `playground/theme.js`, `playground/404.html`: matching browser/theme colors and 404 presentation.
- `test/playground.test.mjs`: validates renamed page and studio stylesheet packaging.

## Maintenance
Do not invent expressions or preset counts: use `STATES` and `FACE_PRESETS` from the library. Prefer adjusting tokens in `studio.css` before adding one-off colors, and keep responsive behavior structural. The main success test is whether a developer can find or roll a face, inspect its animation, and export it without losing context.
