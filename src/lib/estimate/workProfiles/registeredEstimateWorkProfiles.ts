import { ASPHALT_REFERENCE_V1_PROFILE } from "../v4/asphalt/asphaltReferenceV1";
import { ELECTRICAL_CANONICAL_PROFILE } from "../v4/electrical/electricalCanonicalV1";
import { createEstimateWorkProfileRegistry } from "./estimateWorkProfileRegistry";

export const REGISTERED_ESTIMATE_WORK_PROFILES = createEstimateWorkProfileRegistry([
  ASPHALT_REFERENCE_V1_PROFILE,
  ELECTRICAL_CANONICAL_PROFILE,
]);

export function getRegisteredEstimateWorkProfile(catalogWorkId: string) {
  return REGISTERED_ESTIMATE_WORK_PROFILES.getByCatalogWorkId(catalogWorkId);
}
