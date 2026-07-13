import { writeSampleArtifacts, writeStartStatusArtifact } from "./professionalExpanded1560Acceptance.shared";

writeStartStatusArtifact()
  .then(writeSampleArtifacts)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
