import { writeCoreProductGoldenPathsArtifacts } from "./coreProductGoldenPaths.shared";

const report = writeCoreProductGoldenPathsArtifacts();
console.log(JSON.stringify(report.contractor_evidence, null, 2));
if (report.contractor_evidence.passed !== true) {
  process.exitCode = 1;
}
