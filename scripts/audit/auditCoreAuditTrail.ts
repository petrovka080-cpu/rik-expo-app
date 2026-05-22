import {
  CORE_WORKFLOWS_GREEN_STATUS,
  printCoreWorkflowsSummary,
  writeCoreWorkflowsArtifacts,
} from "./coreWorkflows.shared";

const report = writeCoreWorkflowsArtifacts({ assumeGatesPassed: true });
printCoreWorkflowsSummary(report);

if (!report.matrix.audit_event_written_once || report.matrix.final_status !== CORE_WORKFLOWS_GREEN_STATUS) {
  process.exitCode = 1;
}
