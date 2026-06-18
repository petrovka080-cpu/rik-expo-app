import { writePdfSnapshotArtifacts } from "./professionalExpanded1560Acceptance.shared";

writePdfSnapshotArtifacts().catch((error) => {
  console.error(error);
  process.exit(1);
});
