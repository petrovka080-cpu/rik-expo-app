import { writeContaminationArtifacts } from "./professionalExpandedTemplate10000Audit.shared";

writeContaminationArtifacts().catch((error) => {
  console.error(error);
  process.exit(1);
});
