import { writeCoreProductGoldenPathsArtifacts } from "./coreProductGoldenPaths.shared";

const report = writeCoreProductGoldenPathsArtifacts();
console.log(JSON.stringify(report.layout_rects, null, 2));
if (report.layout_rects.passed !== true) {
  process.exitCode = 1;
}
