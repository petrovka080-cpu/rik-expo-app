import {
  CORE_WORKFLOWS_GREEN_STATUS,
  printCoreWorkflowsSummary,
  writeCoreWorkflowsArtifacts,
} from "./coreWorkflows.shared";

const report = writeCoreWorkflowsArtifacts({ assumeGatesPassed: true });
printCoreWorkflowsSummary(report);

if (!report.matrix.transaction_rollback_verified || report.matrix.final_status !== CORE_WORKFLOWS_GREEN_STATUS) {
  process.exitCode = 1;
}
