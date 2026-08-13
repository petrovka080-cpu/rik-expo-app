import type { ConsumerRepairAiDraft, ConsumerRepairItemType } from "../../../../consumerRequests/consumerRequestTypes";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../../buildEstimateFromInlineWorkPrompt";
import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type NormativeApplicabilityRequestV1,
  type ProfessionalDomainCompileResultV1,
  type ProfessionalDomainParameterSchemaV1,
} from "../../domainFactory";
import type { ProfessionalEstimateScopeModeV4, ProfessionalParameterValueV4 } from "../../professionalProjectAssemblyV4";
import { electricalCompleteDomainFactory } from "./domainPackage";
import { ELECTRICAL_COMPLETE_DOMAIN_ID, ELECTRICAL_DOMAIN_INVENTORY, type ElectricalDomainInventoryRow } from "./inventory";

export const ELECTRICAL_PRODUCTION_BINDING_VERSION = "electrical-complete-production-binding:v1" as const;

export type ElectricalProductionDraftInput = {
  catalog_id: string;
  work_key: string;
  scope_mode: ProfessionalEstimateScopeModeV4;
  parent_revision_id: string | null;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  normative_request: Omit<NormativeApplicabilityRequestV1, "requested_source_ids" | "requested_source_types">;
  raw_input: string;
  currency: string;
};

export type ElectricalProductionDraftResult = {
  inventory: ElectricalDomainInventoryRow;
  compile_result: ProfessionalDomainCompileResultV1;
  draft: ConsumerRepairAiDraft | null;
};

export type ElectricalInlineProductionResult = {
  exact_match: boolean;
  inventory: ElectricalDomainInventoryRow | null;
  missing_parameter_ids: readonly string[];
  production: ElectricalProductionDraftResult | null;
};

function itemType(category: string): ConsumerRepairItemType {
  if (category === "material") return "material";
  if (category === "labor" || category === "work") return "work";
  if (category === "documentation") return "document";
  return "service";
}

function primitiveParameterSnapshot(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.value]));
}

export function buildElectricalProductionDraftV1(input: ElectricalProductionDraftInput): ElectricalProductionDraftResult {
  const inventory = ELECTRICAL_DOMAIN_INVENTORY.find((candidate) => candidate.catalog_id === input.catalog_id && candidate.work_key === input.work_key);
  if (!inventory) throw new Error(`ELECTRICAL_EXACT_BINDING_NOT_FOUND:${input.catalog_id}:${input.work_key}`);
  const compileResult = compileProfessionalEstimateDomainV1(electricalCompleteDomainFactory, constructionNormativeRegistryV1, {
    catalog_id: input.catalog_id,
    work_key: input.work_key,
    scope_mode: input.scope_mode,
    parent_revision_id: input.parent_revision_id,
    parameter_values: input.parameter_values,
    normative_request: input.normative_request,
  });
  if (compileResult.status !== "COMPILED" || !compileResult.compilation) return { inventory, compile_result: compileResult, draft: null };
  const compilation = compileResult.compilation;
  if (compilation.compiled_rows.length === 0) throw new Error(`ELECTRICAL_EMPTY_PRODUCTION_BOQ:${input.catalog_id}`);
  const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = electricalCompleteDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!technology || !schema) throw new Error(`ELECTRICAL_PRODUCTION_SCHEMA_NOT_FOUND:${input.catalog_id}`);
  const applicableSourceIds = compileResult.normative_resolution.applicable_sources.map((source) => source.source_id);
  const parameterSnapshot = primitiveParameterSnapshot(input.parameter_values);
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
      workKey: input.work_key,
      canonicalTechnologyId: inventory.canonical_technology_id,
      electricalFamily: inventory.electrical_family,
      scopeCapability: inventory.scope_capability,
      scopeMode: input.scope_mode,
      individualElectricalEstimateResourcePassportV1: `${inventory.canonical_technology_id}:individual-electrical-estimate-resource-passport:v1`,
      normBoundElectricalParameterSchemaV1: schema.schema_id,
      formulaGraphV1: { formulaId: row.formula_id, expression: row.formula_expression, inputValues: row.formula_input_values, outputUnit: row.unit_id },
      resourceGraphV3: row.resource_graph_node_v3,
      normativeRowTraceV3: row.normative_trace_v3,
      priceRouteV3: row.price_route_v3,
      priceBasisReference: row.price_basis_reference,
      priceBasisDate: row.price_basis_date,
      parameterSnapshot,
      projectAssemblyId: compilation.project_assembly_id,
      childRevisionId: row.child_revision_id,
      semanticOwner: row.semantic_owner,
      costOwnerId: row.cost_owner_id,
      includedInProcurement: row.procurement_eligible,
      professionalBoqCategory: row.category,
      applicableSourceIds,
    },
    templateId: `domain-passport:${input.catalog_id}:v1`,
    templateVersion: electricalCompleteDomainFactory.package.manifest.domain_version,
    normSourceId: row.normative_source_ids[0] ?? null,
    normSourceTitle: row.normative_source_ids.join(", "),
    normVersion: compileResult.normative_resolution.normative_profile_version,
    normReviewStatus: "applicable",
    priceStatus: "USER_ENTERED_PRICE",
    priceSource: "user",
    priceSourceId: row.price_source_id,
    priceSourceLabel: `${row.price_basis_reference} (${row.price_basis_date})`,
    costConfidence: "high",
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
      summaryRu: `${inventory.localized_name_ru}: индивидуальная профессиональная электротехническая смета ${input.scope_mode}; строк BOQ ${items.length}.`,
      repairType: input.work_key,
      selectedWork: {
        selectedCatalogWorkId: input.catalog_id,
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

function conditionMatches(condition: ProfessionalDomainParameterSchemaV1["parameters"][number]["required_when"], supplied: NonNullable<BuildEstimateFromInlineWorkPromptInput["paramOverrides"]>): boolean {
  if (condition.kind === "ALWAYS") return true;
  if (condition.kind === "EQUALS") return supplied[condition.parameter_id]?.value === condition.value;
  return condition.conditions.some((item) => supplied[item.parameter_id]?.value === item.value);
}

function missingParameterIds(schema: ProfessionalDomainParameterSchemaV1, supplied: NonNullable<BuildEstimateFromInlineWorkPromptInput["paramOverrides"]>): string[] {
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

export function buildElectricalFromInlineInputV1(input: BuildEstimateFromInlineWorkPromptInput): ElectricalInlineProductionResult {
  const identities = [input.selectedWorkKey, input.selectedTemplateId].filter((identity): identity is string => typeof identity === "string" && identity.trim().length > 0).map((identity) => identity.trim());
  const inventory = ELECTRICAL_DOMAIN_INVENTORY.find((candidate) => identities.includes(candidate.catalog_id) || identities.includes(candidate.work_key) || identities.includes(candidate.template_id) || identities.includes(`domain-passport:${candidate.catalog_id}:v1`)) ?? null;
  if (!inventory) return { exact_match: false, inventory: null, missing_parameter_ids: [], production: null };
  const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = electricalCompleteDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!technology || !schema) throw new Error(`ELECTRICAL_INLINE_SCHEMA_NOT_FOUND:${inventory.catalog_id}`);
  const supplied = input.paramOverrides ?? {};
  const missing = missingParameterIds(schema, supplied);
  if (missing.length > 0) return { exact_match: true, inventory, missing_parameter_ids: missing, production: null };
  const parameterValues = Object.fromEntries(schema.parameters.flatMap((parameter) => {
    const value = supplied[parameter.parameter_id]?.value;
    if (value == null || String(value).trim() === "") return [];
    const sourceType = sourceTypeForParameter(parameter.parameter_id);
    return [[parameter.parameter_id, {
      value: value as string | number | boolean,
      unit_id: parameter.unit_id,
      source_type: sourceType,
      source_id: `inline-exact:${inventory.catalog_id}:${parameter.parameter_id}:${String(supplied[parameter.parameter_id]?.source ?? sourceType)}`,
      captured_at: new Date().toISOString(),
      confidence: "high" as const,
      applicability: `Exact project/resource/price input for ${inventory.catalog_id}`,
    } satisfies ProfessionalParameterValueV4]];
  }));
  const scopeMode = parameterValues.estimate_scope_mode?.value;
  if (scopeMode !== "MINIMAL_EXPLICIT_SCOPE" && scopeMode !== "FULL_APPLICABLE_SCOPE") throw new Error(`ELECTRICAL_INLINE_SCOPE_INVALID:${String(scopeMode)}`);
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
        rate_code_by_source_id: {
          KG_KRERM_08_2015_ELECTRICAL: String(parameterValues.exact_krerm_rate_code.value),
          KG_KRERP_01_2015_ELECTRICAL: String(parameterValues.exact_krerp_rate_code.value),
        },
      },
      raw_input: input.rawInput,
      currency: input.currency?.trim() || "KGS",
    }),
  };
}

export function isElectricalProductionDraftV1(draft: ConsumerRepairAiDraft | null): boolean {
  return Boolean(draft?.items.length && draft.items.every((item) =>
    item.sourceParameters?.professionalDomainFactoryV1 === true &&
    item.sourceParameters?.domainId === ELECTRICAL_COMPLETE_DOMAIN_ID));
}
