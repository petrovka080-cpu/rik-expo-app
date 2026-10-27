import type { GlobalWorkTypeDefinition } from "../../ai/globalEstimate/globalEstimateTypes";
import { resolveProfessionalUnitDefinition } from "../professionalUnitRegistry";
import { canonicalPublicEstimateChoiceLabelRu, canonicalPublicEstimateWorkTitleRu } from "./canonicalPublicEstimateLanguageRu";
import type {
  CanonicalEstimateConditionProfileGroupingV1,
  CanonicalEstimateConditionProfileV1,
  CanonicalEstimateSearchItem,
} from "./contracts";

/** Resolve only server-listed exact identities. Never infer a standard profile. */
export function canonicalEstimateSelectedConditionProfileV1(
  grouping: CanonicalEstimateConditionProfileGroupingV1,
  requestedCatalogId?: string,
): CanonicalEstimateConditionProfileV1 | null {
  const profiles = grouping.conditionProfiles;
  if (!profiles?.length) {
    if (requestedCatalogId) throw new Error("CANONICAL_CONDITION_PROFILE_NOT_OFFERED");
    return null;
  }
  if (new Set(profiles.map(profile => profile.catalogId)).size !== profiles.length) {
    throw new Error("CANONICAL_CONDITION_PROFILE_ID_AMBIGUOUS");
  }
  const catalogId = requestedCatalogId ?? grouping.matchedConditionCatalogId
    ?? (profiles.length === 1 ? profiles[0].catalogId : null);
  if (!catalogId) return null;
  const profile = profiles.find(candidate => candidate.catalogId === catalogId);
  if (!profile) throw new Error("CANONICAL_CONDITION_PROFILE_NOT_OFFERED");
  return profile;
}

export function canonicalEstimateConditionProfileReadyV1(profile: CanonicalEstimateConditionProfileV1): boolean {
  return profile.estimateReady === true && profile.selectableMode === "PROFESSIONAL"
    && profile.contentAdmission?.allowed === true
    && profile.contentAdmission.contractVersion === "estimate-admission-r3"
    && profile.contentAdmission.catalogId === profile.catalogId
    && profile.contentAdmission.definitionVersionId === profile.definitionVersionId
    && profile.contentAdmission.releaseId === profile.definitionReleaseId;
}

export function canonicalEstimateConditionProfileLabelRuV1(profile: CanonicalEstimateConditionProfileV1): string {
  const labels: Record<string, string> = {
    standard: "Обычные условия", wet_zone: "Влажная зона", technical_room: "Техническое помещение",
    high_load: "Высокая нагрузка", repair: "Ремонт", access_limited: "Ограниченный доступ",
    commercial: "Коммерческое помещение",
  };
  return profile.conditionTitleRu || labels[profile.conditionId] || profile.titleRu;
}

/** Public card name and functional choice are authored by the server policy.
 * The exact manufacturer/source title stays inside conditionProfiles. */
export function canonicalEstimateConditionProfilePublicTitleRuV1(
  publicWorkTitleRu: string, profile: CanonicalEstimateConditionProfileV1,
): string {
  const title = canonicalPublicEstimateWorkTitleRu(publicWorkTitleRu);
  const choice = canonicalPublicEstimateChoiceLabelRu(canonicalEstimateConditionProfileLabelRuV1(profile));
  if (!choice || choice === "Основной вариант") return title;
  const suffix = ` — ${choice}`;
  return title.toLocaleLowerCase("ru-RU").endsWith(suffix.toLocaleLowerCase("ru-RU")) ? title : title + suffix;
}

export function canonicalEstimateCatalogPublicTitleRuV1(
  catalog: { catalogId: string; titleRu: string },
  selection: Pick<CanonicalEstimateSearchItem, "catalogId" | "canonicalNameRu"> | null,
): string {
  return canonicalPublicEstimateWorkTitleRu(selection?.catalogId === catalog.catalogId
    ? selection.canonicalNameRu : catalog.titleRu);
}

export function canonicalPrimaryUomToGlobalUnitV1(value: string): GlobalWorkTypeDefinition["defaultMeasureUnit"] | null {
  const token = value.normalize("NFKC").trim().toLocaleLowerCase("en");
  const sourceAliases: Record<string, string> = { "м": "m", "т": "t", item: "pcs", kilogram: "kg", cu_m: "m3" };
  const definition = resolveProfessionalUnitDefinition(sourceAliases[token] ?? value);
  if (!definition) return null;
  const units: Record<string, GlobalWorkTypeDefinition["defaultMeasureUnit"]> = {
    m2: "sq_m", sq_ft: "sq_ft", m: "linear_m", lm: "linear_m", linear_ft: "linear_ft",
    pcs: "pcs", point: "pcs", circuit: "pcs", zone: "pcs", set: "set", shift: "shift", trip: "trip",
    kg: "kg", lbs: "lbs", t: "ton", l: "l", m3: "m3", cu_ft: "cu_ft",
  };
  // Mixed/unsupported catalog measures retain their exact primaryUom and schema.
  // This display projection does not convert quantities or invent a count unit.
  return units[definition.code] ?? null;
}

export function resolveCanonicalEstimateConditionSearchItemV1(
  item: CanonicalEstimateSearchItem, requestedCatalogId?: string,
): CanonicalEstimateSearchItem | null {
  if (!item.conditionProfiles?.length) {
    if (requestedCatalogId) throw new Error("CANONICAL_CONDITION_PROFILE_NOT_OFFERED");
    return item;
  }
  const profile = canonicalEstimateSelectedConditionProfileV1(item, requestedCatalogId);
  if (!profile) return null;
  return { ...item, catalogId: profile.catalogId, definitionVersionId: profile.definitionVersionId,
    definitionReleaseId: profile.definitionReleaseId,
    canonicalNameRu: canonicalEstimateConditionProfilePublicTitleRuV1(item.canonicalNameRu, profile),
    technologyVariant: profile.technologyVariant ?? "", primaryUom: profile.primaryUom,
    operationKind: profile.operationKind, publicationState: profile.publicationState,
    estimateReady: canonicalEstimateConditionProfileReadyV1(profile),
    contentAdmission: profile.contentAdmission, selectableMode: profile.selectableMode,
    nonselectableReasonRu: profile.nonselectableReasonRu, matchedConditionCatalogId: profile.catalogId };
}
