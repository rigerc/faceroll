import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createFaceroll, FACE_PRESETS, nameForParts } from "../dist/index.js";
import { restoreEditor, createHistory, filterPresets, exportFilename } from "../playground-dist/model.js";

test("restores valid configuration and recovers from corrupt or inaccessible storage", () => {
  const config = createFaceroll({ name: "Nova", vibe: "cool", parts: { body: "bot" }, locks: { eyes: true } }).getConfig();
  const storage = value => ({ getItem: () => value });
  assert.deepEqual(restoreEditor(storage(JSON.stringify(config))).getConfig(), config);
  for (const value of ["{bad", "null", JSON.stringify({ ...config, name: {} }), JSON.stringify({ ...config, locks: {} }), JSON.stringify({ ...config, parts: { ...config.parts, eyes: "invalid" } })]) {
    assert.deepEqual(restoreEditor(storage(value)).getConfig(), createFaceroll().getConfig());
  }
  assert.deepEqual(restoreEditor({ getItem() { throw new Error("blocked"); } }).getConfig(), createFaceroll().getConfig());
  assert.deepEqual(restoreEditor(undefined).getConfig(), createFaceroll().getConfig());
});

test("automatic names survive storage and UI history while legacy names stay custom", () => {
  const initial = createFaceroll().getConfig();
  const editor = restoreEditor({ getItem: () => JSON.stringify(initial) });
  const history = createHistory(editor);
  history.change(() => editor.setParts({ body: "bot" }));
  assert.equal(editor.getConfig().name, nameForParts(editor.getParts()));
  assert.notEqual(editor.getConfig().name, initial.name);
  history.undo();
  assert.deepEqual(editor.getConfig(), initial);
  const { nameMode, ...legacy } = initial;
  legacy.name = "Pixel";
  const old = restoreEditor({ getItem: () => JSON.stringify(legacy) });
  old.setParts({ body: "bot" });
  assert.equal(old.getConfig().name, "Pixel");
  assert.equal(old.getConfig().nameMode, "custom");
  assert.equal(restoreEditor({ getItem: () => JSON.stringify({ ...initial, nameMode: "invalid" }) }).getConfig().nameMode, "auto");
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

test("preset search finds generated first names and surnames alongside preset labels", () => {
  const classic = FACE_PRESETS.find(preset => preset.id === "classic");
  const name = nameForParts(classic.parts);
  assert.deepEqual(filterPresets(FACE_PRESETS, "any", ` ${name.toUpperCase()} `).map(preset => preset.id), ["classic"]);
  for (const word of name.split(" ")) {
    assert.ok(filterPresets(FACE_PRESETS, "cute", word).some(preset => preset.id === "classic"));
  }
  assert.equal(filterPresets(FACE_PRESETS, "cool", name).length, 0);
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

test("playground build contains the family preview and stable slot controls", async () => {
  const html = await readFile(new URL("../playground-dist/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../playground-dist/app.js", import.meta.url), "utf8");
  assert.match(html, /id="family-children"/);
  assert.match(html, /id="family-seed"/);
  assert.match(html, /id="family-count"/);
  assert.match(app, /deriveChildCharacters/);
  assert.match(app, /Thread slot/);
});

test("static hosts keep a 404 page and header rules in the build output", async () => {
  const root = new URL("../playground-dist/", import.meta.url);
  const notFound = await readFile(new URL("404.html", root), "utf8");
  // Without a top-level 404.html, Cloudflare Pages assumes an SPA and serves / with a 200 for
  // every unmatched path. The page is served at the requested URL, so relative assets would break.
  assert.doesNotMatch(notFound, /(?:href|src)="\.\//);
  assert.match(notFound, /href="\/"/);
  const headers = await readFile(new URL("_headers", root), "utf8");
  assert.match(headers, /Content-Security-Policy:/);
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



test("Studio ships both themes, brand vectors and compact mobile workspaces", async () => {
  const root = new URL("../playground-dist/", import.meta.url);
  const html = await readFile(new URL("index.html", root), "utf8");
  const studio = await readFile(new URL("studio.js", root), "utf8");
  const css = await readFile(new URL("studio.css", root), "utf8");
  for (const hook of ["face", "roll", "parts", "states", "family-children", "output", "theme"]) {
    assert.match(html, new RegExp('id="' + hook + '"'));
  }
  assert.match(html, /href="\.\/studio\.css"/);
  assert.match(html, /src="\.\/studio\.js"/);
  assert.match(studio, /family-peek-faces/);
  assert.match(studio, /mobile-dock/);
  assert.match(studio, /data\.panel/);
  assert.match(studio, /derive|familyGrid/);
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /data-mobile-panel="family"/);
  for (const name of ["faceroll-icon.svg", "faceroll-emoticon-color.svg", "faceroll-emoticon-reversed.svg"]) {
    assert.match(await readFile(new URL("assets/" + name, root), "utf8"), /<svg/);
  }
});
