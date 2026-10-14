(() => {
  const storageKey = "faceroll-playground-theme";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const normalize = value => value === "light" || value === "dark" ? value : "system";
  let preference = "system";
  try { preference = normalize(window.localStorage.getItem(storageKey)); }
  catch { /* The system preference works without storage. */ }

  function applyTheme() {
    const theme = preference === "system" ? (systemTheme.matches ? "dark" : "light") : preference;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#0e1519" : "#f8faf7";
    const select = document.querySelector("#theme");
    if (select) select.value = preference;
  }

  applyTheme();
  systemTheme.addEventListener("change", applyTheme);
  window.addEventListener("storage", event => {
    if (event.key === storageKey || event.key === null) {
      preference = normalize(event.newValue);
      applyTheme();
    }
  });
  document.addEventListener("DOMContentLoaded", () => {
    const select = document.querySelector("#theme");
    if (!select) return;
    select.disabled = false;
    select.value = preference;
    select.addEventListener("change", () => {
      preference = normalize(select.value);
      applyTheme();
      try {
        if (preference === "system") window.localStorage.removeItem(storageKey);
        else window.localStorage.setItem(storageKey, preference);
      } catch { /* Changes still apply when storage is unavailable. */ }
    });
  }, { once: true });
})();
