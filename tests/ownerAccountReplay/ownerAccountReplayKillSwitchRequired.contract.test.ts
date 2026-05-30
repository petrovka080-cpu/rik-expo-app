import {
  buildAiEstimateOwnerAccountReplayPolicy,
  validateOwnerAccountReplayPolicy,
} from "../../src/lib/ai/productionCanary";
import { runOwnerAccountKillSwitchProof } from "../../scripts/e2e/aiEstimateOwnerAccountLiveReplayCore";

test("owner account replay requires kill switch and proves override path", () => {
  const missingKillSwitch = validateOwnerAccountReplayPolicy(
    buildAiEstimateOwnerAccountReplayPolicy({ kill_switch_required: false }),
  );
  const proof = runOwnerAccountKillSwitchProof();

  expect(missingKillSwitch.issues).toContain("KILL_SWITCH_NOT_REQUIRED");
  expect(proof.final_status).toBe("OWNER_ACCOUNT_KILL_SWITCH_OK");
  expect(proof.kill_switch_proof_passed).toBe(true);
});
