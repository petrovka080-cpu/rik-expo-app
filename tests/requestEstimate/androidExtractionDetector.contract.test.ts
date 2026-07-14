import fs from "node:fs";
import path from "node:path";

describe("Android Chrome request estimate extraction detector", () => {
  it("uses Android Chrome CDP without native builds and requires UI extraction", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/e2e/runAiEstimateContinuousDetectGate.ts"),
      "utf8",
    );

    expect(source).toContain('process.env.ESTIMATE_SMOKE_TARGET === "android-chrome"');
    expect(source).toContain("chromium.connectOverCDP");
    expect(source).toContain("adb");
    expect(source).toContain("reverse");
    expect(source).toContain("android_chrome_rows_extracted_from_ui");
    expect(source).toContain("android_chrome_calculation_trace_usable");
    expect(source).toContain("STOP_ANDROID_CHROME_REQUIRED_FOR_AI_ESTIMATE_DETECTOR");
    expect(source).not.toMatch(/eas\s+build|expo\s+run:android|gradlew|xcodebuild/);
  });
});
