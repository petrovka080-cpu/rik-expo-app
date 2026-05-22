import { writeAiRoleLiveTranscriptValueArtifacts } from "../e2e/aiRoleLiveTranscriptValue.shared";

const report = writeAiRoleLiveTranscriptValueArtifacts();

console.log(JSON.stringify({
  wave: "S_AI_ROLE_LIVE_TRANSCRIPT_VALUE_CLOSEOUT",
  slice: "data_access",
  artifact: "artifacts/S_AI_ROLE_LIVE_TRANSCRIPT_data_access.json",
  app_data_used_all_roles: report.dataAccess.app_data_used_all_roles,
  unsafe_cross_role_leak_found: report.dataAccess.unsafe_cross_role_leak_found,
  service_role_used: report.dataAccess.service_role_used,
}, null, 2));

