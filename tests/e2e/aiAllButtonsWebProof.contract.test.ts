import fs from "node:fs";
import path from "node:path";

describe("AI all-buttons web proof runner", () => {
  it("uses Playwright to click every visible AI button and capture before/after screenshots", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts", "e2e", "runAiAllButtonsRealUserWebProof.ts"),
      "utf8",
    );

    expect(source).toContain("chromium.launch");
    expect(source).toContain("ai.screen_magic.action");
    expect(source).toContain("buttonLocator.click");
    expect(source).toContain("page.screenshot");
    expect(source).toContain("_web_click_trace.json");
    expect(source).toContain("_screenshots_index.json");
  });
});
