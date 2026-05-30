import {
  runAndroidApi34OwnerAccountReplay,
} from "./aiEstimateOwnerAccountLiveReplayCore";

if (require.main === module) {
  const artifact = runAndroidApi34OwnerAccountReplay();
  if (artifact.final_status !== "OWNER_ACCOUNT_ANDROID_API34_REPLAY_OK") {
    const reason = "reason" in artifact
      ? artifact.reason
      : "failures" in artifact && Array.isArray(artifact.failures)
        ? artifact.failures.join(";")
        : "android owner replay failed";
    throw new Error(`${artifact.final_status}:${reason}`);
  }
}
