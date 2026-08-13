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
} from "../../domainFactory";
import type {
  ProfessionalEstimateScopeModeV4,
  ProfessionalParameterValueV4,
} from "../../professionalProjectAssemblyV4";
import { interiorFinishesDomainFactory } from "./domainPackage";
import {
  INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  type InteriorFinishesDomainInventoryRow,
} from "./inventory";
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

function constructionState(inventory: InteriorFinishesDomainInventoryRow): "NEW" | "REPAIR" {
  return inventory.scope_capability === "repair" || ["repair", "replace"].includes(inventory.work_type)
    ? "REPAIR"
    : "NEW";
}

function normativeSourceId(inventory: InteriorFinishesDomainInventoryRow): string {
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
  const parameterMetadata = Object.fromEntries(schema.parameters.map((parameter) => [
    parameter.parameter_id,
    {
      labelRu: parameter.label_ru,
      unit: parameter.unit_id,
      inputKind: parameter.input_type === "choice" ? "select" : parameter.input_type,
      choices: parameter.choices?.map((choice) => ({ value: choice.value, labelRu: choice.label_ru })) ?? [],
      requiredFor: parameter.priority === "P0" ? "contract_ready" : "better_accuracy",
    },
  ]));
  const applicableSourceIds = compileResult.normative_resolution.applicable_sources.map((source) => source.source_id);
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
      workKey: input.work_key,
      canonicalTechnologyId: inventory.canonical_technology_id,
      scopeCapability: inventory.scope_capability,
      scopeMode: input.scope_mode,
      parameterSchemaId: `canonical:${schema.schema_id}:${input.catalog_id}`,
      parameterSchemaVersion: schema.schema_version,
      parameterKeys: schema.parameters.map((parameter) => parameter.parameter_id),
      professionalDomainParameterMetadata: parameterMetadata,
      parameterSnapshot,
      projectAssemblyId: compilation.project_assembly_id,
      childRevisionId: row.child_revision_id,
      semanticOwner: registeredProfessionalOwner,
      professionalEstimatePassportId: registeredProfessionalOwner,
      calculationStrategyId,
      rowCode: row.row_id,
      normativeSourceIds: row.normative_source_ids,
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
      ...(domainCompletionV7 ? {
        formulaGraphVersion: "FormulaGraphV7",
        resourceGraphVersion: "ResourceGraphV7",
      } : {}),
    },
    templateId: registeredProfessionalOwner,
    templateVersion: interiorFinishesDomainFactory.package.manifest.domain_version,
    normSourceId: applicableSourceIds[0] ?? null,
    normSourceTitle: applicableSourceIds.join(", "),
    normVersion: compileResult.normative_resolution.normative_profile_version,
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
        selectedCatalogWorkId: input.catalog_id,
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
  const supplied = input.paramOverrides ?? {};
  const missing = missingParameterIds(schema, supplied);
  if (missing.length > 0) return { exact_match: true, inventory, missing_parameter_ids: missing, production: null };
  const parameterValues = Object.fromEntries(schema.parameters.flatMap((parameter) => {
    const suppliedValue = supplied[parameter.parameter_id]?.value;
    if (suppliedValue == null || String(suppliedValue).trim() === "") return [];
    const sourceType = sourceTypeForParameter(parameter.parameter_id);
    return [[parameter.parameter_id, {
      value: suppliedValue as string | number | boolean,
      unit_id: parameter.unit_id,
      source_type: sourceType,
      source_id: `inline-exact:${inventory.catalog_id}:${parameter.parameter_id}:${String(supplied[parameter.parameter_id]?.source ?? sourceType)}`,
      captured_at: new Date().toISOString(),
      confidence: "high" as const,
      applicability: `Exact user/project value for ${inventory.catalog_id}`,
    } satisfies ProfessionalParameterValueV4]];
  }));
  const scopeMode = parameterValues.estimate_scope_mode?.value;
  if (scopeMode !== "MINIMAL_EXPLICIT_SCOPE" && scopeMode !== "FULL_APPLICABLE_SCOPE") {
    throw new Error(`INTERIOR_INLINE_SCOPE_INVALID:${String(scopeMode)}`);
  }
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
      rate_code_by_source_id: { [sourceId]: String(parameterValues.normative_rate_code?.value ?? "") },
    },
    raw_input: input.rawInput,
    currency: input.currency?.trim() || "KGS",
  });
  return { exact_match: true, inventory, missing_parameter_ids: production.compile_result.blockers, production };
}

export function isInteriorFinishesProductionDraftV1(draft: ConsumerRepairAiDraft | null): boolean {
  return Boolean(draft?.items.length && draft.items.every((item) =>
    item.sourceParameters?.professionalDomainFactoryV1 === true &&
    item.sourceParameters?.domainId === INTERIOR_FINISHES_COMPLETE_DOMAIN_ID));
}
