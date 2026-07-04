import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("artifact lineage source sha", () => {
  it("requires full-green and browser evidence to match the tested HEAD instead of stale artifacts", () => {
    const source = fs.readFileSync(
      path.join(PROJECT_ROOT, "scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke.ts"),
      "utf8",
    );

    expect(source).toContain("FULL_GREEN_ROOTS");
    expect(source).toContain(".release-runtime/ai-estimate-10000-truth-audit-and-backfill");
    expect(source).toContain(".release-runtime/ai-estimate-10000-trusted-professional-expanded-boq");
    expect(source).toContain("GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS");
    expect(source).toContain("GREEN_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS");
    expect(source).toContain("latestFullGreenSummary(head)");
    expect(source).toContain("candidate.summary.source_sha === head || candidate.summary.source_commit === head");
    expect(source).toContain("evidence.source_sha === head");
    expect(source).toContain("full_green_summary_source_sha_mismatch");
  });
});
