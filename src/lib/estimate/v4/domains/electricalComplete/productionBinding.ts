import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type AppliedProfessionalPhysicalNormResolutionV1,
  LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID,
  resolveProfessionalPhysicalNormParameterValuesV1,
  type NormativeApplicabilityRequestV1,
  type ProfessionalDomainCompileResultV1,
  type ProfessionalDomainParameterSchemaV1,
} from "../../domainFactory";
import type { ProfessionalEstimateScopeModeV4, ProfessionalParameterValueV4 } from "../../professionalProjectAssemblyV4";
import { electricalCompleteDomainFactory } from "./domainPackage";
import { ELECTRICAL_COMPLETE_DOMAIN_ID, ELECTRICAL_DOMAIN_INVENTORY, type ElectricalDomainInventoryRow } from "./inventory";
import {
  PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1,
  buildProfessionalDomainVisibleBaselineV1,
  professionalDomainVisibleParameterMetadataV1,
} from "../professionalDomainVisibleBaselineV1";

export const ELECTRICAL_PRODUCTION_BINDING_VERSION = "electrical-complete-production-binding:v2" as const;
export const ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1 = "N_A_WITH_REASON:OPEN_OFFICIAL_KRERM_08_RATE_TABLE_NOT_PUBLISHED_USE_CUSTOMER_APPROVED_INDIVIDUAL_NORM_PER_KRERM_GUIDANCE_1_6_1_7" as const;
export const ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1 = "N_A_WITH_REASON:EXACT_KRERP_01_RATE_NOT_APPLICABLE_TO_GENERIC_FIXTURE_USE_CUSTOMER_APPROVED_INDIVIDUAL_RATE_PER_KRERP_GUIDANCE_5_5_1_5_5_5" as const;

type ElectricalInlineBuildInputV1 = {
  rawInput: string;
  selectedTemplateId?: string | null;
  selectedWorkKey?: string | null;
  selectedTemplateName?: string | null;
  city?: string | null;
  currency?: string | null;
  countryCode?: string | null;
  paramOverrides?: Record<string, { value: unknown; source?: string | null }>;
};

type ElectricalProductionItemTypeV1 = "work" | "material" | "service" | "document" | "other";
type ElectricalProductionDraftItemV1 = {
  itemType: ElectricalProductionItemTypeV1;
  titleRu: string;
  quantity: number;
  unit: string;
  unitLabel: string;
  unitPrice: number | null;
  currency: string;
  source: "reference_price_book";
  category: string;
  sourceId: string | null;
  sourceLabel: string | null;
  formulaId: string;
  quantityFormula: string;
  calculationTrace: string;
  sourceParameters: Record<string, unknown>;
  templateId: string;
  templateVersion: string;
  normSourceId: string | null;
  normSourceTitle: string;
  normVersion: string;
  normReviewStatus: "applicable";
  priceStatus: "PRICE_MISSING" | "REFERENCE_PRICE_ESTIMATE";
  priceSource: "missing" | "reference_price_book";
  priceSourceId: string | null;
  priceSourceLabel: string | null;
  costConfidence: "high" | "missing";
  confidence: "high";
  addedBy: "system";
  materialKey: string | null;
  rateKey: string;
};
type ElectricalProductionDraftV1 = {
  titleRu: string;
  summaryRu: string;
  repairType: string;
  selectedWork: {
    selectedCatalogWorkId: string;
    selectedWorkKey: string;
    selectedWorkTitleRu: string;
    selectedWorkCategoryKey: string;
    selectedWorkCategoryTitleRu: string;
    selectedWorkRawInput: string;
    selectedWorkSource: "user_selected";
    selectedWorkResolverReGuessed: false;
  };
  items: ElectricalProductionDraftItemV1[];
  missingData: string[];
  safetyMessageRu: string;
  dangerousDiyBlocked: false;
};

export type ElectricalProductionDraftInput = {
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

export type ElectricalProductionDraftResult = {
  inventory: ElectricalDomainInventoryRow;
  compile_result: ProfessionalDomainCompileResultV1;
  draft: ElectricalProductionDraftV1 | null;
};

export type ElectricalInlineProductionResult = {
  exact_match: boolean;
  inventory: ElectricalDomainInventoryRow | null;
  missing_parameter_ids: readonly string[];
  production: ElectricalProductionDraftResult | null;
};

function itemType(category: string): ElectricalProductionItemTypeV1 {
  if (category === "material") return "material";
  if (category === "labor" || category === "work") return "work";
  if (category === "documentation") return "document";
  return "service";
}

function primitiveParameterSnapshot(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.value]));
}

function assertExactNormativeRateResolution(sourceId: string, value: unknown, exactCode: RegExp): void {
  const text = typeof value === "string" ? value.trim() : "";
  const justifiedNotApplicable = /^N_A_WITH_REASON:.{40,}$/u.test(text);
  if (!exactCode.test(text) && !justifiedNotApplicable) {
    throw new Error(`ELECTRICAL_NORMATIVE_RATE_RESOLUTION_RED:${sourceId}:${text || "MISSING"}`);
  }
}

export function buildElectricalProductionDraftV1(input: ElectricalProductionDraftInput): ElectricalProductionDraftResult {
  const inventory = ELECTRICAL_DOMAIN_INVENTORY.find((candidate) => candidate.catalog_id === input.catalog_id && candidate.work_key === input.work_key);
  if (!inventory) throw new Error(`ELECTRICAL_EXACT_BINDING_NOT_FOUND:${input.catalog_id}:${input.work_key}`);
  const rateCodes = input.normative_request.rate_code_by_source_id ?? {};
  assertExactNormativeRateResolution(
    "KG_KRERM_08_2015_ELECTRICAL",
    rateCodes.KG_KRERM_08_2015_ELECTRICAL,
    /^(?:КРЕРм\s+)?08-\d{2}-\d{3}-\d{2}$/u,
  );
  assertExactNormativeRateResolution(
    "KG_KRERP_01_2015_ELECTRICAL",
    rateCodes.KG_KRERP_01_2015_ELECTRICAL,
    /^(?:КРЕРп\s+)?01-\d{2}-\d{3}-\d{2}$/u,
  );
  const compileResult = compileProfessionalEstimateDomainV1(electricalCompleteDomainFactory, constructionNormativeRegistryV1, {
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
  });
  if (compileResult.status !== "COMPILED" || !compileResult.compilation) return { inventory, compile_result: compileResult, draft: null };
  const compilation = compileResult.compilation;
  if (compilation.compiled_rows.length === 0) throw new Error(`ELECTRICAL_EMPTY_PRODUCTION_BOQ:${input.catalog_id}`);
  const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = electricalCompleteDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!technology || !schema) throw new Error(`ELECTRICAL_PRODUCTION_SCHEMA_NOT_FOUND:${input.catalog_id}`);
  const applicableSourceIds = compileResult.normative_resolution.applicable_sources.map((source) => source.source_id);
  const requestedCatalogWorkId = input.catalog_id.startsWith("expanded-template:")
    ? input.catalog_id.slice("expanded-template:".length)
    : inventory.template_id;
  const passportId = `domain-passport:${input.catalog_id}:v1`;
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
  const parameterKeys = schema.parameters.map((parameter) => parameter.parameter_id);
  const parameterSourceTypes = Object.fromEntries(
    Object.entries(input.parameter_values).map(([key, value]) => [key, value.source_type]),
  );
  const items: ElectricalProductionDraftItemV1[] = compilation.compiled_rows.map((row, rowIndex) => {
    const informationalOutput = row.cost_ownership === "informational_output";
    const rowParameterSnapshot = Object.fromEntries(
      Object.keys(row.formula_input_values).map((parameterId) => [
        parameterId,
        parameterSnapshot[parameterId],
      ]),
    );
    return {
      itemType: itemType(row.category),
    titleRu: row.title_ru,
    quantity: row.quantity,
    unit: row.unit_id,
    unitLabel: row.unit_id,
    unitPrice: row.unit_price,
    currency: input.currency,
    source: "reference_price_book",
    category: row.section,
    sourceId: row.price_source_id,
    sourceLabel: row.price_basis_reference,
    formulaId: row.formula_id,
    quantityFormula: row.formula_expression,
    calculationTrace: row.calculation_trace,
    sourceParameters: {
      professionalDomainFactoryV1: true,
      productionBindingVersion: ELECTRICAL_PRODUCTION_BINDING_VERSION,
      domainId: ELECTRICAL_COMPLETE_DOMAIN_ID,
      domainVersion: electricalCompleteDomainFactory.package.manifest.domain_version,
      domainPackageHash: electricalCompleteDomainFactory.package_hash,
      catalogId: input.catalog_id,
      requestedCatalogWorkId,
      workKey: input.work_key,
      canonicalTechnologyId: inventory.canonical_technology_id,
      electricalFamily: inventory.electrical_family,
      scopeCapability: inventory.scope_capability,
      scopeMode: input.scope_mode,
      individualElectricalEstimateResourcePassportV2: `${inventory.canonical_technology_id}:individual-electrical-estimate-resource-passport:v2`,
      normBoundElectricalParameterSchemaV2: schema.schema_id,
      formulaGraphV2: { formulaId: row.formula_id, expression: row.formula_expression, inputValues: row.formula_input_values, outputUnit: row.unit_id },
      resourceGraphV3: row.resource_graph_node_v3,
      normativeRowTraceV3: row.normative_trace_v3,
      priceRouteV3: row.price_route_v3,
      priceBasisReference: row.price_basis_reference,
      priceBasisDate: row.price_basis_date,
      parameterSchemaId: `canonical:${schema.schema_id}:${input.catalog_id}`,
      parameterSchemaVersion: schema.schema_version,
      // Schema-level state owns the whole revision and is intentionally stored
      // once. Repeating it on every BOQ row made large electrical revisions
      // exceed V8's serializable string limit and the durable envelope budget.
      parameterKeys: rowIndex === 0 ? parameterKeys : undefined,
      professionalDomainParameterMetadata: rowIndex === 0 ? parameterMetadata : undefined,
      parameterSnapshot: rowIndex === 0 ? parameterSnapshot : undefined,
      rowParameterSnapshot,
      assumptionKeys: rowIndex === 0 ? assumptionKeys : undefined,
      explicitParameterKeys: rowIndex === 0 ? explicitParameterKeys : undefined,
      parameterSourceTypes: rowIndex === 0 ? parameterSourceTypes : undefined,
      professionalDomainVisibleBaselineVersion: rowIndex === 0
        ? PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1
        : undefined,
      smartEstimateProjectionV2: {
        progressiveDisclosure: true,
        stage: row.section,
        category: row.category,
        initiallyCollapsed: compilation.compiled_rows.length > 90,
        rowReachable: true,
        formulaExplanation: row.calculation_trace,
        normativeExplanation: row.normative_trace_v3,
        priceExplanation: row.price_route_v3,
        parameterDependencies: Object.keys(row.formula_input_values),
        parameterToCostDelta: row.cost_ownership === "informational_output" ? "NOT_APPLICABLE_TYPED_CHILD" : "quantity_delta * verified_unit_price",
      },
      projectAssemblyId: compilation.project_assembly_id,
      childRevisionId: row.child_revision_id,
      rowCode: row.row_id,
      semanticOwner: row.semantic_owner,
      workSemanticOwner: passportId,
      professionalEstimatePassportId: passportId,
      costOwnerId: row.cost_owner_id,
      includedInProcurement: row.procurement_eligible,
      professionalBoqCategory: row.category,
      applicableSourceIds,
      normativeSourceIds: row.normative_source_ids,
      parameterSourceIds: row.parameter_source_ids,
      ...(input.physical_norm_resolution &&
          row.parameter_source_ids.includes(input.physical_norm_resolution.source_id)
        ? { professionalPhysicalNormApplicabilityV1: input.physical_norm_resolution }
        : {}),
    },
    templateId: passportId,
    templateVersion: electricalCompleteDomainFactory.package.manifest.domain_version,
    normSourceId: row.normative_source_ids[0] ?? null,
    normSourceTitle: row.normative_source_ids.join(", "),
    normVersion: compileResult.normative_resolution.normative_profile_version,
    normReviewStatus: "applicable",
    priceStatus: informationalOutput || row.unit_price == null ? "PRICE_MISSING" : "REFERENCE_PRICE_ESTIMATE",
    priceSource: informationalOutput || row.unit_price == null ? "missing" : "reference_price_book",
    priceSourceId: informationalOutput || row.unit_price == null ? null : row.price_source_id,
    priceSourceLabel: informationalOutput || !row.price_basis_reference
      ? null
      : `${row.price_basis_reference} (${row.price_basis_date})`,
    costConfidence: row.unit_price == null ? "missing" : "high",
    confidence: "high",
    addedBy: "system",
    materialKey: row.category === "material" ? row.semantic_owner : null,
    rateKey: row.cost_owner_id,
    };
  });
  return {
    inventory,
    compile_result: compileResult,
    draft: {
      titleRu: inventory.localized_name_ru,
      summaryRu: `${inventory.localized_name_ru}: индивидуальная профессиональная электротехническая смета ${input.scope_mode}; строк BOQ ${items.length}.`,
      repairType: input.work_key,
      selectedWork: {
        selectedCatalogWorkId: requestedCatalogWorkId,
        selectedWorkKey: input.work_key,
        selectedWorkTitleRu: inventory.localized_name_ru,
        selectedWorkCategoryKey: "electrical",
        selectedWorkCategoryTitleRu: "Электромонтажные работы",
        selectedWorkRawInput: input.raw_input,
        selectedWorkSource: "user_selected",
        selectedWorkResolverReGuessed: false,
      },
      items,
      missingData: [],
      safetyMessageRu: "Работы в электроустановках выполняются квалифицированным персоналом после безопасного отключения, блокировки и проверки отсутствия напряжения.",
      dangerousDiyBlocked: false,
    },
  };
}

function conditionMatches(condition: ProfessionalDomainParameterSchemaV1["parameters"][number]["required_when"], supplied: NonNullable<ElectricalInlineBuildInputV1["paramOverrides"]>): boolean {
  if (condition.kind === "ALWAYS") return true;
  if (condition.kind === "EQUALS") return supplied[condition.parameter_id]?.value === condition.value;
  return condition.conditions.some((item) => supplied[item.parameter_id]?.value === item.value);
}

function missingParameterIds(schema: ProfessionalDomainParameterSchemaV1, supplied: NonNullable<ElectricalInlineBuildInputV1["paramOverrides"]>): string[] {
  const full = supplied.estimate_scope_mode?.value === "FULL_APPLICABLE_SCOPE";
  const missing = schema.parameters
    .filter((parameter) => parameter.priority === "P0" || (full && parameter.priority === "P1"))
    .filter((parameter) => conditionMatches(parameter.required_when, supplied))
    .filter((parameter) => supplied[parameter.parameter_id]?.value == null || String(supplied[parameter.parameter_id]?.value).trim() === "")
    .map((parameter) => parameter.parameter_id);
  return [...new Set(missing)];
}

function sourceTypeForParameter(parameterId: string): ProfessionalParameterValueV4["source_type"] {
  if (parameterId.startsWith("unit_price_")) return "USER_EXPLICIT";
  if (parameterId.includes("rate_code") || parameterId.includes("project") || parameterId.includes("price_basis") || parameterId === "funding_source") return "PROJECT_DOCUMENT";
  if (parameterId.includes("product")) return "MATERIAL_PASSPORT";
  return "USER_EXPLICIT";
}

export function buildElectricalFromInlineInputV1(input: ElectricalInlineBuildInputV1): ElectricalInlineProductionResult {
  const identities = [input.selectedWorkKey, input.selectedTemplateId].filter((identity): identity is string => typeof identity === "string" && identity.trim().length > 0).map((identity) => identity.trim());
  const inventory = ELECTRICAL_DOMAIN_INVENTORY.find((candidate) => identities.includes(candidate.catalog_id) || identities.includes(candidate.work_key) || identities.includes(candidate.template_id) || identities.includes(`domain-passport:${candidate.catalog_id}:v1`)) ?? null;
  if (!inventory) return { exact_match: false, inventory: null, missing_parameter_ids: [], production: null };
  const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = electricalCompleteDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!technology || !schema) throw new Error(`ELECTRICAL_INLINE_SCHEMA_NOT_FOUND:${inventory.catalog_id}`);
  const baseline = buildProfessionalDomainVisibleBaselineV1({
    schema,
    catalogId: inventory.catalog_id,
    workKey: inventory.work_key,
    scopeCapability: inventory.scope_capability,
    rawInput: input.rawInput,
    supplied: input.paramOverrides,
    requireExplicitNormativeRateCode:
      input.paramOverrides?.product_profile_id?.value === LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID,
  });
  const baselineParameterValues = baseline.parameter_values;
  const scopeMode = baselineParameterValues.estimate_scope_mode?.value;
  if (scopeMode !== "MINIMAL_EXPLICIT_SCOPE" && scopeMode !== "FULL_APPLICABLE_SCOPE") throw new Error(`ELECTRICAL_INLINE_SCOPE_INVALID:${String(scopeMode)}`);
  const physicalNormResolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: inventory.electrical_family,
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
  return {
    exact_match: true,
    inventory,
    missing_parameter_ids: [],
    production: buildElectricalProductionDraftV1({
      catalog_id: inventory.catalog_id,
      work_key: inventory.work_key,
      scope_mode: scopeMode,
      parent_revision_id: null,
      parameter_values: parameterValues,
      normative_request: {
        country: "KG",
        region: "Кыргызская Республика",
        funding_source: String(parameterValues.funding_source.value),
        project_type: String(parameterValues.project_type.value),
        construction_state: ["TEST", "COMMISSION"].includes(inventory.operation_class) ? "COMMISSIONING" : inventory.new_repair_demolition_state === "REPAIR" ? "REPAIR" : "NEW",
        contract_basis: [],
        effective_date: new Date().toISOString().slice(0, 10),
        material_system: inventory.electrical_family,
        operation_class: inventory.operation_class,
        product_profile_id: String(parameterValues.product_profile_id?.value ?? ""),
        rate_code_by_source_id: {
          KG_KRERM_08_2015_ELECTRICAL: String(parameterValues.exact_krerm_rate_code.value),
          KG_KRERP_01_2015_ELECTRICAL: String(parameterValues.exact_krerp_rate_code.value),
        },
      },
      raw_input: input.rawInput,
      currency: input.currency?.trim() || "KGS",
      physical_norm_resolution: physicalNormResolution.status === "APPLIED"
        ? physicalNormResolution
        : null,
    }),
  };
}

export function isElectricalProductionDraftV1(draft: ElectricalProductionDraftV1 | null): boolean {
  return Boolean(draft?.items.length && draft.items.every((item) =>
    item.sourceParameters?.professionalDomainFactoryV1 === true &&
    item.sourceParameters?.domainId === ELECTRICAL_COMPLETE_DOMAIN_ID));
}
