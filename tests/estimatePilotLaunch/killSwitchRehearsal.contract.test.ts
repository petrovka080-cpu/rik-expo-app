import { rehearseEstimatePilotKillSwitches } from "../../scripts/estimate/buildPilotDefectBurndown";

describe("pilot launch kill switch rehearsal", () => {
  it("verifies disable-all, PDF, buyer handoff, and complex-engineering switches", () => {
    const summary = rehearseEstimatePilotKillSwitches({ writeRuntime: false });

    expect(summary.kill_switch_rehearsal_passed).toBe(true);
    expect(summary.disable_all_blocks_new_estimates).toBe(true);
    expect(summary.existing_snapshots_still_readable).toBe(true);
    expect(summary.pdf_disable_does_not_break_request).toBe(true);
    expect(summary.buyer_disable_does_not_break_pdf).toBe(true);
    expect(summary.complex_disable_keeps_core_repair).toBe(true);
    expect(summary.events_recorded).toHaveLength(5);
  });
});
