import { expectFastAcceptanceGreen } from "./blackboxAcceptanceTestHelpers";

jest.setTimeout(240_000);

describe("blackbox prompt to snapshot acceptance", () => {
  it("passes prompt parser, template selection, confirmation, revision, director payload and snapshot creation", () => {
    const summary = expectFastAcceptanceGreen();

    expect(summary.blackbox_corpus_total).toBeGreaterThanOrEqual(530);
    expect(summary.blackbox_random_sample_size).toBeGreaterThanOrEqual(500);
    expect(summary.blackbox_acceptance_passed).toBe(true);
    expect(summary.failed_case_count).toBe(0);
    expect(summary.all_work_families_represented).toBe(true);
    expect(summary.previous_full_green_verified).toBe(true);
    expect(summary.no_manual_green_status_override).toBe(true);
    expect(summary.artifact_lineage_valid).toBe(true);
  });
});
