import { expect, test } from "playwright/test";

import {
  writeCanaryEvaluationDecisionPolicyArtifacts,
  writeCanaryEvaluationEvidenceArtifacts,
  writeCanaryEvaluationWebArtifacts,
} from "../../scripts/e2e/aiEstimateCanaryEvaluationCore";

test.describe("AI estimate canary evaluation", () => {
  test("keeps public rollout disabled while evaluating internal canary evidence", () => {
    const policy = writeCanaryEvaluationDecisionPolicyArtifacts();
    const evaluation = writeCanaryEvaluationEvidenceArtifacts();
    const web = writeCanaryEvaluationWebArtifacts();

    expect(policy.production_rollout_enabled).toBe(false);
    expect(policy.public_canary_enabled).toBe(false);
    expect(policy.public_rollout_authorized).toBe(false);
    expect(evaluation.decision.decision).toBe("GO_NEXT_CONTROLLED_PUBLIC_CANARY_STAGE");
    expect(web.web_live_app_tested).toBe(true);
    expect(web.web_flows_passed).toBe(true);
  });
});
