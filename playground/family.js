import { childCapacity, deriveChildCharacters, serialize } from "./lib/index.js";

const STORAGE_KEY = "faceroll:family:v1";

/** Keep the existing stable-slot family contract in the redesigned playground. */
export function createFamily({ editor, root = document, storage, copy }) {
  const $ = selector => root.querySelector(selector);
  const seedInput = $("#family-seed");
  const countInput = $("#family-count");
  let state = "idle";
  let parentKey;
  let capacity;
  let childrenKey;
  let cardsKey;
  let children = [];
  let count = 5;

  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "null");
    if (saved && typeof saved.seed === "string" && saved.seed.length <= 100 &&
        Number.isSafeInteger(saved.count) && saved.count >= 1 && saved.count <= 239) {
      seedInput.value = saved.seed;
      countInput.value = String(saved.count);
    }
  } catch { /* Family settings are optional, including in restricted browsers. */ }

  function save() {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify({ seed: seedInput.value, count })); }
    catch { /* The family still works when storage is unavailable. */ }
  }

  function exportData() {
    const parent = editor.getCharacter();
    return {
      parent: { name: parent.name, parts: parent.parts },
      seed: seedInput.value,
      children: children.map((child, index) => ({ index, name: child.name, parts: child.parts })),
    };
  }

  function render(nextState = state) {
    state = nextState;
    const parent = editor.getCharacter();
    const key = JSON.stringify(parent.parts);
    if (parentKey !== key) {
      parentKey = key;
      capacity = childCapacity(parent);
    }
    countInput.max = String(capacity);
    const entered = Number(countInput.value);
    count = Math.min(capacity, Math.max(1, Number.isSafeInteger(entered) && countInput.value !== "" ? entered : count));
    // Keep an empty field editable until blur; generation always uses a valid count.
    if (countInput.value !== "") countInput.value = String(count);
    const nextKey = JSON.stringify([parent.parts, seedInput.value, count]);
    if (childrenKey !== nextKey) {
      childrenKey = nextKey;
      children = deriveChildCharacters(parent, { count, seed: seedInput.value });
    }

    $("#family-parent-face").textContent = parent.animations[state].still;
    $("#family-parent-face").setAttribute("aria-label", `${parent.name}, ${state} expression`);
    $("#family-parent-name").textContent = parent.name;
    $("#family-status").textContent = `${count} of ${capacity} distinct thread faces`;
    const nextCardsKey = JSON.stringify([childrenKey, state]);
    if (cardsKey === nextCardsKey) return;
    cardsKey = nextCardsKey;
    const cards = children.map((child, index) => {
      const card = root.createElement("article");
      card.className = "family-card";
      const slot = root.createElement("span");
      slot.className = "family-slot";
      slot.textContent = `Thread slot ${index}`;
      const face = root.createElement("span");
      face.className = "family-face";
      face.textContent = child.animations[state].still;
      face.setAttribute("role", "img");
      face.setAttribute("aria-label", `${child.name}, ${state} expression`);
      const name = root.createElement("h3");
      name.className = "family-name";
      name.textContent = child.name;
      const actions = root.createElement("div");
      actions.className = "family-actions";
      for (const [label, getText, success] of [
        ["Copy face", () => child.animations[state].still, `Thread ${index} face copied`],
        ["Copy JSON", () => JSON.stringify({ index, character: serialize(child) }, null, 2), `Thread ${index} JSON copied`],
      ]) {
        const button = root.createElement("button");
        button.type = "button";
        button.className = "pill-button";
        button.textContent = label;
        button.setAttribute("aria-label", `${label} for thread slot ${index}`);
        button.addEventListener("click", () => copy(getText(), success));
        actions.append(button);
      }
      card.append(slot, face, name, actions);
      return card;
    });
    $("#family-children").replaceChildren(...cards);
  }

  for (const input of [seedInput, countInput]) {
    input.addEventListener("input", () => { render(); save(); });
  }
  countInput.addEventListener("change", () => { render(); countInput.value = String(count); save(); });
  $("#copy-family").addEventListener("click", () => copy(JSON.stringify(exportData(), null, 2), "Family JSON copied"));
  return { render, exportData };
}
