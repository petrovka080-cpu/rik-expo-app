import { writeInternalCanaryReplayArtifacts } from "../e2e/aiEstimateInternalCanaryCore";

export function runAiEstimateCanaryTelemetryAudit() {
  const replay = writeInternalCanaryReplayArtifacts();
  const telemetryReady = replay.summary.telemetry_events_valid === replay.summary.telemetry_events_total;
  if (!telemetryReady) {
    throw new Error("NO_GO_TELEMETRY_LEAK");
  }
  return {
    telemetry_ready: telemetryReady,
    telemetry_redacted: true,
    telemetry_events_total: replay.summary.telemetry_events_total,
    telemetry_events_valid: replay.summary.telemetry_events_valid,
  };
}

if (require.main === module) {
  runAiEstimateCanaryTelemetryAudit();
}
