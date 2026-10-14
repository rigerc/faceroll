import { createPlayer, createPresetCharacter, FACE_PRESETS, STATES } from "./lib/index.js";
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
    const face = document.createElement("span");
    face.className = "preset-face";
    face.textContent = createPresetCharacter(preset.id).animations.idle.still;
    const name = document.createElement("span");
    name.className = "preset-name";
    name.textContent = preset.label;
    const vibe = document.createElement("span");
    vibe.className = "preset-vibe";
    vibe.textContent = preset.vibe;
    button.append(face, name, vibe);
    button.addEventListener("click", () => {
      history.change(() => editor.applyPreset(preset.id));
      refresh();
      notify(`${preset.label} selected`);
    });
    return button;
  }));
}

function renderExport() { $("#output").textContent = editor.export(format); }
function renderControls() {
  const config = editor.getConfig();
  $("#name").value = config.name;
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

$("#roll").addEventListener("click", () => { history.change(() => editor.roll()); refresh(); });
$("#undo").addEventListener("click", () => { history.undo(); refresh(); });
$("#name").addEventListener("input", event => {
  editor.setName(event.target.value);
  renderControls();
  renderExport();
  $("#face").setAttribute("aria-label", `${event.target.value || "Character"}, ${state} expression`);
  persist();
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
