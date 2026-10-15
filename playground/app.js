import { createPlayer, createPresetCharacter, FACE_PRESETS, STATES } from "./lib/index.js";
import { STORAGE_KEY, TABLES, restoreEditor, createHistory, filterPresets, exportFilename } from "./model.js";
import { createFamily } from "./family.js";

const $ = selector => document.querySelector(selector);
const ICON_PATHS = {
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0"/>',
  roll: '<path d="m18 2 4 4-4 4M2 18h2.5c6 0 9-12 15-12H22m-4 8 4 4-4 4M2 6h2.5c2.2 0 4 1.6 5.5 4m4 4c1.5 2.4 3.3 4 5.5 4H22"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
};
function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}
let storage;
try { storage = window.localStorage; } catch { /* Restricted storage still permits editing. */ }
const editor = restoreEditor(storage);
const history = createHistory(editor);
const family = createFamily({ editor, storage, copy });
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
let playing = !motion.matches;
let cycling = false;
let moodTimer;
let state = "idle";
let speed = 1;
let filter = "any";
let format = "prompt";
let noticeTimer;
let lastParts = "";
let showAll = false;
const PREVIEW_COUNT = 6;
const compact = window.matchMedia("(max-width: 700px)");
const partControls = {};
const stateButtons = new Map();
let frameButtons = [];

function notify(message) {
  clearTimeout(noticeTimer);
  $("#notice").textContent = message;
  noticeTimer = setTimeout(() => { $("#notice").textContent = ""; }, 3500);
}
function persist() {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(editor.getConfig())); }
  catch { /* Storage is optional. */ }
}
function showFrame(text, index) {
  $("#face").textContent = text;
  $("#dock-face").textContent = text;
  frameButtons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
}
const player = createPlayer((frame, index) => showFrame(frame.text, index), {
  setTimeout: (callback, ms) => setTimeout(callback, ms / speed),
  clearTimeout: timer => clearTimeout(timer),
});

function updatePlayback() {
  $("#play").innerHTML = `${icon(playing ? "pause" : "play")}${playing ? "Pause" : "Play"}`;
  $("#play").setAttribute("aria-pressed", String(playing));
  $("#cycle-moods").setAttribute("aria-pressed", String(cycling));
  $("#motion-status").textContent = playing ? (cycling ? "Cycling moods" : "Animating") : "Paused";
  $("#motion-status").dataset.on = String(playing);
}
function stopPlayback() {
  player.stop();
  clearTimeout(moodTimer);
  moodTimer = undefined;
}
/** Size the face so the widest frame always fits the stage, trail included. */
const FACE_GLYPH_WIDTH = 0.62;
const FACE_MAX = 104;
const FACE_MIN = 18;
function fitFace() {
  const wrap = $("#face-wrap");
  const row = $("#face-row");
  const chars = Math.max(editor.getAnimation(state).width, 1);
  const trailShown = getComputedStyle(row.querySelector(".trail")).display !== "none";
  const available = wrap.clientWidth - 8;
  const units = chars * FACE_GLYPH_WIDTH + (trailShown ? 1.45 : 0);
  const size = Math.max(FACE_MIN, Math.min(FACE_MAX, Math.floor(available / units)));
  row.style.setProperty("--face-size", `${size}px`);
}
/** A rolled face streaks in along the trail lines; reduced motion skips it. */
function streak() {
  if (motion.matches) return;
  const row = $("#face-row");
  row.classList.remove("streak");
  void row.offsetWidth;
  row.classList.add("streak");
}
function startPlayback() {
  stopPlayback();
  updatePlayback();
  if (playing && !document.hidden) {
    const animation = editor.getAnimation(state);
    player.play(animation);
    if (cycling) {
      moodTimer = setTimeout(() => {
        state = STATES[(STATES.findIndex(entry => entry.id === state) + 1) % STATES.length].id;
        renderAnimation();
      }, animation.duration / speed);
    }
  }
}
function renderAnimation() {
  const animation = editor.getAnimation(state);
  $("#face").style.minWidth = `${animation.width}ch`;
  fitFace();
  $("#face").setAttribute("aria-label", `${editor.getConfig().name || "Character"}, ${state} expression`);
  $("#state-say").textContent = STATES.find(entry => entry.id === state).say;
  $("#animation-info").textContent = `${animation.frames.length} frames, ${(animation.duration / 1000).toFixed(2)} s loop`;
  stateButtons.forEach((button, id) => button.setAttribute("aria-pressed", String(id === state)));
  frameButtons = animation.frames.map((frame, index) => {
    const button = document.createElement("button");
    button.className = "frame";
    button.type = "button";
    button.setAttribute("aria-label", `Frame ${index + 1}, ${frame.ms} milliseconds`);
    button.setAttribute("aria-pressed", "false");
    const face = document.createElement("span");
    face.className = "frame-face";
    face.textContent = frame.text;
    const meta = document.createElement("span");
    meta.className = "frame-meta";
    const number = document.createElement("span");
    number.textContent = String(index + 1);
    const time = document.createElement("span");
    time.textContent = `${frame.ms} ms`;
    meta.append(number, time);
    button.append(face, meta);
    button.addEventListener("click", () => {
      playing = false;
      cycling = false;
      stopPlayback();
      showFrame(frame.text, index);
      updatePlayback();
    });
    return button;
  });
  $("#frames").replaceChildren(...frameButtons);
  showFrame(animation.still, -1);
  startPlayback();
  family.render(state);
}

function renderGallery() {
  const matches = filterPresets(FACE_PRESETS, filter, $("#search").value);
  // Phones show a short list first so the page stays short; searching shows every match.
  const collapsible = compact.matches && matches.length > PREVIEW_COUNT && !$("#search").value.trim();
  const presets = collapsible && !showAll ? matches.slice(0, PREVIEW_COUNT) : matches;
  const more = $("#show-more");
  more.hidden = !collapsible;
  more.textContent = showAll ? "Show fewer faces" : `Show all ${matches.length} faces`;
  more.setAttribute("aria-expanded", String(showAll));
  $("#preset-count").textContent = String(matches.length);
  $("#empty").hidden = matches.length > 0;
  const parts = editor.getParts();
  $("#gallery").replaceChildren(...presets.map(preset => {
    const button = document.createElement("button");
    button.className = "preset";
    button.type = "button";
    button.setAttribute("aria-pressed", String(Object.keys(TABLES).every(kind => parts[kind] === preset.parts[kind])));
    const character = createPresetCharacter(preset.id);
    button.setAttribute("aria-label", `${character.name}, ${preset.label}, ${preset.vibe}`);
    const face = document.createElement("span");
    face.className = "preset-face";
    face.textContent = character.animations.idle.still;
    const name = document.createElement("span");
    name.className = "preset-name";
    name.textContent = character.name;
    const label = document.createElement("span");
    label.className = "preset-label";
    label.textContent = preset.label;
    const vibe = document.createElement("span");
    vibe.className = "preset-vibe";
    vibe.textContent = preset.vibe[0].toUpperCase() + preset.vibe.slice(1);
    button.append(face, name, label, vibe);
    button.addEventListener("click", () => {
      history.change(() => editor.applyPreset(preset.id));
      refresh();
      notify(`${editor.getConfig().name} selected`);
    });
    return button;
  }));
}

function renderExport() { $("#output").textContent = editor.export(format); }
function renderControls() {
  const config = editor.getConfig();
  if (document.activeElement !== $("#name")) $("#name").value = config.name;
  const automatic = config.nameMode === "auto";
  $("#name-mode").textContent = automatic ? "Automatic" : "Custom";
  $("#auto-name").disabled = automatic;
  $("#name-hint").textContent = automatic
    ? "This name follows the face. Type your own to keep it."
    : "Your name stays when the face changes.";
  $("#vibe").value = config.vibe;
  $("#character-caption").textContent = config.name || "Unnamed character";
  $("#dock-name").textContent = config.name || "Unnamed character";
  $("#undo").disabled = history.length === 0;
  $("#dock-undo").disabled = history.length === 0;
  const allLocked = Object.values(config.locks).every(Boolean);
  $("#roll").disabled = allLocked;
  $("#dock-roll").disabled = allLocked;
  $("#mouth-note").hidden = config.parts.body !== "bear";
  for (const kind of Object.keys(TABLES)) {
    const { select, lock, reroll, reel, glyph } = partControls[kind];
    select.value = config.parts[kind];
    glyph.textContent = windowGlyph(kind, TABLES[kind].find(part => part.id === config.parts[kind]));
    reel.dataset.locked = String(config.locks[kind]);
    lock.setAttribute("aria-pressed", String(config.locks[kind]));
    lock.innerHTML = `${icon(config.locks[kind] ? "lock" : "unlock")}<span class="btn-text">${config.locks[kind] ? "Locked" : "Lock"}</span>`;
    lock.title = `${config.locks[kind] ? "Unlock" : "Lock"} ${kind} for random rolls`;
    lock.setAttribute("aria-label", lock.title);
    reroll.disabled = config.locks[kind];
  }
}
function refresh() {
  renderControls();
  renderGallery();
  renderExport();
  renderAnimation();
  persist();
  const signature = JSON.stringify(editor.getParts());
  if (signature !== lastParts) streak();
  lastParts = signature;
}

for (const entry of STATES) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = entry.label;
  button.title = entry.use;
  button.addEventListener("click", () => { cycling = false; state = entry.id; renderAnimation(); });
  $("#states").append(button);
  stateButtons.set(entry.id, button);
}
function optionGlyph(kind, part) {
  return kind === "body" ? `${part.left}…${part.right}` : kind === "eyes" ? part.open.join(" ") : part.calm;
}
function windowGlyph(kind, part) {
  return kind === "body" ? `${part.left} ${part.right}` : kind === "eyes" ? part.open.join(" ") : part.calm;
}
for (const [kind, table] of Object.entries(TABLES)) {
  const title = kind[0].toUpperCase() + kind.slice(1);
  const reel = document.createElement("div");
  reel.className = "reel";
  const glyph = document.createElement("div");
  glyph.className = "reel-window";
  glyph.setAttribute("aria-hidden", "true");
  const label = document.createElement("label");
  label.className = "part-label";
  label.textContent = title;
  const select = document.createElement("select");
  select.className = "part-select";
  select.id = `part-${kind}`;
  for (const part of table) {
    const option = document.createElement("option");
    option.value = part.id;
    option.textContent = `${part.id[0].toUpperCase() + part.id.slice(1)} ${optionGlyph(kind, part)}`;
    select.append(option);
  }
  select.addEventListener("change", () => {
    history.change(() => editor.setParts({ [kind]: select.value }));
    refresh();
  });
  label.append(select);
  const actions = document.createElement("div");
  actions.className = "reel-actions";
  const lock = document.createElement("button");
  lock.className = "pill-button";
  lock.type = "button";
  lock.addEventListener("click", () => {
    editor.setLocked(kind, !editor.isLocked(kind));
    renderControls();
    persist();
  });
  const reroll = document.createElement("button");
  reroll.className = "pill-button";
  reroll.type = "button";
  reroll.innerHTML = `${icon("roll")}<span class="btn-text">Reroll</span>`;
  reroll.title = `Reroll ${kind}`;
  reroll.setAttribute("aria-label", `Reroll ${kind}`);
  reroll.addEventListener("click", () => { history.change(() => editor.reroll(kind)); refresh(); });
  actions.append(lock, reroll);
  reel.append(glyph, label, actions);
  $("#parts").append(reel);
  partControls[kind] = { select, lock, reroll, reel, glyph };
}

for (const id of ["#roll", "#dock-roll"]) $(id).addEventListener("click", () => { history.change(() => editor.roll()); refresh(); });
for (const id of ["#undo", "#dock-undo"]) $(id).addEventListener("click", () => { history.undo(); refresh(); });
$("#show-more").addEventListener("click", () => { showAll = !showAll; renderGallery(); });
compact.addEventListener("change", () => { renderGallery(); updateDock(); fitFace(); });

// The dock keeps the face and Roll in reach: always on phones, and on wider screens once the editor scrolls away.
let workspaceVisible = true;
function updateDock() { $("#dock").dataset.visible = String(compact.matches || !workspaceVisible); }
new IntersectionObserver(([entry]) => { workspaceVisible = entry.isIntersecting; updateDock(); }).observe($("#workspace"));
updateDock();
$("#name").addEventListener("input", event => {
  editor.setName(event.target.value);
  renderControls();
  renderExport();
  family.render(state);
  $("#face").setAttribute("aria-label", `${editor.getConfig().name}, ${state} expression`);
  persist();
});
$("#name").addEventListener("blur", renderControls);
$("#auto-name").addEventListener("click", () => {
  editor.setName("");
  renderControls();
  renderExport();
  family.render(state);
  $("#face").setAttribute("aria-label", `${editor.getConfig().name}, ${state} expression`);
  persist();
  notify(`Automatic name: ${editor.getConfig().name}`);
});
$("#vibe").addEventListener("change", event => { history.change(() => editor.setVibe(event.target.value)); refresh(); });
$("#play").addEventListener("click", () => { playing = !playing; startPlayback(); });
$("#cycle-moods").addEventListener("click", () => {
  cycling = !cycling;
  if (cycling) playing = true;
  startPlayback();
});
$("#speed").addEventListener("change", event => { speed = Number(event.target.value); startPlayback(); });
$("#search").addEventListener("input", renderGallery);
$("#filters").addEventListener("click", event => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  filter = button.dataset.filter;
  $("#filters").querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  renderGallery();
});
$("#formats").addEventListener("click", event => {
  const button = event.target.closest("button[data-format]");
  if (!button) return;
  format = button.dataset.format;
  $("#formats").querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  renderExport();
});

async function copy(text, success) {
  try {
    await navigator.clipboard.writeText(text);
    notify(success);
  } catch {
    // Plain HTTP and restricted clipboard permissions can still use manual copy.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("aria-label", "Text to copy");
    area.className = "manual-copy";
    const close = document.createElement("button");
    close.textContent = "Done";
    close.className = "manual-copy-close";
    const previousFocus = document.activeElement;
    const dismiss = () => { area.remove(); close.remove(); previousFocus?.focus(); };
    close.addEventListener("click", dismiss);
    area.addEventListener("keydown", event => { if (event.key === "Escape") dismiss(); });
    document.body.append(area, close);
    area.focus();
    area.select();
    notify("Clipboard unavailable. Copy the selected text, then choose Done.");
  }
}
$("#copy-face").addEventListener("click", () => copy($("#face").textContent, "Face copied"));
$("#copy-export").addEventListener("click", () => copy(editor.export(format), "Character export copied"));
$("#download").addEventListener("click", () => {
  const type = format === "json" ? "application/json" : "text/plain;charset=utf-8";
  const url = URL.createObjectURL(new Blob([editor.export(format)], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFilename(editor.getConfig().name, format);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
motion.addEventListener("change", () => {
  if (motion.matches) {
    playing = false;
    cycling = false;
    stopPlayback();
    showFrame(editor.getStill(state), -1);
    updatePlayback();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopPlayback();
  else startPlayback();
});
window.addEventListener("pagehide", stopPlayback);
let fitWidth = 0;
new ResizeObserver(() => {
  const width = $("#face-wrap").clientWidth;
  if (width !== fitWidth) { fitWidth = width; fitFace(); }
}).observe($("#face-wrap"));
refresh();

