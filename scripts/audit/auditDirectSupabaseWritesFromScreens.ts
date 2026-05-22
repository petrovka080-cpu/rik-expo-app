import {
  buildBackendServiceBoundaryDirectWritesReport,
} from "./backendServiceBoundary.shared";

const report = buildBackendServiceBoundaryDirectWritesReport();
console.log(JSON.stringify(report, null, 2));

if (!report.passed) {
  process.exitCode = 1;
}
