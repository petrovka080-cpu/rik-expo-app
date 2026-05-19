import {
  AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX,
  buildAiRealUserLocalizationAudit,
  writeAiRealUserCoreArtifacts,
} from "../ai/aiRealUserButtonProof";

const audit = buildAiRealUserLocalizationAudit();

writeAiRealUserCoreArtifacts();

console.log(JSON.stringify(audit, null, 2));

if (audit.final_status !== "GREEN_AI_RUSSIAN_UI_COPY_READY") {
  throw new Error(`${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX} localization audit blocked`);
}
