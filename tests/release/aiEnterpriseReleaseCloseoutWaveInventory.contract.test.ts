import { buildAiEnterpriseReleaseCloseoutReport } from "../../scripts/release/runAiEnterpriseReleaseCloseoutChangeControl";

describe("AI enterprise release closeout wave inventory", () => {
  it("verifies waves 1 through 13 have layers, indexes, proof runners, tests, and matrices", () => {
    const report = buildAiEnterpriseReleaseCloseoutReport();

    expect(report.waveInventory).toHaveLength(13);
    expect(report.matrix.waves_1_to_13_inventory_ready).toBe(true);
    expect(report.matrix.all_required_layers_present).toBe(true);
    expect(report.matrix.all_required_tests_present).toBe(true);
    expect(report.matrix.all_required_proof_runners_present).toBe(true);
    expect(report.matrix.all_required_artifacts_present).toBe(true);
  });
});
