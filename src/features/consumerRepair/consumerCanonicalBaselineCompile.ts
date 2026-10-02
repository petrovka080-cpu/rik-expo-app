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
import { createCancellableDelay } from "../../lib/async/mapWithConcurrencyLimit";
import { logger } from "../../lib/logger";
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
import {
  FILTRATION_STATION_CATALOG_ID,
  parseFiltrationStationOrdinaryPromptR1,
} from "../../lib/estimate/v4/filtrationStationR1";
import {
  CHLORINATION_STATION_CATALOG_ID,
  parseChlorinationStationOrdinaryPromptR1,
} from "../../lib/estimate/v4/chlorinationStationR1";
import {
  FLUSHING_DISINFECTION_CATALOG_ID,
  parseFlushingDisinfectionOrdinaryPromptR1,
} from "../../lib/estimate/v4/flushingDisinfectionR1";

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

const ASPHALT_GEOMETRY_FACT_SUFFIX: Readonly<Record<string, string>> = Object.freeze({
  length_m: "_length_m",
  width_m: "_width_m",
});

const ASPHALT_FACT_PARAMETER_ALIASES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  asphalt_layer_2_thickness_mm: Object.freeze(["wearing_layer_thickness_mm"]),
});

/**
 * Professional successors may namespace the same user-owned geometry fact
 * (for example `bridge_length_m`) while the shared text extractor correctly
 * emits `length_m`. Resolve that semantic alias only when the selected schema
 * exposes one unambiguous measured field. Norms, delivery distances, joints
 * and other replaceable profile values are deliberately excluded.
 */
function asphaltPromptParameterId(
  catalog: CanonicalEstimateCatalogItem,
  extractedParameterId: string,
): string | null {
  const exact = catalog.parameterSchema.find(
    (parameter) => parameter.parameterId === extractedParameterId,
  );
  if (exact) return exact.parameterId;
  const aliasCandidates = (ASPHALT_FACT_PARAMETER_ALIASES[extractedParameterId] ?? [])
    .filter((parameterId) =>
      catalog.parameterSchema.some((parameter) => parameter.parameterId === parameterId)
    );
  if (aliasCandidates.length === 1) return aliasCandidates[0];
  const suffix = ASPHALT_GEOMETRY_FACT_SUFFIX[extractedParameterId];
  if (!suffix) return null;
  const candidates = catalog.parameterSchema.filter((parameter) =>
    parameter.parameterId.endsWith(suffix)
    && (parameter.valueType === "decimal" || parameter.valueType === "integer")
    && parameter.visibilityRole === "USER_INPUT"
    && parameter.valueSourceRole === "USER_MEASURED"
    && String(parameter.unitId ?? "").toLocaleLowerCase("en-US") === "m"
    && !/(?:distance|joint|seam|perimeter|route|delivery|haul|travel)/iu.test(parameter.parameterId)
  );
  return candidates.length === 1 ? candidates[0].parameterId : null;
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
    const parameterId = key ? asphaltPromptParameterId(input.catalog, key) : null;
    if (!parameterId || Array.isArray(userFact.value)) continue;
    if (["string", "number", "boolean"].includes(typeof userFact.value)) {
      values[parameterId] = userFact.value as CanonicalEstimateParameterInputValue;
    }
  }
  const lengthParameterId = asphaltPromptParameterId(input.catalog, "length_m");
  const widthParameterId = asphaltPromptParameterId(input.catalog, "width_m");
  const length = Number(lengthParameterId ? values[lengthParameterId] : undefined);
  const width = Number(widthParameterId ? values[widthParameterId] : undefined);
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
    .replace(/m²/giu, "m2")
    .replace(/m³/giu, "m3")
    .replace(/м²/giu, "м2")
    .replace(/м³/giu, "м3")
    .replace(/(?:кв(?:адратн[\p{L}]*)?\.?\s*м(?:етр[\p{L}]*)?)/giu, "м2")
    .replace(/(?:куб(?:ическ[\p{L}]*)?\.?\s*м(?:етр[\p{L}]*)?)/giu, "м3");
  const match = /(?<![\p{L}\p{N}])(\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[,.]\d+)?|\d+(?:[,.]\d+)?)\s*(штук(?:а|и)?|шт\.?|m2|m3|м2|м3|м|кг|тонн(?:а|ы)?|т)(?![\p{L}\p{N}])/iu.exec(normalizedPrompt);
  if (!match) return null;
  const rawUnit = match[2]
    .toLocaleLowerCase("ru-RU")
    .replace("²", "2")
    .replace("³", "3")
    .replace(/[.\s]+/gu, "");
  const unit = /^шт|^штук/u.test(rawUnit) ? "pcs"
    : rawUnit === "m2" || rawUnit === "м2" || rawUnit.startsWith("кв") || rawUnit.startsWith("квадратн") ? "m2"
      : rawUnit === "m3" || rawUnit === "м3" || rawUnit.startsWith("куб") || rawUnit.startsWith("кубическ") ? "m3"
        : rawUnit === "м" ? "m"
          : rawUnit === "кг" ? "kg"
            : rawUnit === "т" || rawUnit.startsWith("тонн") ? "t"
              : null;
  return { value: match[1].replace(/[ \u00a0\u202f]/gu, "").replace(",", "."), unit };
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

type ExplicitGeometryFact = {
  semanticSuffix: "length_m" | "width_m" | "height_m" | "depth_m" | "area_m2" | "volume_m3";
  unitId: "m" | "m2" | "m3";
  value: string | undefined;
};

function schemaDrivenExplicitGeometry(
  schema: CanonicalEstimateCatalogItem["parameterSchema"],
  prompt: string,
): Record<string, CanonicalEstimateParameterInputValue> {
  const normalized = prompt.normalize("NFKC").replace(/\u00a0/gu, " ");
  const number = (pattern: RegExp): string | undefined =>
    pattern.exec(normalized)?.[1]?.replace(",", ".");
  const linearValue = (labelStem: string): string | undefined => {
    const match = new RegExp(
      String.raw`${labelStem}\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(мм|см|м(?![\p{L}\p{N}²³])|метр\p{L}*)`,
      "iu",
    ).exec(normalized);
    if (!match) return undefined;
    const raw = Number(match[1].replace(",", "."));
    if (!Number.isFinite(raw)) return undefined;
    const unit = match[2].toLocaleLowerCase("ru-RU");
    const metres = unit === "мм" ? raw / 1_000 : unit === "см" ? raw / 100 : raw;
    return String(metres);
  };
  const facts: readonly ExplicitGeometryFact[] = [
    {
      semanticSuffix: "length_m",
      unitId: "m",
      value: linearValue("длин"),
    },
    {
      semanticSuffix: "width_m",
      unitId: "m",
      value: linearValue("ширин"),
    },
    {
      semanticSuffix: "height_m",
      unitId: "m",
      value: linearValue("высот"),
    },
    {
      semanticSuffix: "depth_m",
      unitId: "m",
      value: linearValue("глубин"),
    },
    {
      semanticSuffix: "area_m2",
      unitId: "m2",
      value: number(/площад\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:м[²2]|кв(?:\.|адратн\p{L}*)?\s*метр\p{L}*)/iu),
    },
    {
      semanticSuffix: "volume_m3",
      unitId: "m3",
      value: number(/объ[её]м\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:м[³3]|куб(?:\.|ическ\p{L}*)?\s*метр\p{L}*)/iu),
    },
  ];
  const result: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const fact of facts) {
    if (fact.value == null) continue;
    const candidates = schema.filter((parameter) => {
      if (parameter.valueType !== "decimal" && parameter.valueType !== "integer") return false;
      if (String(parameter.unitId ?? "").toLocaleLowerCase("en-US") !== fact.unitId) return false;
      if (parameter.visibilityRole != null && parameter.visibilityRole !== "USER_INPUT") return false;
      if (parameter.valueSourceRole != null
        && !DIRECT_USER_QUANTITY_SOURCE.has(String(parameter.valueSourceRole))) return false;
      if (DERIVED_QUANTITY_PARAMETER.test(
        `${parameter.parameterId} ${parameter.semanticParameterKey ?? ""} ${parameter.titleRu}`,
      )) return false;
      const identity = `${parameter.parameterId} ${parameter.semanticParameterKey ?? ""}`
        .toLocaleLowerCase("en-US");
      return new RegExp(`(?:^|[_:])${fact.semanticSuffix}(?:$|\\s)`, "u").test(identity);
    });
    // A dimension label is not enough to choose between, for example, route
    // length and joint length. Only the selected schema can make it unique.
    if (candidates.length === 1) result[candidates[0].parameterId] = fact.value;
  }
  return result;
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
  const values = {
    ...schemaDrivenExplicitGeometry(schema, prompt),
    ...promptOwnedNamedParameters(schema, prompt),
  };
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
    ["luminaire_count"],
    number(/(\d+(?:[,.]\d+)?)\s+(?:накладн\p{L}*\s+)?(?:LED[-\s]*)?светильник\p{L}*/iu),
  );
  assign(
    ["breaker_count"],
    number(/(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?(?:одно|двух|тр[её]х|четыр[её]х)?полюсн\p{L}*\s*(?:автоматическ\p{L}*\s+)?(?:выключател\p{L}*|автомат\p{L}*)/iu)
      ?? number(/(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?(?:автоматическ\p{L}*\s+)?(?:выключател\p{L}*|автомат\p{L}*)/iu),
  );
  assign(
    ["rcd_count"],
    number(/(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?(?:УЗО|RCCB|RCBO|диф(?:ференциальн\p{L}*\s+)?автомат\p{L}*)/iu),
  );
  assign(
    ["detector_count"],
    number(/(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?адресн\p{L}*\s+(?:оптико[-\s]*электронн\p{L}*\s+)?дым\p{L}*\s+извещател\p{L}*/iu),
  );
  assign(
    ["pump_count"],
    number(/(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?насосн\p{L}*\s+агрегат\p{L}*/iu),
  );
  assign(
    ["boiler_count"],
    number(/(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?(?:водогрейн\p{L}*\s+)?кот[её]л\p{L}*/iu),
  );
  assign(
    ["joint_count"],
    number(/(\d+(?:[,.]\d+)?)\s*(?:шт\.?\s*)?(?:сварн\p{L}*\s+)?стык\p{L}*/iu),
  );
  const weldingProcedure = /\bWPS\s*[:=]?\s*(WPS[-_./A-Z0-9]+)/iu
    .exec(normalized)?.[1];
  assign(["welding_procedure_designation"],
    weldingProcedure?.replace(/[.,;:]+$/u, "").toLocaleUpperCase("en-US"));
  const boilerProduct = /(?:модель|марка)\s+котл\p{L}*\s*[:=]?\s*([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  const burnerProduct = /(?:модель|марка)\s+горелк\p{L}*\s*[:=]?\s*([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["boiler_product_designation"], boilerProduct?.replace(/[.,;:]+$/u, ""));
  assign(["burner_product_designation"], burnerProduct?.replace(/[.,;:]+$/u, ""));
  assign(
    ["thermal_power_kw"],
    number(/(\d+(?:[,.]\d+)?)\s*к\s*вт(?!\p{L})/iu),
  );
  if (/природн\p{L}*\s+газ/iu.test(normalized)) {
    assign(["fuel_type"], "NATURAL_GAS");
  }
  if (/(?:отдельн\p{L}*|поставляем\p{L}*)\s+модулируем\p{L}*\s+газов\p{L}*\s+горелк\p{L}*/iu
    .test(normalized)) {
    assign(["burner_configuration"], "SEPARATE_MODULATING_GAS_BURNER");
  }
  const selectedDeviceProduct = /(?:модель|марка|каталожн\p{L}*\s+обозначен\p{L}*)\s*[:=]?\s*([A-Z0-9][A-Z0-9._/-]*(?:\s+[A-Z0-9][A-Z0-9._/-]*)?)/iu
    .exec(normalized)?.[1];
  assign([
    "breaker_product_designation", "rcd_product_designation",
    "pump_unit_product_designation",
  ], selectedDeviceProduct);
  const breakerElectricalIdentity = /\b([1-4]P)\s+([BCD])\s*(\d+(?:[,.]\d+)?)\b/iu
    .exec(normalized);
  if (breakerElectricalIdentity) {
    assign(["pole_configuration"], breakerElectricalIdentity[1].toLocaleUpperCase("en-US"));
    assign(["trip_curve"], breakerElectricalIdentity[2].toLocaleUpperCase("en-US"));
    assign(["rated_current_a"], breakerElectricalIdentity[3].replace(",", "."));
  }
  const rcdElectricalIdentity = /\b([24]P)\s+(\d+(?:[,.]\d+)?)\s*A(?![\p{L}\p{N}])/iu
    .exec(normalized);
  if (rcdElectricalIdentity && byId.has("rcd_count")) {
    assign(["pole_configuration"], rcdElectricalIdentity[1].toLocaleUpperCase("en-US"));
    assign(["rated_current_a"], rcdElectricalIdentity[2].replace(",", "."));
  }
  if (/RCBO|диф(?:ференциальн\p{L}*\s+)?автомат\p{L}*/iu.test(normalized)) {
    assign(["rcd_device_type"], "RCBO");
  } else if (/RCCB|УЗО/iu.test(normalized)) {
    assign(["rcd_device_type"], "RCCB");
  }
  assign(
    ["rated_residual_current_ma"],
    number(/(\d+(?:[,.]\d+)?)\s*mA(?![\p{L}\p{N}])/iu),
  );
  const residualCurrentType = /(?:тип|type)\s*(AC|A|F|B)(?![\p{L}\p{N}])/iu
    .exec(normalized)?.[1];
  assign(["residual_current_type"], residualCurrentType?.toLocaleUpperCase("en-US"));
  const detectorProduct = /(?:модель|марка)\s+извещател\p{L}*\s*[:=]?\s*([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  const detectorBaseProduct = /(?:модель|марка)\s+баз\p{L}*\s*[:=]?\s*([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["detector_product_designation"], detectorProduct?.replace(/[.,;:]+$/u, ""));
  assign(["base_product_designation"], detectorBaseProduct?.replace(/[.,;:]+$/u, ""));
  if (byId.has("detector_count")
    && /адресн\p{L}*/iu.test(normalized)
    && /дым\p{L}*\s+извещател\p{L}*/iu.test(normalized)) {
    assign(["detector_type"], "ADDRESSABLE_OPTICAL_SMOKE");
    assign(["base_type"], "MATCHED_ADDRESSABLE_DETECTOR_BASE");
  }
  assign(
    ["design_flow_m3_h"],
    number(/\bQ\s*=\s*(\d+(?:[,.]\d+)?)\s*(?:м[³3]|m3)\s*\/\s*(?:ч|h)\b/iu),
  );
  assign(
    ["design_head_m"],
    number(/\bH\s*=\s*(\d+(?:[,.]\d+)?)\s*(?:м|m)(?![\p{L}\p{N}])/iu),
  );
  if (/на\s+(?:фундаментн\p{L}*\s+)?рам\p{L}*/iu.test(normalized)) {
    assign(["pump_configuration"], "PUMP_MOTOR_ON_BASEFRAME");
  }
  assign(
    ["breaking_capacity_ka"],
    number(/(\d+(?:[,.]\d+)?)\s*(?:кА|kA)(?![\p{L}\p{N}])/iu),
  );
  assign(
    ["rated_voltage_v"],
    number(/(\d+(?:[,.]\d+)?)\s*(?:В|V)(?![\p{L}\p{N}])/iu),
  );
  if (/(?:DIN[-\s]*(?:рейк\p{L}*|rail)|дин[-\s]*рейк\p{L}*)/iu.test(normalized)) {
    assign(["mounting_system"], "EXISTING_DIN_RAIL");
  }
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
  assign(
    ["rack_width_designation"],
    number(/ширин\p{L}*\s*(\d+(?:[,.]\d+)?)\s*мм/iu)
      ? `${number(/ширин\p{L}*\s*(\d+(?:[,.]\d+)?)\s*мм/iu)} мм`
      : undefined,
  );
  assign(["rack_depth_mm"], number(/глубин\p{L}*\s*(\d+(?:[,.]\d+)?)\s*мм/iu));
  const rackProduct = /(?:модель|марка)\s+(?:серверн\p{L}*\s+)?шкаф\p{L}*\s*[:=]?\s*([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["rack_designation"], rackProduct?.replace(/[.,;:]+$/u, ""));
  assign(["bms_system_count"], number(/(\d+(?:[,.]\d+)?)\s+систем\p{L}*\s+BMS\b/iu));
  assign(["bms_controller_count"], number(/(\d+(?:[,.]\d+)?)\s+контроллер\p{L}*/iu));
  const bmsController = /контроллер\p{L}*\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["bms_controller_designation"], bmsController?.replace(/[.,;:]+$/u, ""));
  assign(
    ["bms_physical_point_count"],
    number(/(\d+(?:[,.]\d+)?)\s+физическ\p{L}*\s+точ\p{L}*/iu),
  );
  assign(
    ["bms_operator_workstation_count"],
    number(/(\d+(?:[,.]\d+)?)\s+(?:АРМ|рабоч\p{L}*\s+мест\p{L}*)\s+оператор\p{L}*/iu),
  );
  const bmsWorkstation = /(?:АРМ|рабоч\p{L}*\s+мест\p{L}*)\s+оператор\p{L}*\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["bms_operator_workstation_designation"], bmsWorkstation?.replace(/[.,;:]+$/u, ""));
  assign(
    ["bms_integration_protocol"],
    text(/протокол\p{L}*\s+(BACnet\s*\/\s*IP|BACnet\s+MS\s*\/\s*TP|Modbus\s+TCP|Modbus\s+RTU)/iu)
      ?.replace(/\s*\/\s*/gu, "/"),
  );
  assign(["cctv_system_count"], number(/(\d+(?:[,.]\d+)?)\s+систем\p{L}*\s+CCTV\b/iu));
  assign(
    ["cctv_camera_count"],
    number(/(\d+(?:[,.]\d+)?)\s+(?:PoE\s+)?IP[-\s]?камер\p{L}*/iu),
  );
  const cctvCamera = /(?:IP[-\s]?камер\p{L}*|камер\p{L}*)\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["cctv_camera_designation"], cctvCamera?.replace(/[.,;:]+$/u, ""));
  if (/(?:PoE\s+IP|IP[-\s]?камер)[^.;]{0,100}\b4\s*(?:Мп|MP)\b[^.;]{0,100}(?:с\s+)?(?:ИК|IR)\b/iu.test(normalized)) {
    assign(["cctv_camera_type"], "IP_POE_4MP_IR");
  }
  assign(["cctv_nvr_count"], number(/(\d+(?:[,.]\d+)?)\s+NVR\b/iu));
  const cctvNvr = /\bNVR\b\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["cctv_nvr_designation"], cctvNvr?.replace(/[.,;:]+$/u, ""));
  assign(
    ["cctv_archive_retention_days"],
    number(/архив\p{L}*\s+(\d+(?:[,.]\d+)?)\s+сут\p{L}*/iu),
  );
  assign(
    ["acs_system_count"],
    number(/(\d+(?:[,.]\d+)?)\s+систем\p{L}*\s+СКУД(?!\p{L})/iu),
  );
  assign(
    ["acs_controlled_door_count"],
    number(/(\d+(?:[,.]\d+)?)\s+контролируем\p{L}*\s+двер\p{L}*/iu),
  );
  assign(["acs_controller_count"], number(/(\d+(?:[,.]\d+)?)\s+контроллер\p{L}*/iu));
  const acsController = /контроллер\p{L}*\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["acs_controller_designation"], acsController?.replace(/[.,;:]+$/u, ""));
  assign(["acs_reader_count"], number(/(\d+(?:[,.]\d+)?)\s+считывател\p{L}*/iu));
  const acsReader = /считывател\p{L}*\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["acs_reader_designation"], acsReader?.replace(/[.,;:]+$/u, ""));
  assign(
    ["acs_lock_count"],
    number(/(\d+(?:[,.]\d+)?)\s+(?:электромагнитн\p{L}*\s+)?замк\p{L}*/iu),
  );
  const acsLock = /(?:электромагнитн\p{L}*\s+)?замк\p{L}*\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["acs_lock_designation"], acsLock?.replace(/[.,;:]+$/u, ""));
  assign(
    ["acs_exit_device_count"],
    number(/(\d+(?:[,.]\d+)?)\s+кноп\p{L}*\s+выход\p{L}*/iu),
  );
  const acsExitDevice = /кноп\p{L}*\s+выход\p{L}*\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["acs_exit_device_designation"], acsExitDevice?.replace(/[.,;:]+$/u, ""));
  assign(["ups_system_count"], number(/(\d+(?:[,.]\d+)?)\s+систем\p{L}*\s+UPS\b/iu));
  assign(["ups_unit_count"], number(/(\d+(?:[,.]\d+)?)\s+установ\p{L}*/iu));
  const upsUnit = /установ\p{L}*\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["ups_unit_designation"], upsUnit?.replace(/[.,;:]+$/u, ""));
  if (/online\s+double[-\s]+conversion/iu.test(normalized)) {
    assign(["ups_topology"], "ONLINE_DOUBLE_CONVERSION");
  }
  assign(
    ["ups_rated_power_kva"],
    number(/(\d+(?:[,.]\d+)?)\s*кВА(?!\p{L})/iu),
  );
  assign(
    ["ups_autonomy_min"],
    number(/автоном\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мин\p{L}*/iu),
  );
  assign(
    ["lvs_system_count"],
    number(/(\d+(?:[,.]\d+)?)\s+систем\p{L}*\s+СКС(?!\p{L})/iu),
  );
  assign(
    ["lvs_information_outlet_count"],
    number(/(\d+(?:[,.]\d+)?)\s+информационн\p{L}*\s+розет\p{L}*/iu),
  );
  const lvsOutlet = /информационн\p{L}*\s+розет\p{L}*\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["lvs_outlet_designation"], lvsOutlet?.replace(/[.,;:]+$/u, ""));
  if (/категори\p{L}*\s+Cat\.?\s*6\s+LSZH/iu.test(normalized)) {
    assign(["lvs_copper_cable_category"], "CAT6_LSZH");
  }
  assign(
    ["lvs_patch_panel_count"],
    number(/(\d+(?:[,.]\d+)?)\s+патч[-\s]?панел\p{L}*/iu),
  );
  const lvsPatchPanel = /патч[-\s]?панел\p{L}*\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["lvs_patch_panel_designation"], lvsPatchPanel?.replace(/[.,;:]+$/u, ""));
  assign(
    ["gsc_collector_count"],
    number(/(\d+(?:[,.]\d+)?)\s+самотечн\p{L}*\s+канализационн\p{L}*\s+коллектор\p{L}*/iu),
  );
  assign(
    ["gsc_route_length_m"],
    number(/трасс\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  if (/\bPVC[-\s]?U\b/iu.test(normalized)) assign(["gsc_pipe_material_grade"], "PVC-U");
  const gscStiffness = /\b(SN\s*\d+)\b/iu.exec(normalized)?.[1];
  assign(["gsc_ring_stiffness_class"], gscStiffness?.replace(/\s+/gu, "").toUpperCase());
  assign(
    ["gsc_pipe_outside_diameter_mm"],
    number(/\b(?:OD|DN\/OD)\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu),
  );
  assign(
    ["gsc_slope_m_per_m"],
    number(/уклон\p{L}*\s+(\d+(?:[,.]\d+)?)(?!\s*%)/iu),
  );
  const gscPipe = /марк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["gsc_pipe_designation"], gscPipe?.replace(/[.,;:]+$/u, ""));
  assign(
    ["swn_network_count"],
    number(/(\d+(?:[,.]\d+)?)\s+поселков\p{L}*\s+водопроводн\p{L}*\s+сет\p{L}*/iu),
  );
  assign(
    ["swn_route_length_m"],
    number(/трасс\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  if (/\bHDPE\b/iu.test(normalized)) assign(["swn_pipe_material"], "HDPE");
  const swnGrade = /\b(PE\s*100[-\s]?RC)\b/iu.exec(normalized)?.[1];
  assign(["swn_pipe_grade"], swnGrade?.replace(/\s+/gu, "").replace("PE100RC", "PE100-RC").toUpperCase());
  const swnSdr = /\b(SDR\s*\d+)\b/iu.exec(normalized)?.[1];
  assign(["swn_sdr_class"], swnSdr?.replace(/\s+/gu, "").toUpperCase());
  assign(
    ["swn_pipe_outside_diameter_mm"],
    number(/\b(?:OD|DN\/OD)\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu),
  );
  const swnPressure = /\b(PN\s*\d+)\b/iu.exec(normalized)?.[1];
  assign(["swn_pressure_class"], swnPressure?.replace(/\s+/gu, "").toUpperCase());
  const swnPipe = /марк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["swn_pipe_designation"], swnPipe?.replace(/[.,;:]+$/u, ""));
  assign(
    ["dpm_main_count"],
    number(/(\d+(?:[,.]\d+)?)\s+распределительн\p{L}*\s+(?:водопроводн\p{L}*\s+)?магистрал\p{L}*/iu),
  );
  assign(
    ["dpm_route_length_m"],
    number(/(?:трасс\p{L}*|длин\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  if (/\bHDPE\b/iu.test(normalized)) assign(["dpm_pipe_material"], "HDPE");
  const dpmGrade = /\b(PE\s*100[-\s]?RC)\b/iu.exec(normalized)?.[1];
  assign(["dpm_pipe_grade"], dpmGrade?.replace(/\s+/gu, "").replace("PE100RC", "PE100-RC").toUpperCase());
  const dpmSdr = /\b(SDR\s*\d+)\b/iu.exec(normalized)?.[1];
  assign(["dpm_sdr_class"], dpmSdr?.replace(/\s+/gu, "").toUpperCase());
  assign(
    ["dpm_pipe_outside_diameter_mm"],
    number(/\b(?:OD|DN\/OD)\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu),
  );
  const dpmPressure = /\b(PN\s*\d+)\b/iu.exec(normalized)?.[1];
  assign(["dpm_pressure_class"], dpmPressure?.replace(/\s+/gu, "").toUpperCase());
  const dpmPipe = /марк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["dpm_pipe_designation"], dpmPipe?.replace(/[.,;:]+$/u, ""));
  assign(
    ["hcw_connection_count"],
    number(/(\d+(?:[,.]\d+)?)\s+(?:водопроводн\p{L}*\s+)?ввод\p{L}*\s+(?:вод\p{L}*\s+)?(?:в\s+дом)?/iu),
  );
  assign(
    ["hcw_service_route_length_m"],
    number(/(?:трасс\p{L}*|длин\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  if (/сервисн\p{L}*\s+труб\p{L}*[^.]*\bHDPE\b/iu.test(normalized)) {
    assign(["hcw_pipe_material"], "HDPE");
  }
  const hcwGrade = /сервисн\p{L}*\s+труб\p{L}*[^.]*?\b(PE\s*100[-\s]?RC)\b/iu
    .exec(normalized)?.[1];
  assign(
    ["hcw_pipe_grade"],
    hcwGrade?.replace(/\s+/gu, "").replace("PE100RC", "PE100-RC").toUpperCase(),
  );
  const hcwSdr = /сервисн\p{L}*\s+труб\p{L}*[^.]*?\b(SDR\s*\d+)\b/iu
    .exec(normalized)?.[1];
  assign(["hcw_sdr_class"], hcwSdr?.replace(/\s+/gu, "").toUpperCase());
  assign(
    ["hcw_pipe_outside_diameter_mm"],
    number(/сервисн\p{L}*\s+труб\p{L}*[^.]*?\b(?:OD|DN\/OD)\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu),
  );
  const hcwPressure = /сервисн\p{L}*\s+труб\p{L}*[^.]*?\b(PN\s*\d+)\b/iu
    .exec(normalized)?.[1];
  assign(["hcw_pressure_class"], hcwPressure?.replace(/\s+/gu, "").toUpperCase());
  const hcwPipe = /марк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["hcw_pipe_designation"], hcwPipe?.replace(/[.,;:]+$/u, ""));
  const hcwMainMaterial = /существующ\p{L}*\s+магистрал\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s+(?:OD|DN\/OD)/iu
    .exec(normalized)?.[1];
  assign(["hcw_existing_main_material"], hcwMainMaterial?.replace(/[.,;:]+$/u, ""));
  assign(
    ["hcw_existing_main_outside_diameter_mm"],
    number(/существующ\p{L}*\s+магистрал\p{L}*[^.]*?\b(?:OD|DN\/OD)\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu),
  );
  assign(
    ["psp_pipeline_count"],
    number(/(\d+(?:[,.]\d+)?)\s+напорн\p{L}*\s+канализационн\p{L}*\s+трубопровод\p{L}*/iu),
  );
  assign(
    ["psp_route_length_m"],
    number(/трасс\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  if (/\bHDPE\b/iu.test(normalized)) assign(["psp_pipe_material"], "HDPE");
  const pspGrade = /\b(PE\s*100[-\s]?RC)\b/iu.exec(normalized)?.[1];
  assign(["psp_pipe_grade"], pspGrade?.replace(/\s+/gu, "").replace("PE100RC", "PE100-RC").toUpperCase());
  const pspSdr = /\b(SDR\s*\d+)\b/iu.exec(normalized)?.[1];
  assign(["psp_sdr_class"], pspSdr?.replace(/\s+/gu, "").toUpperCase());
  assign(
    ["psp_pipe_outside_diameter_mm"],
    number(/\b(?:OD|DN\/OD)\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu),
  );
  const pspPressure = /\b(PN\s*\d+)\b/iu.exec(normalized)?.[1];
  assign(["psp_pressure_class"], pspPressure?.replace(/\s+/gu, "").toUpperCase());
  const pspPipe = /марк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["psp_pipe_designation"], pspPipe?.replace(/[.,;:]+$/u, ""));
  assign(
    ["swd_network_count"],
    number(/(\d+(?:[,.]\d+)?)\s+ливнев\p{L}*\s+(?:водоотводн\p{L}*\s+)?сет\p{L}*/iu),
  );
  assign(
    ["swd_route_length_m"],
    number(/трасс\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  if (/\bPVC[-\s]?U\b/iu.test(normalized)) assign(["swd_pipe_material"], "PVC-U");
  const swdStiffness = /\b(SN\s*\d+)\b/iu.exec(normalized)?.[1];
  assign(["swd_ring_stiffness_class"], swdStiffness?.replace(/\s+/gu, "").toUpperCase());
  assign(
    ["swd_pipe_outside_diameter_mm"],
    number(/\b(?:OD|DN\/OD)\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu),
  );
  assign(
    ["swd_slope_m_per_m"],
    number(/уклон\p{L}*\s+(\d+(?:[,.]\d+)?)(?!\s*%)/iu),
  );
  assign(
    ["swd_design_flow_lps"],
    number(/расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*л\/с(?!\p{L})/iu),
  );
  const swdPipe = /марк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["swd_pipe_designation"], swdPipe?.replace(/[.,;:]+$/u, ""));
  assign(
    ["dch_channel_count"],
    number(/(\d+(?:[,.]\d+)?)\s+открыт\p{L}*\s+водоотводн\p{L}*\s+канал\p{L}*/iu),
  );
  assign(
    ["dch_route_length_m"],
    number(/трасс\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  if (/сборн\p{L}*\s+U[-\s]?образн\p{L}*\s+канал\p{L}*/iu.test(normalized)) {
    assign(["dch_channel_type"], "PRECAST_U_CHANNEL");
  }
  if (/железобетон\p{L}*\s+C\s*35\s*\/\s*45/iu.test(normalized)) {
    assign(["dch_channel_material"], "RC_C35_45");
  }
  const dchSection = /(?:внутренн\p{L}*\s+)?сечен\p{L}*\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*мм/iu
    .exec(normalized);
  assign(["dch_internal_width_mm"], dchSection?.[1]?.replace(",", "."));
  assign(["dch_internal_depth_mm"], dchSection?.[2]?.replace(",", "."));
  assign(
    ["dch_slope_m_per_m"],
    number(/уклон\p{L}*\s+(\d+(?:[,.]\d+)?)(?!\s*%)/iu),
  );
  assign(
    ["dch_design_flow_lps"],
    number(/расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*л\/с(?!\p{L})/iu),
  );
  const dchChannel = /марк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["dch_channel_designation"], dchChannel?.replace(/[.,;:]+$/u, ""));
  assign(
    ["rwi_inlet_count"],
    number(/(?:монтаж\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+дождепри[её]мн\p{L}*/iu),
  );
  const rwiBody = /корпус\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)(?=\s+из|[,.;:]|$)/iu
    .exec(normalized)?.[1];
  assign(["rwi_body_designation"], rwiBody?.replace(/[.,;:]+$/u, "").toUpperCase());
  if (/сборн\p{L}*\s+железобетон\p{L}*/iu.test(normalized)) {
    assign(["rwi_body_material"], "PRECAST_RC");
  }
  if (/реш[её]тк\p{L}*\s+чугунн\p{L}*/iu.test(normalized)) {
    assign(["rwi_grating_material"], "DUCTILE_IRON");
  }
  const rwiLoadClass = /\b([A-F]\s*\d{3})\b/iu.exec(normalized)?.[1];
  assign(["rwi_grating_load_class"], rwiLoadClass?.replace(/\s+/gu, "").toUpperCase());
  assign(
    ["rwi_outlet_diameter_mm"],
    number(/выпуск\p{L}*\s+(?:DN\s*)?(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu),
  );
  const rwiAssembly = /марк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["rwi_assembly_designation"], rwiAssembly?.replace(/[.,;:]+$/u, ""));

  assign(
    ["ich_chamber_count"],
    number(/(\d+(?:[,.]\d+)?)\s+смотров\p{L}*\s+камер\p{L}*/iu),
  );
  if (/сборн\p{L}*\s+железобетон\p{L}*\s+кругл\p{L}*\s+камер\p{L}*/iu.test(normalized)) {
    assign(["ich_chamber_type"], "PRECAST_RC_CIRCULAR");
  }
  if (/сборн\p{L}*\s+железобетон\p{L}*/iu.test(normalized)) {
    assign(["ich_chamber_material"], "PRECAST_RC");
  }
  assign(
    ["ich_internal_diameter_mm"],
    number(/внутренн\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu),
  );
  assign(
    ["ich_depth_m"],
    number(/глубин\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  const ichLoadClass = /люк\p{L}*\s+([A-F]\s*\d{3})\b/iu.exec(normalized)?.[1];
  assign(["ich_cover_load_class"], ichLoadClass?.replace(/\s+/gu, "").toUpperCase());
  assign(
    ["ich_connector_diameter_mm"],
    number(/присоединен\p{L}*\s+DN\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu),
  );
  const ichDesignation = /марка\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["ich_chamber_designation"], ichDesignation?.replace(/[.,;:]+$/u, ""));

  assign(
    ["mnh_manhole_count"],
    number(/(\d+(?:[,.]\d+)?)\s+канализацион\p{L}*\s+колодц\p{L}*/iu),
  );
  if (/монолитн\p{L}*\s+железобетон\p{L}*\s+прямоугольн\p{L}*\s+колодц\p{L}*/iu
    .test(normalized)) {
    assign(["mnh_manhole_type"], "CAST_IN_PLACE_RC_RECTANGULAR");
  }
  if (/монолитн\p{L}*\s+железобетон\p{L}*/iu.test(normalized)) {
    assign(["mnh_manhole_material"], "CAST_IN_PLACE_RC");
  }
  const mnhInternalSize = /внутренн\p{L}*\s+размер\p{L}*\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*мм/iu
    .exec(normalized);
  assign(["mnh_internal_length_mm"], mnhInternalSize?.[1]?.replace(",", "."));
  assign(["mnh_internal_width_mm"], mnhInternalSize?.[2]?.replace(",", "."));
  assign(
    ["mnh_depth_m"],
    number(/глубин\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  const mnhConcreteClass = /бетон\p{L}*\s+(C\s*\d+\s*\/\s*\d+)/iu
    .exec(normalized)?.[1];
  assign(["mnh_concrete_class"], mnhConcreteClass?.replace(/\s+/gu, "").toUpperCase());
  const mnhCoverDesignation = /люк\p{L}*\s+([A-Z][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["mnh_cover_frame_designation"], mnhCoverDesignation?.replace(/[.,;:]+$/u, ""));
  const mnhLoadClass = /класс\p{L}*\s+([A-F]\s*\d{3})\b/iu.exec(normalized)?.[1];
  assign(["mnh_cover_load_class"], mnhLoadClass?.replace(/\s+/gu, "").toUpperCase());
  assign(
    ["mnh_connector_diameter_mm"],
    number(/присоединен\p{L}*\s+DN\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu),
  );
  const mnhDesignation = /марка\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["mnh_manhole_designation"], mnhDesignation?.replace(/[.,;:]+$/u, ""));

  assign(
    ["pbb_route_length_m"],
    number(/засыпк\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м\s+трубопроводн\p{L}*\s+транше/iu),
  );
  assign(
    ["pbb_pipe_outside_diameter_mm"],
    number(/наружн\p{L}*\s+диаметр\p{L}*\s+труб\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
  );
  const pbbAssembly = /конструкц\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["pbb_assembly_designation"], pbbAssembly?.replace(/[.,;:]+$/u, ""));
  const pbbGeotextile = /геотекстил\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["pbb_geotextile_designation"], pbbGeotextile?.replace(/[.,;:]+$/u, ""));
  const pbbBedding = /материал\p{L}*\s+постел\p{L}*\s+([A-Z][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["pbb_bedding_material"], pbbBedding?.replace(/[.,;:]+$/u, ""));
  assign(
    ["pbb_bedding_thickness_mm"],
    number(/толщин\p{L}*\s+постел\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
  );
  assign(
    ["pbb_surround_cover_above_pipe_mm"],
    number(/обсыпк\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм\s+над\s+труб/iu),
  );
  const pbbBackfill = /материал\p{L}*\s+обратн\p{L}*\s+засыпк\p{L}*\s+([A-Z][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["pbb_backfill_material"], pbbBackfill?.replace(/[.,;:]+$/u, ""));
  assign(
    ["pbb_compaction_coefficient"],
    number(/коэффициент\p{L}*\s+уплотнен\p{L}*\s+(\d+(?:[,.]\d+)?)/iu),
  );
  assign(
    ["pbb_bedding_surround_installed_volume_m3"],
    number(/проектн\p{L}*\s+объ[её]м\p{L}*\s+постел\p{L}*\s+и\s+обсыпк\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]/iu),
  );

  assign(
    ["hyd_tested_length_m"],
    number(/гидравлическ\p{L}*\s+испытан\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м\s+напорн\p{L}*\s+канализационн\p{L}*\s+трубопровод/iu),
  );
  const hydPipeMaterial = /\b(PE\s*100)\b/iu.exec(normalized)?.[1];
  assign(["hyd_pipe_material"], hydPipeMaterial?.replace(/\s+/gu, "").toUpperCase());
  const hydPipeSdr = /\b(SDR\s*\d+(?:[,.]\d+)?)\b/iu.exec(normalized)?.[1];
  assign(["hyd_pipe_sdr"], hydPipeSdr?.replace(/\s+/gu, "").replace(",", ".").toUpperCase());
  assign(
    ["hyd_pipe_outside_diameter_mm"],
    number(/наружн\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
  );
  const hydPressureClass = /\b(PN\s*\d+(?:[,.]\d+)?)\b/iu.exec(normalized)?.[1];
  assign(["hyd_pressure_class"], hydPressureClass?.replace(/\s+/gu, "").replace(",", ".").toUpperCase());
  assign(
    ["hyd_test_section_count"],
    number(/(\d+(?:[,.]\d+)?)\s+изолированн\p{L}*\s+испытательн\p{L}*\s+участ/iu),
  );
  const hydClosures = /(\d+(?:[,.]\d+)?)\s+временн\p{L}*\s+заглуш\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["hyd_temporary_closure_installed_piece"], hydClosures?.[1]?.replace(",", "."));
  assign(["hyd_closure_designation"], hydClosures?.[2]?.replace(/[.,;:]+$/u, ""));
  assign(
    ["hyd_test_pressure_mpa"],
    number(/испытательн\p{L}*\s+давлен\p{L}*\s+(\d+(?:[,.]\d+)?)\s*МПа/iu),
  );
  assign(
    ["hyd_hold_duration_min"],
    number(/выдержк\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мин/iu),
  );
  const hydProcedure = /процедур\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["hyd_procedure_designation"], hydProcedure?.replace(/[.,;:]+$/u, ""));

  assign(
    ["out_structure_count"],
    number(/(\d+(?:[,.]\d+)?)\s+выпускн\p{L}*\s+сооружен/iu),
  );
  if (/монолитн\p{L}*\s+железобетонн\p{L}*\s+(?:выпускн\p{L}*\s+)?оголов/iu.test(normalized)) {
    assign(["out_structure_type"], "CAST_IN_PLACE_RC_HEADWALL");
  }
  if (/берег\p{L}*\s+рек/iu.test(normalized)) assign(["out_receiving_environment"], "RIVER_BANK");
  assign(
    ["out_outlet_pipe_diameter_mm"],
    number(/выпуск\p{L}*\s+DN\s*(\d+(?:[,.]\d+)?)\s*мм/iu),
  );
  assign(
    ["out_design_discharge_lps"],
    number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*л\/с/iu),
  );
  const outDimensions = /габарит\p{L}*\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu
    .exec(normalized);
  assign(["out_structure_length_m"], outDimensions?.[1]?.replace(",", "."));
  assign(["out_structure_width_m"], outDimensions?.[2]?.replace(",", "."));
  assign(["out_structure_height_m"], outDimensions?.[3]?.replace(",", "."));
  const outConcreteClass = /бетон\p{L}*\s+(C\s*\d+\s*\/\s*\d+)/iu.exec(normalized)?.[1];
  assign(["out_concrete_class"], outConcreteClass?.replace(/\s+/gu, "").toUpperCase());
  const outWatertightness = /\b(W\s*\d+)\b/iu.exec(normalized)?.[1];
  assign(["out_watertightness_class"], outWatertightness?.replace(/\s+/gu, "").toUpperCase());
  const outFrostResistance = /\b(F\s*\d+)\b/iu.exec(normalized)?.[1];
  assign(["out_frost_resistance_class"], outFrostResistance?.replace(/\s+/gu, "").toUpperCase());
  const outDesignation = /марка\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["out_structure_designation"], outDesignation?.replace(/[.,;:]+$/u, ""));
  assign(
    ["out_structural_concrete_installed_volume_m3"],
    number(/проектн\p{L}*\s+объ[её]м\p{L}*\s+конструкционн\p{L}*\s+бетон\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]/iu),
  );

  assign(
    ["sps_station_count"],
    number(/(?:монтаж\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+комплектн\p{L}*\s+канализационн\p{L}*\s+насосн\p{L}*\s+станц/iu),
  );
  if (/подземн\p{L}*\s+стеклопластиков\p{L}*\s+мокр\p{L}*\s+камер/iu.test(normalized)) {
    assign(["sps_station_type"], "PREFABRICATED_GRP_WET_WELL");
    assign(["sps_wet_well_material"], "GRP");
  }
  assign(
    ["sps_wet_well_diameter_mm"],
    number(/мокр\p{L}*\s+камер\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
  );
  assign(
    ["sps_wet_well_depth_mm"],
    number(/глубин\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
  );
  assign(
    ["sps_design_flow_lps"],
    number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*л\/с/iu),
  );
  assign(
    ["sps_design_head_m"],
    number(/напор\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  const spsPumps = /(\d+(?:[,.]\d+)?)\s+погружн\p{L}*\s+насос\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*\(/iu
    .exec(normalized);
  assign(["sps_pump_unit_installed_piece"], spsPumps?.[1]?.replace(",", "."));
  assign(["sps_pump_designation"], spsPumps?.[2]?.replace(/[.,;:]+$/u, ""));
  assign(["sps_duty_pump_count"], number(/(\d+)\s+рабоч\p{L}*\s*\+/iu));
  assign(["sps_standby_pump_count"], number(/\+\s*(\d+)\s+резервн/iu));
  assign(
    ["sps_motor_power_kw"],
    number(/мощност\p{L}*\s+двигател\p{L}*\s+(\d+(?:[,.]\d+)?)\s*кВт/iu),
  );
  const spsDesignation = /марка\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(normalized)?.[1];
  assign(["sps_station_designation"], spsDesignation?.replace(/[.,;:]+$/u, ""));

  assign(
    ["wtp_plant_count"],
    number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+(?:комплекс\p{L}*\s+)?очистн\p{L}*\s+сооружен/iu),
  );
  const wtpDesignation = /очистн\p{L}*\s+сооружен\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["wtp_plant_designation"], wtpDesignation?.replace(/[.,;:]+$/u, ""));
  const wtpTechnology = /технологи\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["wtp_process_technology"], wtpTechnology?.toUpperCase());
  assign(
    ["wtp_process_train_count"],
    number(/(\d+(?:[,.]\d+)?)\s+технологическ\p{L}*\s+лини/iu),
  );
  assign(
    ["wtp_design_flow_m3_day"],
    number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
  );
  assign(
    ["wtp_peak_flow_m3_day"],
    number(/пиков\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
  );
  const wtpInfluent = /вход\s*:\s*([^;]+)/iu.exec(normalized)?.[1] ?? "";
  const wtpEffluent = /выход\s*:\s*([^;]+)/iu.exec(normalized)?.[1] ?? "";
  const wtpInfluentNumber = (pattern: RegExp): string | undefined =>
    pattern.exec(wtpInfluent)?.[1]?.replace(",", ".");
  const wtpEffluentNumber = (pattern: RegExp): string | undefined =>
    pattern.exec(wtpEffluent)?.[1]?.replace(",", ".");
  assign(["wtp_influent_bod5_mg_l"], wtpInfluentNumber(/БПК\s*5\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu));
  assign(["wtp_influent_tss_mg_l"], wtpInfluentNumber(/взвешенн\p{L}*\s+веществ\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu));
  assign(["wtp_influent_tn_mg_l"], wtpInfluentNumber(/общ\p{L}*\s+азот\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu));
  assign(["wtp_effluent_bod5_mg_l"], wtpEffluentNumber(/БПК\s*5\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu));
  assign(["wtp_effluent_tss_mg_l"], wtpEffluentNumber(/взвешенн\p{L}*\s+веществ\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu));
  assign(["wtp_effluent_tn_mg_l"], wtpEffluentNumber(/общ\p{L}*\s+азот\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu));
  const wtpMembranes = /(\d+(?:[,.]\d+)?)\s+мембранн\p{L}*\s+кассет\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wtp_membrane_cassette_installed_piece"], wtpMembranes?.[1]?.replace(",", "."));
  assign(["wtp_membrane_cassette_designation"], wtpMembranes?.[2]?.replace(/[.,;:]+$/u, ""));

  assign(
    ["aer_tank_count"],
    number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+аэротенк/iu),
  );
  const aerDesignation = /аэротенк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["aer_tank_designation"], aerDesignation?.replace(/[.,;:]+$/u, ""));
  if (/монолитн\p{L}*\s+железобетонн\p{L}*\s+прямоугольн\p{L}*\s+бассейн/iu
    .test(normalized)) {
    assign(["aer_tank_type"], "CAST_IN_PLACE_RC_RECTANGULAR");
  }
  if (/мелкопузырчат\p{L}*\s+аэраци\p{L}*\s+активн\p{L}*\s+ил/iu.test(normalized)) {
    assign(["aer_process_duty"], "ACTIVATED_SLUDGE_FINE_BUBBLE_AERATION");
  }
  assign(
    ["aer_process_train_count"],
    number(/(\d+(?:[,.]\d+)?)\s+технологическ\p{L}*\s+лини/iu),
  );
  const aerDimensions = /размер\p{L}*\s+кажд\p{L}*\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu
    .exec(normalized);
  assign(["aer_tank_length_m"], aerDimensions?.[1]?.replace(",", "."));
  assign(["aer_tank_width_m"], aerDimensions?.[2]?.replace(",", "."));
  assign(
    ["aer_operating_water_depth_m"],
    number(/рабоч\p{L}*\s+глубин\p{L}*\s+вод\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  assign(
    ["aer_design_air_flow_nm3_h"],
    number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+воздух\p{L}*\s+(\d+(?:[,.]\d+)?)\s*Нм[³3]\s*\/\s*ч/iu),
  );
  const aerDiffusers = /(\d+(?:[,.]\d+)?)\s+аэрационн\p{L}*\s+диффузор\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["aer_diffuser_installed_piece"], aerDiffusers?.[1]?.replace(",", "."));
  assign(["aer_diffuser_designation"], aerDiffusers?.[2]?.replace(/[.,;:]+$/u, ""));

  assign(
    ["sdw_system_count"],
    number(/(?:монтаж\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+комплекс\p{L}*\s+обезвоживан\p{L}*\s+осадк/iu),
  );
  const sdwDesignation = /комплекс\p{L}*\s+обезвоживан\p{L}*\s+осадк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["sdw_system_designation"], sdwDesignation?.replace(/[.,;:]+$/u, ""));
  const sdwTechnology = /технологи\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["sdw_dewatering_technology"], sdwTechnology?.toUpperCase());
  assign(
    ["sdw_sludge_feed_flow_m3_h"],
    number(/подач\p{L}*\s+осадк\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*ч/iu),
  );
  assign(
    ["sdw_inlet_dry_solids_percent"],
    number(/сух\p{L}*\s+веществ\p{L}*\s+на\s+вход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*%/iu),
  );
  assign(
    ["sdw_cake_dry_solids_percent"],
    number(/сух\p{L}*\s+веществ\p{L}*\s+кек\p{L}*\s+(\d+(?:[,.]\d+)?)\s*%/iu),
  );
  assign(
    ["sdw_operating_hours_day"],
    number(/работ\p{L}*\s+(\d+(?:[,.]\d+)?)\s*ч\s*\/\s*сут/iu),
  );
  const sdwPresses = /(\d+(?:[,.]\d+)?)\s+шнеков\p{L}*\s+пресс\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["sdw_press_unit_installed_piece"], sdwPresses?.[1]?.replace(",", "."));
  assign(["sdw_press_unit_designation"], sdwPresses?.[2]?.replace(/[.,;:]+$/u, ""));

  assign(
    ["stt_tank_count"],
    number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+резервуар\p{L}*\s+очистн\p{L}*\s+сооружен/iu),
  );
  const sttDesignation = /резервуар\p{L}*\s+очистн\p{L}*\s+сооружен\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["stt_tank_designation"], sttDesignation?.replace(/[.,;:]+$/u, ""));
  if (/монолитн\p{L}*\s+железобетонн\p{L}*\s+прямоугольн\p{L}*\s+резервуар/iu.test(normalized)) {
    assign(["stt_tank_type"], "CAST_IN_PLACE_RC_RECTANGULAR");
  }
  if (/усреднен\p{L}*\s+и\s+первичн\p{L}*\s+отстаив/iu.test(normalized)) {
    assign(["stt_process_duty"], "EQUALIZATION_AND_PRIMARY_SETTLEMENT");
  }
  const sttDimensions = /размер\p{L}*\s+кажд\p{L}*\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu
    .exec(normalized);
  assign(["stt_tank_length_m"], sttDimensions?.[1]?.replace(",", "."));
  assign(["stt_tank_width_m"], sttDimensions?.[2]?.replace(",", "."));
  assign(
    ["stt_operating_liquid_depth_m"],
    number(/рабоч\p{L}*\s+глубин\p{L}*\s+жидкост\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
  );
  const sttWaterstop = /(\d+(?:[,.]\d+)?)\s*м\s+гидрошпонк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["stt_waterstop_installed_m"], sttWaterstop?.[1]?.replace(",", "."));
  assign(["stt_waterstop_designation"], sttWaterstop?.[2]?.replace(/[.,;:]+$/u, ""));

  assign(
    ["stf_facility_count"],
    number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+септическ\p{L}*\s+очистн\p{L}*\s+сооружен/iu),
  );
  const stfDesignation = /септическ\p{L}*\s+очистн\p{L}*\s+сооружен\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["stf_facility_designation"], stfDesignation?.replace(/[.,;:]+$/u, ""));
  const stfTechnology = /технологи\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["stf_treatment_technology"], stfTechnology?.toUpperCase());
  assign(
    ["stf_design_flow_m3_day"],
    number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
  );
  assign(
    ["stf_working_volume_m3"],
    number(/рабоч\p{L}*\s+объ[её]м\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]/iu),
  );
  assign(["stf_chamber_count"], number(/(\d+(?:[,.]\d+)?)\s+камер/iu));
  const stfRings = /(\d+(?:[,.]\d+)?)\s+сборн\p{L}*\s+железобетонн\p{L}*\s+колец\s+([A-ZА-Я0-9][A-ZА-Я0-9._/-]*)/iu
    .exec(normalized);
  assign(["stf_ring_installed_piece"], stfRings?.[1]?.replace(",", "."));
  assign(["stf_ring_designation"], stfRings?.[2]?.replace(/[.,;:]+$/u, ""));

  assign(
    ["vsn_network_count"],
    number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+самотечн\p{L}*\s+канализационн\p{L}*\s+сет\p{L}*\s+сел/iu),
  );
  const vsnDesignation = /сет\p{L}*\s+сел\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["vsn_network_designation"], vsnDesignation?.replace(/[.,;:]+$/u, ""));
  if (/самотечн\p{L}*\s+канализационн\p{L}*\s+сет\p{L}*\s+сел/iu.test(normalized)) {
    assign(["vsn_network_type"], "GRAVITY_VILLAGE_SEWER");
  }
  assign(
    ["vsn_design_flow_m3_day"],
    number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
  );
  const vsnMainPipe = /(\d+(?:[,.]\d+)?)\s*м\s+главн\p{L}*\s+труб\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["vsn_main_pipe_installed_m"], vsnMainPipe?.[1]?.replace(",", "."));
  assign(["vsn_main_pipe_designation"], vsnMainPipe?.[2]?.replace(/[.,;:]+$/u, ""));
  const vsnLateralPipe = /(\d+(?:[,.]\d+)?)\s*м\s+труб\p{L}*\s+домов\p{L}*\s+подключен\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["vsn_lateral_pipe_installed_m"], vsnLateralPipe?.[1]?.replace(",", "."));
  assign(["vsn_lateral_pipe_designation"], vsnLateralPipe?.[2]?.replace(/[.,;:]+$/u, ""));
  assign(
    ["vsn_inspection_manhole_piece"],
    number(/(\d+(?:[,.]\d+)?)\s+смотров\p{L}*\s+колодц/iu),
  );
  assign(
    ["vsn_house_connection_piece"],
    number(/(\d+(?:[,.]\d+)?)\s+домов\p{L}*\s+подключен/iu),
  );

  assign(
    ["vws_network_count"],
    number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+напорн\p{L}*\s+водопроводн\p{L}*\s+сет\p{L}*\s+сел/iu),
  );
  const vwsDesignation = /водопроводн\p{L}*\s+сет\p{L}*\s+сел\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["vws_network_designation"], vwsDesignation?.replace(/[.,;:]+$/u, ""));
  if (/напорн\p{L}*\s+водопроводн\p{L}*\s+сет\p{L}*\s+сел/iu.test(normalized)) {
    assign(["vws_network_type"], "PRESSURE_VILLAGE_WATER_SUPPLY");
  }
  assign(
    ["vws_design_flow_m3_day"],
    number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
  );
  const vwsMainPipe = /(\d+(?:[,.]\d+)?)\s*м\s+главн\p{L}*\s+труб\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["vws_main_pipe_installed_m"], vwsMainPipe?.[1]?.replace(",", "."));
  assign(["vws_main_pipe_designation"], vwsMainPipe?.[2]?.replace(/[.,;:]+$/u, ""));
  const vwsBranchPipe = /(\d+(?:[,.]\d+)?)\s*м\s+труб\p{L}*\s+ответвлен\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["vws_branch_pipe_installed_m"], vwsBranchPipe?.[1]?.replace(",", "."));
  assign(["vws_branch_pipe_designation"], vwsBranchPipe?.[2]?.replace(/[.,;:]+$/u, ""));
  assign(
    ["vws_valve_chamber_piece"],
    number(/(\d+(?:[,.]\d+)?)\s+камер\p{L}*\s+запорн\p{L}*\s+арматур/iu),
  );
  assign(
    ["vws_fire_hydrant_piece"],
    number(/(\d+(?:[,.]\d+)?)\s+пожарн\p{L}*\s+гидрант/iu),
  );
  assign(
    ["vws_house_service_connection_piece"],
    number(/(\d+(?:[,.]\d+)?)\s+домов\p{L}*\s+ввод/iu),
  );

  assign(
    ["wi_facility_count"],
    number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+берегов\p{L}*\s+водозабор/iu),
  );
  const wiDesignation = /берегов\p{L}*\s+водозабор\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["wi_facility_designation"], wiDesignation?.replace(/[.,;:]+$/u, ""));
  const wiType = /тип\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["wi_intake_type"], wiType?.toUpperCase());
  assign(
    ["wi_design_capacity_m3_day"],
    number(/производительност\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
  );
  assign(
    ["wi_intake_bay_count"],
    number(/(\d+(?:[,.]\d+)?)\s+водопри[её]мн\p{L}*\s+камер/iu),
  );
  const wiScreens = /(\d+(?:[,.]\d+)?)\s+груб\p{L}*\s+реш[её]тк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wi_coarse_screen_installed_piece"], wiScreens?.[1]?.replace(",", "."));
  assign(["wi_coarse_screen_designation"], wiScreens?.[2]?.replace(/[.,;:]+$/u, ""));
  const wiPumps = /(\d+(?:[,.]\d+)?)\s+насос\p{L}*\s+исходн\p{L}*\s+вод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wi_raw_water_pump_installed_piece"], wiPumps?.[1]?.replace(",", "."));
  assign(["wi_raw_water_pump_designation"], wiPumps?.[2]?.replace(/[.,;:]+$/u, ""));

  assign(
    ["wmc_chamber_count"],
    number(/(\d+(?:[,.]\d+)?)\s+железобетонн\p{L}*\s+камер\p{L}*\s+водомерн\p{L}*\s+узл\p{L}*/iu),
  );
  const wmcChamberDesignation = /камер\p{L}*\s+водомерн\p{L}*\s+узл\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(
    ["wmc_chamber_designation"],
    wmcChamberDesignation?.replace(/[.,;:]+$/u, ""),
  );
  const wmcChamberType = /тип\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["wmc_chamber_type"], wmcChamberType?.toUpperCase());
  assign(
    ["wmc_design_flow_m3_day"],
    number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
  );
  const wmcMeters = /(\d+(?:[,.]\d+)?)\s+электромагнитн\p{L}*\s+сч[её]тчик\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wmc_meter_installed_piece"], wmcMeters?.[1]?.replace(",", "."));
  assign(["wmc_meter_designation"], wmcMeters?.[2]?.replace(/[.,;:]+$/u, ""));
  const wmcStraightPipe = /(\d+(?:[,.]\d+)?)\s*м\s+прям\p{L}*\s+измерительн\p{L}*\s+участк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wmc_straight_pipe_installed_m"], wmcStraightPipe?.[1]?.replace(",", "."));
  assign(
    ["wmc_straight_pipe_designation"],
    wmcStraightPipe?.[2]?.replace(/[.,;:]+$/u, ""),
  );
  const wmcBypassPipe = /(\d+(?:[,.]\d+)?)\s*м\s+байпасн\p{L}*\s+трубопровод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wmc_bypass_pipe_installed_m"], wmcBypassPipe?.[1]?.replace(",", "."));
  assign(
    ["wmc_bypass_pipe_designation"],
    wmcBypassPipe?.[2]?.replace(/[.,;:]+$/u, ""),
  );

  assign(
    ["wr_reservoir_count"],
    number(/(\d+(?:[,.]\d+)?)\s+подземн\p{L}*\s+железобетонн\p{L}*\s+резервуар\p{L}*\s+чист\p{L}*\s+вод\p{L}*/iu),
  );
  const wrDesignation = /резервуар\p{L}*\s+чист\p{L}*\s+вод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["wr_reservoir_designation"], wrDesignation?.replace(/[.,;:]+$/u, ""));
  const wrType = /тип\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["wr_reservoir_type"], wrType?.toUpperCase());
  assign(
    ["wr_total_storage_capacity_m3"],
    number(/общ\p{L}*\s+[её]мкост\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]/iu),
  );
  assign(
    ["wr_unit_capacity_m3"],
    number(/[её]мкост\p{L}*\s+кажд\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]/iu),
  );
  const wrWaterstop = /(\d+(?:[,.]\d+)?)\s*м\s+гидрошпонк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wr_waterstop_installed_m"], wrWaterstop?.[1]?.replace(",", "."));
  assign(["wr_waterstop_designation"], wrWaterstop?.[2]?.replace(/[.,;:]+$/u, ""));
  const wrInletPipe = /(\d+(?:[,.]\d+)?)\s*м\s+входн\p{L}*\s+трубопровод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wr_inlet_pipe_installed_m"], wrInletPipe?.[1]?.replace(",", "."));
  assign(["wr_inlet_pipe_designation"], wrInletPipe?.[2]?.replace(/[.,;:]+$/u, ""));
  const wrOutletPipe = /(\d+(?:[,.]\d+)?)\s*м\s+выходн\p{L}*\s+трубопровод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wr_outlet_pipe_installed_m"], wrOutletPipe?.[1]?.replace(",", "."));
  assign(["wr_outlet_pipe_designation"], wrOutletPipe?.[2]?.replace(/[.,;:]+$/u, ""));

  assign(
    ["wt_tower_count"],
    number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+стальн\p{L}*\s+водонапорн\p{L}*\s+башн\p{L}*\s+рожновск\p{L}*/iu),
  );
  const wtDesignation = /башн\p{L}*\s+рожновск\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["wt_tower_designation"], wtDesignation?.replace(/[.,;:]+$/u, ""));
  const wtType = /тип\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["wt_tower_type"], wtType?.toUpperCase());
  assign(
    ["wt_tank_capacity_m3"],
    number(/бак\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]/iu),
  );
  assign(
    ["wt_support_height_m"],
    number(/высот\p{L}*\s+опор\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?!\p{L})/iu),
  );
  const wtCoating = /(\d+(?:[,.]\d+)?)\s*м[²2]\s+покрыти\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wt_coating_installed_area_m2"], wtCoating?.[1]?.replace(",", "."));
  assign(["wt_coating_designation"], wtCoating?.[2]?.replace(/[.,;:]+$/u, ""));
  const wtRiser = /(\d+(?:[,.]\d+)?)\s*м\s+стояк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wt_riser_pipe_installed_m"], wtRiser?.[1]?.replace(",", "."));
  assign(["wt_riser_pipe_designation"], wtRiser?.[2]?.replace(/[.,;:]+$/u, ""));
  const wtOverflow = /(\d+(?:[,.]\d+)?)\s*м\s+переливн\p{L}*\s+трубопровод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wt_overflow_pipe_installed_m"], wtOverflow?.[1]?.replace(",", "."));
  assign(["wt_overflow_pipe_designation"], wtOverflow?.[2]?.replace(/[.,;:]+$/u, ""));

  assign(
    ["wtp_facility_count"],
    number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+водоочистн\p{L}*\s+станци\p{L}*/iu),
  );
  const wtpPlantDesignation = /водоочистн\p{L}*\s+станци\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["wtp_facility_designation"], wtpPlantDesignation?.replace(/[.,;:]+$/u, ""));
  const wtpProcessType = /схем\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["wtp_process_type"], wtpProcessType?.toUpperCase());
  assign(
    ["wtp_design_capacity_m3_day"],
    number(/производительност\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
  );
  assign(
    ["wtp_filter_train_count"],
    number(/(\d+(?:[,.]\d+)?)\s+скор\p{L}*\s+гравитационн\p{L}*\s+фильтр\p{L}*/iu),
  );
  const wtpFilterMedia = /(\d+(?:[,.]\d+)?)\s*т\s+антрацитов\p{L}*\s+загрузк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wtp_filter_media_installed_t"], wtpFilterMedia?.[1]?.replace(",", "."));
  assign(["wtp_filter_media_designation"], wtpFilterMedia?.[2]?.replace(/[.,;:]+$/u, ""));
  const wtpRawPumps = /(\d+(?:[,.]\d+)?)\s+насос\p{L}*\s+исходн\p{L}*\s+вод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wtp_raw_water_pump_installed_piece"], wtpRawPumps?.[1]?.replace(",", "."));
  assign(["wtp_raw_water_pump_designation"], wtpRawPumps?.[2]?.replace(/[.,;:]+$/u, ""));
  const wtpTreatedPumps = /(\d+(?:[,.]\d+)?)\s+насос\p{L}*\s+очищенн\p{L}*\s+вод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(
    ["wtp_treated_water_pump_installed_piece"],
    wtpTreatedPumps?.[1]?.replace(",", "."),
  );
  assign(
    ["wtp_treated_water_pump_designation"],
    wtpTreatedPumps?.[2]?.replace(/[.,;:]+$/u, ""),
  );

  assign(
    ["bh_borehole_count"],
    number(/(?:устройств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+эксплуатационн\p{L}*\s+скважин\p{L}*/iu),
  );
  const boreholeDesignation = /эксплуатационн\p{L}*\s+скважин\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["bh_borehole_designation"], boreholeDesignation?.replace(/[.,;:]+$/u, ""));
  const boreholePurpose = /назначени\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["bh_purpose"], boreholePurpose?.toUpperCase());
  assign(
    ["bh_drilled_depth_m"],
    number(/глубин\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![м\p{L}\p{N}])/iu),
  );
  assign(
    ["bh_final_bore_diameter_mm"],
    number(/конечн\p{L}*\s+диаметр\p{L}*\s+ствол\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
  );
  const boreholeCasing = /(\d+(?:[,.]\d+)?)\s*м\s+обсадн\p{L}*\s+колонн\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["bh_casing_installed_m"], boreholeCasing?.[1]?.replace(",", "."));
  assign(["bh_casing_designation"], boreholeCasing?.[2]?.replace(/[.,;:]+$/u, ""));
  const boreholeScreen = /(\d+(?:[,.]\d+)?)\s*м\s+фильтров\p{L}*\s+колонн\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["bh_screen_installed_m"], boreholeScreen?.[1]?.replace(",", "."));
  assign(["bh_screen_designation"], boreholeScreen?.[2]?.replace(/[.,;:]+$/u, ""));
  const boreholePump = /(\d+(?:[,.]\d+)?)\s+погружн\p{L}*\s+насос\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["bh_pump_installed_piece"], boreholePump?.[1]?.replace(",", "."));
  assign(["bh_pump_designation"], boreholePump?.[2]?.replace(/[.,;:]+$/u, ""));
  const boreholeRisingMain = /(\d+(?:[,.]\d+)?)\s*м\s+водоподъ[её]мн\p{L}*\s+колонн\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["bh_rising_main_installed_m"], boreholeRisingMain?.[1]?.replace(",", "."));
  assign(
    ["bh_rising_main_designation"],
    boreholeRisingMain?.[2]?.replace(/[.,;:]+$/u, ""),
  );
  const boreholeWellhead = /(\d+(?:[,.]\d+)?)\s+санитарн\p{L}*\s+оголов\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["bh_wellhead_installed_set"], boreholeWellhead?.[1]?.replace(",", "."));
  assign(["bh_wellhead_designation"], boreholeWellhead?.[2]?.replace(/[.,;:]+$/u, ""));

  assign(
    ["wiw_well_count"],
    number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+шахтн\p{L}*\s+водозаборн\p{L}*\s+колодц\p{L}*/iu),
  );
  const shaftWellDesignation = /шахтн\p{L}*\s+водозаборн\p{L}*\s+колодц\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(["wiw_well_designation"], shaftWellDesignation?.replace(/[.,;:]+$/u, ""));
  const shaftWellType = /тип\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["wiw_well_type"], shaftWellType?.toUpperCase());
  const shaftWellPurpose = /назначени\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["wiw_purpose"], shaftWellPurpose?.toUpperCase());
  assign(
    ["wiw_shaft_depth_m"],
    number(/глубин\p{L}*\s+шахт\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![м\p{L}\p{N}])/iu),
  );
  assign(
    ["wiw_internal_diameter_mm"],
    number(/внутренн\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
  );
  const shaftWellRings = /(\d+(?:[,.]\d+)?)\s+железобетонн\p{L}*\s+колец\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wiw_lining_ring_installed_piece"], shaftWellRings?.[1]?.replace(",", "."));
  assign(
    ["wiw_lining_ring_designation"],
    shaftWellRings?.[2]?.replace(/[.,;:]+$/u, ""),
  );
  const shaftWellJointSeal = /(\d+(?:[,.]\d+)?)\s*м\s+уплотнени\p{L}*\s+стык\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wiw_joint_seal_installed_m"], shaftWellJointSeal?.[1]?.replace(",", "."));
  assign(
    ["wiw_joint_seal_designation"],
    shaftWellJointSeal?.[2]?.replace(/[.,;:]+$/u, ""),
  );
  const shaftWellPumps = /(\d+(?:[,.]\d+)?)\s+погружн\p{L}*\s+насос\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["wiw_pump_installed_piece"], shaftWellPumps?.[1]?.replace(",", "."));
  assign(["wiw_pump_designation"], shaftWellPumps?.[2]?.replace(/[.,;:]+$/u, ""));
  const shaftWellDischargePipe = /(\d+(?:[,.]\d+)?)\s*м\s+напорн\p{L}*\s+труб\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(
    ["wiw_discharge_pipe_installed_m"],
    shaftWellDischargePipe?.[1]?.replace(",", "."),
  );
  assign(
    ["wiw_discharge_pipe_designation"],
    shaftWellDischargePipe?.[2]?.replace(/[.,;:]+$/u, ""),
  );
  const shaftWellCoverSlab = /(\d+(?:[,.]\d+)?)\s+плит\p{L}*\s+покрыти\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(
    ["wiw_cover_slab_installed_piece"],
    shaftWellCoverSlab?.[1]?.replace(",", "."),
  );
  assign(
    ["wiw_cover_slab_designation"],
    shaftWellCoverSlab?.[2]?.replace(/[.,;:]+$/u, ""),
  );

  assign(
    ["wps_station_count"],
    number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+станци\p{L}*\s+повышени\p{L}*\s+давлени\p{L}*\s+питьев\p{L}*\s+вод\p{L}*/iu),
  );
  const potableWaterStationDesignation = /станци\p{L}*\s+повышени\p{L}*\s+давлени\p{L}*\s+питьев\p{L}*\s+вод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
    .exec(normalized)?.[1];
  assign(
    ["wps_station_designation"],
    potableWaterStationDesignation?.replace(/[.,;:]+$/u, ""),
  );
  const potableWaterStationType = /тип\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["wps_station_type"], potableWaterStationType?.toUpperCase());
  const potableWaterStationDuty = /назначени\p{L}*\s+([A-Z][A-Z0-9_]*)/iu
    .exec(normalized)?.[1];
  assign(["wps_duty"], potableWaterStationDuty?.toUpperCase());
  assign(
    ["wps_design_flow_lps"],
    number(/расч[её]тн\p{L}*\s+подач\p{L}*\s+(\d+(?:[,.]\d+)?)\s*л\s*\/\s*с/iu),
  );
  assign(
    ["wps_design_head_m"],
    number(/расч[её]тн\p{L}*\s+напор\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![м\p{L}\p{N}])/iu),
  );
  const potableWaterStationPumps = /(\d+(?:[,.]\d+)?)\s+(?:горизонтальн\p{L}*\s+)?насосн\p{L}*\s+агрегат\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(
    ["wps_pump_installed_piece"],
    potableWaterStationPumps?.[1]?.replace(",", "."),
  );
  assign(
    ["wps_pump_designation"],
    potableWaterStationPumps?.[2]?.replace(/[.,;:]+$/u, ""),
  );
  const potableWaterPumpArrangement = /схем\p{L}*\s+(\d+(?:[,.]\d+)?)\s+рабоч\p{L}*\s*\+\s*(\d+(?:[,.]\d+)?)\s+резервн\p{L}*/iu
    .exec(normalized);
  assign(
    ["wps_duty_pump_count"],
    potableWaterPumpArrangement?.[1]?.replace(",", "."),
  );
  assign(
    ["wps_standby_pump_count"],
    potableWaterPumpArrangement?.[2]?.replace(",", "."),
  );
  assign(
    ["wps_motor_power_kw"],
    number(/мощност\p{L}*\s+двигател\p{L}*\s+(\d+(?:[,.]\d+)?)\s*кВт/iu),
  );
  const potableWaterSuctionManifold = /(\d+(?:[,.]\d+)?)\s*м\s+всасывающ\p{L}*\s+коллектор\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(
    ["wps_suction_manifold_installed_m"],
    potableWaterSuctionManifold?.[1]?.replace(",", "."),
  );
  assign(
    ["wps_suction_manifold_designation"],
    potableWaterSuctionManifold?.[2]?.replace(/[.,;:]+$/u, ""),
  );
  const potableWaterDischargeManifold = /(\d+(?:[,.]\d+)?)\s*м\s+напорн\p{L}*\s+коллектор\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(
    ["wps_discharge_manifold_installed_m"],
    potableWaterDischargeManifold?.[1]?.replace(",", "."),
  );
  assign(
    ["wps_discharge_manifold_designation"],
    potableWaterDischargeManifold?.[2]?.replace(/[.,;:]+$/u, ""),
  );
  const potableWaterPowerCable = /(\d+(?:[,.]\d+)?)\s*м\s+силов\p{L}*\s+кабел\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(
    ["wps_power_cable_installed_m"],
    potableWaterPowerCable?.[1]?.replace(",", "."),
  );
  assign(
    ["wps_power_cable_designation"],
    potableWaterPowerCable?.[2]?.replace(/[.,;:]+$/u, ""),
  );

  assign(
    ["bps_skid_count"],
    number(/(?:монтаж\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+заводск\p{L}*\s+повысительн\p{L}*\s+насосн\p{L}*\s+установк\p{L}*/iu),
  );
  const boosterSkidDesignation = /заводск\p{L}*\s+повысительн\p{L}*\s+насосн\p{L}*\s+установк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized)?.[1];
  assign(["bps_skid_designation"], boosterSkidDesignation?.replace(/[.,;:]+$/u, ""));
  const boosterSkidType = /тип\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["bps_skid_type"], boosterSkidType?.toUpperCase());
  const boosterSkidDuty = /назначени\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(normalized)?.[1];
  assign(["bps_duty"], boosterSkidDuty?.toUpperCase());
  assign(
    ["bps_design_flow_m3_h"],
    number(/расч[её]тн\p{L}*\s+подач\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*ч/iu),
  );
  assign(
    ["bps_design_head_m"],
    number(/расч[её]тн\p{L}*\s+напор\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![м\p{L}\p{N}])/iu),
  );
  const boosterSkidPumps = /(\d+(?:[,.]\d+)?)\s+(?:вертикальн\p{L}*\s+)?насосн\p{L}*\s+агрегат\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["bps_pump_installed_piece"], boosterSkidPumps?.[1]?.replace(",", "."));
  assign(["bps_pump_designation"], boosterSkidPumps?.[2]?.replace(/[.,;:]+$/u, ""));
  const boosterSkidArrangement = /схем\p{L}*\s+(\d+(?:[,.]\d+)?)\s+рабоч\p{L}*\s*\+\s*(\d+(?:[,.]\d+)?)\s+резервн\p{L}*/iu
    .exec(normalized);
  assign(["bps_duty_pump_count"], boosterSkidArrangement?.[1]?.replace(",", "."));
  assign(["bps_standby_pump_count"], boosterSkidArrangement?.[2]?.replace(",", "."));
  assign(
    ["bps_motor_power_kw"],
    number(/мощност\p{L}*\s+двигател\p{L}*\s+(\d+(?:[,.]\d+)?)\s*кВт/iu),
  );
  const boosterSkidSuction = /(\d+(?:[,.]\d+)?)\s*м\s+всасывающ\p{L}*\s+коллектор\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["bps_suction_manifold_installed_m"], boosterSkidSuction?.[1]?.replace(",", "."));
  assign(["bps_suction_manifold_designation"], boosterSkidSuction?.[2]?.replace(/[.,;:]+$/u, ""));
  const boosterSkidDischarge = /(\d+(?:[,.]\d+)?)\s*м\s+напорн\p{L}*\s+коллектор\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["bps_discharge_manifold_installed_m"], boosterSkidDischarge?.[1]?.replace(",", "."));
  assign(["bps_discharge_manifold_designation"], boosterSkidDischarge?.[2]?.replace(/[.,;:]+$/u, ""));
  const boosterSkidVessels = /(\d+(?:[,.]\d+)?)\s+гидропневматическ\p{L}*\s+бак\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["bps_pressure_vessel_installed_piece"], boosterSkidVessels?.[1]?.replace(",", "."));
  assign(["bps_pressure_vessel_designation"], boosterSkidVessels?.[2]?.replace(/[.,;:]+$/u, ""));
  const boosterSkidCable = /(\d+(?:[,.]\d+)?)\s*м\s+силов\p{L}*\s+кабел\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
    .exec(normalized);
  assign(["bps_power_cable_installed_m"], boosterSkidCable?.[1]?.replace(",", "."));
  assign(["bps_power_cable_designation"], boosterSkidCable?.[2]?.replace(/[.,;:]+$/u, ""));

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
  const filtrationStationInput = input.catalog.catalogId === FILTRATION_STATION_CATALOG_ID
    ? parseFiltrationStationOrdinaryPromptR1(input.prompt)
    : null;
  const chlorinationStationInput = input.catalog.catalogId === CHLORINATION_STATION_CATALOG_ID
    ? parseChlorinationStationOrdinaryPromptR1(input.prompt)
    : null;
  const flushingDisinfectionInput = input.catalog.catalogId === FLUSHING_DISINFECTION_CATALOG_ID
    ? parseFlushingDisinfectionOrdinaryPromptR1(input.prompt)
    : null;
  const userQuantity = pumpStationInput == null && stripFoundationInput == null
    && asphaltDrainageInput == null && asphaltRoadInput == null
    && formworkFramiXlifeInput == null && ricsNrm2FormworkInput == null
    && biaTn10MasonryInput == null && concretePlacementInput == null
    && stripFoundationReinforcementInput == null
    && anchorGroupInstallationInput == null
    && bulkheadFrameInput == null
    && filtrationStationInput == null
    && chlorinationStationInput == null
    && flushingDisinfectionInput == null
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
      ?? filtrationStationInput
      ?? chlorinationStationInput
      ?? flushingDisinfectionInput
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
        : filtrationStationInput != null
          ? "flt_station_count"
        : chlorinationStationInput != null
          ? "chl_station_count"
        : flushingDisinfectionInput != null
          ? "fld_pipeline_length_m"
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
        logger.info("RikEstimateAdmission", JSON.stringify({
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
      await createCancellableDelay(500 * (attempt + 1)).promise;
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
