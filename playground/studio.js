// Presentation only: reuse the playground's existing stateful controls and listeners.
(() => {
  const $ = s => document.querySelector(s);
  const workspace = $(".workspace");
  const editor = $(".editor-panel");
  const preview = $(".preview-panel");
  const moods = $(".mood-area");
  const personality = $("#personality");
  const exportPanel = $(".export-section");
  const inspector = document.createElement("aside");
  inspector.className = "inspector-panel";
  inspector.setAttribute("aria-label", "Expressions and export");
  inspector.append(moods, exportPanel);
  workspace.prepend(editor);
  workspace.append(inspector);

  // Desktop glimpse of the actual derived thread family, not illustrative faces.
  const familyPeek = document.createElement("section");
  familyPeek.className = "family-peek";
  familyPeek.innerHTML = '<div class="family-peek-head"><strong>Thread family</strong><a href="#family-title">View family ↗</a></div><div class="family-peek-faces" aria-label="Related thread faces"></div>';
  inspector.insertBefore(familyPeek, exportPanel);
  const familyGrid = $("#family-children");
  function renderFamilyPeek() {
    const target = familyPeek.querySelector(".family-peek-faces");
    const rows = Array.from(familyGrid.querySelectorAll(".family-card")).slice(0, 3);
    target.replaceChildren(...rows.map(row => {
      const tile = document.createElement("div");
      tile.className = "family-peek-tile";
      const face = document.createElement("span");
      face.className = "family-peek-face";
      face.textContent = row.querySelector(".family-face")?.textContent || "";
      const name = document.createElement("small");
      name.textContent = row.querySelector(".family-name")?.textContent || "";
      tile.append(face, name);
      return tile;
    }));
  }
  new MutationObserver(renderFamilyPeek).observe(familyGrid, {childList:true});
  renderFamilyPeek();

  const brand = $(".brand");
  brand.innerHTML = '<img class="studio-brand-emoticon brand-for-light" src="./assets/faceroll-emoticon-color.svg" alt="" width="98" height="32"><img class="studio-brand-emoticon brand-for-dark" src="./assets/faceroll-emoticon-reversed.svg" alt="" width="98" height="32"><span class="studio-wordmark">facer<span>roll</span></span><span class="version">PLAYGROUND</span>';

  const nav = document.createElement("nav");
  nav.className = "studio-nav";
  nav.setAttribute("aria-label", "Playground sections");
  nav.innerHTML = '<a href="#workspace" aria-current="page">Studio</a><a href="#family-title">Family</a><a href="#gallery-title">Presets</a>';
  $(".header-actions").prepend(nav);
  $("#title").textContent = "Faceroll Studio";
  $(".subtitle").textContent = "Roll a character. Edit the parts. Preview every expression.";
  $("#editor-title").textContent = "Character";
  $(".preview-panel .panel-bar h2").textContent = "Live preview";

  // The original app owns all ten mood buttons, animation playback, editor,
  // family generation, exports, storage and reduced-motion behavior.
  const mobile = matchMedia("(max-width: 760px)");
  const dock = document.createElement("nav");
  dock.className = "mobile-dock";
  dock.setAttribute("aria-label", "Mobile workspaces");
  const tabs = [
    ["edit", "Edit", '<path d="m12 20 9-9-4-4-9 9-1 5 5-1Z"/><path d="m15 9 4 4"/>'],
    ["frames", "Frames", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/>'],
    ["presets", "Presets", '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'],
    ["family", "Family", '<circle cx="12" cy="7" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2M3 10a3 3 0 0 0-2 5m20-5a3 3 0 0 1 2 5"/>'],
    ["export", "Export", '<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>']
  ];
  for (const [key, label, paths] of tabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.panel = key;
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">' + paths + "</svg><span>" + label + "</span>";
    button.setAttribute("aria-label", "Show " + label.toLowerCase());
    button.addEventListener("click", () => activate(key));
    dock.append(button);
  }
  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "mobile-roll";
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-5 5M3 18h4c6 0 7-10 13-10h1M16 13l5 5-5 5M3 6h4c2 0 4 2 5 4"/></svg><span>Roll face</span>';
  fab.addEventListener("click", () => $("#roll").click());
  document.body.append(dock, fab);
  const views = {edit: editor, frames: $(".timeline-section"), presets: $(".gallery-section"), family: $(".family-section"), export: exportPanel};
  function activate(key) {
    document.body.dataset.mobilePanel = key;
    for (const button of dock.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset.panel === key));
    }
    for (const [name, panel] of Object.entries(views)) {
      panel.setAttribute("aria-hidden", String(mobile.matches && name !== key));
      if ("inert" in panel) panel.inert = mobile.matches && name !== key;
    }
  }
  function arrange() {
    if (mobile.matches) {
      preview.append(moods);
      // Keep variable-length trait descriptions out of the fixed mobile preview.
      $(".name-controls").after(personality);
    } else {
      inspector.prepend(moods);
      $("#character-caption").after(personality);
    }
    activate(document.body.dataset.mobilePanel || "edit");
  }
  mobile.addEventListener("change", arrange);
  arrange();
  // Make disabled roll state visible on the persistent mobile action.
  const syncRoll = () => { fab.disabled = $("#roll").disabled; };
  new MutationObserver(syncRoll).observe($("#roll"), {attributes:true,attributeFilter:["disabled"]});
  syncRoll();
})();
