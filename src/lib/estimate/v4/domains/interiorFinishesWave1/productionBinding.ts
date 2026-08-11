import type {
  ConsumerRepairAiDraft,
  ConsumerRepairItemType,
} from "../../../../consumerRequests/consumerRequestTypes";
import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type NormativeApplicabilityRequestV1,
  type ProfessionalDomainCompileResultV1,
} from "../../domainFactory";
import type {
  ProfessionalEstimateScopeModeV4,
  ProfessionalParameterValueV4,
} from "../../professionalProjectAssemblyV4";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../../buildEstimateFromInlineWorkPrompt";
import {
  INTERIOR_FINISHES_WAVE_1_INVENTORY,
  type InteriorFinishesWave1InventoryRow,
} from "./inventory";
import { interiorFinishesWave1DomainFactory } from "./domainPackage";

export const INTERIOR_FINISHES_WAVE_1_PRODUCTION_BINDING_VERSION =
  "interior-finishes-wave1-production-binding:v1" as const;

export type InteriorFinishesWave1ProductionDraftInput = {
  catalog_id: string;
  work_key: string;
  scope_mode: ProfessionalEstimateScopeModeV4;
  parent_revision_id: string | null;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  normative_request: Omit<NormativeApplicabilityRequestV1, "requested_source_ids" | "requested_source_types">;
  raw_input: string;
  currency: string;
};

export type InteriorFinishesWave1ProductionDraftResult = {
  inventory: InteriorFinishesWave1InventoryRow;
  compile_result: ProfessionalDomainCompileResultV1;
  draft: ConsumerRepairAiDraft | null;
};

export type InteriorFinishesWave1InlineProductionResult = {
  exact_match: boolean;
  inventory: InteriorFinishesWave1InventoryRow | null;
  missing_parameter_ids: readonly string[];
  production: InteriorFinishesWave1ProductionDraftResult | null;
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

export function buildInteriorFinishesWave1ProductionDraftV1(
  input: InteriorFinishesWave1ProductionDraftInput,
): InteriorFinishesWave1ProductionDraftResult {
  const inventory = INTERIOR_FINISHES_WAVE_1_INVENTORY.find((candidate) =>
    candidate.catalog_id === input.catalog_id && candidate.work_key === input.work_key);
  if (!inventory) {
    throw new Error(`INTERIOR_WAVE1_EXACT_BINDING_NOT_FOUND:${input.catalog_id}:${input.work_key}`);
  }
  const compileResult = compileProfessionalEstimateDomainV1(
    interiorFinishesWave1DomainFactory,
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
    throw new Error(`INTERIOR_WAVE1_EMPTY_PRODUCTION_BOQ:${input.catalog_id}`);
  }
  const schema = interiorFinishesWave1DomainFactory.schema_by_id.get(
    interiorFinishesWave1DomainFactory.technology_by_id.get(inventory.canonical_technology_id)?.parameter_schema_id ?? "",
  );
  if (!schema) throw new Error(`INTERIOR_WAVE1_PRODUCTION_SCHEMA_NOT_FOUND:${input.catalog_id}`);
  const passportId = `domain-passport:${input.catalog_id}:v1`;
  const parameterSnapshot = primitiveParameterSnapshot(input.parameter_values);
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
      productionBindingVersion: INTERIOR_FINISHES_WAVE_1_PRODUCTION_BINDING_VERSION,
      domainId: interiorFinishesWave1DomainFactory.package.manifest.domain_id,
      domainVersion: interiorFinishesWave1DomainFactory.package.manifest.domain_version,
      domainPackageHash: interiorFinishesWave1DomainFactory.package_hash,
      catalogId: input.catalog_id,
      workKey: input.work_key,
      canonicalTechnologyId: inventory.canonical_technology_id,
      scopeCapability: inventory.scope_capability,
      scopeMode: input.scope_mode,
      parameterSchemaId: `canonical:${schema.schema_id}:${input.catalog_id}`,
      parameterSchemaVersion: schema.schema_version,
      parameterKeys: schema.parameters.map((parameter) => parameter.parameter_id),
      parameterSnapshot,
      projectAssemblyId: compilation.project_assembly_id,
      childRevisionId: row.child_revision_id,
      semanticOwner: row.semantic_owner,
      rowCode: row.row_id,
      normativeSourceIds: row.normative_source_ids,
      parameterSourceIds: row.parameter_source_ids,
      costOwnership: row.cost_ownership,
      costOwnerId: row.cost_owner_id,
      includedInProcurement: row.procurement_eligible,
      professionalBoqCategory: row.category,
    },
    templateId: passportId,
    templateVersion: interiorFinishesWave1DomainFactory.package.manifest.domain_version,
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
        selectedCatalogWorkId: input.catalog_id,
        selectedWorkKey: input.work_key,
        selectedWorkTitleRu: inventory.localized_name_ru,
        selectedWorkCategoryKey: "plaster_paint",
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

export function isInteriorFinishesWave1ProductionDraftV1(
  draft: ConsumerRepairAiDraft | null,
): boolean {
  return Boolean(draft?.items.length && draft.items.every((item) =>
    item.sourceParameters?.professionalDomainFactoryV1 === true &&
    item.sourceParameters?.domainId === "interior_finishes_wave_1"));
}

function inlineInventory(input: BuildEstimateFromInlineWorkPromptInput): InteriorFinishesWave1InventoryRow | null {
  const identities = [input.selectedWorkKey, input.selectedTemplateId]
    .filter((identity): identity is string => typeof identity === "string" && identity.trim().length > 0)
    .map((identity) => identity.trim());
  return INTERIOR_FINISHES_WAVE_1_INVENTORY.find((inventory) =>
    identities.includes(inventory.catalog_id) ||
    identities.includes(inventory.work_key) ||
    identities.includes(inventory.template_id) ||
    identities.includes(`domain-passport:${inventory.catalog_id}:v1`)) ?? null;
}

function sourceTypeForParameter(parameterId: string): ProfessionalParameterValueV4["source_type"] {
  if (parameterId === "normative_rate_code" || parameterId === "funding_source" || parameterId === "project_type") {
    return "PROJECT_DOCUMENT";
  }
  if (parameterId.includes("productivity")) return "VERIFIED_RATEBOOK";
  if (
    parameterId === "product_profile_id" ||
    parameterId.includes("material_consumption") ||
    parameterId.includes("material_mass") ||
    parameterId.includes("auxiliary_material_rate")
  ) return "MATERIAL_PASSPORT";
  return "USER_EXPLICIT";
}

export function buildInteriorFinishesWave1FromInlineInputV1(
  input: BuildEstimateFromInlineWorkPromptInput,
): InteriorFinishesWave1InlineProductionResult {
  const inventory = inlineInventory(input);
  if (!inventory) return { exact_match: false, inventory: null, missing_parameter_ids: [], production: null };
  const technology = interiorFinishesWave1DomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  if (!technology) throw new Error(`INTERIOR_WAVE1_INLINE_TECHNOLOGY_NOT_FOUND:${inventory.catalog_id}`);
  const schema = interiorFinishesWave1DomainFactory.schema_by_id.get(technology.parameter_schema_id);
  if (!schema) throw new Error(`INTERIOR_WAVE1_INLINE_SCHEMA_NOT_FOUND:${inventory.catalog_id}`);
  const supplied = input.paramOverrides ?? {};
  const missing = schema.parameters
    .filter((parameter) => parameter.priority === "P0" || (
      supplied.estimate_scope_mode?.value === "FULL_APPLICABLE_SCOPE" && parameter.priority === "P1"
    ))
    .filter((parameter) => supplied[parameter.parameter_id]?.value == null || String(supplied[parameter.parameter_id]?.value).trim() === "")
    .map((parameter) => parameter.parameter_id);
  if (missing.length > 0) {
    return { exact_match: true, inventory, missing_parameter_ids: missing, production: null };
  }
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
    throw new Error(`INTERIOR_WAVE1_INLINE_SCOPE_INVALID:${String(scopeMode)}`);
  }
  const fundingSource = String(parameterValues.funding_source?.value ?? "");
  const projectType = String(parameterValues.project_type?.value ?? "");
  const rateCode = String(parameterValues.normative_rate_code?.value ?? "");
  const isRepair = inventory.scope_capability === "repair";
  const production = buildInteriorFinishesWave1ProductionDraftV1({
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: scopeMode,
    parent_revision_id: null,
    parameter_values: parameterValues,
    normative_request: {
      country: "KG",
      region: input.city?.trim() || "Bishkek",
      funding_source: fundingSource,
      project_type: projectType,
      construction_state: isRepair ? "REPAIR" : "NEW",
      contract_basis: [],
      effective_date: new Date().toISOString().slice(0, 10),
      material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: {
        [isRepair ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance"]: rateCode,
      },
    },
    raw_input: input.rawInput,
    currency: input.currency?.trim() || "KGS",
  });
  return { exact_match: true, inventory, missing_parameter_ids: production.compile_result.blockers, production };
}
