import { evaluateAiEstimateKillSwitchReadiness } from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import { validateAiEstimateRollbackPlan } from "../../src/lib/ai/rollback/aiEstimateRollbackPlan";
import { writeAiEstimateEnterpriseFinalReadinessArtifacts } from "./runAiEstimateEnterpriseFinalReadinessGoNoGo";

const killSwitch = evaluateAiEstimateKillSwitchReadiness();
const rollback = validateAiEstimateRollbackPlan();
writeAiEstimateEnterpriseFinalReadinessArtifacts();
if (!killSwitch.kill_switch_ready) throw new Error("KILL_SWITCH_NOT_READY");
if (!rollback.rollback_ready) throw new Error("ROLLBACK_NOT_READY");

