import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

describe("final professional 10000 green browser proof", () => {
  it("requires real web and Android Chrome evidence artifacts instead of env browser flags", () => {
    const source = read("scripts/estimate/auditEstimate10000FinalProfessionalGreen.ts");

    expect(source).toContain("WEB_BROWSER_EVIDENCE_ROOT");
    expect(source).toContain("ANDROID_CHROME_EVIDENCE_ROOT");
    expect(source).toContain("readBrowserEvidence");
    expect(source).toContain("actual_web_browser_smoke_passed");
    expect(source).toContain("actual_android_chrome_browser_smoke_passed");
    expect(source).toContain("validateRenderedEstimateSnapshots10000");
    expect(source).toContain("rendered_snapshots_10000_passed");
    expect(source).toContain("rendered_snapshots_10000_failed");
    expect(source).toContain("ai_is_parser_not_quantity_source");
    expect(source).toContain("every_template_has_work_family");
    expect(source).toContain("every_work_row_has_professional_ru_name");
    expect(source).toContain("pdf_no_mojibake");
    expect(source).toContain("buyer_receives_procurement_subset_only");
    expect(source).toContain("every_priced_row_has_ratebook_or_missing_price_state");
    expect(source).toContain("browser_proof:web_actual_browser_not_green");
    expect(source).toContain("browser_proof:android_chrome_actual_browser_not_green");
    expect(source).toContain("route_equivalent_not_reported_as_real_browser");
    expect(source).toContain("env_does_not_mark_browser_passed: true");
    expect(source).not.toMatch(/actual_web_browser_smoke_passed:\s*envFlag/);
    expect(source).not.toMatch(/actual_android_chrome_browser_smoke_passed:\s*envFlag/);
  });
});
