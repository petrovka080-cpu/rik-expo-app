import {
  runOwnerAccountKillSwitchProof,
} from "./aiEstimateOwnerAccountLiveReplayCore";

if (require.main === module) {
  const artifact = runOwnerAccountKillSwitchProof();
  if (artifact.final_status !== "OWNER_ACCOUNT_KILL_SWITCH_OK") {
    throw new Error(`${artifact.final_status}:owner account kill switch proof failed`);
  }
}

