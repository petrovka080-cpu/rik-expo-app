import { buildBuiltInAi150ConstructionWorkTypesProofArtifacts } from "../../scripts/e2e/runBuiltInAi150ConstructionWorkTypesProof";

let cached: ReturnType<typeof buildBuiltInAi150ConstructionWorkTypesProofArtifacts> | null = null;

export function getAi150Artifacts() {
  cached ??= buildBuiltInAi150ConstructionWorkTypesProofArtifacts();
  return cached;
}
