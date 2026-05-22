import {
  buildCoreProductBackendBoundaryReport,
  writeCoreProductJson,
} from "../e2e/coreProductGoldenPaths.shared";

const report = buildCoreProductBackendBoundaryReport();
writeCoreProductJson("backend_boundary", report);
console.log(JSON.stringify(report, null, 2));

if (report.passed !== true) {
  process.exitCode = 1;
}
