import { sampleRenderedEstimateSnapshotsByFamily } from "../../scripts/estimate/sampleRenderedEstimateSnapshotsByFamily";
import { readRepoFile } from "./blackboxAcceptanceTestHelpers";

jest.setTimeout(240_000);

describe("blackbox human review pack", () => {
  it("samples 100 rendered estimates by family and keeps review artifacts runtime-only", () => {
    const summary = sampleRenderedEstimateSnapshotsByFamily({ count: 100, writeHumanReport: false });

    expect(summary.sampled_count).toBe(100);
    expect(summary.requested_count).toBe(100);
    expect(summary.all_work_families_represented).toBe(true);
    expect(summary.sampled_estimates_readable).toBe(true);
    expect(summary.critical_cases_readable).toBe(true);
    expect(summary.failed_cases_listed_if_any).toBe(true);
    expect(summary.human_review_pack_created).toBe(false);
    expect(summary.human_review_dir).toBeNull();
    expect(summary.samples.every((sample) => sample.row_count > 0 && sample.first_formula_trace)).toBe(true);

    const sampler = readRepoFile("scripts/estimate/sampleRenderedEstimateSnapshotsByFamily.ts");
    expect(sampler).toContain(".release-runtime/ai-estimate-10000-blackbox-acceptance");
    expect(sampler).toContain("100-sampled-estimates.md");
    expect(sampler).toContain("100-sampled-pdfs-text.json");
    expect(sampler).toContain("critical-cases-report.md");
    expect(sampler).toContain("failed-cases-if-any.json");
    expect(sampler).toContain("formula-trace-samples.json");
    expect(sampler).toContain("buyer-handoff-samples.json");
  });
});
