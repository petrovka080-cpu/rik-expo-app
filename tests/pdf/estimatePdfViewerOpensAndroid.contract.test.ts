import fs from "node:fs";
import path from "node:path";

describe("estimate PDF Android viewer contract", () => {
  it("has an emulator smoke that requires the PDF viewer case to pass", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAndroidEstimatePdfViewerSmoke.ts"), "utf8");
    expect(source).toContain("createAndroidHarness");
    expect(source).toContain("createTempUser");
    expect(source).toContain("consumer-estimate-make-pdf");
    expect(source).toContain("tapAndroidBounds");
    expect(source).toContain("com.google.android.apps.docs");
    expect(source).toContain("pdf_viewer_android_opened");
    expect(source).toContain("BLOCKED_ANDROID_EMULATOR_NOT_RUN");
    expect(source).not.toMatch(/android_emulator_passed:\s*true[\s\S]*mock/i);
  });
});
