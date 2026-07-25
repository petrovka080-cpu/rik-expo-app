import type { AsphaltAssemblyProfileIdV4 } from "./asphaltPreliminaryAssemblyPolicyV4";

export type EstimateSemanticKind =
  | "PROFESSIONAL_WORK"
  | "SCOPE_PRESET"
  | "COMPOSITE_PROJECT"
  | "SEARCH_ALIAS"
  | "DOMAIN_REVIEW_REQUIRED";

export type RoadScopeIdV4 =
  | "ROAD_SURFACING_ONLY"
  | "FULL_PAVEMENT_STRUCTURE"
  | "FULL_ROAD_INFRASTRUCTURE"
  | "ROAD_REPAIR_REHABILITATION";

export type RoadScopeResolverStatusV4 = "RESOLVED" | "NEEDS_SCOPE_SELECTION" | "NOT_ROAD";
export const ROAD_SCOPE_RESOLVER_VERSION_V4 = "road-scope-resolver-v4.1.0" as const;

export type RoadScopeResolutionV4 = {
  resolverStatus: RoadScopeResolverStatusV4;
  originalText: string;
  requestedCatalogWorkId: string;
  selectedScopeId: RoadScopeIdV4 | null;
  profileId: AsphaltAssemblyProfileIdV4 | null;
  semanticKind: EstimateSemanticKind | null;
  evidence: string[];
  assumptions: string[];
  exclusions: string[];
};

export type CompositeRoadProjectV4 = {
  compositeProjectId: string;
  requestedCatalogWorkId: string;
  selectedScopeId: Extract<RoadScopeIdV4, "FULL_PAVEMENT_STRUCTURE" | "FULL_ROAD_INFRASTRUCTURE">;
  childPassportRefs: {
    passportId: string;
    passportVersion: string;
    quantityBindingId: string;
    wbsSectionId: string;
  }[];
  projectParameterBindings: string[];
  projectLevelServices: string[];
  assumptions: string[];
  exclusions: string[];
  sourceRegistryVersion: string;
};

export type RoadScopeRevisionBindingV4 = {
  requestedCatalogWorkId: string;
  originalUserText: string;
  semanticKind: Extract<EstimateSemanticKind, "PROFESSIONAL_WORK" | "SCOPE_PRESET" | "COMPOSITE_PROJECT">;
  selectedRoadScope: RoadScopeIdV4;
  resolverEvidence: string[];
  assumptions: string[];
  exclusions: string[];
  resolverVersion: string;
  passportVersions: string[];
  formulaGraphVersions: string[];
  sourceRegistryVersion: string;
  compositeProject?: CompositeRoadProjectV4 | null;
};

export type RoadGeometryResolutionV4 = {
  status: "RESOLVED" | "INCOMPLETE" | "NEEDS_GEOMETRY_CONFIRMATION" | "INVALID";
  lengthM: number | null;
  widthM: number | null;
  areaM2: number | null;
  thicknessMm: number | null;
  evidence: string[];
};

const ROAD = /(?:асфальт|дорог|дорожн[а-яё]*\s+покрыт|щеб[её]н|тротуар|жол|жолду|фрезер|\broad\b|\bpavement\b)/iu;
const PREPARED_BASE =
  /(?:готов[а-яё]*\s+(?:щеб[её]ночн[а-яё]*\s+)?основан|подготовлен[а-яё]*\s+основан|по\s+готовому|даяр\s+(?:шагыл\s+)?негиз)/iu;
const PAVEMENT =
  /(?:дорожн[а-яё]*\s+одежд|подготов[а-яё]*\s+грунт|землян[а-яё]*\s+полотн|щеб[её]ночн[а-яё]*\s+основан|основан[а-яё]*\s+и\s+(?:два|2)\s+сло|жол\s+т[өо]ш[өо]м|full\s+pavement\s+structure)/iu;
const INFRASTRUCTURE =
  /(?:полн[а-яё]*\s+строительств[а-яё]*\s+(?:автомобильн[а-яё]*\s+)?дорог|водоотвод|освещен|освещён|ливнев|разметк|огражден|ограждён|дорожн[а-яё]*\s+знак|инфраструктур|толук\s+жол)/iu;
const REPAIR =
  /(?:ремонт|реабилитац|реконструкц|фрезер|стар[а-яё]*\s+покрыт|ямоч|калыбына\s+келтир)/iu;
const SURFACING_ACTION = /(?:улож|уклад|асфальтир|асфальттоо|покрыт|overlay|surfacing)/iu;
const SURFACING_ONLY =
  /(?:не\s+нужн[а-яё]*\s+полн[а-яё]*\s+дорог|только\s+(?:верхн[а-яё]*\s+сло|асфальт|покрыт)|без\s+(?:нов[а-яё]*\s+)?основан)/iu;

function metricNumber(value: string): number {
  return Number(value.replace(/\s+/g, "").replace(",", "."));
}

function lengthInMeters(value: string, unit: string): number {
  return metricNumber(value) * (/^(?:км|km)$/iu.test(unit) ? 1000 : 1);
}

export function parseRoadGeometryV4(rawText: string): RoadGeometryResolutionV4 {
  const text = rawText.normalize("NFKC").replace(/\u00a0/g, " ");
  const pair = text.match(/(-?\d+(?:[,.]\d+)?)\s*(км|km|м|m)\s*(?:×|x|х|на)\s*(-?\d+(?:[,.]\d+)?)\s*(км|km|м|m)/iu);
  const labelledLength = text.match(/(?:длин[а-яё]*|протяж[а-яё]*|length)\s*[:=]?\s*(-?\d+(?:[,.]\d+)?)\s*(км|km|м|m)/iu);
  const labelledWidth = text.match(/(?:ширин[а-яё]*|width)\s*[:=]?\s*(-?\d+(?:[,.]\d+)?)\s*(км|km|м|m)/iu);
  const areaMatch = text.match(/(?:площад[а-яё]*\s*[:=]?\s*)?(-?\d[\d\s]*(?:[,.]\d+)?)\s*(?:м²|м2|m2|sqm)/iu);
  const thickness = text.match(/(?:толщин[а-яё]*\s*[:=]?\s*)(-?\d+(?:[,.]\d+)?)\s*(мм|mm|см|cm|м|m)/iu);
  const lengthM = pair ? lengthInMeters(pair[1], pair[2]) : labelledLength ? lengthInMeters(labelledLength[1], labelledLength[2]) : null;
  const widthM = pair ? lengthInMeters(pair[3], pair[4]) : labelledWidth ? lengthInMeters(labelledWidth[1], labelledWidth[2]) : null;
  const directArea = areaMatch ? metricNumber(areaMatch[1]) : null;
  const calculatedArea = lengthM != null && widthM != null ? lengthM * widthM : null;
  const thicknessMm = thickness
    ? metricNumber(thickness[1]) * (/^(?:см|cm)$/iu.test(thickness[2]) ? 10 : /^(?:м|m)$/iu.test(thickness[2]) ? 1000 : 1)
    : null;
  const values = [lengthM, widthM, directArea, thicknessMm].filter((value): value is number => value != null);
  if (values.some((value) => !Number.isFinite(value) || value <= 0) || values.some((value) => value > 10_000_000)) {
    return { status: "INVALID", lengthM, widthM, areaM2: directArea ?? calculatedArea, thicknessMm, evidence: ["non_positive_or_extreme_value"] };
  }
  if (directArea != null && calculatedArea != null) {
    const deviation = Math.abs(directArea - calculatedArea) / Math.max(directArea, calculatedArea);
    if (deviation > 0.01) {
      return { status: "NEEDS_GEOMETRY_CONFIRMATION", lengthM, widthM, areaM2: directArea, thicknessMm, evidence: ["area_length_width_conflict"] };
    }
  }
  const areaM2 = directArea ?? calculatedArea;
  if (areaM2 == null) {
    return { status: "INCOMPLETE", lengthM, widthM, areaM2: null, thicknessMm, evidence: ["area_or_length_width_required"] };
  }
  return { status: "RESOLVED", lengthM, widthM, areaM2, thicknessMm, evidence: [directArea != null ? "direct_area" : "length_width"] };
}

const PROFILE_BY_SCOPE: Record<RoadScopeIdV4, AsphaltAssemblyProfileIdV4> = {
  ROAD_SURFACING_ONLY: "surfacing_on_prepared_base",
  FULL_PAVEMENT_STRUCTURE: "new_full_road_pavement",
  FULL_ROAD_INFRASTRUCTURE: "new_full_road_infrastructure",
  ROAD_REPAIR_REHABILITATION: "rehabilitation_with_milling",
};

const KIND_BY_SCOPE: Record<RoadScopeIdV4, EstimateSemanticKind> = {
  ROAD_SURFACING_ONLY: "PROFESSIONAL_WORK",
  FULL_PAVEMENT_STRUCTURE: "COMPOSITE_PROJECT",
  FULL_ROAD_INFRASTRUCTURE: "COMPOSITE_PROJECT",
  ROAD_REPAIR_REHABILITATION: "PROFESSIONAL_WORK",
};

export const ROAD_SCOPE_SELECTION_QUESTION_RU = {
  question: "Что требуется рассчитать?",
  options: [
    { scopeId: "ROAD_SURFACING_ONLY", label: "Только асфальт по готовому основанию" },
    { scopeId: "FULL_PAVEMENT_STRUCTURE", label: "Полную дорожную одежду с основанием" },
    { scopeId: "FULL_ROAD_INFRASTRUCTURE", label: "Полное строительство дороги и инфраструктуры" },
    { scopeId: "ROAD_REPAIR_REHABILITATION", label: "Ремонт существующей дороги" },
  ],
} as const;

export function semanticKindForAsphaltProfileV4(profile: AsphaltAssemblyProfileIdV4): EstimateSemanticKind {
  if (profile === "new_full_road_pavement" || profile === "new_full_road_infrastructure" || profile === "parking_full_construction") {
    return "COMPOSITE_PROJECT";
  }
  return profile === "surfacing_on_prepared_base" || profile === "parking_surfacing_only"
    ? "SCOPE_PRESET"
    : "PROFESSIONAL_WORK";
}

export function isRoadCatalogWorkIdV4(value: string): boolean {
  return /(?:asphalt|(?:^|[_:-])road(?:[_:-]|$)|дорож|асфальт)/iu.test(value);
}

export function resolveRoadScopeV4(input: {
  originalText: string;
  requestedCatalogWorkId: string;
  selectedScopeId?: RoadScopeIdV4 | null;
  exactProfessionalWorkId?: string | null;
}): RoadScopeResolutionV4 {
  const originalText = input.originalText.normalize("NFKC").replace(/\u00a0/g, " ").trim();
  const selected = input.selectedScopeId ?? null;
  if (selected) {
    return resolved(originalText, input.requestedCatalogWorkId, selected, ["user_scope_selection"]);
  }
  if (input.exactProfessionalWorkId?.trim()) {
    return {
      resolverStatus: "NOT_ROAD",
      originalText,
      requestedCatalogWorkId: input.requestedCatalogWorkId,
      selectedScopeId: null,
      profileId: null,
      semanticKind: null,
      evidence: [`exact_professional_work:${input.exactProfessionalWorkId.trim()}`],
      assumptions: [],
      exclusions: [],
    };
  }
  const roadCatalogSelection = isRoadCatalogWorkIdV4(input.requestedCatalogWorkId);
  if (!ROAD.test(originalText) && !roadCatalogSelection) {
    return {
      resolverStatus: "NOT_ROAD",
      originalText,
      requestedCatalogWorkId: input.requestedCatalogWorkId,
      selectedScopeId: null,
      profileId: null,
      semanticKind: null,
      evidence: [],
      assumptions: [],
      exclusions: [],
    };
  }
  if (REPAIR.test(originalText)) {
    return resolved(originalText, input.requestedCatalogWorkId, "ROAD_REPAIR_REHABILITATION", ["repair_or_milling_explicit"]);
  }
  if (SURFACING_ONLY.test(originalText)) {
    return resolved(originalText, input.requestedCatalogWorkId, "ROAD_SURFACING_ONLY", ["surfacing_only_explicit"]);
  }
  const infrastructureNegated = /без\s+(?:бордюр[а-яё]*\s+и\s+)?водоотвод/iu.test(originalText);
  if (INFRASTRUCTURE.test(originalText) && !infrastructureNegated) {
    return resolved(originalText, input.requestedCatalogWorkId, "FULL_ROAD_INFRASTRUCTURE", ["road_infrastructure_explicit"]);
  }
  if (PAVEMENT.test(originalText) && !PREPARED_BASE.test(originalText)) {
    return resolved(originalText, input.requestedCatalogWorkId, "FULL_PAVEMENT_STRUCTURE", ["pavement_structure_explicit"]);
  }
  if (PREPARED_BASE.test(originalText) && SURFACING_ACTION.test(originalText)) {
    return resolved(originalText, input.requestedCatalogWorkId, "ROAD_SURFACING_ONLY", ["prepared_base_explicit"]);
  }
  return {
    resolverStatus: "NEEDS_SCOPE_SELECTION",
    originalText,
    requestedCatalogWorkId: input.requestedCatalogWorkId,
    selectedScopeId: null,
    profileId: null,
    semanticKind: null,
    evidence: ["road_intent_present", "scope_not_explicit"],
    assumptions: [],
    exclusions: [],
  };
}

/** The only public production entry point for road scope selection. */
export const resolveRoadEstimateScopeV4 = resolveRoadScopeV4;

export function roadScopeIdForProfileV4(profile: unknown): RoadScopeIdV4 | null {
  if (profile === "surfacing_on_prepared_base" || profile === "parking_surfacing_only" || profile === "ROAD_SURFACING_ONLY") return "ROAD_SURFACING_ONLY";
  if (profile === "new_full_road_pavement" || profile === "parking_full_construction" || profile === "FULL_PAVEMENT_STRUCTURE") return "FULL_PAVEMENT_STRUCTURE";
  if (profile === "new_full_road_infrastructure" || profile === "FULL_ROAD_INFRASTRUCTURE") return "FULL_ROAD_INFRASTRUCTURE";
  if (profile === "rehabilitation_with_milling" || profile === "overlay_on_existing_pavement" || profile === "local_patch_repair" || profile === "ROAD_REPAIR_REHABILITATION") {
    return "ROAD_REPAIR_REHABILITATION";
  }
  return null;
}

export function buildRoadScopeRevisionBindingV4(input: {
  resolution: RoadScopeResolutionV4;
  passportVersions: string[];
  formulaGraphVersions: string[];
  sourceRegistryVersion: string;
  compositeProject?: CompositeRoadProjectV4 | null;
}): RoadScopeRevisionBindingV4 {
  const { resolution } = input;
  if (
    resolution.resolverStatus !== "RESOLVED" ||
    !resolution.selectedScopeId ||
    !resolution.semanticKind ||
    resolution.semanticKind === "SEARCH_ALIAS" ||
    resolution.semanticKind === "DOMAIN_REVIEW_REQUIRED"
  ) throw new Error("road_scope_must_be_resolved_before_revision");
  if (resolution.semanticKind === "COMPOSITE_PROJECT" && !input.compositeProject) {
    throw new Error("composite_project_binding_required");
  }
  return {
    requestedCatalogWorkId: resolution.requestedCatalogWorkId,
    originalUserText: resolution.originalText,
    semanticKind: resolution.semanticKind,
    selectedRoadScope: resolution.selectedScopeId,
    resolverEvidence: [...resolution.evidence],
    assumptions: [...resolution.assumptions],
    exclusions: [...resolution.exclusions],
    resolverVersion: ROAD_SCOPE_RESOLVER_VERSION_V4,
    passportVersions: [...input.passportVersions],
    formulaGraphVersions: [...input.formulaGraphVersions],
    sourceRegistryVersion: input.sourceRegistryVersion,
    compositeProject: input.compositeProject ?? null,
  };
}

function resolved(
  originalText: string,
  requestedCatalogWorkId: string,
  selectedScopeId: RoadScopeIdV4,
  evidence: string[],
): RoadScopeResolutionV4 {
  const exclusions =
    selectedScopeId === "ROAD_SURFACING_ONLY"
      ? ["earthworks", "new_base", "drainage", "lighting", "road_safety_infrastructure"]
      : selectedScopeId === "FULL_PAVEMENT_STRUCTURE"
        ? ["drainage", "lighting", "road_safety_infrastructure"]
        : [];
  return {
    resolverStatus: "RESOLVED",
    originalText,
    requestedCatalogWorkId,
    selectedScopeId,
    profileId: PROFILE_BY_SCOPE[selectedScopeId],
    semanticKind: KIND_BY_SCOPE[selectedScopeId],
    evidence,
    assumptions: [],
    exclusions,
  };
}

export function validateCompositeRoadProjectV4(project: CompositeRoadProjectV4): string[] {
  const errors: string[] = [];
  if (project.childPassportRefs.length === 0) errors.push("child_passports_required");
  const sections = project.childPassportRefs.map((ref) => ref.wbsSectionId);
  const bindings = project.childPassportRefs.map((ref) => ref.quantityBindingId);
  if (new Set(sections).size !== sections.length) errors.push("duplicate_wbs_ownership");
  if (new Set(bindings).size !== bindings.length) errors.push("duplicate_quantity_binding");
  if (project.childPassportRefs.some((ref) => !ref.passportId || !ref.passportVersion || !ref.wbsSectionId || !ref.quantityBindingId)) {
    errors.push("incomplete_child_reference");
  }
  return errors;
}
