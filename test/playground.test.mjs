import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createFaceroll, FACE_PRESETS } from "../dist/index.js";
import { restoreEditor, createHistory, filterPresets, exportFilename } from "../playground-dist/model.js";

test("restores valid configuration and recovers from corrupt or inaccessible storage", () => {
  const config = createFaceroll({ name: "Nova", vibe: "cool", parts: { body: "bot" }, locks: { eyes: true } }).getConfig();
  const storage = value => ({ getItem: () => value });
  assert.deepEqual(restoreEditor(storage(JSON.stringify(config))).getConfig(), config);
  for (const value of ["{bad", "null", JSON.stringify({ ...config, name: {} }), JSON.stringify({ ...config, locks: {} }), JSON.stringify({ ...config, parts: { ...config.parts, eyes: "invalid" } })]) {
    assert.equal(restoreEditor(storage(value)).getConfig().name, "Pixel");
  }
  assert.equal(restoreEditor({ getItem() { throw new Error("blocked"); } }).getConfig().name, "Pixel");
  assert.equal(restoreEditor(undefined).getConfig().name, "Pixel");
});

test("undo restores manual edits, presets and rolls while retaining locks and name", () => {
  const editor = createFaceroll({ seed: "playground" });
  const history = createHistory(editor);
  const original = editor.getParts();
  history.change(() => editor.setParts({ body: "bot" }));
  const manual = editor.getParts();
  history.change(() => editor.applyPreset("bunny"));
  editor.setLocked("eyes", true);
  editor.setName("Nova");
  const beforeRoll = editor.getParts();
  history.change(() => editor.roll());
  assert.equal(editor.getParts().eyes, beforeRoll.eyes);
  history.undo();
  assert.deepEqual(editor.getParts(), beforeRoll);
  history.undo();
  assert.deepEqual(editor.getParts(), manual);
  history.undo();
  assert.deepEqual(editor.getParts(), original);
  assert.equal(editor.isLocked("eyes"), true);
  assert.equal(editor.getConfig().name, "Nova");
  assert.equal(history.length, 0);
  history.undo();
  history.change(() => editor.setParts(original));
  assert.equal(history.length, 0);
  assert.throws(() => history.change(() => editor.setParts({ body: "invalid" })));
  assert.equal(history.length, 0);
});

test("history stays bounded and all-locked rolls add no history", () => {
  const editor = createFaceroll({ seed: 12 });
  const history = createHistory(editor);
  for (let i = 0; i < 40; i++) history.change(() => editor.roll());
  assert.equal(history.length, 30);
  for (const kind of ["body", "eyes", "mouth"]) editor.setLocked(kind, true);
  const parts = editor.getParts();
  history.change(() => editor.roll());
  assert.deepEqual(editor.getParts(), parts);
  assert.equal(history.length, 30);
});

test("preset search combines style and normalized text and permits empty results", () => {
  assert.equal(filterPresets(FACE_PRESETS, "any", "").length, 24);
  assert.deepEqual(filterPresets(FACE_PRESETS, "cute", " BUNNY ").map(preset => preset.id), ["bunny"]);
  assert.equal(filterPresets(FACE_PRESETS, "cool", "bunny").length, 0);
  assert.ok(filterPresets(FACE_PRESETS, "weird", "weird").every(preset => preset.vibe === "weird"));
});

test("download names are safe and match export content", () => {
  assert.equal(exportFilename("../../Nova / Agent", "json"), "nova-agent.json");
  assert.equal(exportFilename("♡", "node"), "character.cjs");
  assert.equal(exportFilename("Pixel", "markdown"), "pixel.md");
  assert.equal(exportFilename("Pixel", "prompt"), "pixel.txt");
});

test("packaged frontend module graph resolves without Node-only imports", async () => {
  const seen = new Set();
  async function check(url) {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const source = await readFile(url, "utf8");
    const imports = [...source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)];
    for (const [, specifier] of imports) {
      assert.ok(specifier.startsWith("."), `Unexpected browser import: ${specifier}`);
      await check(new URL(specifier, url));
    }
  }
  await check(new URL("../playground-dist/app.js", import.meta.url));
  assert.ok(seen.size >= 4);
});

test("preview server serves the built playground and rejects traversal and writes", async t => {
  const child = spawn(process.execPath, ["scripts/serve-playground.mjs"], {
    cwd: new URL("..", import.meta.url), env: { ...process.env, PORT: "0", HOST: "127.0.0.1" }, stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => { child.kill(); await once(child, "exit"); });
  const origin = await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error("Preview server did not start")), 5000);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.stdout.on("data", chunk => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Kaomoji playground/);
  assert.match((await fetch(`${origin}/app.js`)).headers.get("content-type"), /javascript/);
  assert.equal((await fetch(`${origin}/lib/index.js`)).status, 200);
  assert.equal((await fetch(`${origin}/missing`)).status, 404);
  assert.equal((await fetch(`${origin}/%2e%2e%2fpackage.json`)).status, 403);
  assert.equal((await fetch(origin, { method: "POST" })).status, 405);
  const head = await fetch(origin, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});
