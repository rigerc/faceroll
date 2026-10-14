import { createPlayer, createPresetCharacter, childCapacity, deriveChildCharacters, FACE_PRESETS, serialize, STATES } from "./lib/index.js";
import { STORAGE_KEY, TABLES, restoreEditor, createHistory, filterPresets, exportFilename } from "./model.js";

const $ = selector => document.querySelector(selector);
const ICON_PATHS = {
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0"/>',
  roll: '<path d="m18 2 4 4-4 4M2 18h2.5c6 0 9-12 15-12H22m-4 8 4 4-4 4M2 6h2.5c2.2 0 4 1.6 5.5 4m4 4c1.5 2.4 3.3 4 5.5 4H22"/>',
};
function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}
let storage;
try { storage = window.localStorage; } catch { /* Restricted storage still permits editing. */ }
const editor = restoreEditor(storage);
const history = createHistory(editor);
const FAMILY_STORAGE_KEY = "faceroll:family:v1";
let familyKey;
let familyChildren = [];
let familyCapacity;
let familyParentKey;
try {
  const saved = JSON.parse(storage?.getItem(FAMILY_STORAGE_KEY) ?? "null");
  if (saved && typeof saved.seed === "string" && saved.seed.length <= 100 &&
      Number.isSafeInteger(saved.count) && saved.count >= 1 && saved.count <= 239) {
    $("#family-seed").value = saved.seed;
    $("#family-count").value = String(saved.count);
  }
} catch { /* Stored settings are optional. */ }
function saveFamilySettings() {
  try {
    storage?.setItem(FAMILY_STORAGE_KEY, JSON.stringify({
      seed: $("#family-seed").value,
      count: Number($("#family-count").value),
    }));
  } catch { /* Storage may be restricted. */ }
}
function renderFamily() {
  const parent = editor.getCharacter();
  const parentKey = JSON.stringify(parent.parts);
  if (familyParentKey !== parentKey) {
    familyParentKey = parentKey;
    familyCapacity = childCapacity(parent);
  }
  const countInput = $("#family-count");
  countInput.max = String(familyCapacity);
  const entered = Number(countInput.value);
  const count = Math.min(familyCapacity, Math.max(1, Number.isSafeInteger(entered) ? entered : 5));
  if (countInput.value !== "") countInput.value = String(count);
  const seed = $("#family-seed").value;
  const key = JSON.stringify([parent.parts, seed, count]);
  if (key !== familyKey) {
    familyKey = key;
    familyChildren = deriveChildCharacters(parent, { count, seed });
  }
  const parentRow = $("#family-parent");
  parentRow.replaceChildren();
  parentRow.append("Project parent", Object.assign(document.createElement("strong"), {
    textContent: parent.animations.idle.still,
  }), parent.name);
  const cards = familyChildren.map((child, index) => {
    const card = document.createElement("article");
    card.className = "family-card";
    const slot = document.createElement("span");
    slot.className = "family-slot";
    slot.textContent = `Thread slot ${index}`;
    const face = document.createElement("span");
    face.className = "family-face";
    face.textContent = child.animations[state].still;
    face.setAttribute("role", "img");
    face.setAttribute("aria-label", `${child.name}, ${state}`);
    const name = document.createElement("span");
    name.className = "family-name";
    name.textContent = child.name;
    const actions = document.createElement("div");
    actions.className = "family-actions";
    const copyFace = document.createElement("button");
    copyFace.type = "button";
    copyFace.className = "small-button";
    copyFace.textContent = "Copy face";
    copyFace.addEventListener("click", () => copy(child.animations[state].still, `Thread ${index} face copied`));
    const copyJson = document.createElement("button");
    copyJson.type = "button";
    copyJson.className = "small-button";
    copyJson.textContent = "Copy JSON";
    copyJson.addEventListener("click", () => copy(JSON.stringify({ index, character: serialize(child) }, null, 2), `Thread ${index} JSON copied`));
    actions.append(copyFace, copyJson);
    card.append(slot, face, name, actions);
    return card;
  });
  $("#family-children").replaceChildren(...cards);
}

const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
let playing = !motion.matches;
let cycling = false;
let moodTimer;
let state = "idle";
let speed = 1;
let filter = "any";
let format = "prompt";
let noticeTimer;
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
  frameButtons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
}
const player = createPlayer((frame, index) => showFrame(frame.text, index), {
  setTimeout: (callback, ms) => setTimeout(callback, ms / speed),
  clearTimeout: timer => clearTimeout(timer),
});

function updatePlayback() {
  $("#play").textContent = playing ? "Pause" : "Play";
  $("#play").setAttribute("aria-pressed", String(playing));
  $("#cycle-moods").setAttribute("aria-pressed", String(cycling));
  $("#motion-status").textContent = playing ? (cycling ? "Cycling moods" : "Animating") : "Paused";
}
function stopPlayback() {
  player.stop();
  clearTimeout(moodTimer);
  moodTimer = undefined;
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
  $("#face").setAttribute("aria-label", `${editor.getConfig().name || "Character"}, ${state} expression`);
  $("#state-say").textContent = STATES.find(entry => entry.id === state).say;
  $("#animation-info").textContent = `${animation.frames.length} frames · ${(animation.duration / 1000).toFixed(2)}s loop`;
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
    const time = document.createElement("span");
    time.className = "frame-time";
    time.textContent = `${index + 1} · ${frame.ms} ms`;
    button.append(face, time);
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
  renderFamily();
}

function renderGallery() {
  const presets = filterPresets(FACE_PRESETS, filter, $("#search").value);
  $("#preset-count").textContent = String(presets.length);
  $("#empty").hidden = presets.length > 0;
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
    const vibe = document.createElement("span");
    vibe.className = "preset-vibe";
    vibe.textContent = `${preset.label} · ${preset.vibe}`;
    button.append(face, name, vibe);
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
  $("#undo").disabled = history.length === 0;
  $("#roll").disabled = Object.values(config.locks).every(Boolean);
  $("#mouth-note").hidden = config.parts.body !== "bear";
  for (const kind of Object.keys(TABLES)) {
    const { select, lock, reroll } = partControls[kind];
    select.value = config.parts[kind];
    lock.setAttribute("aria-pressed", String(config.locks[kind]));
    lock.innerHTML = icon(config.locks[kind] ? "lock" : "unlock");
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
for (const [kind, table] of Object.entries(TABLES)) {
  const row = document.createElement("div");
  row.className = "part-row";
  const label = document.createElement("label");
  label.className = "part-label";
  label.textContent = kind;
  const select = document.createElement("select");
  select.className = "part-select";
  select.id = `part-${kind}`;
  for (const part of table) {
    const option = document.createElement("option");
    option.value = part.id;
    const glyph = kind === "body" ? `${part.left}…${part.right}` : kind === "eyes" ? part.open.join(" ") : part.calm;
    option.textContent = `${part.id[0].toUpperCase() + part.id.slice(1)}  ${glyph}`;
    select.append(option);
  }
  select.addEventListener("change", () => {
    history.change(() => editor.setParts({ [kind]: select.value }));
    refresh();
  });
  label.append(select);
  const lock = document.createElement("button");
  lock.className = "icon-button";
  lock.type = "button";
  lock.setAttribute("aria-label", `Lock ${kind} for random rolls`);
  lock.addEventListener("click", () => {
    editor.setLocked(kind, !editor.isLocked(kind));
    renderControls();
    persist();
  });
  const reroll = document.createElement("button");
  reroll.className = "icon-button";
  reroll.type = "button";
  reroll.innerHTML = icon("roll");
  reroll.title = `Reroll ${kind}`;
  reroll.setAttribute("aria-label", `Reroll ${kind}`);
  reroll.addEventListener("click", () => { history.change(() => editor.reroll(kind)); refresh(); });
  row.append(label, lock, reroll);
  $("#parts").append(row);
  partControls[kind] = { select, lock, reroll };
}

$("#family-seed").addEventListener("input", () => { renderFamily(); saveFamilySettings(); });
$("#family-count").addEventListener("input", () => { renderFamily(); saveFamilySettings(); });
$("#roll").addEventListener("click", () => { history.change(() => editor.roll()); refresh(); });
$("#undo").addEventListener("click", () => { history.undo(); refresh(); });
$("#name").addEventListener("input", event => {
  editor.setName(event.target.value);
  renderControls();
  renderExport();
  $("#face").setAttribute("aria-label", `${editor.getConfig().name}, ${state} expression`);
  persist();
});
$("#name").addEventListener("blur", renderControls);
$("#auto-name").addEventListener("click", () => {
  editor.setName("");
  renderControls();
  renderExport();
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
    close.className = "dark-button manual-copy-close";
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
$("#copy-family").addEventListener("click", () => {
  const parent = editor.getCharacter();
  const data = {
    parent: { name: parent.name, parts: parent.parts },
    seed: $("#family-seed").value,
    children: familyChildren.map((child, index) => ({
      index, name: child.name, parts: child.parts,
    })),
  };
  copy(JSON.stringify(data, null, 2), "Family JSON copied");
});
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
refresh();

