import { writeRowQualityArtifacts } from "./professionalExpandedTemplate10000Audit.shared";

writeRowQualityArtifacts().catch((error) => {
  console.error(error);
  process.exit(1);
});
