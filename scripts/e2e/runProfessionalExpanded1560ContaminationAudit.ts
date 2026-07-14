import { writeContaminationArtifacts } from "./professionalExpanded1560Acceptance.shared";

writeContaminationArtifacts().catch((error) => {
  console.error(error);
  process.exit(1);
});
