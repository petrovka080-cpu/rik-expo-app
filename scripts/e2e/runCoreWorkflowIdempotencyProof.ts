import {
  CORE_WORKFLOWS_GREEN_STATUS,
  printCoreWorkflowsSummary,
  writeCoreWorkflowsArtifacts,
} from "../audit/coreWorkflows.shared";

const report = writeCoreWorkflowsArtifacts();
printCoreWorkflowsSummary(report);

if (report.matrix.final_status !== CORE_WORKFLOWS_GREEN_STATUS) {
  process.exitCode = 1;
}
