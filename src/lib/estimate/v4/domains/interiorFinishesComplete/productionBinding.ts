import type {
  ConsumerRepairAiDraft,
  ConsumerRepairItemType,
} from "../../../../consumerRequests/consumerRequestTypes";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../../backendPlatform/canonicalEstimateHistoricalIngress";
import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type NormativeApplicabilityRequestV1,
  type ProfessionalDomainCompileResultV1,
  type ProfessionalDomainParameterSchemaV1,
  type AppliedProfessionalPhysicalNormResolutionV1,
  CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID,
  CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID,
  CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_PRODUCT_PROFILE_ID,
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID,
  CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID,
  CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID,
  CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID,
  CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID,
  FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID,
  GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID,
  KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID,
  KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID,
  resolveAppliedProfessionalPhysicalNormIdentityV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../domainFactory";
import type {
  ProfessionalEstimateScopeModeV4,
  ProfessionalParameterValueV4,
} from "../../professionalProjectAssemblyV4";
import {
  PROFESSIONAL_MATERIAL_QUANTITY_BASIS_VERSION_V1,
  type ProfessionalMaterialQuantityBasisV1,
} from "../../../professionalMaterialQuantityContract";
import { interiorFinishesDomainFactory } from "./domainPackage";
import { interiorFinishesWave1DomainFactory } from "../interiorFinishesWave1/domainPackage";
import {
  INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  type InteriorFinishesDomainInventoryRow,
} from "./inventory";
import {
  PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1,
  buildProfessionalDomainVisibleBaselineV1,
  professionalDomainVisibleParameterMetadataV1,
} from "../professionalDomainVisibleBaselineV1";
import {
  drywallCeilingBulkheadCalculationStrategyIdV3,
  drywallCeilingBulkheadProfessionalOwnerIdV3,
  isDrywallCeilingBulkheadProfessionalCatalogIdV3,
} from "./drywallCeilingBulkheadProfessionalV3";
import {
  drywallArchitecturalElementCalculationStrategyIdV4,
  drywallArchitecturalElementProfessionalOwnerIdV4,
  drywallFlatCeilingCalculationStrategyIdV6,
  drywallFlatCeilingProfessionalOwnerIdV6,
  isDrywallArchitecturalElementProfessionalCatalogIdV4,
  isDrywallFlatCeilingProfessionalCatalogIdV6,
} from "./drywallArchitecturalElementsProfessionalV4";
import {
  drywallDomainCalculationStrategyIdV7,
  drywallDomainProfessionalOwnerIdV7,
  isDrywallDomainCompletionCatalogIdV7,
} from "./drywallDomainCompletionProfessionalV7";
import {
  applyWallPuttyCt127Krer15SourceManagedValuesV1,
  isWallPuttyCt127Krer15Target,
  validateWallPuttyCt127Krer15InputsV1,
  WALL_PUTTY_CT127_KRER15_SOURCE_ID,
} from "./wallPuttyCeresitCt127Krer15ProfessionalV1";

export const INTERIOR_FINISHES_PRODUCTION_BINDING_VERSION =
  "interior-finishes-production-binding:v1" as const;

export type InteriorFinishesProductionDraftInput = {
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

export type InteriorFinishesProductionDraftResult = {
  inventory: InteriorFinishesDomainInventoryRow;
  compile_result: ProfessionalDomainCompileResultV1;
  draft: ConsumerRepairAiDraft | null;
};

export type InteriorFinishesInlineProductionResult = {
  exact_match: boolean;
  inventory: InteriorFinishesDomainInventoryRow | null;
  missing_parameter_ids: readonly string[];
  production: InteriorFinishesProductionDraftResult | null;
};

function itemType(category: string): ConsumerRepairItemType {
  if (category === "material") return "material";
  if (category === "labor") return "work";
  if (category === "documentation") return "document";
  return "service";
}

function primitiveParameterSnapshot(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
): Readonly<Record<string, string | number | boolean>> {
  return Object.fromEntries(Object.entries(values).map(([key, parameter]) => [key, parameter.value]));
}

function puttyMaterialQuantityBasisV1(input: {
  resolution: AppliedProfessionalPhysicalNormResolutionV1 | null | undefined;
  parameterValues: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalMaterialQuantityBasisV1 | null {
  const resolution = input.resolution;
  if (!resolution) return null;
  const ct126 = resolution.calculated_ct126_net_quantity_kg != null;
  const ct127 = resolution.calculated_ct127_net_quantity_kg != null;
  if (!ct126 && !ct127) return null;
  const netQuantity = ct126
    ? resolution.calculated_ct126_net_quantity_kg
    : resolution.calculated_ct127_net_quantity_kg;
  const procurementQuantity = ct126
    ? resolution.calculated_ct126_procurement_quantity_kg
    : resolution.calculated_ct127_procurement_quantity_kg;
  const bagCount = ct126
    ? resolution.calculated_ct126_bag_count
    : resolution.calculated_ct127_bag_count;
  const packageSize = Number(input.parameterValues.selected_bag_size_kg?.value);
  if (
    netQuantity == null || !Number.isFinite(netQuantity) || netQuantity <= 0 ||
    procurementQuantity == null || !Number.isFinite(procurementQuantity) ||
    bagCount == null || !Number.isFinite(bagCount) || bagCount <= 0 ||
    !Number.isFinite(packageSize) || packageSize <= 0 ||
    Math.abs(procurementQuantity - bagCount * packageSize) > 1e-6
  ) {
    throw new Error(`PUTTY_MATERIAL_QUANTITY_BASIS_INVALID:${resolution.norm_id}`);
  }
  const formula = ct126
    ? "area_m2 × layer_thickness_mm × material_consumption_kg_m2_mm"
    : "area_m2 × selected_consumption_kg_m2";
  const quantityDependsOnParams = ct126
    ? ["area_m2", "layer_thickness_mm", "material_consumption_kg_m2_mm"]
    : ["area_m2", "selected_consumption_kg_m2"];
  const formulaInputs = Object.fromEntries(quantityDependsOnParams.map((parameterId) => [
    parameterId,
    input.parameterValues[parameterId]?.value ?? null,
  ]));
  return {
    version: PROFESSIONAL_MATERIAL_QUANTITY_BASIS_VERSION_V1,
    materialType: "wet_mix",
    unit: "kg",
    netQuantity,
    wastePercent: 0,
    lossPercent: 0,
    grossQuantity: netQuantity,
    procurementUnit: "kg",
    procurementPackageSize: packageSize,
    procurementQuantity,
    formula,
    formulaInputs,
    sourceId: resolution.source_id,
    citationLabel: `${resolution.exact_locator} (${resolution.source_document_version})`,
    calculationTrace: [
      `net=${netQuantity} kg`,
      "waste=0% (not published)",
      `package=${packageSize} kg`,
      `bags=${bagCount}`,
      `procurement=${procurementQuantity} kg`,
      `source=${resolution.source_id}`,
    ].join("; "),
    quantityDependsOnParams,
  };
}

function constructionState(inventory: InteriorFinishesDomainInventoryRow): "NEW" | "REPAIR" {
  return inventory.scope_capability === "repair" || ["repair", "replace"].includes(inventory.work_type)
    ? "REPAIR"
    : "NEW";
}

function normativeSourceId(
  inventory: InteriorFinishesDomainInventoryRow,
  productProfileId: unknown,
): string {
  if (
    isWallPuttyCt127Krer15Target(inventory) &&
    productProfileId === CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID
  ) {
    return WALL_PUTTY_CT127_KRER15_SOURCE_ID;
  }
  return constructionState(inventory) === "REPAIR"
    ? "kg_krerr_2015_application_guidance"
    : "kg_krer_2015_application_guidance";
}

export function buildInteriorFinishesProductionDraftV1(
  input: InteriorFinishesProductionDraftInput,
): InteriorFinishesProductionDraftResult {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((candidate) =>
    candidate.catalog_id === input.catalog_id && candidate.work_key === input.work_key);
  if (!inventory) throw new Error(`INTERIOR_EXACT_BINDING_NOT_FOUND:${input.catalog_id}:${input.work_key}`);
  const domainFactory = input.parameter_values.product_profile_id?.value ===
    CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_PRODUCT_PROFILE_ID
    ? interiorFinishesWave1DomainFactory
    : interiorFinishesDomainFactory;
  const physicalNormSourceIds = input.physical_norm_resolution
    ? input.physical_norm_resolution.source_ids ?? [input.physical_norm_resolution.source_id]
    : [];
  const compileResult = compileProfessionalEstimateDomainV1(
    domainFactory,
    constructionNormativeRegistryV1,
    {
      catalog_id: input.catalog_id,
      work_key: input.work_key,
      scope_mode: input.scope_mode,
      parent_revision_id: input.parent_revision_id,
      parameter_values: input.parameter_values,
      normative_request: input.normative_request,
      additional_normative_source_ids: physicalNormSourceIds,
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
    throw new Error(`INTERIOR_EMPTY_PRODUCTION_BOQ:${input.catalog_id}`);
  }
  const technology = domainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = domainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!technology || !schema) throw new Error(`INTERIOR_PRODUCTION_SCHEMA_NOT_FOUND:${input.catalog_id}`);
  const passportId = `domain-passport:${input.catalog_id}:v1`;
  const requestedCatalogWorkId = input.catalog_id;
  const domainCompletionV7 = isDrywallDomainCompletionCatalogIdV7(input.catalog_id);
  const registeredProfessionalOwner = isDrywallCeilingBulkheadProfessionalCatalogIdV3(input.catalog_id)
    ? drywallCeilingBulkheadProfessionalOwnerIdV3(input.catalog_id)
    : isDrywallArchitecturalElementProfessionalCatalogIdV4(input.catalog_id)
      ? drywallArchitecturalElementProfessionalOwnerIdV4(input.catalog_id)
      : isDrywallFlatCeilingProfessionalCatalogIdV6(input.catalog_id)
        ? drywallFlatCeilingProfessionalOwnerIdV6(input.catalog_id)
        : domainCompletionV7
          ? drywallDomainProfessionalOwnerIdV7(input.catalog_id)
          : passportId;
  const calculationStrategyId = isDrywallCeilingBulkheadProfessionalCatalogIdV3(input.catalog_id)
    ? drywallCeilingBulkheadCalculationStrategyIdV3(input.catalog_id)
    : isDrywallArchitecturalElementProfessionalCatalogIdV4(input.catalog_id)
      ? drywallArchitecturalElementCalculationStrategyIdV4(input.catalog_id)
      : isDrywallFlatCeilingProfessionalCatalogIdV6(input.catalog_id)
        ? drywallFlatCeilingCalculationStrategyIdV6(input.catalog_id)
        : domainCompletionV7
          ? drywallDomainCalculationStrategyIdV7(input.catalog_id)
          : technology.technology_id;
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
  const physicalNormIdentityByRowId = new Map(compilation.compiled_rows.map((row) => [
    row.row_id,
    resolveAppliedProfessionalPhysicalNormIdentityV1({
      resolution: input.physical_norm_resolution,
      rowParameterSourceIds: row.parameter_source_ids,
    }),
  ]));
  const physicalMaterialQuantityBasis = puttyMaterialQuantityBasisV1({
    resolution: input.physical_norm_resolution,
    parameterValues: input.parameter_values,
  });
  const items: ConsumerRepairAiDraft["items"] = compilation.compiled_rows.map((row) => ({
    itemType: itemType(row.category),
    titleRu: row.title_ru,
    quantity: row.quantity,
    unit: row.unit_id,
    unitLabel: row.unit_id,
    unitPrice: row.unit_price,
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
      productionBindingVersion: INTERIOR_FINISHES_PRODUCTION_BINDING_VERSION,
      domainId: domainFactory.package.manifest.domain_id,
      domainVersion: domainFactory.package.manifest.domain_version,
      domainPackageHash: domainFactory.package_hash,
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
      workSemanticOwner: registeredProfessionalOwner,
      professionalEstimatePassportId: registeredProfessionalOwner,
      calculationStrategyId,
      rowCode: row.row_id,
      normativeSourceIds: [...new Set([
        ...row.normative_source_ids,
        ...(row.category === "material" && input.physical_norm_resolution
          ? row.parameter_source_ids.filter((sourceId) => physicalNormSourceIds.includes(sourceId))
          : []),
      ])],
      parameterSourceIds: row.parameter_source_ids,
      costOwnership: row.cost_ownership,
      costOwnerId: row.cost_owner_id,
      includedInProcurement: row.procurement_eligible,
      professionalBoqCategory: row.category,
      formulaGraphV3: {
        graphVersion: "FormulaGraphV3",
        formulaId: row.formula_id,
        expression: row.formula_expression,
        inputValues: row.formula_input_values,
        outputUnit: row.unit_id,
        substitutionTrace: row.calculation_trace,
      },
      professionalResourceGraphV3: row.resource_graph_node_v3,
      normativeRowTraceV3: row.normative_trace_v3,
      priceRouteV3: row.price_route_v3,
      priceBasisReference: row.price_basis_reference,
      priceBasisDate: row.price_basis_date,
      workNormativeProofBundleV3: row.normative_proof_bundle_id_v3,
      workProfessionalProofBundleV3: row.professional_proof_bundle_id_v3,
      ...(input.physical_norm_resolution && physicalNormIdentityByRowId.get(row.row_id)
        ? {
          professionalPhysicalNormApplicabilityV1: input.physical_norm_resolution,
          ...(physicalMaterialQuantityBasis &&
            row.row_id.endsWith(":row:primary_material")
            ? { professionalMaterialQuantityBasisV1: physicalMaterialQuantityBasis }
            : {}),
        }
        : {}),
      ...(isDrywallArchitecturalElementProfessionalCatalogIdV4(input.catalog_id)
        ? { formulaGraphVersion: "FormulaGraphV4", resourceGraphVersion: "ResourceGraphV4" }
        : isDrywallFlatCeilingProfessionalCatalogIdV6(input.catalog_id)
          ? { formulaGraphVersion: "FormulaGraphV6", resourceGraphVersion: "ResourceGraphV6" }
          : domainCompletionV7
            ? { formulaGraphVersion: "FormulaGraphV7", resourceGraphVersion: "ResourceGraphV7" }
            : {}),
    },
    templateId: registeredProfessionalOwner,
    templateVersion: interiorFinishesDomainFactory.package.manifest.domain_version,
    normId: physicalNormIdentityByRowId.get(row.row_id)?.norm_id ?? null,
    normSourceId: physicalNormIdentityByRowId.get(row.row_id)?.source_id ?? applicableSourceIds[0] ?? null,
    normSourceTitle: applicableSourceIds.join(", "),
    normVersion: physicalNormIdentityByRowId.get(row.row_id)?.source_document_version ??
      compileResult.normative_resolution.normative_profile_version,
    normReviewStatus: "applicable",
    priceStatus: row.unit_price == null ? "PRICE_MISSING" : "USER_ENTERED_PRICE",
    priceSource: row.unit_price == null ? "missing" : "user",
    priceSourceId: row.price_source_id,
    priceSourceLabel: row.unit_price == null
      ? "Цена не применяется к информационной строке материального баланса"
      : `${row.price_basis_reference} (${row.price_basis_date})`,
    costConfidence: row.unit_price == null ? "missing" : "high",
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
        selectedWorkCategoryKey: inventory.source_domain_id,
        selectedWorkCategoryTitleRu: "Внутренние отделочные работы",
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
  const geometryComplete = schema.quantity_alternatives.some((alternative) => alternative.every((parameterId) => {
    const value = supplied[parameterId]?.value;
    return value != null && !(typeof value === "string" && value.trim() === "");
  }));
  if (!geometryComplete) missing.push(`ONE_OF:${schema.quantity_alternatives.map((item) => item.join("+")).join("|")}`);
  return [...new Set(missing)];
}

function sourceTypeForParameter(parameterId: string): ProfessionalParameterValueV4["source_type"] {
  if (parameterId === "normative_rate_code" || parameterId === "funding_source" || parameterId === "project_type" ||
    parameterId === "price_basis_reference" || parameterId === "price_basis_date") {
    return "PROJECT_DOCUMENT";
  }
  if (parameterId.startsWith("unit_price_") && parameterId.endsWith("_kgs")) return "USER_EXPLICIT";
  if (parameterId.includes("productivity") || parameterId.includes("interval")) return "VERIFIED_RATEBOOK";
  if (parameterId === "product_profile_id" || parameterId.includes("consumption") || parameterId.includes("mass")) {
    return "MATERIAL_PASSPORT";
  }
  return "USER_EXPLICIT";
}

export function buildInteriorFinishesFromInlineInputV1(
  input: BuildEstimateFromInlineWorkPromptInput,
): InteriorFinishesInlineProductionResult {
  const identities = [input.selectedWorkKey, input.selectedTemplateId]
    .filter((identity): identity is string => typeof identity === "string" && identity.trim().length > 0)
    .map((identity) => identity.trim());
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((candidate) =>
    identities.includes(candidate.catalog_id) || identities.includes(candidate.work_key) ||
    identities.includes(candidate.template_id) || identities.includes(`domain-passport:${candidate.catalog_id}:v1`)) ?? null;
  if (!inventory) return { exact_match: false, inventory: null, missing_parameter_ids: [], production: null };
  const domainFactory = input.paramOverrides?.product_profile_id?.value ===
    CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_PRODUCT_PROFILE_ID
    ? interiorFinishesWave1DomainFactory
    : interiorFinishesDomainFactory;
  const technology = domainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = domainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!technology || !schema) throw new Error(`INTERIOR_INLINE_SCHEMA_NOT_FOUND:${inventory.catalog_id}`);
  const baseline = buildProfessionalDomainVisibleBaselineV1({
    schema,
    catalogId: inventory.catalog_id,
    workKey: inventory.work_key,
    scopeCapability: inventory.scope_capability,
    rawInput: input.rawInput,
    supplied: input.paramOverrides,
    requireExplicitNormativeRateCode:
      constructionState(inventory) === "REPAIR" ||
      input.paramOverrides?.product_profile_id?.value === CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID ||
      input.paramOverrides?.product_profile_id?.value === KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID,
  });
  const baselineParameterValues = applyWallPuttyCt127Krer15SourceManagedValuesV1({
    workKey: inventory.work_key,
    parameterValues: baseline.parameter_values,
  });
  const exactNormBlockers = validateWallPuttyCt127Krer15InputsV1({
    workKey: inventory.work_key,
    parameterValues: baselineParameterValues,
  });
  if (exactNormBlockers.length > 0) {
    return {
      exact_match: true,
      inventory,
      missing_parameter_ids: exactNormBlockers,
      production: null,
    };
  }
  const scopeMode = baselineParameterValues.estimate_scope_mode?.value;
  if (scopeMode !== "MINIMAL_EXPLICIT_SCOPE" && scopeMode !== "FULL_APPLICABLE_SCOPE") {
    throw new Error(`INTERIOR_INLINE_SCOPE_INVALID:${String(scopeMode)}`);
  }
  const physicalNormResolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: technology.material_system,
    operation_class: technology.operation_class,
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
  const sourceId = normativeSourceId(inventory, parameterValues.product_profile_id?.value);
  const production = buildInteriorFinishesProductionDraftV1({
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

export function isInteriorFinishesProductionDraftV1(draft: ConsumerRepairAiDraft | null): boolean {
  return Boolean(draft?.items.length && draft.items.every((item) =>
    item.sourceParameters?.professionalDomainFactoryV1 === true &&
    item.sourceParameters?.domainId === INTERIOR_FINISHES_COMPLETE_DOMAIN_ID));
}


// Exact current linoleum continuation. No registered default or saved revision
// is changed by importing these explicit source-only functions.
import linoleumParentR1065 from '../../../../../../data/estimate-benchmarks/fixtures/linoleum-current-parent-r1065.json';
import linoleumPackR1 from '../../../../../../data/estimate-benchmarks/source-packs/linoleum-current-oem-physical-cycle-r1.json';
import {buildAutomaticConstructionOwnerR1 as buildLinoleumAutomaticR1,
 compileAutomaticConstructionOwnerR1 as compileLinoleumAutomaticR1,
 unresolvedApplicationNormTruthR1 as linoleumUnresolvedR1,
 type AutomaticOwnerDefinition as LinoleumDefinitionR1,
 type AutomaticParameterSpec as LinoleumParameterR1,
 type AutomaticRowSpec as LinoleumRowR1,
 type AutomaticInclusionCondition as LinoleumConditionR1} from '../../automaticConstructionOwnerR1';
import {canonicalEstimateStableJson as linoleumStableR1} from '../../../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText as linoleumShaTextR1} from '../../../backendPlatform/canonicalEstimateSha256';
import {compileFormulaGraph as linoleumFormulaR1, type FormulaAst as LinoleumAstR1} from '../../../backendPlatform/formulaGraph';
import {estimateDeterministicHash as linoleumRowHashR1} from '../../../estimateDeterministicHash';
import {effectivePurchaseBalanceExpressionsR1 as linoleumBalanceR1} from '../../effectivePurchaseBalanceR1';

type LinoleumRecordR1=Record<string,unknown>;
const lr1=(value:unknown):LinoleumRecordR1=>{if(value===null||typeof value!=='object'||Array.isArray(value))throw Error('LINOLEUM_R1_RECORD_REQUIRED');return Object.fromEntries(Object.entries(value));};
const lt1=(value:unknown):string=>{if(typeof value!=='string')throw Error('LINOLEUM_R1_TEXT_REQUIRED');return value;};
const la1=(value:unknown):unknown[]=>{if(!Array.isArray(value))throw Error('LINOLEUM_R1_ARRAY_REQUIRED');return value;};
const lb1=(value:unknown):boolean=>{if(typeof value!=='boolean')throw Error('LINOLEUM_R1_BOOLEAN_REQUIRED');return value;};
const li1=(value:unknown):number=>{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw Error('LINOLEUM_R1_ORDINAL_REQUIRED');return value;};
function linoleumAstR1(value:unknown):LinoleumAstR1{
 const x=lr1(value);
 if(x.kind==='literal')return{...x,kind:'literal',value:lt1(x.value)};
 if(x.kind==='parameter')return{...x,kind:'parameter',id:lt1(x.id)};
 if(x.kind==='unary'&&(x.operator==='+'||x.operator==='-'))return{...x,kind:'unary',operator:x.operator,operand:linoleumAstR1(x.operand)};
 if(x.kind==='binary'&&(x.operator==='+'||x.operator==='-'||x.operator==='*'||x.operator==='/'))return{...x,kind:'binary',operator:x.operator,left:linoleumAstR1(x.left),right:linoleumAstR1(x.right)};
 if(x.kind==='conditional')return{...x,kind:'conditional',condition:linoleumAstR1(x.condition),whenTrue:linoleumAstR1(x.whenTrue),whenFalse:linoleumAstR1(x.whenFalse)};
 if(x.kind==='call'&&(x.function==='ceil'||x.function==='floor'||x.function==='max'||x.function==='min'||x.function==='pow'||x.function==='round_to'||x.function==='sqrt'||x.function==='unit_convert'))return{...x,kind:'call',function:x.function,arguments:la1(x.arguments).map(linoleumAstR1)};
 throw Error('LINOLEUM_R1_AST_REQUIRED');
}
export const linoleumCurrentWholePackR1=linoleumPackR1;
/** All ten actual sets, full header, raw provenance and arithmetic are guarded
 * before mapping. No reconstruction from the manifest or generic59 fixture. */
export function linoleumActualCurrentR1(actual:unknown=linoleumParentR1065):LinoleumDefinitionR1{
 const snapshot=lr1(actual),body=lr1(snapshot.body),header=lr1(snapshot.header);
 if(linoleumStableR1(header)!==linoleumStableR1(linoleumPackR1.parent.header)
  ||linoleumShaTextR1(linoleumStableR1(body))!==linoleumPackR1.parent.bodySha256)throw Error('LINOLEUM_R1_ACTUAL_R1065_BODY_REQUIRED');
 const definition=lr1(la1(body.definition)[0]);
 if(definition.catalog_id!==linoleumPackR1.catalogId||definition.id!==header.definition_version_id
  ||definition.definition_sha256!==header.definition_sha256||definition.definition_version!==3)throw Error('LINOLEUM_R1_ACTUAL_HEADER_REQUIRED');
 const parameters:LinoleumDefinitionR1['parameters'][number][]=la1(body.parameters).map(raw=>{const p=lr1(raw);return{...p,
  parameter_id:lt1(p.parameter_id),ordinal:li1(p.ordinal),value_type:lt1(p.value_type),unit_id:p.unit_id===null?null:lt1(p.unit_id),title_ru:lt1(p.title_ru),
  required:lb1(p.required),default_value:p.default_value,constraints_json:p.constraints_json===null?null:lr1(p.constraints_json),truth_metadata:lr1(p.truth_metadata)};});
 const formulas:LinoleumDefinitionR1['formulas'][number][]=la1(body.formulas).map(raw=>{const f=lr1(raw),expression=lt1(f.expression_source),compiled=linoleumFormulaR1(expression),ast=linoleumAstR1(f.ast),inputs=la1(f.input_parameter_ids).map(lt1);
  if(linoleumStableR1(compiled.ast)!==linoleumStableR1(ast)||linoleumStableR1(compiled.inputParameterIds)!==linoleumStableR1(inputs))throw Error('LINOLEUM_R1_RETAINED_FORMULA_PARITY');
  return{...f,formula_id:lt1(f.formula_id),output_unit_id:lt1(f.output_unit_id),expression_source:expression,ast,input_parameter_ids:inputs,ast_sha256:lt1(f.ast_sha256)};});
 const resources:LinoleumDefinitionR1['resources'][number][]=la1(body.resources).map(raw=>{const r=lr1(raw);return{...r,id:lt1(r.id),row_id:lt1(r.row_id),ordinal:li1(r.ordinal),section:lt1(r.section),category:lt1(r.category),title_ru:lt1(r.title_ru),unit_id:lt1(r.unit_id),formula_id:lt1(r.formula_id),inclusion_ast:lr1(r.inclusion_ast),resource_graph:lr1(r.resource_graph),procurement_eligible:lb1(r.procurement_eligible),cost_owner_id:r.cost_owner_id===null?null:lt1(r.cost_owner_id),source_metadata:r.source_metadata===null?null:lr1(r.source_metadata),row_sha256:lt1(r.row_sha256)};});
 if(parameters.length!==1||formulas.length!==59||resources.length!==59||la1(body.bindings).length!==0||la1(body.locators).length!==0||la1(body.sources).length!==0)throw Error('LINOLEUM_R1_CURRENT_SHAPE_REQUIRED');
 return{parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']};
}
const lp1=linoleumPackR1,ln1=lp1.namespace,lid1=(key:string)=>ln1+key,
 leq1=(id:string,value:string):LinoleumConditionR1=>({kind:'equals',parameterId:id,value}),
 lexact1=leq1(lp1.selector.parameterId,lp1.selector.exactValue);
const linoleumFactIdsR1=(keys:readonly string[])=>keys.map(key=>{const f=lp1.protectedFacts.find(f=>f.key===key);if(!f)throw Error('LINOLEUM_R1_FACT:'+key);return f.id;});
function linoleumOperationsR1(keys:readonly string[]){
 const refs=keys.map(key=>{const o=lp1.operations.find(o=>o.key===key);if(!o)throw Error('LINOLEUM_R1_OPERATION:'+key);return{operationId:lid1('operation:'+key),operationTitleRu:o.titleRu,processOrdinal:lp1.operations.indexOf(o)*10,processRole:'PROCESS' as const,completionCriterionRu:'Реальное обеспечение и результат подработы проверены в точной применимой технологии; открытые количества не скрываются.'};});
 return{contractVersion:'canonical-operation-resource/v1',groupId:ln1,groupTitleRu:lp1.titleRu,...refs[0]!,additionalOperations:refs.slice(1)};
}
function linoleumPublicKindR1(key:string){
 if(['chemical-glove','chemical-goggle','cut-protection','knee-protection','work-footwear'].includes(key))return 'PPE';
 if(key==='labour')return 'LABOR';if(key==='vehicle')return 'TRANSPORT';
 if(['moisture-test','quality-service','handover-doc','waste-haul'].includes(key))return 'SERVICE';
 if(['covering','adhesive','clean-water','weld-cable','perimeter-seal','neutral-cleaner'].includes(key))return 'MATERIAL';
 if(['wipe','straight-blade','hooked-blade','vacuum-filter','vacuum-bag','mop-pad','waste-sack','wet-waste-vessel','sharps-vessel','protection-cover'].includes(key))return 'CONSUMABLE';
 return ['vacuum','handling-trolley','upright-storage','inspection-light','power-provision'].includes(key)?'EQUIPMENT':'TOOL';
}
function linoleumRehashR1(row:LinoleumDefinitionR1['resources'][number]):LinoleumDefinitionR1['resources'][number]{const{row_sha256:_old,...content}=row;return{...content,row_sha256:linoleumRowHashR1(content)};}
/** Same existing catalog and compiler. Legacy59 remains a distinct executable
 * branch; none of its area coefficients, owners or provenance gain OEM status. */
export function buildLinoleumCurrentWholeR1(actual:unknown=linoleumParentR1065):LinoleumDefinitionR1{
 const old=linoleumActualCurrentR1(actual),evidence=lp1.primaryPins[0]!,held=new Map(lp1.resources.filter(r=>r.heldQuantity).map(r=>[r.expression,r.quantityBasis])),
  selectors:LinoleumParameterR1[]=[{id:lp1.selector.parameterId,title:'Способ укладки существующей карточки',valueType:'enum',unitId:null,kind:'ordinary',values:[lp1.selector.legacyValue,lp1.selector.exactValue]},
   {id:lp1.seamParameterId,title:'Тип стыка по принятой спецификации',valueType:'enum',unitId:null,kind:'ordinary',values:lp1.seamValues},
   {id:lp1.edgeParameterId,title:'Способ прижатия недоступных катку примыканий',valueType:'enum',unitId:null,kind:'ordinary',values:lp1.edgeValues}],
  ordinary:LinoleumParameterR1[]=[...selectors,...lp1.numericDrivers.map(d=>({id:d.id,title:d.titleRu,valueType:d.integer?'integer' as const:'decimal' as const,unitId:d.unitId,kind:'ordinary' as const,min:d.minimum}))],
  conditional:LinoleumParameterR1[]=[...lp1.protectedFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:f.values,
    // Real application facts use the existing Core consumer requirement.
    // Optional numerical measurements remain separate row quantity needs.
    requiredWhen:f.key==='weld_method'?{kind:'and' as const,operands:[lexact1,leq1(lp1.seamParameterId,'HOT_WELD')]}
     :f.key==='netfit_permission'?{kind:'and' as const,operands:[lexact1,leq1(lp1.seamParameterId,'NET_FIT')]}:lexact1})),
   ...[...held].map(([id,title])=>({id,title,valueType:'decimal' as const,unitId:lp1.resources.find(r=>r.expression===id)!.unitId,kind:'internal' as const,min:0}))];
 const rows:LinoleumRowR1[]=lp1.resources.map(r=>{
  let inclusion:LinoleumConditionR1=lexact1;
  if(r.appliesWhen?.includes('HOT_WELD'))inclusion={kind:'and',operands:[lexact1,leq1(lp1.seamParameterId,'HOT_WELD')]};
  if(r.functionKey==='perimeter-seal')inclusion={kind:'and',operands:[lexact1,leq1(lp1.parameterPrefix+'perimeter_scope','SEAL_REQUIRED')]};
  if(r.functionKey==='rubbing-hammer')inclusion={kind:'and',operands:[lexact1,leq1(lp1.edgeParameterId,'HAMMER')]};
  // No sealant is implied by area or by a general wish for welded seams.
  // Its exact applicable junction remains an explicit held physical need.
  return{rowId:r.rowId,formulaId:r.formulaId,section:r.primaryOperation,category:r.functionKey==='labour'?'labor':r.functionKey==='vehicle'?'transport':r.unitId==='pcs'&&['moisture-test','quality-service','handover-doc'].includes(r.functionKey)?'service':['covering','adhesive','clean-water','wipe','protection-cover','weld-cable','perimeter-seal','neutral-cleaner','waste-sack','wet-waste-vessel','sharps-vessel','straight-blade','hooked-blade','vacuum-bag'].includes(r.functionKey)?'material':'equipment',title:r.nameRu,unitId:r.unitId,expression:r.expression,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion,
   inputParameterIds:[...linoleumFactIdsR1(r.factKeys),lp1.seamParameterId,lp1.edgeParameterId],
   ...(['clean-water','waste-haul','covering'].includes(r.functionKey)?{formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId:r.unitId,minimum:0,reasonRu:'Сырой измерительный баланс не заменяется max(0) и не скрывает отрицательный результат.'}}:{})};
 });
 const rate=lp1.quantityRules.acceptedRate,consumed=lp1.resources.find(r=>r.functionKey==='adhesive')!.expression,balance=linoleumBalanceR1({ownerRowId:lid1('adhesive-order'),orderUnitId:'kg',consumed,stock:lp1.parameterPrefix+'adhesive_stock_kg',reserve:lp1.parameterPrefix+'adhesive_reserve_kg',quantum:'11*'+lp1.parameterPrefix+'adhesive_supplier_bucket_multiple'});
 rows.push({rowId:lid1('adhesive-rate-check'),formulaId:lid1('formula:adhesive-rate-check'),section:'adhesive',category:'service',title:'Контроль удельного расхода принятой пробы',unitId:'kg_per_m2',expression:rate,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:lexact1,inputParameterIds:linoleumFactIdsR1(['product','bond']),formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg_per_m2',minimum:0.280,maximum:0.385,reasonRu:'Взята только точная EN611V17 область280–385г/м²; среднее или расход другой версии не подставляется.'}},
  {rowId:lid1('covering-balance-check'),formulaId:lid1('formula:covering-balance-check'),section:'layout',category:'service',title:'Баланс выданного покрытия, укладки и пригодного возврата',unitId:'m2',expression:lp1.resources.find(r=>r.functionKey==='covering')!.expression+'-'+lp1.parameterPrefix+'net_area_m2',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:lexact1,inputParameterIds:linoleumFactIdsR1(['layout','dedicated_records']),formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'m2',minimum:0,reasonRu:'Выданная площадь должна покрывать укладку и пригодный возврат; неизвестные потери не подменяются процентом.'}},
  {rowId:lid1('trial-area-check'),formulaId:lid1('formula:trial-area-check'),section:'adhesive',category:'service',title:'Принятая проба внутри окончательной площади',unitId:'m2',expression:lp1.parameterPrefix+'net_area_m2-'+lp1.parameterPrefix+'trial_bonded_area_m2',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:lexact1,inputParameterIds:linoleumFactIdsR1(['bond']),formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'m2',minimum:0,reasonRu:'Проба в этом узком методе входит в укладку; внешняя проба не удваивается и требует собственного подтверждённого баланса.'}},
  {rowId:lid1('covering-order'),formulaId:lid1('formula:covering-order'),section:'incoming',category:'material',title:'Покрытие по принятой ведомости покупных отрезов',unitId:'m2',expression:lp1.quantityRules.coveringOrder,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:lexact1,inputParameterIds:linoleumFactIdsR1(['product','layout','dedicated_records'])},
  {rowId:lid1('adhesive-order'),formulaId:lid1('formula:adhesive-order'),section:'incoming',category:'material',title:'Клей по подтверждённому балансу поставки',unitId:'kg',expression:`ceil(max(0,(${consumed})+${lp1.parameterPrefix}adhesive_reserve_kg-${lp1.parameterPrefix}adhesive_stock_kg)/(11*${lp1.parameterPrefix}adhesive_supplier_bucket_multiple))*(11*${lp1.parameterPrefix}adhesive_supplier_bucket_multiple)`,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:lexact1,inputParameterIds:linoleumFactIdsR1(['product','bond','dedicated_records']),...balance.owner},
  {rowId:lid1('edge-roller-scope'),formulaId:lid1('formula:edge-roller-scope'),section:'junctions',category:'service',title:'Прижатие примыканий ручным роликом',unitId:'m2',expression:lp1.parameterPrefix+'net_area_m2',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:{kind:'and',operands:[lexact1,leq1(lp1.edgeParameterId,'ROLLER')]},inputParameterIds:linoleumFactIdsR1(['equipment'])},
  {rowId:lid1('netfit-scope'),formulaId:lid1('formula:netfit-scope'),section:'net-seam',category:'service',title:'Допуск стыка без сварки по назначению',unitId:'m2',expression:lp1.parameterPrefix+'net_area_m2',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:{kind:'and',operands:[lexact1,leq1(lp1.seamParameterId,'NET_FIT')]},inputParameterIds:linoleumFactIdsR1(['netfit_permission'])});
 const added=buildLinoleumAutomaticR1({contract:lp1.contract,semanticOwner:ln1,sourceId:lp1.sourceId,normId:'LINOLEUM_EXACT_OEM_METHOD_MEASUREMENTS_NOT_LABOUR_NORM',sourceMetadata:{source_title:lp1.titleRu,source_document_version:lp1.contract,definition_hash:evidence.sha256,artifact_sha256:evidence.sha256,exact_locator:'Source pack resources/operations/quantityRules; exact UKSheet032021 and611ENBG132567V17; original59 not OEM norms'},applicabilityRu:lp1.scopeRu,ordinary,profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:lp1.sourceHolds});
 const factIds=new Set(lp1.protectedFacts.map(f=>f.id)),numericIds=new Set(lp1.numericDrivers.map(d=>d.id)),selectorIds=new Set(selectors.map(s=>s.id));
 const parameters=[...old.parameters,...added.parameters.map((p,index)=>{
  let truth=p.truth_metadata;
  if(factIds.has(p.parameter_id))truth={...truth,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}};
  else if(held.has(p.parameter_id))truth=linoleumUnresolvedR1(truth,held.get(p.parameter_id)!);
  else if(numericIds.has(p.parameter_id)||selectorIds.has(p.parameter_id))truth={...truth,visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,visible_when:p.parameter_id===lp1.selector.parameterId?{kind:'literal',value:true}:lexact1,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...lr1(truth.guide),source_role:'USER_MEASURED',guide_kind:'MEASUREMENT_RULE',source_document:lp1.quantityEvidence.path,source_locator:'Sections3-7: exact dimensions and one-use measured flow; no defaults',source_snapshot_hash:lp1.quantityEvidence.sha256}};
  return{...p,ordinal:old.parameters.length+index,required:false,default_value:null,truth_metadata:truth};
 })];
 const legacy=leq1(lp1.selector.parameterId,lp1.selector.legacyValue),resources=[...old.resources.map(r=>linoleumRehashR1({...r,inclusion_ast:{kind:'and',operands:[legacy,r.inclusion_ast]}})),...added.resources.map((r,index)=>{
  const item=lp1.resources.find(item=>item.rowId===r.row_id),ops=item?.operations??((r.row_id.includes('rate')||r.row_id.includes('trial-area'))?['adhesive']:r.row_id.includes('netfit')?['net-seam']:r.row_id.includes('edge-roller')?['junctions']:r.row_id.includes('covering-balance')?['layout']:['incoming']),facts=item?linoleumFactIdsR1(item.factKeys):(Array.isArray(r.resource_graph.inputParameterIds)?r.resource_graph.inputParameterIds.filter((value):value is string=>typeof value==='string'&&factIds.has(value)):[]);
  return linoleumRehashR1({...r,ordinal:old.resources.length+index,resource_graph:{...r.resource_graph,operationCompositionV1:item?.functionKey==='hand-roller'?{...linoleumOperationsR1(ops),additionalOperations:linoleumOperationsR1(ops).additionalOperations.map(op=>({...op,whenResourcePresent:[lid1('edge-roller-scope')]}))}:linoleumOperationsR1(ops),requiredFactConditionIds:facts,scopeContextParameterIds:[lp1.parameterPrefix+'net_area_m2'],publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:r.title_ru,sourceTitleRu:r.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:[],...(item?{resourceKind:linoleumPublicKindR1(item.functionKey)}:{rowKind:'PROCESS_NOTE'})},...(item?.suppliedWithKitResourceRowId?{suppliedWithKitResourceRowId:item.suppliedWithKitResourceRowId}:{}),sourceOnlyPaymentBoundaryR1:{noSecondPaymentOrOrder:true,actualPaidOwnerOrOrderNotAsserted:true}},source_metadata:{...r.source_metadata,source_kind:'PROJECT_SYSTEM',native59NormAuthorityTransferred:false,actualObjectFactsAsserted:false,fullTechnicalAcceptance:false}});
 })];
 if(new Set([...old.formulas,...added.formulas].map(f=>f.formula_id)).size!==old.formulas.length+added.formulas.length)throw Error('LINOLEUM_R1_FORMULA_ID_COLLISION');
 return{parameters,formulas:[...old.formulas,...added.formulas],resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[...new Set([lp1.selector.parameterId,lp1.parameterPrefix+'net_area_m2',lp1.seamParameterId,lp1.edgeParameterId,...lp1.numericDrivers.map(d=>d.id)])]};
}
export function compileLinoleumCurrentWholeR1(submitted:Record<string,unknown>,confirmed:Record<string,unknown>={},actual:unknown=linoleumParentR1065){
 const effective=Object.hasOwn(submitted,lp1.selector.parameterId)?submitted:{...submitted,[lp1.selector.parameterId]:lp1.selector.legacyValue};
 return compileLinoleumAutomaticR1({catalogId:lp1.catalogId,compilerVersion:lp1.contract,primaryMeasureParameterId:effective[lp1.selector.parameterId]===lp1.selector.exactValue?lp1.parameterPrefix+'net_area_m2':'q',definition:buildLinoleumCurrentWholeR1(actual),submittedParameters:effective,confirmedParameters:confirmed});
}
export function linoleumCurrentWholeExpectationsR1(){return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:lp1.primaryPins[0]!.sha256,
 entries:lp1.resources.map(r=>({expectedResourceId:r.functionKey,sourceId:lp1.sourceId,operationId:lid1('operation:'+r.primaryOperation),condition:lp1.scopeRu,specification:r.authority,unitId:r.unitId,formulaId:r.formulaId,quantityRule:r.quantityBasis,requiredOperationIds:r.operations.map(o=>lid1('operation:'+o)),resolution:{kind:'ROW',rowId:r.rowId}})),legacy59ReboundToOemAuthority:false,fullTechnicalAcceptance:false};}
/** Ordinary production is held, not routed into a migration main() or granted
 * new authority by mapping zero native bindings to an unrelated OEM locator. */
export function linoleumCurrentWholeOrdinaryRequestR1(){return{catalogId:lp1.catalogId,sourceId:lp1.sourceId,existingPublisher:'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',status:'SOURCE_AWARE_ORDINARY_TARGET_CONFIG_HELD',expectedCurrentHeader:lp1.parent.header,expectedCurrentShape:lp1.parent.shape,nativeRegistryCounts:[0,0,0],candidateSourceObservation:lp1.formalIntake.newCandidateSourceObservation,legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:'flooring_interior_linoleum_lay_standard_professional_expanded_v1',parameterSources:{q:['r555-source:flooring_interior_linoleum_lay_standard_professional_expanded_v1']}},nativeRowsMustNotReceiveNewOemBinding:true,newBindingRowIds:buildLinoleumCurrentWholeR1().resources.slice(59).map(r=>r.row_id),existingRetainedGuardAppearsApplicableBySourceReview:true,defaultSelectorUnchanged:true,requiredBeforeRuntime:['existing scoped capture over current source/parameter binding closure','explicit legacy59 historical source disposition without OEM normative rebinding','finite typed partial witness over exact selected resource closure'],newReader:false,newPublisher:false,admissionGranted:false};}


// R2 is an explicit pure source recipe. R1 legacy/weld/seal branches above and
// their unresolved needs are immutable. No import selects R2 or rewrites a draft.
import linoleumParentR1115 from '../../../../../../data/estimate-benchmarks/fixtures/linoleum-current-parent-r1115.json';
import linoleumQuantityR2 from '../../../../../../data/estimate-benchmarks/source-packs/linoleum-current-project-quantity-cycle-r2.json';
const lp2=linoleumQuantityR2;
export const linoleumCurrentProjectQuantityPackR2=lp2;
const lq2=lp2.quantityReclassification;
const lprojectGuideR2=(parameterId:string,title:string)=>({guide_kind:'MEASUREMENT_RULE',source_role:'USER_SUPPLIED_OBJECT_FACT',
 guide_validation_policy:'MANDATORY_BLOCK',guide_version:lp2.contract,source_document:lp2.quantityEvidence.path,
 source_snapshot_hash:lp2.quantityEvidence.sha256,source_locator:'45-row disposition:'+parameterId,
 guide_short_ru:title,applicability:'Фактические измерения/ведомость предоставления выбранного метода; не норма на м², срок службы или доказательство технологической достаточности.'});
const lstructuralR2:Readonly<Record<string,string>>={[lp1.selector.parameterId]:lp2.method.value,
 [lp1.seamParameterId]:lp2.method.seam,[lp1.edgeParameterId]:lp2.method.edge};
function linoleumProjectTruthR2(old:LinoleumRecordR1,id:string,title:string):LinoleumRecordR1{
 const {unresolved_norm_reason:_hold,...rest}=old;
 return {...rest,visibility_role:'USER_INPUT',value_source_role:'CONDITIONAL_PROJECT_FACT',source_confirmation_required:false,
  provenance:{consumer_input_role_v1:'ADVANCED_OPTION'},visible_when:lexact1,guide:lprojectGuideR2(id,title)};
}
/** Counts remain unknown until actual signed records exist. Provision is not a
 * productivity norm. The only new dose has an exact separate cleaning-water input. */
export function buildLinoleumCurrentProjectQuantityR2(actual:unknown=linoleumParentR1115):LinoleumDefinitionR1{
 const base=buildLinoleumCurrentWholeR1(actual),seal=lq2.find(r=>r.functionKey==='perimeter-seal')!,clean=lq2.find(r=>r.functionKey==='neutral-cleaner')!,
  quantities=new Map(lq2.filter(r=>!['perimeter-seal','neutral-cleaner'].includes(r.functionKey)).map(r=>[r.quantityParameterId,r])),
  numeric=new Map(lp1.numericDrivers.map(d=>[d.id,d])),none=lp1.parameterPrefix+'perimeter_scope';
 const parameters:LinoleumDefinitionR1['parameters'][number][]=base.parameters
 .filter(p=>p.parameter_id!==seal.quantityParameterId&&p.parameter_id!==clean.quantityParameterId).map(p=>{
  const id=p.parameter_id;
  if(Object.hasOwn(lstructuralR2,id))return {...p,required:false,default_value:null,constraints_json:{values:[lstructuralR2[id]!]},truth_metadata:{...p.truth_metadata,
   visibility_role:'INTERNAL_ONLY',value_source_role:'COMPILER_DERIVED_RESOURCE_QUANTITY',source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},guide:{...lprojectGuideR2(id,'Версия явно выбранного узкого метода; не факт объекта.'),guide_kind:'PROJECT_DEFINED',source_role:'PROJECT_DOCUMENTATION'}}};
  const q=quantities.get(id);
  if(q)return {...p,title_ru:(q.after==='SIGNED_ISSUED_MINUS_USABLE_UNUSED_RETURN'?'Выдано за вычетом пригодного возврата: ':q.after==='DISTINCT_ACCEPTED_EVENT_RECORDS'?'Количество принятых событий: ':'Фактически предоставлено: ')+(lp1.resources.find(r=>r.rowId===q.needId)!.nameRu),required:false,default_value:null,value_type:q.unitId==='pcs'||q.unitId==='pair'?'integer':'decimal',constraints_json:{min:0},
   truth_metadata:linoleumProjectTruthR2(p.truth_metadata,id,q.guideRu)};
  const d=numeric.get(id);
  if(d)return {...p,required:false,default_value:null,truth_metadata:linoleumProjectTruthR2(p.truth_metadata,id,d.titleRu+'; отдельный фактический документ безdefault.')};
  if(id===lp1.parameterPrefix+'clean_method'||id===lp1.parameterPrefix+'safety')return {...p,title_ru:p.title_ru+'; точный очиститель888BG175222V08/SDS6.0/17.03.2023',truth_metadata:{...p.truth_metadata,guide:{...lr1(p.truth_metadata.guide),guide_version:lp2.contract,source_document:lp2.primaryPins[0]!.sourcePath,source_snapshot_hash:lp2.primaryPins[0]!.sha256,guide_short_ru:'Ручная первоначальная очистка только совместимым888BG175222V08, точнаяSDS6.0/17.03.2023, риск/защита глаз/подходящие химические перчатки по их изготовителю; не норма износа. Условия611 и его deliveredSDS не отменяются.'}}};
  if(id===none)return {...p,required:false,default_value:null,constraints_json:{...p.constraints_json,values:[lp2.method.perimeter],requiredWhen:lexact1},
   truth_metadata:{...p.truth_metadata,provenance:{...lr1(p.truth_metadata.provenance),source_readback_only_v1:true,consumer_question_allowed:false},
    guide:{...lr1(p.truth_metadata.guide),guide_version:lp2.contract,source_document:lp2.quantityEvidence.path,source_snapshot_hash:lp2.quantityEvidence.sha256,
     guide_short_ru:'Только фактическое принятое отсутствие узла герметизации; NONE не выводится из неизвестного расхода. Не подставлять при неизвестном узле.'}}};
  return p;
 });
 const reference=parameters.find(p=>p.parameter_id===lp1.parameterPrefix+'wash_start_l')!;
 parameters.push({...reference,parameter_id:lp2.cleaner.waterParameterId,ordinal:parameters.length,title_ru:'Вода отдельной партии первоначальной очистки пола',unit_id:'l',value_type:'decimal',required:false,default_value:null,constraints_json:{min:0},
  truth_metadata:linoleumProjectTruthR2(reference.truth_metadata,lp2.cleaner.waterParameterId,'Фактические литры чистой холодной воды только для100мл/8л первоначальной очистки. Не вода промывки инструмента; не площадь; та же партия в общем счётчике учитывается один раз.')});
 const formulas=base.formulas.map(f=>{
  const expression=f.formula_id===lid1('formula:neutral-cleaner')?lp2.cleaner.expression:f.formula_id===lid1('formula:perimeter-seal')?'0':null;
  if(expression===null)return f;
  const compiled=linoleumFormulaR1(expression);return {...f,expression_source:expression,ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,
   ast_sha256:linoleumShaTextR1(linoleumStableR1(compiled.ast))};
 });
 const resources=base.resources.map(r=>{
  if(!r.row_id.startsWith(ln1))return r;
  const sealRow=r.row_id===lid1('perimeter-seal'),graph=r.resource_graph,trace=Array.isArray(r.source_metadata?.normativeTrace)?r.source_metadata.normativeTrace.map(value=>({...lr1(value),sourceId:lp2.sourceId,source_id:lp2.sourceId,normVersion:lp2.contract})):[];
  return linoleumRehashR1({...r,...(sealRow?{inclusion_ast:{kind:'literal',value:false}}:{}),resource_graph:{...graph,
   inputParameterIds:[...new Set([...(Array.isArray(graph.inputParameterIds)?graph.inputParameterIds.filter((x):x is string=>typeof x==='string'):[]),none])],
   ...(sealRow?{notApplicablePureMethodR2:{contract:lp2.contract,reason:'EXPLICIT_NET_FIT_ROLLER_NONE_ONLY;not a zero physical quantity',originalSourceId:lp1.sourceId,
    archivedQuantityParameterId:seal.quantityParameterId,archivedExpression:seal.quantityParameterId,sourceNormStillHeld:true,notAnObjectClosure:true}}:{}),
   sourceOnlyPaymentBoundaryR1:{noSecondPaymentOrOrder:true,actualPaidOwnerOrOrderNotAsserted:true}},source_metadata:{...r.source_metadata,normativeTrace:trace,
    projectQuantityCycleR2:{contract:lp2.contract,quantityNormAdded:false,actualObjectFactsAsserted:false,providedCountDoesNotProveSufficiency:true,
     scope:lp2.method,perimeterNormArchivedNotResolved:true}}});
 });
 const definition:LinoleumDefinitionR1={...base,parameters:parameters.map((p,i)=>({...p,ordinal:i})),formulas,resources,
  runtimeInput:lstructuralR2,runtimeClassification:{},runtimeSourceIds:Object.fromEntries(Object.keys(lstructuralR2).map(id=>[id,[lp2.sourceId]])),
  ordinaryParameterIds:parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT'&&p.parameter_id!=='q').map(p=>p.parameter_id)};
 assertLinoleumCurrentProjectQuantityScopeR2(definition);return definition;
}
/** A source-owned shape invariant, not an admission bypass. The ordinary shared
 * publisher still performs capture, retained arithmetic and source checks. */
export function assertLinoleumCurrentProjectQuantityScopeR2(d:LinoleumDefinitionR1):void{
 const old=linoleumActualCurrentR1(linoleumParentR1115),none=lp1.parameterPrefix+'perimeter_scope',seal=d.resources.find(r=>r.row_id===lid1('perimeter-seal')),
  f=d.formulas.find(f=>f.formula_id===lid1('formula:perimeter-seal')),p=d.parameters.find(p=>p.parameter_id===none);
 if(linoleumStableR1(d.parameters.slice(0,1))!==linoleumStableR1(old.parameters)||linoleumStableR1(d.formulas.slice(0,59))!==linoleumStableR1(old.formulas)
  ||d.resources.length!==124||d.formulas.length!==124||new Set(d.resources.map(r=>r.row_id)).size!==124)throw Error('LINOLEUM_R2_RETAINED_NATIVE_DRIFT');
 for(const [id,value]of Object.entries(lstructuralR2)){
  const method=d.parameters.find(p=>p.parameter_id===id);
  if(method?.truth_metadata.visibility_role!=='INTERNAL_ONLY'||linoleumStableR1(method.constraints_json?.values)!==linoleumStableR1([value])||d.runtimeInput[id]!==value)throw Error('LINOLEUM_R2_PURE_METHOD_REQUIRED');
 }
 if(!seal||linoleumStableR1(seal.inclusion_ast)!==linoleumStableR1({kind:'literal',value:false})||f?.expression_source!=='0'||f.input_parameter_ids.length!==0||f.output_unit_id!=='l'||linoleumStableR1(f.ast)!==linoleumStableR1(linoleumFormulaR1('0').ast)
  ||lr1(seal.resource_graph.notApplicablePureMethodR2).sourceNormStillHeld!==true||p?.truth_metadata.visibility_role!=='INTERNAL_ONLY'
  ||p.truth_metadata.provenance===null||lr1(p.truth_metadata.provenance).source_readback_only_v1!==true
  ||linoleumStableR1(p.constraints_json?.values)!==linoleumStableR1(['NONE_CONFIRMED'])||linoleumStableR1(p.constraints_json?.requiredWhen)!==linoleumStableR1(lexact1))throw Error('LINOLEUM_R2_NONE_SCOPE_BOUNDARY_REQUIRED');
 if(d.resources.filter(r=>r.row_id.startsWith(ln1)).some(r=>r.procurement_eligible!==false||r.resource_graph.costTreatment!=='INFORMATIONAL_SCOPE'
  ||!Array.isArray(r.resource_graph.inputParameterIds)||!r.resource_graph.inputParameterIds.includes(none)))throw Error('LINOLEUM_R2_PROTECTED_NONE_CONSUMER_REQUIRED');
 if(d.parameters.some(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'))throw Error('LINOLEUM_R2_GENUINE_NORM_NOT_A_PROJECT_COUNT');
}
export function compileLinoleumCurrentProjectQuantityR2(submitted:Record<string,unknown>,confirmed:Record<string,unknown>={},actual:unknown=linoleumParentR1115){
 return compileLinoleumAutomaticR1({catalogId:lp2.catalogId,compilerVersion:lp2.contract,primaryMeasureParameterId:lp1.parameterPrefix+'net_area_m2',
  definition:buildLinoleumCurrentProjectQuantityR2(actual),submittedParameters:submitted,confirmedParameters:confirmed});
}
export function linoleumCurrentProjectQuantityExpectationsR2(){
 const old=linoleumCurrentWholeExpectationsR1();return {...old,sourceId:lp2.sourceId,scope:lp2.method,
  entries:old.entries.map(e=>({...e,sourceId:lp2.sourceId,
   ...(e.expectedResourceId==='perimeter-seal'?{condition:'NOT_APPLICABLE ONLY explicit protected NONE_CONFIRMED pure R2; frozen R1 seal need still SOURCE_HELD',quantityRule:'permanent false inclusion; structural AST0 is not material consumption'}:
    e.expectedResourceId==='neutral-cleaner'?{quantityRule:lp2.cleaner.expression}:{})})),oldR1SourceHoldsRetained:true};
}


// Source-owned forward only: exact R1137 arithmetic/owners/authority are retained.
import {withLinoleumCompositionForwardR1139,linoleumIndependentCompositionR1139,linoleumDefinitionCompositionScopeR1141} from './linoleumCompositionSourceForwardR1139';
export function buildLinoleumCompositionForwardR1139(actual:unknown=linoleumParentR1115):LinoleumDefinitionR1{
 return withLinoleumCompositionForwardR1139(buildLinoleumCurrentProjectQuantityR2(actual),linoleumRowHashR1);
}
export function linoleumCompositionExpectationsR1139(){
 const model=buildLinoleumCompositionForwardR1139();
 return{...linoleumIndependentCompositionR1139(),definitionCompositionScopeV1:linoleumDefinitionCompositionScopeR1141(model,value=>linoleumShaTextR1(linoleumStableR1(value)))};
}
