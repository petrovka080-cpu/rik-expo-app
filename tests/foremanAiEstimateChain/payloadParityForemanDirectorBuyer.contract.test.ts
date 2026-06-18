import {
  FOREMAN_AI_ESTIMATE_ACCEPTANCE_SAMPLES,
  buildForemanAiEstimateSampleMapping,
} from "../../src/lib/foremanAiEstimate/foremanAiEstimateChainAudit";
import {
  summarizeForemanAiEstimatePayloadParity,
  verifyForemanAiEstimatePayloadParity,
} from "../../src/lib/foremanAiEstimate/foremanAiEstimatePayloadParity";

describe("foreman AI estimate payload parity", () => {
  it("keeps source row identity through AI, foreman, director and buyer filtering", () => {
    const reports = FOREMAN_AI_ESTIMATE_ACCEPTANCE_SAMPLES.map((sample) =>
      verifyForemanAiEstimatePayloadParity(buildForemanAiEstimateSampleMapping(sample)),
    );
    const summary = summarizeForemanAiEstimatePayloadParity(reports);

    expect(summary.sample_count).toBe(10);
    expect(summary.payload_parity_ai_to_foreman).toBe(true);
    expect(summary.payload_parity_foreman_to_director).toBe(true);
    expect(summary.payload_parity_director_to_buyer).toBe(true);
    expect(summary.code_desync_detected).toBe(false);
    expect(summary.issue_count).toBe(0);
  });
});
