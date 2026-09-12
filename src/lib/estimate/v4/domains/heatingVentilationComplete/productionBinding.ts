import type {
  ConsumerRepairAiDraft,
  ConsumerRepairItemType,
} from "../../../../consumerRequests/consumerRequestTypes";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../../buildEstimateFromInlineWorkPrompt";
import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type NormativeApplicabilityRequestV1,
  type ProfessionalDomainCompileResultV1,
  type ProfessionalDomainParameterSchemaV1,
  type AppliedProfessionalPhysicalNormResolutionV1,
  DAIKIN_3MXS_K_PRODUCT_PROFILE_ID,
  LINDAB_VSR_PRODUCT_PROFILE_ID,
  resolveProfessionalPhysicalNormParameterValuesV1,
  UPONOR_UFH_150MM_PRODUCT_PROFILE_ID,
} from "../../domainFactory";
import type {
  ProfessionalEstimateScopeModeV4,
  ProfessionalParameterValueV4,
} from "../../professionalProjectAssemblyV4";
import { hvacDomainFactory } from "./domainPackage";
import { hvacIsRepair, hvacTechnologyProfile } from "./technologyProfiles";
import {
  HVAC_COMPLETE_DOMAIN_ID,
  HVAC_DOMAIN_INVENTORY,
  type HvacDomainInventoryRow,
} from "./inventory";
import {
  PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1,
  buildProfessionalDomainVisibleBaselineV1,
  professionalDomainVisibleParameterMetadataV1,
} from "../professionalDomainVisibleBaselineV1";

export const HVAC_PRODUCTION_BINDING_VERSION =
  "heating-ventilation-production-binding:v1" as const;

export type HvacProductionDraftInput = {
  catalog_id: string;
  work_key: string;
  scope_mode: ProfessionalEstimateScopeModeV4;
  parent_revision_id: string | null;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  normative_request: Omit<NormativeApplicabilityRequestV1, "requested_source_ids" | "requested_source_types">;
  raw_input: string;
  currency: string;
  physical_norm_resolution?: AppliedProfessionalPhysicalNormResolutionV1 | null;
};

export type HvacProductionDraftResult = {
  inventory: HvacDomainInventoryRow;
  compile_result: ProfessionalDomainCompileResultV1;
  draft: ConsumerRepairAiDraft | null;
};

export type HvacInlineProductionResult = {
  exact_match: boolean;
  inventory: HvacDomainInventoryRow | null;
  missing_parameter_ids: readonly string[];
  production: HvacProductionDraftResult | null;
};

function itemType(category: string): ConsumerRepairItemType {
  if (category === "material") return "material";
  if (category === "labor" || category === "work") return "work";
  if (category === "documentation") return "document";
  return "service";
}

function primitiveParameterSnapshot(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
): Readonly<Record<string, string | number | boolean>> {
  return Object.fromEntries(Object.entries(values).map(([key, parameter]) => [key, parameter.value]));
}

function constructionState(inventory: HvacDomainInventoryRow): "NEW" | "REPAIR" {
  return hvacIsRepair(inventory) ? "REPAIR" : "NEW";
}

function normativeSourceId(inventory: HvacDomainInventoryRow): string {
  return constructionState(inventory) === "REPAIR"
    ? "kg_krerr_2015_application_guidance"
    : "kg_krer_2015_application_guidance";
}

export function buildHvacProductionDraftV1(
  input: HvacProductionDraftInput,
): HvacProductionDraftResult {
  const inventory = HVAC_DOMAIN_INVENTORY.find((candidate) =>
    candidate.catalog_id === input.catalog_id && candidate.work_key === input.work_key);
  if (!inventory) throw new Error(`HVAC_EXACT_BINDING_NOT_FOUND:${input.catalog_id}:${input.work_key}`);
  const compileResult = compileProfessionalEstimateDomainV1(
    hvacDomainFactory,
    constructionNormativeRegistryV1,
    {
      catalog_id: input.catalog_id,
      work_key: input.work_key,
      scope_mode: input.scope_mode,
      parent_revision_id: input.parent_revision_id,
      parameter_values: input.parameter_values,
      normative_request: input.normative_request,
      additional_normative_source_ids: input.physical_norm_resolution
        ? [input.physical_norm_resolution.source_id]
        : [],
      additional_normative_source_types: input.physical_norm_resolution
        ? ["MANUFACTURER_PASSPORT"]
        : [],
    },
  );
  if (compileResult.status !== "COMPILED" || !compileResult.compilation) {
    return { inventory, compile_result: compileResult, draft: null };
  }
  const compilation = compileResult.compilation;
  if (compilation.compiled_rows.length === 0) {
    throw new Error(`HVAC_EMPTY_PRODUCTION_BOQ:${input.catalog_id}`);
  }
  const technology = hvacDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = hvacDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!technology || !schema) throw new Error(`HVAC_PRODUCTION_SCHEMA_NOT_FOUND:${input.catalog_id}`);
  const passportId = `domain-passport:${input.catalog_id}:v1`;
  const requestedCatalogWorkId = input.catalog_id.startsWith("expanded-template:")
    ? input.catalog_id.slice("expanded-template:".length)
    : inventory.template_id;
  const parameterSnapshot = primitiveParameterSnapshot(input.parameter_values);
  const assumptionKeys = Object.entries(input.parameter_values)
    .filter(([, value]) => value.source_type === "VISIBLE_BASELINE_ASSUMPTION")
    .map(([key]) => key)
    .sort();
  const explicitParameterKeys = Object.entries(input.parameter_values)
    .filter(([, value]) => value.source_type !== "VISIBLE_BASELINE_ASSUMPTION")
    .map(([key]) => key)
    .sort();
  const parameterMetadata = Object.fromEntries(schema.parameters.map((parameter) => [
    parameter.parameter_id,
    professionalDomainVisibleParameterMetadataV1(parameter, input.parameter_values[parameter.parameter_id]),
  ]));
  const applicableSourceIds = compileResult.normative_resolution.applicable_sources.map((source) => source.source_id);
  const items: ConsumerRepairAiDraft["items"] = compilation.compiled_rows.map((row) => ({
    itemType: itemType(row.category),
    titleRu: row.title_ru,
    quantity: row.quantity,
    unit: row.unit_id,
    unitLabel: row.unit_id,
    unitPrice: null,
    currency: input.currency,
    source: "reference_price_book",
    category: row.section,
    sourceId: applicableSourceIds[0] ?? null,
    sourceLabel: applicableSourceIds.join(", "),
    formulaId: row.formula_id,
    quantityFormula: row.formula_expression,
    calculationTrace: row.calculation_trace,
    sourceParameters: {
      professionalDomainFactoryV1: true,
      productionBindingVersion: HVAC_PRODUCTION_BINDING_VERSION,
      domainId: HVAC_COMPLETE_DOMAIN_ID,
      domainVersion: hvacDomainFactory.package.manifest.domain_version,
      domainPackageHash: hvacDomainFactory.package_hash,
      catalogId: input.catalog_id,
      requestedCatalogWorkId,
      workKey: input.work_key,
      canonicalTechnologyId: inventory.canonical_technology_id,
      scopeCapability: inventory.scope_capability,
      scopeMode: input.scope_mode,
      parameterSchemaId: `canonical:${schema.schema_id}:${input.catalog_id}`,
      parameterSchemaVersion: schema.schema_version,
      parameterKeys: schema.parameters.map((parameter) => parameter.parameter_id),
      professionalDomainParameterMetadata: parameterMetadata,
      parameterSnapshot,
      assumptionKeys,
      explicitParameterKeys,
      parameterSourceTypes: Object.fromEntries(Object.entries(input.parameter_values).map(([key, value]) => [key, value.source_type])),
      professionalDomainVisibleBaselineVersion: PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1,
      projectAssemblyId: compilation.project_assembly_id,
      childRevisionId: row.child_revision_id,
      semanticOwner: row.semantic_owner,
      workSemanticOwner: passportId,
      professionalEstimatePassportId: passportId,
      rowCode: row.row_id,
      normativeSourceIds: row.normative_source_ids,
      parameterSourceIds: row.parameter_source_ids,
      costOwnership: row.cost_ownership,
      costOwnerId: row.cost_owner_id,
      includedInProcurement: row.procurement_eligible,
      professionalBoqCategory: row.category,
      professionalResourceGraphV3: row.resource_graph_node_v3,
      ...(input.physical_norm_resolution &&
          row.parameter_source_ids.includes(input.physical_norm_resolution.source_id)
        ? { professionalPhysicalNormApplicabilityV1: input.physical_norm_resolution }
        : {}),
    },
    templateId: passportId,
    templateVersion: hvacDomainFactory.package.manifest.domain_version,
    normSourceId: applicableSourceIds[0] ?? null,
    normSourceTitle: applicableSourceIds.join(", "),
    normVersion: compileResult.normative_resolution.normative_profile_version,
    normReviewStatus: "applicable",
    priceStatus: "PRICE_MISSING",
    priceSource: "missing",
    priceSourceId: null,
    priceSourceLabel: "Источник цены не выбран",
    costConfidence: "missing",
    confidence: "high",
    addedBy: "system",
    materialKey: row.category === "material" ? row.semantic_owner : null,
    rateKey: row.cost_owner_id,
  }));
  return {
    inventory,
    compile_result: compileResult,
    draft: {
      titleRu: inventory.localized_name_ru,
      summaryRu: `${inventory.localized_name_ru}: профессиональная ресурсная ведомость ${input.scope_mode}; строк BOQ ${items.length}.`,
      repairType: input.work_key,
      selectedWork: {
        selectedCatalogWorkId: requestedCatalogWorkId,
        selectedWorkKey: input.work_key,
        selectedWorkTitleRu: inventory.localized_name_ru,
        selectedWorkCategoryKey: "heating_hvac",
        selectedWorkCategoryTitleRu: "Отопление, вентиляция и кондиционирование",
        selectedWorkRawInput: input.raw_input,
        selectedWorkSource: "user_selected",
        selectedWorkResolverReGuessed: false,
      },
      items,
      missingData: [],
      dangerousDiyBlocked: false,
    },
  };
}

function conditionMatches(
  condition: ProfessionalDomainParameterSchemaV1["parameters"][number]["required_when"],
  supplied: NonNullable<BuildEstimateFromInlineWorkPromptInput["paramOverrides"]>,
): boolean {
  if (condition.kind === "ALWAYS") return true;
  if (condition.kind === "EQUALS") return supplied[condition.parameter_id]?.value === condition.value;
  return condition.conditions.some((item) => supplied[item.parameter_id]?.value === item.value);
}

function missingParameterIds(
  schema: ProfessionalDomainParameterSchemaV1,
  supplied: NonNullable<BuildEstimateFromInlineWorkPromptInput["paramOverrides"]>,
): string[] {
  const full = supplied.estimate_scope_mode?.value === "FULL_APPLICABLE_SCOPE";
  const missing = schema.parameters
    .filter((parameter) => parameter.priority === "P0" || (full && parameter.priority === "P1"))
    .filter((parameter) => conditionMatches(parameter.required_when, supplied))
    .filter((parameter) => {
      const value = supplied[parameter.parameter_id]?.value;
      return value == null || (typeof value === "string" && value.trim() === "");
    })
    .map((parameter) => parameter.parameter_id);
  const quantityComplete = schema.quantity_alternatives.some((alternative) => alternative.every((parameterId) => {
    const value = supplied[parameterId]?.value;
    return value != null && !(typeof value === "string" && value.trim() === "");
  }));
  if (!quantityComplete) {
    missing.push(`ONE_OF:${schema.quantity_alternatives.map((item) => item.join("+")).join("|")}`);
  }
  return [...new Set(missing)];
}

function sourceTypeForParameter(parameterId: string): ProfessionalParameterValueV4["source_type"] {
  if (
    parameterId === "normative_rate_code" ||
    parameterId === "funding_source" ||
    parameterId === "project_type" ||
    parameterId.includes("project") ||
    parameterId.includes("design") ||
    parameterId.includes("pressure") ||
    parameterId.includes("slope") ||
    parameterId.includes("elevation")
  ) return "PROJECT_DOCUMENT";
  if (
    parameterId.includes("productivity") ||
    parameterId.includes("interval") ||
    parameterId.includes("consumption_rate") ||
    parameterId.includes("spacing")
  ) return "VERIFIED_RATEBOOK";
  if (
    parameterId.includes("profile") ||
    parameterId.includes("passport") ||
    parameterId.includes("material") ||
    parameterId.includes("mass") ||
    parameterId.includes("unit_rate")
  ) return "MATERIAL_PASSPORT";
  return "USER_EXPLICIT";
}

export function buildHvacFromInlineInputV1(
  input: BuildEstimateFromInlineWorkPromptInput,
): HvacInlineProductionResult {
  const identities = [input.selectedWorkKey, input.selectedTemplateId]
    .filter((identity): identity is string => typeof identity === "string" && identity.trim().length > 0)
    .map((identity) => identity.trim());
  const inventory = HVAC_DOMAIN_INVENTORY.find((candidate) =>
    identities.includes(candidate.catalog_id) || identities.includes(candidate.work_key) ||
    identities.includes(candidate.template_id) || identities.includes(`domain-passport:${candidate.catalog_id}:v1`)) ?? null;
  if (!inventory) return { exact_match: false, inventory: null, missing_parameter_ids: [], production: null };
  const technology = hvacDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = hvacDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!technology || !schema) throw new Error(`HVAC_INLINE_SCHEMA_NOT_FOUND:${inventory.catalog_id}`);
  const baseline = buildProfessionalDomainVisibleBaselineV1({
    schema,
    catalogId: inventory.catalog_id,
    workKey: inventory.work_key,
    scopeCapability: inventory.scope_capability,
    rawInput: input.rawInput,
    supplied: input.paramOverrides,
    requireExplicitNormativeRateCode:
      input.paramOverrides?.product_profile_id?.value === UPONOR_UFH_150MM_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === LINDAB_VSR_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === DAIKIN_3MXS_K_PRODUCT_PROFILE_ID,
  });
  const baselineParameterValues = baseline.parameter_values;
  const scopeMode = baselineParameterValues.estimate_scope_mode?.value;
  if (scopeMode !== "MINIMAL_EXPLICIT_SCOPE" && scopeMode !== "FULL_APPLICABLE_SCOPE") {
    throw new Error(`HVAC_INLINE_SCOPE_INVALID:${String(scopeMode)}`);
  }
  const physicalNormResolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: hvacTechnologyProfile(inventory).technology_class,
    operation_class: inventory.operation_class,
    material_system: technology.material_system,
    scope_mode: scopeMode,
    parameter_values: baselineParameterValues,
  });
  if (physicalNormResolution.status === "BLOCKED_REQUIRED_INPUTS" ||
      physicalNormResolution.status === "BLOCKED_NOT_APPLICABLE") {
    return {
      exact_match: true,
      inventory,
      missing_parameter_ids: physicalNormResolution.blockers,
      production: null,
    };
  }
  const parameterValues = physicalNormResolution.parameter_values;
  const sourceId = normativeSourceId(inventory);
  const production = buildHvacProductionDraftV1({
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: scopeMode,
    parent_revision_id: null,
    parameter_values: parameterValues,
    normative_request: {
      country: "KG",
      region: input.city?.trim() || "Bishkek",
      funding_source: String(parameterValues.funding_source?.value ?? ""),
      project_type: String(parameterValues.project_type?.value ?? ""),
      construction_state: constructionState(inventory),
      contract_basis: [],
      effective_date: new Date().toISOString().slice(0, 10),
      material_system: technology.material_system,
      operation_class: technology.operation_class,
      product_profile_id: String(parameterValues.product_profile_id?.value ?? ""),
      rate_code_by_source_id: { [sourceId]: String(parameterValues.normative_rate_code?.value ?? "") },
    },
    raw_input: input.rawInput,
    currency: input.currency?.trim() || "KGS",
    physical_norm_resolution: physicalNormResolution.status === "APPLIED"
      ? physicalNormResolution
      : null,
  });
  return { exact_match: true, inventory, missing_parameter_ids: production.compile_result.blockers, production };
}

export function isHvacProductionDraftV1(draft: ConsumerRepairAiDraft | null): boolean {
  return Boolean(draft?.items.length && draft.items.every((item) =>
    item.sourceParameters?.professionalDomainFactoryV1 === true &&
    item.sourceParameters?.domainId === HVAC_COMPLETE_DOMAIN_ID));
}
