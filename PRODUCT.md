# Faceroll

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers creating expressive text characters for AI agents. They choose a face,
customize its parts, preview moods, and export it for use in their agent or app.

## Product Purpose

Give AI agents a reproducible text character that expresses their state and mood.
The web playground helps developers find, customize, preview, and export a character;
the library and CLI let them integrate it into browsers, Node.js, and terminals.
Success means taking a chosen character into an integration while preserving its
identity and expressions.

## Operating Context

The existing playground supports selecting presets, editing body/eyes/mouth,
locking parts during rolls, undoing selections, and previewing nine states and
emotions. Developers can pause playback, adjust speed, inspect frames, copy a face,
and export a system prompt, JSON, Markdown, or standalone Node.js source.
Character configuration is saved in localStorage when available.

## Capabilities and Constraints

- Preserve reproducible characters through seeds and saved parts.
- Preserve plain-text faces and exports; animations are timed text frames.
- Keep the core free of runtime dependencies.
- The existing TypeScript library provides ESM/CJS builds, a Node.js CLI, terminal
  playback, and optional React, Vue, and Web Component integrations.
- The playground uses HTML, CSS, and JavaScript with the real library build.
- Existing states are idle, working, waiting, questioning, happy, sad, surprised,
  angry, and sleepy.
- Run `npm run playground` to build and serve the playground at
  `http://127.0.0.1:4173`; the served files are generated in `playground-dist/`
  from `playground/`.

## Brand Commitments

The existing product name is Faceroll. No additional binding brand or visual
requirements were established during initialization.

## Evidence on Hand

- `README.md` describes the product, workflows, integrations, and exports.
- `docs/` contains API, parts, animation, CLI, editor, and integration documentation.
- `src/` implements the library; `integrations/` contains framework adapters.
- `playground/` contains the interactive web interface; `examples/browser.html`
  provides another browser integration example.
- `test/` contains automated checks for the library and playground.
- No customer testimonials, adoption claims, or comparative benchmarks were
  confirmed during initialization.

## Product Principles

- Keep a character's identity reproducible across sessions and integrations.
- Make customization and expression easy to preview before export.
- Keep exported faces and animation data portable as plain text.
- Preserve a dependency-free core and optional integrations.
- Respect reduced-motion preferences.

## Accessibility & Inclusion

Preserve reduced-motion support. The existing playground pauses animation for
reduced-motion preferences and permits an explicit playback choice. No additional
product-specific accessibility standard was established during initialization.
