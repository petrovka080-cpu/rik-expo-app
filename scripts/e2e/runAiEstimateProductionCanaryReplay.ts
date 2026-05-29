import { writeProductionCanaryReplayArtifacts } from "./aiEstimateProductionCanaryCore";

export function runAiEstimateProductionCanaryReplay() {
  const replay = writeProductionCanaryReplayArtifacts();
  if (replay.failures.length > 0) {
    throw new Error(`NO_GO_REPLAY_FAILED:${replay.failures.map((item) => `${item.caseId ?? "global"}:${item.classification}`).join(";")}`);
  }
  return replay;
}

if (require.main === module) {
  runAiEstimateProductionCanaryReplay();
}
