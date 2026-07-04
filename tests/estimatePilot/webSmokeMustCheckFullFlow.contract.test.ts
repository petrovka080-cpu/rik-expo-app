import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function source(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

describe("controlled pilot web smoke", () => {
  it("must drive full request to grouped draft to snapshot PDF buyer flow", () => {
    const web = source("scripts/e2e/runControlledPilotWebSmoke.ts");
    expect(web).toContain("chromium.launch");
    expect(web).toContain("consumer-repair-problem-input");
    expect(web).toContain("consumer-repair-prepare-draft");
    expect(web).toContain("request-estimate-summary-card");
    expect(web).toContain("request-estimate-details-toggle");
    expect(web).toContain("request-estimate-details-panel");
    expect(web).toContain("consumer-repair-approve");
    expect(web).toContain("consumer-repair-open-pdf");
    expect(web).toContain("buildConsumerRepairProcurementHandoffFromSnapshot");
    expect(web).toContain("pdf_rows_equal_snapshot_rows");
    expect(web).toContain("buyer_handoff_procurement_subset_valid");
    expect(web).toContain("route_equivalent_smoke_passed: false");
    expect(web).toContain("env_browser_green_rejected: true");
    expect(web).toContain("positions_empty_after_prompt");
    expect(web).toContain("PRICE_MISSING");
  });
});
