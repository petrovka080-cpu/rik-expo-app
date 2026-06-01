import {
  buildReleaseVerifyCoreReport,
  classifyDirtyFiles,
  evaluateGeneratedArtifactHygiene,
  evaluateReleaseGuardConsistency,
  runProductionReleaseSecretScan,
} from "../../scripts/release/releaseStateCleanupCore";
import { tempReleaseRoot } from "./releaseStateCleanupTestHelpers";

export function greenCoreReport() {
  const root = tempReleaseRoot();
  return buildReleaseVerifyCoreReport({
    dirtyScope: classifyDirtyFiles([]),
    releaseGuard: evaluateReleaseGuardConsistency({
      rootDir: root,
      requiredGates: [],
      ownerOnlyGates: [],
      matrixPathList: [],
    }),
    artifactHygiene: evaluateGeneratedArtifactHygiene(""),
    secretScan: runProductionReleaseSecretScan(root),
  });
}
