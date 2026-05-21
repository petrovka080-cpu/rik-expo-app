import { printAuditSlice, writeMaxArchitectureScaleRiskAudit50kArtifacts } from "../audit/maxArchitectureScaleRiskAudit50k.shared";

const report = writeMaxArchitectureScaleRiskAudit50kArtifacts();
printAuditSlice("ai_role_helpfulness_proof", {
  ai_role_matrix: report.aiRoleMatrix,
  transcripts: report.aiHelpfulnessTranscripts,
});
