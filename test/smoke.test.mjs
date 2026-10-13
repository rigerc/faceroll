import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import * as esm from "../dist/index.js";

const require = createRequire(import.meta.url);
const cjs = require("../dist/index.cjs");
const root = fileURLToPath(new URL("..", import.meta.url));

test("ESM and CommonJS entry points expose the same core API", () => {
  for (const api of [esm, cjs]) {
    const editor = api.createFaceroll({ seed: "fixed" });
    assert.equal(editor.getStill("idle"), "(•ω•)");
    assert.equal(typeof api.rollCharacter, "function");
    assert.equal(typeof api.toNodeSource, "function");
    assert.equal(typeof api.frameAt, "function");
  }
});

test("all 2970 combinations have nine complete animations with stable durations", () => {
  let checked = 0;
  for (const body of esm.BODIES) for (const eyes of esm.EYES) for (const mouth of esm.MOUTHS) {
    const c = esm.createCharacter({ body: body.id, eyes: eyes.id, mouth: mouth.id });
    for (const state of esm.STATES) {
      const animation = c.animations[state.id];
      assert.ok(animation.still.length);
      assert.ok(animation.frames.length);
      assert.equal(animation.duration, animation.frames.reduce((sum, f) => sum + f.ms, 0));
      assert.ok(Object.isFrozen(animation));
      assert.ok(Object.isFrozen(animation.frames));
      assert.ok(animation.frames.every((f) => Object.isFrozen(f)));
      checked++;
    }
  }
  assert.equal(checked, 2970);
});

test("locked editor, seeded rerolls, bounded undo, and mouth preference", () => {
  const a = esm.createFaceroll({ seed: "sequence", parts: { body: "bear", mouth: "w" } });
  const b = esm.createFaceroll({ seed: "sequence", parts: { body: "bear", mouth: "w" } });
  assert.equal(a.getStill("idle"), "ʕ•ᴥ•ʔ");
  assert.equal(a.getParts().mouth, "w");
  a.setParts({ body: "round" });
  b.setParts({ body: "round" });
  assert.equal(a.getStill("idle"), "(•ω•)");
  a.setLocked("eyes", true);
  b.setLocked("eyes", true);
  for (let i = 0; i < 40; i++) {
    assert.equal(a.roll(), true);
    assert.equal(b.roll(), true);
    assert.deepEqual(a.getParts(), b.getParts());
  }
  assert.equal(a.historyLength, 30);
  assert.equal(a.undo(), true);
  a.setLocked("body", true);
  a.setLocked("mouth", true);
  assert.equal(a.roll(), false);
});

test("generated Node source is executable and stops", () => {
  const src = esm.toNodeSource(esm.createCharacter({ body: "round", eyes: "dot", mouth: "w" }));
  const writes = [];
  let stopCalled = false;
  let handler;
  const stop = runInNewContext(`${src}\nplay("working")`, {
    process: { stdout: { write: (text) => writes.push(text) } },
    setTimeout: (fn) => { handler = fn; return 1; },
    clearTimeout: () => { stopCalled = true; },
  });
  assert.ok(writes[0].startsWith("\r\x1b[K"));
  handler();
  assert.ok(writes.length > 1);
  stop();
  assert.equal(stopCalled, true);
  assert.equal(writes.at(-1), "\r\x1b[K");
});

test("CLI supports new node output and old command interface", () => {
  const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
  for (const format of ["node", "json", "markdown", "prompt", "text"]) {
    const out = spawnSync(process.execPath, [cli, "roll", "--seed", "pixel", "--format", format], { encoding: "utf8" });
    assert.equal(out.status, 0, out.stderr);
    assert.ok(out.stdout);
    if (format === "node") assert.ok(out.stdout.includes("function play(state"));
  }
});

test("browser example imports the shipped ESM build", () => {
  const html = readFileSync(new URL("../examples/browser.html", import.meta.url), "utf8");
  assert.ok(html.includes('from "../dist/index.js"'));
  assert.ok(html.includes("prefers-reduced-motion"));
});
