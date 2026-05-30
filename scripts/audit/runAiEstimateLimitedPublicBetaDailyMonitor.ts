import {
  writeLimitedPublicBetaDailyMonitorArtifacts,
  writeLimitedPublicBetaReplayArtifacts,
} from "../e2e/aiEstimateLimitedPublicBetaExecutionCore";

export function runAiEstimateLimitedPublicBetaDailyMonitor() {
  const replay = writeLimitedPublicBetaReplayArtifacts();
  const monitor = writeLimitedPublicBetaDailyMonitorArtifacts(replay);
  if (!monitor.daily_monitor_ready) {
    throw new Error(`AUTO_NO_GO_AND_DISABLE_PUBLIC_BETA:${monitor.failures.join(";")}`);
  }
  return monitor;
}

if (require.main === module) {
  runAiEstimateLimitedPublicBetaDailyMonitor();
}
