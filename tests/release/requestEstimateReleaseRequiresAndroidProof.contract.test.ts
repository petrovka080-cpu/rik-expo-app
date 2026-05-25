import fs from "node:fs";
import path from "node:path";

const screenshotsPath = path.resolve(process.cwd(), "artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_android_screenshots.json");
const transcriptsPath = path.resolve(process.cwd(), "artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_android_transcripts.json");

describe("request estimate release gate requires Android proof", () => {
  it("requires Android emulator artifacts for request estimate catalog BOQ release", () => {
    expect(fs.existsSync(screenshotsPath)).toBe(true);
    expect(fs.existsSync(transcriptsPath)).toBe(true);
    const screenshots = JSON.parse(fs.readFileSync(screenshotsPath, "utf8")) as Record<string, unknown>;
    const transcripts = JSON.parse(fs.readFileSync(transcriptsPath, "utf8")) as Record<string, unknown>;
    expect(screenshots.android_emulator_passed).toBe(true);
    expect(transcripts.android_emulator_passed).toBe(true);
    expect(transcripts.fake_green_claimed).toBe(false);
  });
});
