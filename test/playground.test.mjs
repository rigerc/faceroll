import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createFaceroll, childCapacity, createCharacter, FACE_PRESETS, nameForParts } from "../dist/index.js";
import { restoreEditor, createHistory, filterPresets, exportFilename } from "../playground-dist/model.js";
import { createFamily } from "../playground-dist/family.js";
import { Window } from "happy-dom";

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

test("preset search finds generated single-word names alongside preset labels", () => {
  const classic = FACE_PRESETS.find(preset => preset.id === "classic");
  const name = nameForParts(classic.parts);
  // Automatic names are reused, so a search can return several presets: only require membership.
  const ids = filterPresets(FACE_PRESETS, "any", ` ${name.toUpperCase()} `).map(preset => preset.id);
  assert.ok(ids.includes("classic"));
  assert.ok(filterPresets(FACE_PRESETS, "cute", name).some(preset => preset.id === "classic"));
  assert.equal(filterPresets(FACE_PRESETS, "cool", name).filter(preset => preset.id === "classic").length, 0);
  assert.ok(filterPresets(FACE_PRESETS, "any", "classic").some(preset => preset.id === "classic"));
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
  const family = await readFile(new URL("../playground-dist/family.js", import.meta.url), "utf8");
  assert.match(html, /id="family-children"/);
  assert.match(html, /id="family-seed"/);
  assert.match(html, /id="family-count"/);
  assert.match(app, /createFamily/);
  assert.match(family, /deriveChildCharacters/);
  assert.match(family, /Thread slot/);
});

async function familyFixture(t, storage) {
  const window = new Window();
  t.after(() => window.close());
  const html = await readFile(new URL("../playground-dist/index.html", import.meta.url), "utf8");
  window.document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)[1];
  const editor = createFaceroll({ seed: "family-test", parts: { body: "round" } });
  const copied = [];
  const family = createFamily({ editor, root: window.document, storage, copy: text => copied.push(text) });
  const $ = selector => window.document.querySelector(selector);
  const input = (id, value) => { $(id).value = value; $(id).dispatchEvent(new window.Event("input")); };
  family.render();
  return { family, editor, copied, $, input, window };
}

test("family UI preserves slots when growing, renaming and changing moods, and copies current data", async t => {
  const { family, editor, copied, $, input } = await familyFixture(t);
  const first = family.exportData();
  input("#family-count", "8");
  assert.deepEqual(family.exportData().children.slice(0, 5), first.children);
  assert.equal($("#family-children").children.length, 8);
  input("#family-seed", "another-project");
  const changed = family.exportData();
  assert.notDeepEqual(changed.children.slice(0, 5).map(x => x.parts), first.children.map(x => x.parts));
  editor.setName("Project Nova");
  family.render("happy");
  assert.equal($("#family-parent-name").textContent, "Project Nova");
  assert.deepEqual(family.exportData().children, changed.children);
  const child = createCharacter(changed.children[0].parts);
  assert.equal($(".family-face").textContent, child.animations.happy.still);
  $(".family-actions button").click();
  assert.equal(copied.pop(), child.animations.happy.still);
  $(".family-actions button:last-child").click();
  const childJSON = JSON.parse(copied.pop());
  assert.equal(childJSON.index, 0);
  assert.deepEqual(childJSON.character.parts, child.parts);
  $("#copy-family").click();
  assert.deepEqual(JSON.parse(copied.pop()), family.exportData());
});

test("family UI restores settings, clamps to parent capacity and tolerates empty count and blocked storage", async t => {
  let saved = JSON.stringify({ seed: "saved-project", count: 20 });
  const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  const { family, editor, $, input, window } = await familyFixture(t, storage);
  assert.equal($("#family-seed").value, "saved-project");
  assert.equal(family.exportData().children.length, 20);
  editor.setParts({ body: "bear" });
  family.render();
  const capacity = childCapacity(editor.getCharacter());
  assert.equal(Number($("#family-count").max), capacity);
  assert.equal(family.exportData().children.length, capacity);
  input("#family-count", "");
  assert.equal($("#family-count").value, "");
  assert.equal(family.exportData().children.length, capacity);
  $("#family-count").dispatchEvent(new window.Event("change"));
  assert.equal($("#family-count").value, String(capacity));
  input("#family-count", "-2");
  assert.equal(family.exportData().children.length, 1);
  assert.equal(JSON.parse(saved).count, 1);
  for (const storage of [
    { getItem: () => "{bad", setItem() { throw new Error("blocked"); } },
    { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } },
  ]) {
    const fixture = await familyFixture(t, storage);
    fixture.input("#family-seed", "works-without-storage");
    assert.equal(fixture.family.exportData().children.length, 5);
  }
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
  // The server sends nosniff, so an asset served as octet-stream is refused by the browser's
  // decoder rather than sniffed: a brand SVG in <img> then fails silently at naturalWidth 0.
  for (const [path, type] of [["/assets/faceroll-icon.svg", /image\/svg\+xml/], ["/assets/favicon-32.png", /image\/png/], ["/assets/pattern-cream.webp", /image\/webp/], ["/assets/fonts/quicksand-latin.woff2", /font\/woff2/]]) {
    const asset = await fetch(`${origin}${path}`);
    assert.equal(asset.status, 200, `Missing asset: ${path}`);
    assert.match(asset.headers.get("content-type"), type, `Wrong content type for ${path}`);
  }
  assert.equal((await fetch(`${origin}/lib/index.js`)).status, 200);
  assert.equal((await fetch(`${origin}/missing`)).status, 404);
  assert.equal((await fetch(`${origin}/%2e%2e%2fpackage.json`)).status, 403);
  assert.equal((await fetch(origin, { method: "POST" })).status, 405);
  const head = await fetch(origin, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});



test("redesigned playground ships themes, brand assets, live dock and family without the Studio overlay", async () => {
  const root = new URL("../playground-dist/", import.meta.url);
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("style.css", root), "utf8");
  for (const hook of ["face", "roll", "parts", "states", "family-children", "output", "theme"]) {
    assert.match(html, new RegExp('id="' + hook + '"'));
  }
  assert.doesNotMatch(html, /studio\.(css|js)/);
  assert.match(html, /class="dock-preview"/);
  assert.match(app, /family\.render\(state\)/);
  assert.match(css, /data-theme="dark"/);
  for (const name of ["logo-color.svg", "logo-reversed.svg"]) {
    assert.match(await readFile(new URL("assets/" + name, root), "utf8"), /<svg/);
  }
});
