import { printAuditSlice, writeMaxArchitectureScaleRiskAudit50kArtifacts } from "./maxArchitectureScaleRiskAudit50k.shared";

const report = writeMaxArchitectureScaleRiskAudit50kArtifacts();
printAuditSlice("ai_role_helpfulness", {
  ai_role_matrix: report.aiRoleMatrix,
  ai_helpfulness_transcripts: report.aiHelpfulnessTranscripts,
  ai_external_knowledge: report.aiExternalKnowledge,
  ai_data_access: report.aiDataAccess,
});
