import { runReplayableEstimateCoreAudit } from "../../scripts/estimate/auditReplayableEstimateCore";
import { validateReplayableCoreCorpus } from "../../scripts/estimate/buildReplayableCoreCorpus";

describe("replayable estimate core audit", () => {
  it("covers at least 360 cases and rejects silent replay drift", () => {
    const corpus = validateReplayableCoreCorpus();
    const audit = runReplayableEstimateCoreAudit({ sourceSha: "test-source-sha", writeLedger: false }).artifact;

    expect(corpus.valid).toBe(true);
    expect(audit.replay_cases_total).toBeGreaterThanOrEqual(360);
    expect(audit.replay_cases_passed).toBe(audit.replay_cases_total);
    expect(audit.silent_drift_count).toBe(0);
    expect(audit.silent_drift_rejected).toBe(true);
    expect(audit.final_status).toBe("GREEN_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT");
  });
});
