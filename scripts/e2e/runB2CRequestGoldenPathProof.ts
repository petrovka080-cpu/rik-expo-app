import { writeCoreProductGoldenPathsArtifacts } from "./coreProductGoldenPaths.shared";

const report = writeCoreProductGoldenPathsArtifacts();
console.log(JSON.stringify(report.b2c_request, null, 2));
if (report.b2c_request.passed !== true) {
  process.exitCode = 1;
}
