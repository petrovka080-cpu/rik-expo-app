import { writeLimitedPublicBetaReplayArtifacts } from "./aiEstimateLimitedPublicBetaExecutionCore";

export function runAiEstimateLimitedPublicBetaExecutionReplay() {
  const replay = writeLimitedPublicBetaReplayArtifacts();
  if (replay.artifact.beta_replay_sessions_total !== 3000) {
    throw new Error("NO_GO_REPLAY_SESSION_COUNT_NOT_3000");
  }
  if (replay.artifact.beta_replay_sessions_failed > 0) {
    throw new Error(`NO_GO_REPLAY_FAILURES:${replay.artifact.beta_replay_sessions_failed}`);
  }
  return replay;
}

if (require.main === module) {
  runAiEstimateLimitedPublicBetaExecutionReplay();
}
