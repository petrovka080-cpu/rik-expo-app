import {
  RoadworksWaveAProductionRegistry,
  getRoadworksWaveAProductionRegistration,
} from "../roadworks/roadworksWaveAProductionBinding";
import {
  ASPHALT_RELATED_EXTRA_PROFILES_V4,
  getAsphaltRelatedProfileByCatalogRecordIdV4,
} from "./asphaltRelatedSemanticRegistryV4";

export type AsphaltRelatedExactRoutingResolutionV4 =
  | { status: "BOUND_EXTRA"; requestedId: string; canonicalWorkKey: string }
  | { status: "BOUND_ROADWORKS"; requestedId: string; canonicalWorkKey: string }
  | { status: "UNSUPPORTED_EXACT_WORK_KEY"; requestedId: string; canonicalWorkKey: null }
  | { status: "NOT_ASPHALT_RELATED"; requestedId: string; canonicalWorkKey: null };

export const ASPHALT_RELATED_KNOWN_EXACT_IDS_V4: ReadonlySet<string> = new Set([
  ...RoadworksWaveAProductionRegistry.flatMap((registration) => [
    registration.workId,
    registration.templateId,
    registration.catalogItemId,
  ]),
  ...ASPHALT_RELATED_EXTRA_PROFILES_V4.flatMap((profile) => [
    profile.canonicalWorkKey,
    profile.canonicalCatalogRecordId,
    ...profile.catalogRecordIds,
  ]),
]);

export function resolveAsphaltRelatedExactRoutingV4(
  rawId: string | null | undefined,
  options: {
    knownExactIds?: ReadonlySet<string>;
    extraOwnerResolver?: typeof getAsphaltRelatedProfileByCatalogRecordIdV4;
    roadworksOwnerResolver?: typeof getRoadworksWaveAProductionRegistration;
  } = {},
): AsphaltRelatedExactRoutingResolutionV4 {
  const requestedId = rawId?.trim() ?? "";
  if (!requestedId) return { status: "NOT_ASPHALT_RELATED", requestedId, canonicalWorkKey: null };
  const extra = (options.extraOwnerResolver ?? getAsphaltRelatedProfileByCatalogRecordIdV4)(requestedId);
  if (extra) {
    return { status: "BOUND_EXTRA", requestedId, canonicalWorkKey: extra.canonicalWorkKey };
  }
  const roadworks = (options.roadworksOwnerResolver ?? getRoadworksWaveAProductionRegistration)(requestedId);
  if (roadworks) {
    return { status: "BOUND_ROADWORKS", requestedId, canonicalWorkKey: roadworks.canonicalWorkId };
  }
  if ((options.knownExactIds ?? ASPHALT_RELATED_KNOWN_EXACT_IDS_V4).has(requestedId)) {
    return { status: "UNSUPPORTED_EXACT_WORK_KEY", requestedId, canonicalWorkKey: null };
  }
  return { status: "NOT_ASPHALT_RELATED", requestedId, canonicalWorkKey: null };
}
