import { writeCoreProductGoldenPathsArtifacts } from "./coreProductGoldenPaths.shared";

const report = writeCoreProductGoldenPathsArtifacts();
console.log(JSON.stringify(report.ai_role_scorecard, null, 2));
if (report.ai_role_scorecard.all_core_roles_gte_7 !== true) {
  process.exitCode = 1;
}
