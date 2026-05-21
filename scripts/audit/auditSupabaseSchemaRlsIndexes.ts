import { printAuditSlice, writeMaxArchitectureScaleRiskAudit50kArtifacts } from "./maxArchitectureScaleRiskAudit50k.shared";

const report = writeMaxArchitectureScaleRiskAudit50kArtifacts();
printAuditSlice("supabase_schema_rls_indexes", {
  db_schema: report.dbSchema,
  rls: report.rls,
  indexes: report.indexes,
});
