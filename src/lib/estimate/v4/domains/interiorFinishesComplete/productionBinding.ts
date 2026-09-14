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

function normativeSourceId(inventory: InteriorFinishesDomainInventoryRow): string {
  if (isWallPuttyCt127Krer15Target(inventory)) {
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
  const physicalNormSourceIds = input.physical_norm_resolution
    ? input.physical_norm_resolution.source_ids ?? [input.physical_norm_resolution.source_id]
    : [];
  const compileResult = compileProfessionalEstimateDomainV1(
    interiorFinishesDomainFactory,
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
  const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
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
      domainId: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
      domainVersion: interiorFinishesDomainFactory.package.manifest.domain_version,
      domainPackageHash: interiorFinishesDomainFactory.package_hash,
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
  const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
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
  const sourceId = normativeSourceId(inventory);
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
