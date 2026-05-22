import {
  CORE_PRODUCT_GREEN_STATUS,
  writeCoreProductGoldenPathsArtifacts,
} from "./coreProductGoldenPaths.shared";

const report = writeCoreProductGoldenPathsArtifacts();
console.log(JSON.stringify(report.marketplace_add, null, 2));
if (report.matrix.final_status !== CORE_PRODUCT_GREEN_STATUS && report.marketplace_add.passed !== true) {
  process.exitCode = 1;
}
