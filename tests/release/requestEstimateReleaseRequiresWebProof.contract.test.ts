import fs from "node:fs";
import path from "node:path";

const screenshotsPath = path.resolve(process.cwd(), "artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_web_screenshots.json");
const transcriptsPath = path.resolve(process.cwd(), "artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_web_transcripts.json");

describe("request estimate release gate requires web proof", () => {
  it("requires Playwright artifacts for the live request-estimate release flow", () => {
    expect(fs.existsSync(screenshotsPath)).toBe(true);
    expect(fs.existsSync(transcriptsPath)).toBe(true);
    const screenshots = JSON.parse(fs.readFileSync(screenshotsPath, "utf8")) as Record<string, unknown>;
    const transcripts = JSON.parse(fs.readFileSync(transcriptsPath, "utf8")) as Record<string, unknown>;
    expect(screenshots.web_playwright_passed).toBe(true);
    expect(transcripts.web_playwright_passed).toBe(true);
    expect(transcripts.acceptance_cases_total).toBe(10);
    expect(transcripts.fake_green_claimed).toBe(false);
  });
});
