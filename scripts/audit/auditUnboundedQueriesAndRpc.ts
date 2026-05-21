import { printAuditSlice, writeMaxArchitectureScaleRiskAudit50kArtifacts } from "./maxArchitectureScaleRiskAudit50k.shared";

const report = writeMaxArchitectureScaleRiskAudit50kArtifacts();
printAuditSlice("unbounded_queries_rpc", {
  unbounded_queries: report.unboundedQueries,
  rpc_transactions: report.rpcTransactions,
});
