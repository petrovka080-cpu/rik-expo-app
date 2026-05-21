import { printAuditSlice, writeMaxArchitectureScaleRiskAudit50kArtifacts } from "../audit/maxArchitectureScaleRiskAudit50k.shared";

const report = writeMaxArchitectureScaleRiskAudit50kArtifacts();
printAuditSlice("50k_scale_fixture_proof", {
  query_plans: report.queryPlans,
  perf_summary: report.perfSummary,
  risk_register: report.riskRegister.risks.filter((risk) => risk.area === "query_scale_performance"),
});
