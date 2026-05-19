import { buildAiRealUserNoiseAudit } from "../../scripts/ai/aiRealUserButtonProof";

describe("AI simple user interface noise audit", () => {
  it("keeps every AI screen compact and understandable", () => {
    const audit = buildAiRealUserNoiseAudit();

    expect(audit.final_status).toBe("GREEN_AI_SIMPLE_USER_INTERFACE_READY");
    expect(audit.max_visible_ai_actions_per_screen).toBeLessThanOrEqual(5);
    expect(audit.duplicate_action_labels_found).toBe(0);
    expect(audit.generic_results_found).toBe(0);
  });
});
