import {
  BACKEND_SERVICE_BOUNDARY_GREEN_STATUS,
  printBackendServiceBoundarySummary,
  writeBackendServiceBoundaryArtifacts,
} from "./backendServiceBoundary.shared";

const report = writeBackendServiceBoundaryArtifacts();
printBackendServiceBoundarySummary(report);

if (report.matrix.final_status !== BACKEND_SERVICE_BOUNDARY_GREEN_STATUS) {
  process.exitCode = 1;
}
