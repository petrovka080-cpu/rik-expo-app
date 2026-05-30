import {
  writeOwnerAccountTelemetryPrivacyAudit,
} from "../e2e/aiEstimateOwnerAccountLiveReplayCore";

if (require.main === module) {
  const artifact = writeOwnerAccountTelemetryPrivacyAudit();
  if (artifact.final_status !== "OWNER_ACCOUNT_TELEMETRY_PRIVACY_OK") {
    const reason = "reason" in artifact ? artifact.reason : "telemetry privacy audit failed";
    throw new Error(`${artifact.final_status}:${reason}`);
  }
}
