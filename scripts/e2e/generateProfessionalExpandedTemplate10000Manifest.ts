import { writeManifestArtifacts } from "./professionalExpandedTemplate10000Audit.shared";

writeManifestArtifacts().catch((error) => {
  console.error(error);
  process.exit(1);
});
