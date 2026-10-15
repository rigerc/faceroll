// Run after building and serving the playground with BB Browser Automation:
// bb browser-automation run <session> --script-file <absolute-path-to-this-file> --script-host <host-id> --json
// This tests rendered geometry; DOM text and asset checks cannot catch clipping.
const origin = "http://127.0.0.1:4173";
const page = await browser.getPage("main");
const results = [];
for (const viewport of [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 320, height: 568 },
  { width: 667, height: 375 },
  { width: 1440, height: 900 },
]) {
  await page.setViewport(viewport);
  await page.goto(origin);
  for (const expanded of [false, true]) {
    if (expanded) await page.click("#personality summary");
    // Short landscape screens intentionally use a normal scrolling page.
    // Return to the preview after clicking details further down that page.
    await page.$eval(".preview-panel", (preview) => {
      if (getComputedStyle(preview).position === "relative") window.scrollTo(0, 0);
    });
    const state = await page.$eval("#face", (face) => {
      const rect = face.getBoundingClientRect();
      const stage = face.closest(".stage").getBoundingClientRect();
      const wrap = face.closest(".face-wrap").getBoundingClientRect();
      const inset = (outer) => rect.top >= outer.top && rect.bottom <= outer.bottom;
      return {
        text: face.textContent,
        visible: rect.height > 0 && inset(stage) && inset(wrap) && rect.top >= 0 && rect.bottom <= innerHeight,
        faceTop: rect.top, faceBottom: rect.bottom, stageTop: stage.top, stageBottom: stage.bottom,
      };
    });
    const result = { name: `${viewport.width}×${viewport.height}, traits ${expanded ? "expanded" : "collapsed"}`, ...state };
    results.push(result);
    if (!state.text || !state.visible) {
      throw new Error(`Face clipped: ${JSON.stringify(result)}`);
    }
  }
}
console.log(JSON.stringify(results));
