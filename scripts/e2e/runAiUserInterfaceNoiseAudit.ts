import {
  AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX,
  buildAiRealUserNoiseAudit,
  writeAiRealUserCoreArtifacts,
} from "../ai/aiRealUserButtonProof";

const audit = buildAiRealUserNoiseAudit();

writeAiRealUserCoreArtifacts();

console.log(JSON.stringify(audit, null, 2));

if (audit.final_status !== "GREEN_AI_SIMPLE_USER_INTERFACE_READY") {
  throw new Error(`${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX} UI noise audit blocked`);
}
