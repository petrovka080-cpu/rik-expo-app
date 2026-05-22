import { writeCoreProductGoldenPathsArtifacts } from "./coreProductGoldenPaths.shared";

const report = writeCoreProductGoldenPathsArtifacts();
const payload = {
  foreman_director: report.foreman_director,
  buyer_procurement: report.buyer_procurement,
};
console.log(JSON.stringify(payload, null, 2));
if (report.foreman_director.passed !== true || report.buyer_procurement.passed !== true) {
  process.exitCode = 1;
}
