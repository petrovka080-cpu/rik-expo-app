import { writePricebookScopeArtifacts } from "./professionalExpandedTemplate10000Audit.shared";

writePricebookScopeArtifacts().catch((error) => {
  console.error(error);
  process.exit(1);
});
