import { runInternalCanaryKillSwitchDrill } from "./aiEstimateInternalCanaryCore";

export function runAiEstimateKillSwitchDrill() {
  const drill = runInternalCanaryKillSwitchDrill();
  if (!drill.kill_switch_drill_passed) {
    throw new Error("NO_GO_KILL_SWITCH_FAILED");
  }
  return drill;
}

if (require.main === module) {
  runAiEstimateKillSwitchDrill();
}
