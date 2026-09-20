import {
  compileCanonicalEstimateAndLoad,
  getCanonicalEstimateCatalogItem,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import {
  canonicalEstimateBlockingParameterIssues,
} from "../../lib/estimate/backendPlatform/canonicalEstimateParameterSemantics";
import { adaptCanonicalRevisionToStructuredEstimate } from "../../lib/estimate/backendPlatform/canonicalEstimateForemanAdapter";
import { validateCanonicalEstimateParameterInputs } from "../../lib/estimate/backendPlatform/canonicalEstimateParameterValidation";
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateParameterInputValue,
} from "../../lib/estimate/backendPlatform/contracts";
import type { CanonicalParameterSession } from "../../lib/estimate/canonicalParameters";
import { buildConsumerCanonicalPrecompileParameterSession } from "./consumerCanonicalParameterEditor";
/*
 * This module is deliberately backend-only: it may derive typed inputs from
 * the user's prompt, but it never compiles a fallback estimate on the client.
 */
import {
  mapAiEstimateToForemanDraft,
  verifyForemanAiEstimatePayloadParity,
  type ForemanAiEstimateDraftMapping,
} from "../../lib/foremanAiEstimate";
import {
  parseR4A6PumpStationPrompt,
  R4_A6_PUMP_STATION_CATALOG_ID,
  R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID,
} from "../../lib/estimate/r4A6PumpStationProfessional";
import {
  parseR4A10AsphaltDrainagePrompt,
  R4_A10_ASPHALT_DRAINAGE_CATALOG_ID,
  R4_A10_ASPHALT_DRAINAGE_PRIMARY_MEASURE_PARAMETER_ID,
} from "../../lib/estimate/r4A10AsphaltDrainagePrompt";
import {
  extractAsphaltUserFactsV4,
  type AsphaltScopeSelectionIdV5,
} from "../../lib/estimate/v4/asphalt";
import {
  getAsphaltRelatedProfileByCanonicalWorkKeyV4,
  getAsphaltRelatedProfileByCatalogRecordIdV4,
} from "../../lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";
import { extractRicsNrm2FormworkCanonicalParametersV1 } from "../../lib/estimate/ownedDomain/formworkRicsNrm2ProductionBindingV1";
import { extractFormworkFramiXlifeCanonicalParametersR1 } from "../../lib/estimate/ownedDomain/formworkFramiXlifeProductionBindingR1";
import { extractReinforcementBarScheduleCanonicalParametersV1 } from "../../lib/estimate/ownedDomain/reinforcementBarScheduleProductionBindingV1";
import { extractBiaTn10MasonryCanonicalParametersV1 } from "../../lib/estimate/ownedDomain/masonryBiaTn10ProductionBindingV1";
import { extractConcretePlacementCanonicalParametersR1 } from "../../lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { extractStripFoundationReinforcementCanonicalParametersR1 } from "../../lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1";
import { extractAnchorGroupInstallationCanonicalParametersR1 } from "../../lib/estimate/ownedDomain/anchorGroupInstallationProductionBindingR1";
import { NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID } from "../../lib/estimate/v4/domainFactory";
import { MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS } from "../../lib/estimate/v4/masonryBrickWallBiaTn10R1";

type UserQuantity = { value: string; unit: "pcs" | "m2" | "m3" | "m" | "kg" | "t" | null };
type CanonicalBaselinePlan = {
  parameters: Record<string, CanonicalEstimateParameterInputValue>;
  assumptions: string[];
  primaryMeasureParameterId: string;
};

class CanonicalBaselineContractMissingError extends Error {
  readonly missingParameterIds: string[];
  readonly parameters: Record<string, CanonicalEstimateParameterInputValue>;
  readonly userExplicitParameterIds: string[];
  readonly textExtractedParameterIds: string[];

  constructor(input: {
    message: string;
    missingParameterIds: string[];
    parameters: Record<string, CanonicalEstimateParameterInputValue>;
    userExplicitParameterIds: string[];
    textExtractedParameterIds: string[];
  }) {
    super(input.message);
    this.name = "CanonicalBaselineContractMissingError";
    this.missingParameterIds = [...input.missingParameterIds];
    this.parameters = { ...input.parameters };
    this.userExplicitParameterIds = [...input.userExplicitParameterIds];
    this.textExtractedParameterIds = [...input.textExtractedParameterIds];
  }
}

export class ConsumerCanonicalBaselineNeedsParametersError extends Error {
  readonly session: CanonicalParameterSession;

  constructor(message: string, session: CanonicalParameterSession) {
    super(message);
    this.name = "ConsumerCanonicalBaselineNeedsParametersError";
    this.session = session;
  }
}

const BIA_TN10_MASONRY_CATALOG_IDS = new Set<string>(
  MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS,
);

const BROAD_ASPHALT_IDENTITIES = new Set([
  "asphalt_concrete_pavement",
  "asphalt_concrete_pavement_preliminary_boq_expanded_complex_v1",
  "asphalt_concrete_surface",
  "asphalt_paving",
  "canonical-work:expanded:asphalt_concrete_pavement",
]);

const CANONICAL_PROJECT_SCOPE_BY_ASPHALT_SCOPE: Readonly<Record<AsphaltScopeSelectionIdV5, string>> = {
  ROAD_SURFACING_ONLY: "SURFACING_ONLY",
  FULL_PAVEMENT_STRUCTURE: "PAVEMENT_STRUCTURE",
  FULL_ROAD_INFRASTRUCTURE: "FULL_ROAD_INFRASTRUCTURE",
  ROAD_REPAIR_REHABILITATION: "REHABILITATION",
  NEW_PARKING_FULL_CONSTRUCTION: "TURNKEY_PARKING_WITH_SITE_FEATURES",
  PAVEMENT_ON_CONFIRMED_PREPARED_BASE: "SURFACING_ONLY",
  OVERLAY_EXISTING_PAVEMENT: "REHABILITATION",
  LOCAL_REPAIR_OR_MILLING: "REHABILITATION",
};

const ASPHALT_INFRASTRUCTURE_SCOPE = new Set<AsphaltScopeSelectionIdV5>([
  "FULL_ROAD_INFRASTRUCTURE",
  "NEW_PARKING_FULL_CONSTRUCTION",
]);

function applyExplicitAsphaltScopeInputs(input: {
  values: Record<string, CanonicalEstimateParameterInputValue>;
  schemaIds: ReadonlySet<string>;
  selectedRoadScope: AsphaltScopeSelectionIdV5;
}): void {
  input.values.project_scope = CANONICAL_PROJECT_SCOPE_BY_ASPHALT_SCOPE[input.selectedRoadScope];
  // Scope choice is itself user input. Keep the cumulative definition in
  // explicit-scope mode and resolve only the child-package switches that the
  // selected scope unambiguously includes or excludes.
  if (input.schemaIds.has("estimate_scope_mode")) {
    input.values.estimate_scope_mode = "MINIMAL_EXPLICIT_SCOPE";
  }
  const includesRoadInfrastructure = ASPHALT_INFRASTRUCTURE_SCOPE.has(input.selectedRoadScope);
  for (const parameterId of [
    "curb_required",
    "drainage_required",
    "marking_required",
    "signing_required",
    "lighting_required",
  ]) {
    if (input.schemaIds.has(parameterId)) input.values[parameterId] = includesRoadInfrastructure;
  }
  // A general road/pavement choice never silently enables bridge works.
  if (input.schemaIds.has("bridge_deck_package_required")) {
    input.values.bridge_deck_package_required = false;
  }
  if (input.schemaIds.has("parking_geometry_required")) {
    input.values.parking_geometry_required = input.selectedRoadScope === "NEW_PARKING_FULL_CONSTRUCTION";
  }
  // Accessibility is project/regulation-specific, not implied by merely
  // choosing a parking construction scope; leave it for an explicit answer.
}

export function isConsumerCanonicalBroadAsphaltIdentity(value: string | null | undefined): boolean {
  return BROAD_ASPHALT_IDENTITIES.has(String(value ?? "").trim());
}

export function isConsumerCanonicalBroadAsphaltCatalog(
  catalog: Pick<CanonicalEstimateCatalogItem, "catalogId" | "workKey">,
): boolean {
  return isConsumerCanonicalBroadAsphaltIdentity(catalog.catalogId) ||
    isConsumerCanonicalBroadAsphaltIdentity(catalog.workKey);
}

function explicitAsphaltPromptInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
  selectedRoadScope?: AsphaltScopeSelectionIdV5 | null;
}): Record<string, CanonicalEstimateParameterInputValue> | null {
  const exactRelatedProfile =
    getAsphaltRelatedProfileByCatalogRecordIdV4(input.catalog.catalogId)
    ?? getAsphaltRelatedProfileByCanonicalWorkKeyV4(input.catalog.workKey);
  if (!isConsumerCanonicalBroadAsphaltCatalog(input.catalog) && !exactRelatedProfile) return null;
  const schemaIds = new Set(input.catalog.parameterSchema.map((parameter) => parameter.parameterId));
  const extracted = extractAsphaltUserFactsV4(input.prompt);
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const userFact of extracted.facts) {
    const key = userFact.fact_id.match(/^asphalt:raw-input:(.+):v4$/u)?.[1] ?? "";
    if (!key || !schemaIds.has(key) || Array.isArray(userFact.value)) continue;
    if (["string", "number", "boolean"].includes(typeof userFact.value)) {
      values[key] = userFact.value as CanonicalEstimateParameterInputValue;
    }
  }
  const length = Number(values.length_m);
  const width = Number(values.width_m);
  if (
    exactRelatedProfile != null
    && !isConsumerCanonicalBroadAsphaltCatalog(input.catalog)
    && schemaIds.has("area_m2")
    && values.area_m2 == null
    && Number.isFinite(length)
    && Number.isFinite(width)
    && length > 0
    && width > 0
  ) {
    // The backend definition may carry a visible example area. A prompt-owned
    // L × B measurement must override that example with its deterministic
    // derived area; otherwise a 200 × 32 m bridge can silently become 640 m².
    values.area_m2 = String(Math.round((length * width + Number.EPSILON) * 1_000_000) / 1_000_000);
  }
  if (input.selectedRoadScope) {
    if (!schemaIds.has("project_scope")) {
      throw new Error(`CANONICAL_SCOPE_PARAMETER_MISSING:${input.catalog.catalogId}`);
    }
    applyExplicitAsphaltScopeInputs({
      values,
      schemaIds,
      selectedRoadScope: input.selectedRoadScope,
    });
  }
  return values;
}

function explicitAsphaltDrainagePromptInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> | null {
  if (input.catalog.catalogId !== R4_A10_ASPHALT_DRAINAGE_CATALOG_ID) return null;
  const schemaIds = new Set(input.catalog.parameterSchema.map((parameter) => parameter.parameterId));
  const parsed = parseR4A10AsphaltDrainagePrompt(input.prompt);
  // The cumulative professional successor owns the same prompt fact under
  // length_m, while the original drainage owner called it route_length_m.
  // Adapt the explicit fact to the selected schema; never manufacture a
  // second length or carry an unknown legacy parameter into validation.
  if (parsed.route_length_m != null
    && !schemaIds.has("route_length_m")
    && schemaIds.has("length_m")) {
    parsed.length_m = parsed.route_length_m;
  }
  return Object.fromEntries(Object.entries(parsed).filter(([parameterId]) => schemaIds.has(parameterId)));
}

function explicitRicsNrm2FormworkPromptInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> | null {
  const extracted = extractRicsNrm2FormworkCanonicalParametersV1(input.prompt);
  const schemaIds = new Set(input.catalog.parameterSchema.map((parameter) => parameter.parameterId));
  if (!extracted || !schemaIds.has("measured_formwork_contact_area_m2")) return null;
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const [parameterId, value] of Object.entries(extracted)) {
    if (schemaIds.has(parameterId)) values[parameterId] = value;
  }
  return values;
}

function explicitFormworkFramiXlifePromptInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> | null {
  const extracted = extractFormworkFramiXlifeCanonicalParametersR1({
    catalogId: input.catalog.catalogId,
    text: input.prompt,
  });
  if (!extracted) return null;
  const schemaIds = new Set(input.catalog.parameterSchema.map((parameter) => parameter.parameterId));
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const [parameterId, value] of Object.entries(extracted)) {
    if (schemaIds.has(parameterId)) values[parameterId] = value;
  }
  return values;
}

function explicitBiaTn10MasonryPromptInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> | null {
  if (!BIA_TN10_MASONRY_CATALOG_IDS.has(input.catalog.catalogId)) return null;
  const extracted = extractBiaTn10MasonryCanonicalParametersV1(input.prompt);
  if (!extracted) return null;
  const schemaIds = new Set(input.catalog.parameterSchema.map((parameter) => parameter.parameterId));
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const [parameterId, value] of Object.entries(extracted)) {
    if (schemaIds.has(parameterId)) values[parameterId] = value;
  }
  return values;
}

function explicitConcretePlacementPromptInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> | null {
  const extracted = extractConcretePlacementCanonicalParametersR1({
    catalogId: input.catalog.catalogId,
    text: input.prompt,
  });
  if (!extracted) return null;
  const schemaIds = new Set(input.catalog.parameterSchema.map((parameter) => parameter.parameterId));
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const [parameterId, value] of Object.entries(extracted)) {
    if (schemaIds.has(parameterId)) values[parameterId] = value;
  }
  return values;
}

function explicitStripFoundationReinforcementPromptInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> | null {
  const extracted = extractStripFoundationReinforcementCanonicalParametersR1({
    catalogId: input.catalog.catalogId,
    text: input.prompt,
  });
  if (!extracted) return null;
  const schemaIds = new Set(input.catalog.parameterSchema.map((parameter) => parameter.parameterId));
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const [parameterId, value] of Object.entries(extracted)) {
    if (schemaIds.has(parameterId)) values[parameterId] = value;
  }
  return values;
}

function explicitAnchorGroupInstallationPromptInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> | null {
  const extracted = extractAnchorGroupInstallationCanonicalParametersR1({
    catalogId: input.catalog.catalogId,
    text: input.prompt,
  });
  if (!extracted) return null;
  const schemaIds = new Set(input.catalog.parameterSchema.map((parameter) => parameter.parameterId));
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const [parameterId, value] of Object.entries(extracted)) {
    if (schemaIds.has(parameterId)) values[parameterId] = value;
  }
  return values;
}

type PromptParameterRule = {
  parameterIds: readonly string[];
  pattern: RegExp;
};

export const R4_A10_STRIP_FOUNDATION_CATALOG_ID = "canonical-work:expanded:strip_foundation";
export const R4_A13_BULKHEAD_FRAME_CATALOG_ID =
  "canonical-work:base:drywall_ceiling_interior_bulkhead_frame_standard";
export const R4_A13_BULKHEAD_FRAME_PRIMARY_MEASURE_PARAMETER_ID = "area_m2";

const PROMPT_PARAMETER_RULES: readonly PromptParameterRule[] = [
  {
    parameterIds: ["route_length_m", "cable_length_m"],
    pattern: /(?:длин[а-яё]*\s+)?(?:кабельн[а-яё]*\s+)?трасс[а-яё]*\s*(\d+(?:[,.]\d+)?)\s*(?:м(?:етр[а-яё]*)?)(?![\p{L}\p{N}])/iu,
  },
  {
    parameterIds: ["outlet_count"],
    pattern: /(\d+(?:[,.]\d+)?)\s*розет[а-яё]*/iu,
  },
  {
    parameterIds: ["switch_count"],
    pattern: /(\d+(?:[,.]\d+)?)\s*выключател[а-яё]*/iu,
  },
  {
    parameterIds: ["lighting_point_count"],
    pattern: /(\d+(?:[,.]\d+)?)\s*(?:точ[а-яё]*\s+)?освещен[а-яё]*/iu,
  },
] as const;

const DERIVED_QUANTITY_PARAMETER = /(?:^quantity_|^unit_price_|(?:^|_)(?:compacted_volume|coverage_area|work_quantity|factor|coefficient|calculated|derived|consumption_total|material_m3|labor_man_hours|machine_hours|trip_count|service_count|test_count|test_frequency|test_interval|inspection_interval|control_interval|protocol_count|documentation_count|productivity)(?:_|$))/iu;
const DIRECT_USER_QUANTITY_SOURCE = new Set([
  "USER_MEASURED",
  "USER_DECLARED",
  "USER_INPUT",
  "PROJECT_SPECIFIC_INPUT",
  "USER_INPUT_REQUIRED",
  "PROJECT_DOCUMENTATION",
  "ENGINEERING_DESIGN",
  "SITE_SURVEY",
  // A visible baseline is only a pre-filled value. USER_INPUT remains the
  // owner, so an explicit value in the current request must replace it.
  "VISIBLE_BASELINE_ASSUMPTION",
]);

export function extractUserQuantity(prompt: string): UserQuantity | null {
  const normalizedPrompt = prompt
    .replace(/м²/giu, "м2")
    .replace(/м³/giu, "м3")
    .replace(/(?:кв(?:адратн[\p{L}]*)?\.?\s*м(?:етр[\p{L}]*)?)/giu, "м2")
    .replace(/(?:куб(?:ическ[\p{L}]*)?\.?\s*м(?:етр[\p{L}]*)?)/giu, "м3");
  const match = /(?<![\p{L}\p{N}])(\d+(?:[,.]\d+)?)\s*(штук(?:а|и)?|шт\.?|м2|м3|м|кг|тонн(?:а|ы)?|т)(?![\p{L}\p{N}])/iu.exec(normalizedPrompt);
  if (!match) return null;
  const rawUnit = match[2]
    .toLocaleLowerCase("ru-RU")
    .replace("²", "2")
    .replace("³", "3")
    .replace(/[.\s]+/gu, "");
  const unit = /^шт|^штук/u.test(rawUnit) ? "pcs"
    : rawUnit === "м2" || rawUnit.startsWith("кв") || rawUnit.startsWith("квадратн") ? "m2"
      : rawUnit === "м3" || rawUnit.startsWith("куб") || rawUnit.startsWith("кубическ") ? "m3"
        : rawUnit === "м" ? "m"
          : rawUnit === "кг" ? "kg"
            : rawUnit === "т" || rawUnit.startsWith("тонн") ? "t"
              : null;
  return { value: match[1].replace(",", "."), unit };
}

function parameterAcceptsQuantity(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
  quantity: UserQuantity,
): boolean {
  if (parameter.valueType !== "decimal" && parameter.valueType !== "integer") return false;
  if (parameter.visibilityRole != null && parameter.visibilityRole !== "USER_INPUT") return false;
  if (parameter.valueSourceRole != null && !DIRECT_USER_QUANTITY_SOURCE.has(String(parameter.valueSourceRole))) return false;
  const identity = `${parameter.parameterId} ${parameter.semanticParameterKey ?? ""} ${parameter.titleRu}`.toLocaleLowerCase("ru-RU");
  if (DERIVED_QUANTITY_PARAMETER.test(identity)) return false;
  const isCount = /количеств|число|count|quantity|qty/u.test(identity);
  if (quantity.unit === "pcs") return isCount || /шт|сва|тумб/u.test(identity);
  const rawUnit = String(parameter.unitId ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace("²", "2")
    .replace("³", "3")
    .replace(/[.\s]+/gu, "");
  const unit: UserQuantity["unit"] = rawUnit === "m2" || rawUnit === "м2" || rawUnit === "sqm" || rawUnit === "sq_m"
    ? "m2"
    : rawUnit === "m3" || rawUnit === "м3" || rawUnit === "cbm"
      ? "m3"
      : rawUnit === "m" || rawUnit === "м"
        ? "m"
        : rawUnit === "kg" || rawUnit === "кг"
          ? "kg"
          : rawUnit === "t" || rawUnit === "т"
            ? "t"
            : rawUnit === "pcs" || rawUnit === "pc" || rawUnit === "шт"
              ? "pcs"
              : null;
  return quantity.unit != null && unit === quantity.unit;
}

function quantityParameterScore(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
  quantity: UserQuantity,
): number | null {
  if (!parameterAcceptsQuantity(parameter, quantity)) return null;
  const parameterId = parameter.parameterId.toLocaleLowerCase("en-US");
  const semanticKey = String(parameter.semanticParameterKey ?? parameter.parameterId).toLocaleLowerCase("en-US");
  const exactSourceByUnit: Record<Exclude<UserQuantity["unit"], null>, RegExp> = {
    m2: /^(?:area_m2|(?:work|surface|floor|wall|roof|parking|paving|site)_area_m2)$/u,
    m3: /^(?:volume_m3|(?:work|excavation|fill|concrete)_volume_m3)$/u,
    m: /^(?:length_m|(?:work|route|pipeline|cable)_length_m)$/u,
    kg: /^(?:weight_kg|mass_kg)$/u,
    t: /^(?:weight_t|mass_t)$/u,
    pcs: /^(?:count|quantity|qty)$/u,
  };
  // semanticParameterKey is namespaced in cumulative definitions. The plain
  // parameter id remains the authoritative discriminator between the primary
  // work area and secondary areas such as protected_area_m2.
  if (quantity.unit != null && exactSourceByUnit[quantity.unit].test(parameterId)) return 140;
  if (quantity.unit != null && exactSourceByUnit[quantity.unit].test(semanticKey)) return 120;
  if (/(?:^|_)(?:area|volume|length|count|quantity|qty|weight|mass)(?:_|$)/u.test(semanticKey)) return 80;
  return 20;
}

function baselineValue(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
): CanonicalEstimateParameterInputValue | undefined {
  if (parameter.defaultValue != null) {
    return parameter.defaultValue as CanonicalEstimateParameterInputValue;
  }
  return undefined;
}

function promptOwnedNamedParameters(
  schema: CanonicalEstimateCatalogItem["parameterSchema"],
  prompt: string,
): Record<string, CanonicalEstimateParameterInputValue> {
  const byId = new Map(schema.map((parameter) => [parameter.parameterId, parameter]));
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const rule of PROMPT_PARAMETER_RULES) {
    const parameterId = rule.parameterIds.find((candidate) => byId.has(candidate));
    if (!parameterId) continue;
    const parameter = byId.get(parameterId)!;
    if ((parameter.valueType !== "decimal" && parameter.valueType !== "integer")
      || (parameter.visibilityRole != null && parameter.visibilityRole !== "USER_INPUT")
      || (parameter.valueSourceRole != null
        && !DIRECT_USER_QUANTITY_SOURCE.has(String(parameter.valueSourceRole)))) continue;
    const match = rule.pattern.exec(prompt);
    if (!match) continue;
    values[parameterId] = match[1].replace(",", ".");
  }
  return values;
}

/**
 * Extracts only facts that are both explicit in the request and present in
 * the selected definition schema. This is the shared ingress for narrow
 * professional owners; it never supplies a project/product fact merely
 * because another fixture or an approved baseline happens to contain one.
 */
export function extractPromptOwnedProfessionalParameters(
  schema: CanonicalEstimateCatalogItem["parameterSchema"],
  prompt: string,
): Record<string, CanonicalEstimateParameterInputValue> {
  const byId = new Map(schema.map((parameter) => [parameter.parameterId, parameter]));
  const values = promptOwnedNamedParameters(schema, prompt);
  const normalized = prompt.normalize("NFKC").replace(/\u00a0/gu, " ");
  const assign = (
    candidateIds: readonly string[],
    value: CanonicalEstimateParameterInputValue | undefined,
  ): void => {
    if (value == null || value === "") return;
    const matching = candidateIds.filter((parameterId) => byId.has(parameterId));
    if (matching.length === 1) values[matching[0]] = value;
  };
  const number = (pattern: RegExp): string | undefined =>
    pattern.exec(normalized)?.[1]?.replace(",", ".");
  const text = (pattern: RegExp): string | undefined => pattern.exec(normalized)?.[1]?.trim();

  assign([
    "pile_count", "anchor_group_count", "element_count_piece", "count", "radiator_count",
    "system_count", "sprinkler_count", "luminaire_count", "splice_count", "detector_count",
    "pump_count", "boiler_count", "joint_count", "rack_count",
  ], number(/количеств\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:шт(?:\.|ук\p{L}*)?)/iu));
  assign(
    ["total_installed_mass_t"],
    number(/(?:общ\p{L}*\s+)?масс\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:т|тонн\p{L}*)(?![\p{L}\p{N}])/iu),
  );
  assign(["pile_diameter_mm"], number(/диаметр\p{L}*\s*(\d+(?:[,.]\d+)?)\s*мм/iu));
  assign(["pile_length_m"], number(/длин\p{L}*\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}²³])/iu));
  assign(["bolts_per_group"], number(/по\s+(\d+(?:[,.]\d+)?)\s+болт\p{L}*/iu));
  const anchorSize = text(/(?:болт\p{L}*\s+)?(М\s*\d+)\s+класс\p{L}*\s+(\d+(?:[,.]\d+)?)/iu);
  const anchorClass = /(?:болт\p{L}*\s+)?М\s*\d+\s+класс\p{L}*\s+(\d+(?:[,.]\d+)?)/iu.exec(normalized)?.[1];
  if (anchorSize && anchorClass) {
    assign(["anchor_bolt_designation"], `${anchorSize.replace(/\s+/gu, "").replace("М", "M")} class ${anchorClass.replace(",", ".")}`);
  }
  assign(["structure_volume_m3"], number(/объ[её]м\p{L}*\s+конструкц\p{L}*\s*(\d+(?:[,.]\d+)?)\s*м[³3]/iu));
  if (/BBS\s+подтвержден\p{L}*/iu.test(normalized)) {
    assign(["bbs_confirmation_state"], "CONFIRMED_SUMMARY_NOT_ATTACHED");
  }
  assign(
    ["average_thickness_mm", "existing_screed_thickness_mm", "layer_thickness_mm", "steel_thickness_mm"],
    number(/толщин\p{L}*\s*(\d+(?:[,.]\d+)?)\s*мм/iu),
  );
  const format = /формат\p{L}*\s*(\d+(?:[,.]\d+)?)\s*[xх×*]\s*(\d+(?:[,.]\d+)?)\s*мм/iu.exec(normalized);
  if (format) {
    assign(["tile_length_mm"], format[1].replace(",", "."));
    assign(["tile_width_mm"], format[2].replace(",", "."));
  }
  assign(["joint_width_mm"], number(/шов\p{L}*\s*(\d+(?:[,.]\d+)?)\s*мм/iu));
  assign(["load_class"], text(/класс\p{L}*\s+нагрузк\p{L}*\s*([A-F]\s*\d{3})/iu)?.replace(/\s+/gu, ""));

  const diameterAndWall = /(?:[Ø⌀]\s*)?(\d+(?:[,.]\d+)?)\s*[xх×*]\s*(\d+(?:[,.]\d+)?)\s*мм/iu.exec(normalized);
  if (diameterAndWall) {
    assign(["outside_diameter_mm"], diameterAndWall[1].replace(",", "."));
    assign(["wall_thickness_mm"], diameterAndWall[2].replace(",", "."));
  }
  assign(
    ["pipe_outside_diameter_mm", "outside_diameter_mm"],
    number(/[Ø⌀]\s*(\d+(?:[,.]\d+)?)\s*мм/iu),
  );
  assign(["pipe_material_grade"], /ПЭ\s*100|PE\s*100/iu.test(normalized) ? "PE100"
    : /ПВХ|PVC(?:-U)?/iu.test(normalized) ? "PVC-U" : undefined);
  assign(["pipe_sdr"], text(/\b(SDR\s*\d+(?:[,.]\d+)?)\b/iu)?.replace(/\s+/gu, "").toUpperCase());
  assign(["pressure_class"], text(/\b(PN\s*\d+(?:[,.]\d+)?)\b/iu)?.replace(/\s+/gu, "").toUpperCase());
  assign(["ring_stiffness_class"], text(/\b(SN\s*\d+)\b/iu)?.replace(/\s+/gu, "").toUpperCase());
  assign(["slope_m_per_m"], number(/уклон\p{L}*\s*(\d+(?:[,.]\d+)?)/iu));
  if (/перфорир\p{L}*/iu.test(normalized)) assign(["perforation_type"], "перфорированная");
  assign(["geotextile_areal_density_g_m2"], number(/геотекстил\p{L}*\s*(\d+(?:[,.]\d+)?)\s*г\s*\/\s*м[²2]/iu));
  assign(["aggregate_fraction"], text(/щеб[её]н\p{L}*\s*(\d+\s*[–—-]\s*\d+\s*мм)/iu)?.replace(/\s+/gu, " "));

  const radiatorSize = /(\d+(?:[,.]\d+)?)\s*[xх×*]\s*(\d+(?:[,.]\d+)?)\s*мм/iu.exec(normalized);
  if (radiatorSize && byId.has("radiator_height_mm") && byId.has("radiator_length_mm")) {
    values.radiator_height_mm = radiatorSize[1].replace(",", ".");
    values.radiator_length_mm = radiatorSize[2].replace(",", ".");
  }
  assign(["radiator_type"], text(/радиатор\p{L}*\s+тип\p{L}*\s*(\d+)/iu));
  if (/нижн\p{L}*\s+подключен\p{L}*/iu.test(normalized)) {
    assign(["connection_type"], "нижнее подключение");
  }
  assign(["airtightness_class"], text(/класс\p{L}*\s+герметичност\p{L}*\s*([A-DА-Г])/iu)?.toUpperCase());
  assign(["cooling_capacity_kw", "thermal_power_kw"], number(/(\d+(?:[,.]\d+)?)\s*кВт/iu));
  assign(["route_length_each_m"], number(/длин\p{L}*\s+трасс\p{L}*\s+кажд\p{L}*\s+комплект\p{L}*\s*(\d+(?:[,.]\d+)?)\s*м/iu));
  assign(["line_count"], number(/(\d+(?:[,.]\d+)?)\s+лини\p{L}*/iu));

  assign(["k_factor"], number(/\bK\s*(\d+(?:[,.]\d+)?)/iu));
  assign(["temperature_rating_c"], number(/(\d+(?:[,.]\d+)?)\s*°\s*C/iu));
  assign(["thread_size_inch"], text(/резьб\p{L}*\s*(\d+\s*\/\s*\d+)/iu)?.replace(/\s+/gu, ""));
  const cableSection = /(\d+)\s*[xх×*]\s*(\d+(?:[,.]\d+)?)\s*мм[²2]/iu.exec(normalized);
  if (cableSection) {
    assign(["core_count"], cableSection[1]);
    assign(["conductor_area_mm2"], cableSection[2].replace(",", "."));
  }
  if (/ВВГнг\s*\(А\)\s*-?\s*LS/iu.test(normalized)) assign(["cable_mark"], "ВВГнг(А)-LS");
  assign(["rated_power"], number(/(\d+(?:[,.]\d+)?)\s*Вт/iu) ? `${number(/(\d+(?:[,.]\d+)?)\s*Вт/iu)}_W` : undefined);
  assign(["ingress_protection"], text(/\b(IP\s*\d{2})\b/iu)?.replace(/\s+/gu, "").toUpperCase());
  if (/накладн\p{L}*\s+монтаж\p{L}*/iu.test(normalized)) assign(["mounting_type"], "SURFACE");
  if (/U\s*\/\s*UTP\s+Cat\.?\s*6\s+LSZH/iu.test(normalized)) {
    assign(["cable_type"], "U_UTP_CAT6_4PAIR_LSZH");
  }
  if (/SM\s+G\.?652D/iu.test(normalized)) assign(["fiber_standard"], "SM_G652D");
  if (/адресн\p{L}*\s+дымов\p{L}*\s+пожарн\p{L}*\s+извещател\p{L}*/iu.test(normalized)) {
    assign(["detector_type"], "ADDRESSABLE_OPTICAL_SMOKE");
    if (/с\s+баз\p{L}*/iu.test(normalized)) {
      assign(["base_type"], "MATCHED_ADDRESSABLE_DETECTOR_BASE");
    }
  }
  assign(["design_flow_m3_h"], number(/(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*ч/iu));
  assign(["design_head_m"], number(/напор\p{L}*\s*(\d+(?:[,.]\d+)?)\s*м/iu));
  if (/природн\p{L}*\s+газ\p{L}*/iu.test(normalized)) assign(["fuel_type"], "NATURAL_GAS");
  assign(["steel_grade"], text(/сталь\p{L}*\s+([\dА-ЯA-Z]+)(?=\s|,|;|$)/iu));
  assign(["rack_height_u"], number(/(\d+(?:[,.]\d+)?)\s*U\b/iu));
  assign(["rack_depth_mm"], number(/глубин\p{L}*\s*(\d+(?:[,.]\d+)?)\s*мм/iu));

  const concreteClass = text(/(?:бетон\p{L}*\s+)?\b(B\s*\d+)\b/iu)?.replace(/\s+/gu, "").toUpperCase();
  const watertightness = text(/\b(W\s*\d+)\b/iu)?.replace(/\s+/gu, "").toUpperCase();
  const frostResistance = text(/\b(F\s*\d+)\b/iu)?.replace(/\s+/gu, "").toUpperCase();
  const mobility = text(/(?:^|[^\p{L}\p{N}])(?:P|П)\s*(\d+)(?![\p{L}\p{N}])/iu);
  assign(["concrete_class"], concreteClass);
  assign(["watertightness"], watertightness);
  assign(["frost_resistance"], frostResistance);
  assign(["mobility"], mobility ? `P${mobility}` : undefined);
  if (/подач\p{L}*\s+бетононасос\p{L}*/iu.test(normalized)) assign(["placement_method"], "pump");

  return values;
}

function promptNumber(prompt: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(prompt);
  return match?.[1]?.replace(",", ".");
}

function promptBoolean(prompt: string, subject: RegExp): boolean | undefined {
  const negative = new RegExp(`${subject.source}[^.;]{0,40}(?:не\\s+вход|нет|исключ)`, "iu");
  if (negative.test(prompt)) return false;
  const positive = new RegExp(`${subject.source}[^.;]{0,40}(?:вход|да|включ)`, "iu");
  return positive.test(prompt) ? true : undefined;
}

function promptReference(prompt: string, label: RegExp): string | undefined {
  const match = prompt.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"));
  return match?.[1]?.trim() || undefined;
}

/**
 * Parses only dimensions whose semantic target is explicit. Generic
 * "100 m long and 20 m wide" can describe the building and must remain a
 * clarification, never strip geometry.
 */
export function parseR4A10StripFoundationPrompt(
  prompt: string,
): Record<string, CanonicalEstimateParameterInputValue> {
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  const numeric: Readonly<Record<string, RegExp>> = {
    total_axis_length_m: /(?:суммарн\p{L}*\s+длин\p{L}*\s+(?:по\s+оси\s+)?лент\p{L}*|длин\p{L}*\s+(?:самой\s+)?лент\p{L}*)\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    strip_width_m: /ширин\p{L}*\s+(?:самой\s+)?лент\p{L}*\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    strip_height_m: /(?:высот\p{L}*|глубин\p{L}*)\s+(?:бетонн\p{L}*\s+)?лент\p{L}*\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    preparation_thickness_m: /толщин\p{L}*\s+(?:бетонн\p{L}*\s+)?подготовк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    concrete_order_allowance_percent: /запас\p{L}*\s+бетонн\p{L}*\s+смес\p{L}*\s*(\d+(?:[,.]\d+)?)\s*%/iu,
    reinforcement_mass_t: /масс\p{L}*\s+арматур\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:т|тонн\p{L}*)/iu,
    binding_wire_mass_kg: /масс\p{L}*\s+(?:вязальн\p{L}*\s+)?проволок\p{L}*\s*(\d+(?:[,.]\d+)?)\s*кг/iu,
    formwork_transport_mass_t: /транспортн\p{L}*\s+масс\p{L}*\s+опалубк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:т|тонн\p{L}*)/iu,
    concrete_delivery_distance_km: /(?:расстоян\p{L}*\s+)?доставк\p{L}*\s+бетонн\p{L}*\s+смес\p{L}*\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    reinforcement_delivery_distance_km: /(?:расстоян\p{L}*\s+)?доставк\p{L}*\s+арматур\p{L}*\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    formwork_delivery_distance_km: /(?:расстоян\p{L}*\s+)?доставк\p{L}*\s+опалубк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    excavation_volume_m3: /объ[её]м\p{L}*\s+(?:разработк\p{L}*|выемк\p{L}*)\s+грунт\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:м3|м³)/iu,
    foundation_bedding_volume_m3: /объ[её]м\p{L}*\s+(?:материал\p{L}*\s+)?подушк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:м3|м³)/iu,
    bedding_delivery_distance_km: /(?:расстоян\p{L}*\s+)?доставк\p{L}*\s+(?:материал\p{L}*\s+)?подушк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    waterproofing_area_m2: /площад\p{L}*\s+гидроизоляц\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:м2|м²)/iu,
    backfill_volume_m3: /объ[её]м\p{L}*\s+обратн\p{L}*\s+засыпк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:м3|м³)/iu,
    excavated_soil_density_t_m3: /плотност\p{L}*\s+(?:вывозим\p{L}*\s+)?грунт\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:т\/м3|т\/м³)/iu,
    soil_disposal_distance_km: /расстоян\p{L}*\s+вывоз\p{L}*\s+грунт\p{L}*\s*(\d+(?:[,.]\d+)?)\s*км/iu,
  };
  for (const [parameterId, pattern] of Object.entries(numeric)) {
    const value = promptNumber(prompt, pattern);
    if (value !== undefined) values[parameterId] = value;
  }
  if (values.total_axis_length_m == null) {
    const directlyScopedLength = promptNumber(
      prompt,
      /ленточн\p{L}*\s+фундамент\p{L}*\s*[:=,-]?\s*(\d+(?:[,.]\d+)?)\s*(?:м(?![\p{L}\p{N}²³])|метр\p{L}*)(?=\s*(?:$|[.;]))/iu,
    );
    if (directlyScopedLength !== undefined) values.total_axis_length_m = directlyScopedLength;
  }
  const booleans: Readonly<Record<string, RegExp>> = {
    preparation_included: /бетонн\p{L}*\s+подготовк\p{L}*/iu,
    groundworks_included: /(?:землян\p{L}*\s+работ\p{L}*|разработк\p{L}*\s+грунт\p{L}*)/iu,
    foundation_bedding_included: /подушк\p{L}*\s+основан\p{L}*/iu,
    waterproofing_included: /гидроизоляц\p{L}*/iu,
    backfill_included: /обратн\p{L}*\s+засыпк\p{L}*/iu,
    soil_disposal_included: /вывоз\p{L}*\s+(?:лишн\p{L}*\s+)?грунт\p{L}*/iu,
  };
  for (const [parameterId, subject] of Object.entries(booleans)) {
    const value = promptBoolean(prompt, subject);
    if (value !== undefined) values[parameterId] = value;
  }
  const concreteClass = prompt.match(/класс\p{L}*\s+бетон\p{L}*\s*(B(?:15|20|25|30|35|40))/iu)?.[1];
  if (concreteClass) values.concrete_class = concreteClass.toUpperCase();
  const watertightness = prompt.match(/водонепроницаемост\p{L}*\s*(W(?:2|4|6|8|10|12))/iu)?.[1];
  if (watertightness) values.watertightness = watertightness.toUpperCase();
  const frostResistance = prompt.match(/морозостойкост\p{L}*\s*(F(?:50|75|100|150|200|300))/iu)?.[1];
  if (frostResistance) values.frost_resistance = frostResistance.toUpperCase();
  const mobility = prompt.match(/подвижност\p{L}*\s+(?:смес\p{L}*\s*)?(P(?:2|3|4|5))/iu)?.[1];
  if (mobility) values.mobility = mobility.toUpperCase();
  const reinforcementSchedule = extractReinforcementBarScheduleCanonicalParametersV1(prompt);
  if (reinforcementSchedule) {
    values.reinforcement_product_profile_id = String(reinforcementSchedule.product_profile_id);
    const approvedWeightKg = Number(reinforcementSchedule.approved_reinforcement_schedule_weight_kg);
    if (Number.isFinite(approvedWeightKg) && approvedWeightKg > 0) {
      values.reinforcement_mass_t = String(approvedWeightKg / 1_000);
    }
    for (const [parameterId, value] of Object.entries(reinforcementSchedule)) {
      if (parameterId === "product_profile_id"
        || parameterId === "approved_reinforcement_schedule_weight_kg") continue;
      values[parameterId === "estimator_approval_reference"
        ? "reinforcement_estimator_approval_reference"
        : parameterId] = value;
    }
  }
  if (/(?:NRMCA\s*)?CIP\s*31/iu.test(prompt)) {
    values.product_profile_id = NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID;
    const evidenceLabels: readonly (readonly [string, RegExp])[] = [
      ["plan_volume_calculation_reference", /(?:расч[её]т\s+проектн\p{L}*\s+объ[её]м\p{L}*|plan\s+volume\s+calculation\s+reference)/iu],
      ["mix_design_or_project_specification_reference", /(?:спецификаци\p{L}*\s+бетонн\p{L}*\s+смес\p{L}*|mix\s+design\s+or\s+project\s+specification\s+reference)/iu],
      ["mixture_designation", /(?:обозначени\p{L}*\s+бетонн\p{L}*\s+смес\p{L}*|mixture\s+designation)/iu],
      ["placement_location", /(?:мест\p{L}*\s+укладк\p{L}*\s+бетон\p{L}*|placement\s+location)/iu],
      ["contingency_selection_justification", /(?:обосновани\p{L}*\s+запас\p{L}*|contingency\s+selection\s+justification)/iu],
      ["delivery_schedule_and_truck_capacity", /(?:график\p{L}*\s+поставк\p{L}*\s+и\s+вместимост\p{L}*\s+миксер\p{L}*|delivery\s+schedule\s+and\s+truck\s+capacity)/iu],
      ["producer_order_confirmation", /(?:подтверждени\p{L}*\s+заказ\p{L}*\s+производител\p{L}*|producer\s+order\s+confirmation)/iu],
      ["estimator_approval_reference", /(?:согласовани\p{L}*\s+сметчик\p{L}*|estimator\s+approval\s+reference)/iu],
    ];
    for (const [parameterId, label] of evidenceLabels) {
      const value = promptReference(prompt, label);
      if (value) values[parameterId] = value;
    }
    const placementMethod = promptReference(prompt, /(?:способ\p{L}*\s+укладк\p{L}*|placement\s+method)/iu);
    if (placementMethod) {
      const normalizedPlacement = placementMethod.toLocaleLowerCase("ru-RU");
      if (/pump|насос/iu.test(normalizedPlacement)) values.placement_method = "pump";
      else if (/crane[_\s-]*bucket|кран|бадь/iu.test(normalizedPlacement)) values.placement_method = "crane_bucket";
      else if (/direct[_\s-]*chute|лоток/iu.test(normalizedPlacement)) values.placement_method = "direct_chute";
    }
  }
  if (/материал\p{L}*\s+подушк\p{L}*[^.;]{0,30}щеб(?:е|ё)н/iu.test(prompt)) {
    values.foundation_bedding_type = "crushed_stone";
  } else if (/материал\p{L}*\s+подушк\p{L}*[^.;]{0,30}пес/iu.test(prompt)) {
    values.foundation_bedding_type = "sand";
  }
  if (/систем\p{L}*\s+гидроизоляц\p{L}*[^.;]{0,30}(?:лист|мембран)/iu.test(prompt)) {
    values.waterproofing_system = "sheet_membrane";
  } else if (/систем\p{L}*\s+гидроизоляц\p{L}*[^.;]{0,30}обмаз/iu.test(prompt)) {
    values.waterproofing_system = "bituminous_coating";
  }
  return values;
}

/** Maps a measured/developed total only to area_m2, never to a particular face. */
export function parseR4A13BulkheadFramePrompt(
  prompt: string,
): Record<string, CanonicalEstimateParameterInputValue> {
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  const normalized = prompt.normalize("NFKC").replace(/\u00a0/gu, " ");
  const numeric: Readonly<Record<string, RegExp>> = {
    horizontal_face_area_m2: /(?:площад\p{L}*\s+)?(?:низ\p{L}*|нижн\p{L}*\s+(?:горизонтальн\p{L}*\s+)?(?:част\p{L}*|гран\p{L}*)|горизонтальн\p{L}*\s+гран\p{L}*)\s*(?:короб\p{L}*\s*)?[:=]?\s*(\d+(?:[,.]\d+)?)\s*(?:м[²2]|кв(?:адратн\p{L}*)?\.?\s*м(?:етр\p{L}*)?)/iu,
    vertical_face_length_m: /(?:суммарн\p{L}*\s+)?длин\p{L}*\s+(?:вертикальн\p{L}*\s+гран\p{L}*|боковин\p{L}*)\s*(?:короб\p{L}*\s*)?[:=]?\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}²³])/iu,
    vertical_face_count: /(?:количеств\p{L}*|числ\p{L}*)\s+(?:вертикальн\p{L}*\s+гран\p{L}*|боковин\p{L}*)\s*(?:короб\p{L}*\s*)?[:=]?\s*(\d+(?:[,.]\d+)?)/iu,
    bulkhead_drop_height_m: /(?:высот\p{L}*\s+(?:опуск\p{L}*|боковин\p{L}*)|опуск\p{L}*\s+по\s+высот\p{L}*)\s*(?:короб\p{L}*\s*)?[:=]?\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}²³])/iu,
    end_face_area_m2: /(?:суммарн\p{L}*\s+)?площад\p{L}*\s+торц\p{L}*\s*(?:короб\p{L}*\s*)?[:=]?\s*(\d+(?:[,.]\d+)?)\s*(?:м[²2]|кв(?:адратн\p{L}*)?\.?\s*м(?:етр\p{L}*)?)/iu,
    return_face_area_m2: /(?:суммарн\p{L}*\s+)?площад\p{L}*\s+(?:возврат\p{L}*(?:\s+и\s+переход\p{L}*)?|переход\p{L}*)\s*(?:короб\p{L}*\s*)?[:=]?\s*(\d+(?:[,.]\d+)?)\s*(?:м[²2]|кв(?:адратн\p{L}*)?\.?\s*м(?:етр\p{L}*)?)/iu,
    opening_area_m2: /(?:суммарн\p{L}*\s+)?площад\p{L}*\s+(?:вычитаем\p{L}*\s+)?про[её]м\p{L}*\s*(?:короб\p{L}*\s*)?[:=]?\s*(\d+(?:[,.]\d+)?)\s*(?:м[²2]|кв(?:адратн\p{L}*)?\.?\s*м(?:етр\p{L}*)?)/iu,
    perimeter_length_m: /длин\p{L}*\s+(?:периметр\p{L}*(?:\s+и\s+примыкан\p{L}*)?|примыкан\p{L}*)\s+(?:короб\p{L}*\s*)?[:=]?\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}²³])/iu,
  };
  for (const [parameterId, pattern] of Object.entries(numeric)) {
    const value = promptNumber(normalized, pattern);
    if (value !== undefined) values[parameterId] = value;
  }
  const componentIds = [
    "horizontal_face_area_m2",
    "vertical_face_length_m",
    "vertical_face_count",
    "bulkhead_drop_height_m",
    "end_face_area_m2",
    "return_face_area_m2",
    "opening_area_m2",
  ] as const;
  if (componentIds.every((parameterId) => values[parameterId] != null)) {
    const developedArea = Number(values.horizontal_face_area_m2)
      + Number(values.vertical_face_length_m) * Number(values.vertical_face_count)
        * Number(values.bulkhead_drop_height_m)
      + Number(values.end_face_area_m2)
      + Number(values.return_face_area_m2)
      - Number(values.opening_area_m2);
    values.area_m2 = String(Math.round((developedArea + Number.EPSILON) * 1_000_000) / 1_000_000);
  } else if (!componentIds.some((parameterId) => values[parameterId] != null)) {
    const total = extractUserQuantity(normalized);
    if (total?.unit === "m2") values.area_m2 = total.value;
  }
  return values;
}

export function buildCanonicalBaselinePlan(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
  selectedRoadScope?: AsphaltScopeSelectionIdV5 | null;
  parameterOverrides?: Record<string, CanonicalEstimateParameterInputValue>;
}): CanonicalBaselinePlan {
  const baselineInputs: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const parameter of input.catalog.parameterSchema) {
    const value = baselineValue(parameter);
    if (value !== undefined) baselineInputs[parameter.parameterId] = value;
  }
  const submittedInputs: Record<string, CanonicalEstimateParameterInputValue> = {};
  const pumpStationInput = input.catalog.catalogId === R4_A6_PUMP_STATION_CATALOG_ID
    ? parseR4A6PumpStationPrompt(input.prompt)
    : null;
  const stripFoundationInput = input.catalog.catalogId === R4_A10_STRIP_FOUNDATION_CATALOG_ID
    ? parseR4A10StripFoundationPrompt(input.prompt)
    : null;
  const asphaltDrainageInput = explicitAsphaltDrainagePromptInputs(input);
  const asphaltRoadInput = explicitAsphaltPromptInputs(input);
  const formworkFramiXlifeInput = explicitFormworkFramiXlifePromptInputs(input);
  const concretePlacementInput = explicitConcretePlacementPromptInputs(input);
  const stripFoundationReinforcementInput =
    explicitStripFoundationReinforcementPromptInputs(input);
  const anchorGroupInstallationInput = explicitAnchorGroupInstallationPromptInputs(input);
  const ricsNrm2FormworkInput = formworkFramiXlifeInput == null
    ? explicitRicsNrm2FormworkPromptInputs(input)
    : null;
  const biaTn10MasonryInput = explicitBiaTn10MasonryPromptInputs(input);
  const bulkheadFrameInput = input.catalog.catalogId === R4_A13_BULKHEAD_FRAME_CATALOG_ID
    ? parseR4A13BulkheadFramePrompt(input.prompt)
    : null;
  const userQuantity = pumpStationInput == null && stripFoundationInput == null
    && asphaltDrainageInput == null && asphaltRoadInput == null
    && formworkFramiXlifeInput == null && ricsNrm2FormworkInput == null
    && biaTn10MasonryInput == null && concretePlacementInput == null
    && stripFoundationReinforcementInput == null
    && anchorGroupInstallationInput == null
    && bulkheadFrameInput == null
    ? extractUserQuantity(input.prompt)
    : null;
  let userQuantityParameterId: string | null = null;
  if (userQuantity) {
    const candidates = input.catalog.parameterSchema
      .map((parameter) => ({ parameter, score: quantityParameterScore(parameter, userQuantity) }))
      .filter((candidate): candidate is { parameter: CanonicalEstimateCatalogItem["parameterSchema"][number]; score: number } => candidate.score != null)
      .sort((left, right) => right.score - left.score || left.parameter.ordinal - right.parameter.ordinal);
    const target = candidates[0];
    if (target && (candidates.length === 1
      || target.score > candidates[1].score)) {
      submittedInputs[target.parameter.parameterId] = userQuantity.value;
      userQuantityParameterId = target.parameter.parameterId;
    }
  }
  Object.assign(
    submittedInputs,
    extractPromptOwnedProfessionalParameters(input.catalog.parameterSchema, input.prompt),
    pumpStationInput ?? stripFoundationInput ?? asphaltDrainageInput ?? asphaltRoadInput
      ?? formworkFramiXlifeInput ?? ricsNrm2FormworkInput ?? biaTn10MasonryInput
      ?? concretePlacementInput ?? stripFoundationReinforcementInput
      ?? anchorGroupInstallationInput
      ?? bulkheadFrameInput
      ?? {},
  );
  const textExtractedParameterIds = Object.keys(submittedInputs);
  Object.assign(submittedInputs, input.parameterOverrides ?? {});
  const userQuantityParameter = input.catalog.parameterSchema.find(
    (parameter) => parameter.parameterId === userQuantityParameterId,
  );
  const connectedUserQuantityParameterId = userQuantityParameterId
    && (userQuantityParameter?.formulaConsumers == null
      || userQuantityParameter.formulaConsumers.length > 0)
    ? userQuantityParameterId
    : null;
  const formulaConnectedPrimaryParameterId = input.catalog.parameterSchema
    .filter((parameter) => parameter.visibilityRole == null || parameter.visibilityRole === "USER_INPUT")
    .filter((parameter) => parameter.valueType === "decimal" || parameter.valueType === "integer")
    .filter((parameter) => parameter.formulaConsumers == null
      || parameter.formulaConsumers.length > 0)
    .filter((parameter) => !DERIVED_QUANTITY_PARAMETER.test(
      `${parameter.parameterId} ${parameter.semanticParameterKey ?? ""} ${parameter.titleRu}`,
    ))
    .sort((left, right) => {
      const score = (parameter: typeof left) => /^(?:area_m2|volume_m3|length_m|count|quantity|qty)$/u.test(
        String(parameter.semanticParameterKey ?? parameter.parameterId).toLocaleLowerCase("en-US"),
      ) ? 0 : 1;
      return score(left) - score(right) || left.ordinal - right.ordinal;
    })[0]?.parameterId;
  const preferredPrimaryMeasureParameterId = pumpStationInput != null
    ? R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID
    : stripFoundationInput != null
      ? "total_axis_length_m"
      : asphaltDrainageInput != null
        ? input.catalog.parameterSchema.some(
            (parameter) => parameter.parameterId === R4_A10_ASPHALT_DRAINAGE_PRIMARY_MEASURE_PARAMETER_ID,
          )
          ? R4_A10_ASPHALT_DRAINAGE_PRIMARY_MEASURE_PARAMETER_ID
          : "length_m"
        : asphaltRoadInput != null
          ? (asphaltRoadInput.area_m2 != null ? "area_m2" : asphaltRoadInput.length_m != null ? "length_m" : undefined)
        : formworkFramiXlifeInput != null || ricsNrm2FormworkInput != null
          ? "measured_formwork_contact_area_m2"
        : biaTn10MasonryInput != null
          ? "measured_net_brick_wall_area_m2"
        : concretePlacementInput != null
          ? input.catalog.parameterSchema.some(
              (parameter) => parameter.parameterId === "consolidated_concrete_volume_m3",
            )
            ? "consolidated_concrete_volume_m3"
            : input.catalog.parameterSchema.some(
                (parameter) => parameter.parameterId === "cured_concrete_volume_m3",
              )
              ? "cured_concrete_volume_m3"
              : input.catalog.parameterSchema.some(
                  (parameter) => parameter.parameterId === "leveled_concrete_volume_m3",
                )
                ? "leveled_concrete_volume_m3"
                : input.catalog.parameterSchema.some(
                    (parameter) => parameter.parameterId === "repair_scope_volume_m3",
                  )
                  ? "repair_scope_volume_m3"
                  : input.catalog.parameterSchema.some(
                      (parameter) => parameter.parameterId === "embedded_item_count_piece",
                    )
                    ? "embedded_item_count_piece"
                    : input.catalog.parameterSchema.some(
                        (parameter) => parameter.parameterId === "joint_length_m",
                      )
                      ? "joint_length_m"
                      : input.catalog.parameterSchema.some(
                          (parameter) => parameter.parameterId === "stairs_concrete_volume_m3",
                        )
                        ? "stairs_concrete_volume_m3"
              : "plan_dimension_concrete_volume_m3"
        : stripFoundationReinforcementInput != null
          ? "approved_reinforcement_schedule_weight_kg"
        : anchorGroupInstallationInput != null
          ? "anchor_bolt_quantity_piece"
        : bulkheadFrameInput != null
          ? R4_A13_BULKHEAD_FRAME_PRIMARY_MEASURE_PARAMETER_ID
    : connectedUserQuantityParameterId
    ?? formulaConnectedPrimaryParameterId;
  const preferredPrimaryParameter = input.catalog.parameterSchema.find(
    (parameter) => parameter.parameterId === preferredPrimaryMeasureParameterId,
  );
  const primaryMeasureParameterId = preferredPrimaryMeasureParameterId
    && preferredPrimaryParameter
    && (preferredPrimaryParameter?.formulaConsumers == null
      || preferredPrimaryParameter.formulaConsumers.length > 0)
    ? preferredPrimaryMeasureParameterId
    : formulaConnectedPrimaryParameterId;
  if (!primaryMeasureParameterId) throw new Error("CANONICAL_PRIMARY_MEASURE_NOT_RESOLVED");
  const validation = validateCanonicalEstimateParameterInputs({
    schema: input.catalog.parameterSchema,
    rawInputs: { ...baselineInputs, ...submittedInputs },
  });
  const schemaById = new Map(input.catalog.parameterSchema.map((parameter) => [parameter.parameterId, parameter]));
  const normalizedSubmittedInputs = Object.fromEntries(
    Object.keys(submittedInputs).flatMap((parameterId) =>
      Object.prototype.hasOwnProperty.call(validation.parameters, parameterId)
        ? [[
          parameterId,
          schemaById.get(parameterId)?.valueType === "boolean"
            ? validation.parameters[parameterId]
            : submittedInputs[parameterId],
        ]]
        : []
    ),
  ) as Record<string, CanonicalEstimateParameterInputValue>;
  const blockingIssues = canonicalEstimateBlockingParameterIssues(
    input.catalog.parameterSchema,
    validation.issues,
  );
  if (blockingIssues.length > 0) {
    const missing = blockingIssues
      .filter((issue) => issue.code === "REQUIRED" || issue.code === "REQUIRED_WHEN")
      .map((issue) => issue.parameterId);
    const message = `CANONICAL_BASELINE_CONTRACT_MISSING:${[...new Set(missing)].join(",") || blockingIssues.map((issue) => issue.code).join(",")}`;
    if (missing.length === 0) throw new Error(message);
    throw new CanonicalBaselineContractMissingError({
      message,
      missingParameterIds: [...new Set(missing)],
      // The missing-input form must evaluate the same conditional schema as
      // the canonical compile request. Keep definition defaults in the form
      // as visible assumptions, while preserving their distinct provenance
      // so they are never presented as text recognized from the user.
      parameters: validation.parameters,
      userExplicitParameterIds: Object.keys(input.parameterOverrides ?? {}),
      textExtractedParameterIds,
    });
  }
  const assumptions = input.catalog.parameterSchema
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .filter((parameter) => parameter.valueSourceRole == null || DIRECT_USER_QUANTITY_SOURCE.has(String(parameter.valueSourceRole)))
    .filter((parameter) => !DERIVED_QUANTITY_PARAMETER.test(`${parameter.parameterId} ${parameter.semanticParameterKey ?? ""} ${parameter.titleRu}`))
    .filter((parameter) => parameter.guide?.guideKind !== "DERIVED_VALUE_RULE")
    .filter((parameter) => parameter.parameterId !== userQuantityParameterId)
    .filter((parameter) => validation.parameters[parameter.parameterId] != null)
    .map((parameter) => `${parameter.titleRu}: ${String(validation.parameters[parameter.parameterId])}${parameter.unitId ? ` ${parameter.unitId}` : ""}`);
  return {
    // Persisted baseline values are merged and owned by the backend worker.
    // Sending only prompt-owned values prevents baseline assumptions and
    // derived outputs from being misclassified as user input.
    parameters: normalizedSubmittedInputs,
    primaryMeasureParameterId,
    assumptions: [
      "Исходная смета рассчитана по явно показанным базовым допущениям; их необходимо проверить перед договором.",
      ...assumptions,
    ],
  };
}

export function buildCanonicalBaselineInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
  selectedRoadScope?: AsphaltScopeSelectionIdV5 | null;
}): Record<string, CanonicalEstimateParameterInputValue> {
  return buildCanonicalBaselinePlan(input).parameters;
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export async function compileConsumerCanonicalBaseline(input: {
  catalogId: string;
  prompt: string;
  draftId: string;
  selectedRoadScope?: AsphaltScopeSelectionIdV5 | null;
  parameterOverrides?: Record<string, CanonicalEstimateParameterInputValue>;
}): Promise<ForemanAiEstimateDraftMapping> {
  const catalog = await getCanonicalEstimateCatalogItem(input.catalogId).catch((error: unknown) => {
    if (error instanceof CanonicalEstimateApiError && error.code === "NOT_FOUND") {
      throw new Error(`CANONICAL_BACKEND_DEFINITION_MISSING:${input.catalogId}`);
    }
    throw error;
  });
  let baseline: CanonicalBaselinePlan;
  try {
    baseline = buildCanonicalBaselinePlan({
      catalog,
      prompt: input.prompt,
      selectedRoadScope: input.selectedRoadScope,
      parameterOverrides: input.parameterOverrides,
    });
  } catch (error) {
    if (!(error instanceof CanonicalBaselineContractMissingError)) throw error;
    throw new ConsumerCanonicalBaselineNeedsParametersError(
      error.message,
      buildConsumerCanonicalPrecompileParameterSession({
        catalog,
        draftId: input.draftId,
        parameters: error.parameters,
        missingParameterIds: error.missingParameterIds,
        userExplicitParameterIds: error.userExplicitParameterIds,
        textExtractedParameterIds: error.textExtractedParameterIds,
      }),
    );
  }
  const parameters = baseline.parameters;
  const compileInput = {
    request: {
      idempotencyKey: `consumer-baseline-${stableId(`${input.draftId}|${catalog.releaseId}|${catalog.catalogId}|${input.prompt}|${JSON.stringify(parameters)}`)}`,
      catalogId: catalog.catalogId,
      sourceRequestText: input.prompt.trim(),
      primaryMeasureParameterId: baseline.primaryMeasureParameterId,
      parameters,
      currencyCode: "KGS",
    },
  } as const;
  let compiled: Awaited<ReturnType<typeof compileCanonicalEstimateAndLoad>> | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      compiled = await compileCanonicalEstimateAndLoad(compileInput);
      break;
    } catch (error) {
      const errorCode = error instanceof CanonicalEstimateApiError
        ? error.code
        : typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code ?? "")
          : "";
      const admissionSettling = errorCode === "DEFINITION_CONTENT_NOT_ADMITTED";
      if (admissionSettling) {
        console.info("[RikEstimateAdmission]", JSON.stringify({
          catalogId: catalog.catalogId,
          releaseId: catalog.releaseId,
          attempt: attempt + 1,
          code: errorCode,
        }));
      }
      if (!admissionSettling || attempt === 4) throw error;
      // A candidate capability and its content-admission projection can settle
      // on adjacent transactions immediately after local/staging sign-in. The
      // exact catalog read remains the fail-closed authority: it must confirm
      // the same release before an idempotent compile retry is permitted.
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * (attempt + 1)));
      await getCanonicalEstimateCatalogItem(catalog.catalogId, null, catalog.releaseId);
    }
  }
  if (!compiled) throw new Error("CANONICAL_BASELINE_COMPILE_NOT_COMPLETED");
  const estimate = adaptCanonicalRevisionToStructuredEstimate({
    catalog,
    revision: compiled.revision,
    rows: compiled.rows,
    inputText: input.prompt,
    assumptions: baseline.assumptions,
  });
  const mapping = mapAiEstimateToForemanDraft({
    estimate,
    context: {
      objectName: "Заявка на ремонт",
      levelName: "",
      systemName: "",
      zoneName: "",
      sourceScreen: "foreman_materials",
    },
    estimateRevisionId: compiled.revision.revisionId,
    estimateReleaseId: compiled.revision.releaseId,
  });
  const parity = verifyForemanAiEstimatePayloadParity(mapping);
  if (!parity.ok) throw new Error(`CANONICAL_BASELINE_PARITY_FAILED:${parity.issues.map((issue) => issue.code).join(",")}`);
  return mapping;
}
