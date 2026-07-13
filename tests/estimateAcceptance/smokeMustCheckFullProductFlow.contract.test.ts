import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function source(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

describe("smoke must check full product flow", () => {
  it("requires browser smokes to drive request, grouped draft, details, approve, PDF and buyer handoff", () => {
    const web = source("scripts/e2e/runCapitalRenovation98ProductFlowWebSmoke.ts");
    const android = source("scripts/e2e/runCapitalRenovation98ProductFlowAndroidSmoke.ts");
    const webWrapper = source("scripts/e2e/runEstimate10000TruthAuditWebSmoke.ts");
    const androidWrapper = source("scripts/e2e/runEstimate10000TruthAuditAndroidSmoke.ts");

    for (const smoke of [web, android]) {
      expect(smoke).toContain("consumer-repair-problem-input");
      expect(smoke).toContain("request-estimate-summary-card");
      expect(smoke).toContain("request-estimate-details-toggle");
      expect(smoke).toContain("consumer-repair-approve");
      expect(smoke).toContain("consumer-repair-open-pdf");
      expect(smoke).toContain("route_marker_only_smoke_rejected");
      expect(smoke).toContain("runtime_marker_only_smoke_rejected");
      expect(smoke).toContain("route_equivalent_smoke_passed: false");
    }
    expect(web).toContain("buildConsumerRepairProcurementHandoffFromSnapshot");
    expect(android).toContain("runCapitalRenovation98ProductFlowDomainProof");
    expect(webWrapper).toContain("runCapitalRenovation98ProductFlowWebSmoke");
    expect(androidWrapper).toContain("runCapitalRenovation98ProductFlowAndroidSmoke");
    expect(webWrapper).not.toContain("runEstimateBlackboxAcceptanceWebSmoke");
    expect(androidWrapper).not.toContain("runEstimateBlackboxAcceptanceAndroidSmoke");
  });
});
