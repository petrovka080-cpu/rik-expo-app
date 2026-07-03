import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("professional estimate web smoke readable Russian", () => {
  it("checks readable Cyrillic labels and reports actual browser evidence explicitly", () => {
    const source = fs.readFileSync(
      path.join(PROJECT_ROOT, "scripts/e2e/runProfessionalEstimateWebSmoke.ts"),
      "utf8",
    );

    expect(source).toContain('result.bodyText.includes("Смета")');
    expect(source).toContain('result.bodyText.includes("Позиции пока пустые")');
    expect(source).toContain("actual_web_browser_smoke_passed");
    expect(source).toContain("browser_automation_started: true");
    expect(source).toContain("browser_evidence_written");
    expect(source).not.toContain("РЎРјРµС‚Р°");
    expect(source).not.toContain("РџРѕР·Рё");
  });
});
