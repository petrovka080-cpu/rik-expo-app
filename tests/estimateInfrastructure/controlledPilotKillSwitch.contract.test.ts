import { rehearseAiEstimateKillSwitch } from "../../scripts/estimate/rehearseAiEstimateKillSwitch";

describe("controlled pilot kill switch rehearsal", () => {
  it("blocks new AI estimates while preserving approved history, PDF and buyer handoff reads", () => {
    const summary = rehearseAiEstimateKillSwitch({ writeRuntime: false }).artifact;

    expect(summary.kill_switch_rehearsal_created).toBe(true);
    expect(summary.kill_switch_blocks_new_ai_estimates).toBe(true);
    expect(summary.kill_switch_preserves_history_read).toBe(true);
    expect(summary.kill_switch_preserves_existing_pdf_read).toBe(true);
    expect(summary.kill_switch_preserves_existing_buyer_handoff_read).toBe(true);
    expect(summary.kill_switch_reenable_passed).toBe(true);
    expect(summary.owner_approved).toBe(false);
    expect(summary.production_release_started).toBe(false);
  });
});
