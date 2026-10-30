import electricalPoles04kvSourceR1117 from '../../../../../../data/estimate-benchmarks/source-packs/electrical-poles-04kv-whole-current-r1117-r1.json';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../backendPlatform/canonicalEstimateCompileCore';
import {compileFormulaGraph} from '../../../backendPlatform/formulaGraph';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from '../../automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../../../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateStableJson} from '../../../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../backendPlatform/canonicalEstimateSha256';
import {estimateDeterministicHash} from '../../../estimateDeterministicHash';
import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type AppliedProfessionalPhysicalNormResolutionV1,
  LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID,
  resolveAppliedProfessionalPhysicalNormIdentityV1,
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
  normId: string | null;
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
  const physicalNormSourceIds = input.physical_norm_resolution
    ? input.physical_norm_resolution.source_ids ?? [input.physical_norm_resolution.source_id]
    : [];
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
    additional_normative_source_ids: physicalNormSourceIds,
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
  const physicalNormIdentityByRowId = new Map(compilation.compiled_rows.map((row) => [
    row.row_id,
    resolveAppliedProfessionalPhysicalNormIdentityV1({
      resolution: input.physical_norm_resolution,
      rowParameterSourceIds: row.parameter_source_ids,
    }),
  ]));
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
      ...(input.physical_norm_resolution && physicalNormIdentityByRowId.get(row.row_id)
        ? { professionalPhysicalNormApplicabilityV1: input.physical_norm_resolution }
        : {}),
    },
    templateId: passportId,
    templateVersion: electricalCompleteDomainFactory.package.manifest.domain_version,
    normId: physicalNormIdentityByRowId.get(row.row_id)?.norm_id ?? null,
    normSourceId: physicalNormIdentityByRowId.get(row.row_id)?.source_id ?? row.normative_source_ids[0] ?? null,
    normSourceTitle: row.normative_source_ids.join(", "),
    normVersion: physicalNormIdentityByRowId.get(row.row_id)?.source_document_version ??
      compileResult.normative_resolution.normative_profile_version,
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

export const ELECTRICAL_POLES_04KV_WHOLE_SOURCE_R1117=electricalPoles04kvSourceR1117;
export const ELECTRICAL_POLES_04KV_WHOLE_SOURCE_SHA_R1117=canonicalEstimateSha256HexText(canonicalEstimateStableJson(electricalPoles04kvSourceR1117));
const electricalPoles04kvWhole=electricalPoles04kvSourceR1117;
export type ElectricalPoles04kvCanonicalParentR1117={header:Record<string,unknown>;body:Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>};
function electricalPoles04kvOperationR1117(key:string){const op=electricalPoles04kvWhole.operations.find(o=>o.key===key);if(!op)throw Error('ELECTRICAL_POLES_04KV_EXACT_OPERATION_REQUIRED:'+key);const{key:_key,...descriptor}=op;return {...descriptor,contractVersion:'canonical-operation-resource/v1',groupId:electricalPoles04kvWhole.catalogId,groupTitleRu:'Монтаж опор воздушной линии 0,4 кВ'};}
function electricalPoles04kvUsesR1117(keys:readonly string[]){const refs=keys.map(electricalPoles04kvOperationR1117);return {...refs[0],additionalOperations:refs.slice(1)};}
export function electricalPoles04kvWholeCurrentForwardR1117(parent:ElectricalPoles04kvCanonicalParentR1117):AutomaticOwnerDefinition{
 const s=electricalPoles04kvWhole,f=s.fields;
 if(canonicalEstimateStableJson(parent.header)!==canonicalEstimateStableJson(s.currentHeader))throw Error('ELECTRICAL_POLES_04KV_EXACT_CURRENT_R1117_HEADER_REQUIRED');
 for(const key of ['parameters','formulas','resources'] as const)if(canonicalEstimateStableJson(parent.body[key])!==canonicalEstimateStableJson(s.currentNative[key]))throw Error('ELECTRICAL_POLES_04KV_CURRENT_NATIVE_DRIFT:'+key);
 const read=s.currentNormalTargetReadR1153;
 if(read.contract!=='poles04-normal-r1-current-parent-evidence/r1153'||read.status!=='ACTUAL_FULL_TEN_RAW_SETS_RR_READONLY_ROLLBACK_CLOSED_NOT_ADMISSION'||read.catalogId!==s.catalogId||read.sourceId!==s.proposedBranchSourceKey||read.releaseId!=='6df52368-002e-51ea-b11d-39803f3c14c3'||read.preimage.sha256!==s.currentParentProof.sha256||canonicalEstimateStableJson(read.header)!==canonicalEstimateStableJson(parent.header)||read.actualCounts.parameters!==parent.body.parameters.length||read.actualCounts.formulas!==parent.body.formulas.length||read.actualCounts.resources!==parent.body.resources.length||read.actualCounts.newSource!==s.proposedBranchLookupCount||read.partialOrTruncated!==false||read.transactionRolledBack!==true||read.connectionClosed!==true||read.formalScopedRegistryCapture!==false||read.sourceAdmission!==false||read.full!==false)throw Error('ELECTRICAL_POLES_04KV_FRESH_NORMAL_R1_PARENT_PROOF_REQUIRED');
 const scopeIds=s.scopeGroups.flatMap(g=>g.originalRowIds),scopeExpected=[...parent.body.resources.map(r=>r.row_id),...s.parts.filter(p=>p.scope!=='scope').map(p=>s.prefix+':'+p.key),...s.unresolvedNeeds.map(n=>s.prefix+':need:'+n.key)];
 if(s.scopeGroups.some(g=>g.originalRowIds.length>128)||new Set(scopeIds).size!==scopeIds.length||canonicalEstimateStableJson([...scopeIds].sort())!==canonicalEstimateStableJson(scopeExpected.sort()))throw Error('ELECTRICAL_POLES_04KV_TRUE_WHOLE_SCOPE_UNION_REQUIRED');
 const eq=(parameterId:string,value:string)=>({kind:'equals' as const,parameterId,value}),active=eq(f.method,s.method),legacy=eq(f.method,s.legacyMethod),common=[...s.commonFacts,f.method_source_gate];
 const factsFor=(key:string,scope:string)=>key==='waste-net'?[f.waste_record]:scope==='scope'?[...s.requiredScopeFacts]:scope==='detail'?[f.stock_record]:[...common,...(scope==='tools'?[f.tool_record]:[])];
 const built=buildAutomaticConstructionOwnerR1({contract:s.contract,semanticOwner:s.catalogId,sourceId:s.proposedBranchSourceKey,normId:'DECLARED_EXACT_WOOD_UTILITY_POLES_ENSTO_IMWS_AND_ACTUAL_PROJECT_NOT_NATIVE_SPACING_NORM',
  sourceMetadata:{source_title:'Целый состав установки деревянных опор ВЛ 0,4 кВ',source_document_version:'EnstoLVABC Handbook p7-9; exact current92page overheadcatalog p22,44,47,88; PEM275RevD2023-03 manualCT6.1317 path plus exact currentCT6/ST34/SP19 official cards; actual customer woodenpole schedule still required',definition_hash:ELECTRICAL_POLES_04KV_WHOLE_SOURCE_SHA_R1117,artifact_sha256:s.primarySources.find(p=>p.key==='ensto-lv-abc-handbook')!.sha256,exact_locator:'IMWS anchor SOT21.01/PD2.2/SO250.01 and suspensionSO260/SOT4.8; SP19woodtop; SLIP22.1 exactmaterials and tools. ST31 TWOwedges and one complete reversible13/17mm ratchet per actual shared manual-tool inventory; no concurrent separate13mm socket. Before-use lubrication source/unit/actualproof stays held. Polegrade/geometry/preservation/fullfasteners/Civil/lift/safeisolation/completeQA remain held.'},
  applicabilityRu:'Явно принятые одиночные деревянные опоры ВЛ 0,4 кВ с совместимыми анкерными либо промежуточными узлами изолированной несущей жилы. Конкретные стойки, основание, нагрузки, отверстия, полный крепёж, подъём, безопасное отключение, контакты, защитная схема и полная программа контроля требуют принятия. Без переноса бетонной либо осветительной опоры, четырёхжильной или неизолированной несущей системы, допустимого усилия из SMFL, сетевых испытаний из числа опор и повторной оплаты отдельной ВЛ/Civil/QA. Контакты выполняются только выбранным ручным ключом-трещоткой13/17мм с принятой готовностью обслуживания; отдельная силовая головка/привод не добавляются к нему. Механизированный путь требует отдельного полного подтверждения и этой ветвью не допускается. Этот собранный проектный комплект не объявляется единой заводской поставкой.',ordinary:[],profile:[],
  conditional:[{id:f.method,title:'Точная технология существующей установки опор ВЛ 0,4 кВ',kind:'conditional',valueType:'enum',unitId:null,values:[s.method,s.legacyMethod]},...s.parameterSpecs.map(p=>({...p,kind:'conditional' as const,valueType:p.valueType as 'enum'|'text'|'integer'|'decimal',...('values' in p?{values:p.values}:{}),...(['text','enum'].includes(p.valueType)||('technicalFact' in p&&p.technicalFact)?{requiredWhen:active}:{})})),
   {id:f.legacy_source_gate,title:'Сохранённый общий состав не имеет принятого источника точной установки опор',kind:'internal',valueType:'enum',unitId:null,values:['CURRENT_NATIVE_ELECTRICAL_POLES_04KV_SOURCE_CHAIN_REQUIRED'],requiredWhen:legacy},
   {id:f.method_source_gate,title:'Точные опоры, арматура, основание, подъём и программа требуют принятого источника',kind:'internal',valueType:'enum',unitId:null,values:['EXACT_WOOD_POLE_IMWS_PROJECT_LIFT_CONTACT_QA_APPLICATION_SOURCE_REQUIRED'],requiredWhen:active},
   ...s.unresolvedNeeds.map(n=>({id:n.parameterId,title:n.titleRu,kind:'internal' as const,valueType:'decimal' as const,unitId:n.unitId}))],
  rows:[...s.parts.map(p=>({rowId:s.prefix+':'+p.key,formulaId:s.prefix+':formula:'+p.key,section:['CALCULATION_DETAIL','PROCESS_NOTE'].includes(p.kind)?'Учёт фактических стоек, узлов, инструмента, партий и остатков':'Физическое обеспечение установки опор ВЛ 0,4 кВ',category:p.unitId==='machine_hour'?'machinery':p.kind==='SERVICE'?'service':p.kind==='MECHANISM'?'machinery':['TOOL','ACCESSORY','EQUIPMENT'].includes(p.kind)?'equipment':'material',title:p.titleRu,unitId:p.unitId,expression:p.expression,inclusion:active,inputParameterIds:factsFor(p.key,p.scope),procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const,...((p.kind==='CALCULATION_DETAIL')?{formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId:p.unitId,minimum:0,...('exactZero' in p&&p.exactZero?{maximum:0}:{}),reasonRu:'Фактические меры и масса без тары неотрицательны; однородные балансы стоек, узлов и контактных зажимов равны нулю. Два отсутствующих числа остаются количественным UNKNOWN без scalar peer. Ручная правка не исправляет исходное противоречие; баланс не подтверждает технологию либо цену.'}}:{})})),
   ...s.unresolvedNeeds.map(n=>({rowId:s.prefix+':need:'+n.key,formulaId:s.prefix+':formula:need:'+n.key,title:n.titleRu,section:'Неопределённое применимое обеспечение',category:n.kind==='LABOR'?'labor':n.kind==='MECHANISM'?'machinery':n.kind==='EQUIPMENT'||n.kind==='TOOL'?'equipment':n.key==='qa-service'?'testing':n.kind==='SERVICE'?'service':n.kind==='TRANSPORT'?'logistics':'material',unitId:n.unitId,expression:n.parameterId,inclusion:active,inputParameterIds:common,procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const}))],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:s.returnWhen.map(n=>n.id+': '+n.returnWhen)});
 const gateIds=[f.legacy_source_gate,f.method_source_gate];
 const parameters:AutomaticOwnerDefinition['parameters'][number][]=[...parent.body.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,visible_when:legacy}})),...built.parameters.map((p,i)=>{const need=s.unresolvedNeeds.find(n=>n.parameterId===p.parameter_id),gate=gateIds.includes(p.parameter_id);return {...p,ordinal:s.nativeCounts.parameters+i,default_value:null,truth_metadata:need||gate?unresolvedApplicationNormTruthR1(p.truth_metadata,need?.reasonRu??'Exact source/application authority absent. Known ST31two-wedge inventory and actual pole/node/contact quantities cannot admit exact polegrade/preservation/fullhardware/foundation/lift/safeisolation/networkprogramme or price.'):{...p.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},actualProjectAuthenticated:false,sourceAuthorityPromoted:false,guide:{guide_kind:'PROJECT_DEFINED',source_role:'ACTUAL_WOOD_POLE_SCHEDULE_NODE_BOM_SITE_LAYOUT_AND_MANUFACTURER_DOCUMENT',source_document:s.contract,source_locator:'ACTUAL_POLE_FOUNDATION_WIND_ICE_SPANS_RIGGING_IMWS_CONTACTS_PROGRAMME_STOCK; NO_DEFAULT_READY',guide_version:s.contract,source_snapshot_hash:'11e582798496f47b3642d6c7ba1524176721592f272073e162fd7baacac5d032',verified_at:'2026-10-29T23:48:44Z',applicability:'Только закреплённый exact woodenpole/IMWS метод и фактический принятый проект; timestamp отражает source-review, не дату нормы, факт объекта или разрешение.',guide_validation_policy:'MANDATORY_BLOCK',guide_short_ru:p.title_ru+'; только фактический документ/измерение, без baseline/default/нормы/цены.'}}};})];
 const nativeFormulas=parent.body.formulas.map(formula=>{const b=s.retainedUnboundNativeQuantities.find(b=>b.formulaId===formula.formula_id);if(!b)return formula;const compiled=compileFormulaGraph(b.parameterId);return {...formula,expression_source:b.parameterId,ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,ast_sha256:estimateDeterministicHash(compiled.ast)};});
 for(const b of s.retainedUnboundNativeQuantities)parameters.push({parameter_id:b.parameterId,ordinal:parameters.length,value_type:'decimal',unit_id:b.unitId,title_ru:'Неустановленное автоматическое количество сохранённой позиции «'+b.originalResource.title_ru+'»',required:false,default_value:null,constraints_json:{min:0},truth_metadata:unresolvedApplicationNormTruthR1({semantic_parameter_key:s.catalogId+':'+b.parameterId,provenance:{retainedSourceContract:s.contract,originalFormulaRawSha256:b.originalFormulaRawSha256,originalResourceRawSha256:b.originalResourceRawSha256},guide:{guide_kind:'PROJECT_DEFINED',source_role:'UNRESOLVED_APPLICATION_NORM',guide_validation_policy:'MANDATORY_BLOCK',source_document:s.currentParentProof.sha256,source_locator:b.formulaId}},b.reasonRu)});
 const rehash=(r:AutomaticOwnerDefinition['resources'][number])=>{const{row_sha256:_prior,...body}=r;return {...body,row_sha256:estimateDeterministicHash(body)};};
 const resources=[...parent.body.resources.map(r=>{const b=s.retainedUnboundNativeQuantities.find(b=>b.rowId===r.row_id);return rehash({...r,inclusion_ast:{kind:'and',operands:[r.inclusion_ast,legacy,eq(f.legacy_source_gate,'CURRENT_NATIVE_ELECTRICAL_POLES_04KV_SOURCE_CHAIN_REQUIRED')]},resource_graph:{...r.resource_graph,inputParameterIds:[...(Array.isArray(r.resource_graph?.inputParameterIds)?r.resource_graph.inputParameterIds.filter((v:unknown):v is string=>typeof v==='string'):[]),f.legacy_source_gate],operationCompositionV1:electricalPoles04kvUsesR1117([r.row_id.includes('_overhead_')||r.row_id.includes('_tax_')?'legacy-cost':'legacy-source']),legacySourceHeldR1117:true,publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:['Все исходные ID/единицы/owners/формулы и полное raw происхождение сохранены. Исторические длина, шаг и мощность либо общие эвристики не являются фактическими опорами, нормой или принятым объектом.']}},source_metadata:{...r.source_metadata,currentLegacySourceHeldR1117:true,...(b?{runtimeExpressionSource:b.parameterId,calculationTraceTemplate:b.formulaId+'; formula='+b.parameterId+'; result=UNKNOWN; source application not admitted',retainedUnboundSourceQuantityV1:{contractVersion:s.contract,originalFormulaId:b.formulaId,originalFormulaRawSha256:b.originalFormulaRawSha256,originalResourceRawSha256:b.originalResourceRawSha256,originalSourceMetadataPreservedInSourcePack:true,runtimeFormulaAstChanged:true,originalFrozenExampleNotActualQuantity:true,automaticQuantityParameterId:b.parameterId,quantitySourceApproved:false,priceStockSupplyOrderDriver:false}}:{}),sourceAuthorityPromoted:false,full_technical_acceptance:false}});}),
  ...built.resources.map((r,i)=>{const part=s.parts.find(p=>s.prefix+':'+p.key===r.row_id),need=s.unresolvedNeeds.find(n=>s.prefix+':need:'+n.key===r.row_id),detail=part?.kind==='CALCULATION_DETAIL';if(!part&&!need)throw Error('ELECTRICAL_POLES_04KV_EXACT_SOURCE_RESOURCE_REQUIRED');const kind=need?need.kind:part!.kind,nonphysical=detail||part?.kind==='PROCESS_NOTE';
   const exactPrimaryKey=part?.key==='connector-ratchet'?'ensto-ct6-1317-complete-ratchet-current':part?.key==='connector-holder'?'ensto-st34-holding-tool-current':part?.key==='pole-cap'?'ensto-sp19-exact-top-hat-current':part?.key==='cap-nails'?'ensto-sp19-fi-installation-range-current':null,
    exactPrimary=exactPrimaryKey?s.primarySources.find(source=>source.key===exactPrimaryKey):null;
   if(exactPrimaryKey&&!exactPrimary)throw Error('ELECTRICAL_POLES_04KV_EXACT_METHOD_ARTIFACT_REQUIRED:'+exactPrimaryKey);
   if(part?.key==='cap-nails'&&!s.primarySources.some(source=>source.key===s.sp19IncludedNailSourceR1153.suppliedComponentBOM.sourceKey))throw Error('ELECTRICAL_POLES_04KV_EXACT_METHOD_ARTIFACT_REQUIRED:'+s.sp19IncludedNailSourceR1153.suppliedComponentBOM.sourceKey);
   return rehash({...r,ordinal:s.nativeCounts.resources+i,cost_owner_id:null,resource_graph:{...r.resource_graph,operationCompositionV1:electricalPoles04kvUsesR1117((part??need)!.uses),...(nonphysical?{calculationDetailV1:detail,...(part?.kind==='PROCESS_NOTE'?{inputParameterIds:[...s.requiredScopeFacts],scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',objectFactMode:'PROJECT_APPLICABILITY_ONLY',groupId:s.catalogId+':scope:'+part!.scopeGroup,groupTitleRu:s.scopeGroupTitles[part!.scopeGroup as keyof typeof s.scopeGroupTitles],titleRu:part!.titleRu,reasonRu:'Число опор, арматуры, инструментов, ручное количество и исключение оплаты не заменяют принятия основания, нагрузок, всей совместимости, безопасного метода и программы.',exactScopeWhen:{kind:'and',operands:[active,eq(f.pole_fit,s.conditionValues.pole_fit)]},objectFactParameterId:f.pole_fit,unknownObjectValues:['UNKNOWN'],requiredFactParameterIds:[...s.requiredScopeFacts],coveringRowIds:[],originalRowIds:s.scopeGroups.find(g=>g.rowId===r.row_id)!.originalRowIds,sourceEvidence:[{sha256:s.primarySources.find(p=>p.key==='ensto-lv-abc-handbook')!.sha256,locator:'Exact woodenpole schedule, accepted IMWS nodes/fullhardware/Civil/Structural/wind/ice/spans/lift/all-source-isolation/contacts/fullnetworkQA. Complete true context union without truncation, not OEM actualobject acceptance'}]}}:{})}:{physicalProvisionV1:{sameCatalogueId:s.catalogId,sourceBasis:part?.scope??'UNRESOLVED_APPLICABLE_METHOD',physicalOwnerNotBillingOwner:s.prefix+':actual-installed-inventory',sourceKitNotNewOrder:true,includedFactoryComponentNotOrderedAgain:part?.key==='included-bracket'||part?.key==='cap-nails',wholeKitIsAssembledProjectBOM:true,manufacturerWholePoleDeliveryNotClaimed:true,existingStructuralCivilCableQaOwnersRequired:true,actualPriceOwnerAuthenticated:false,structuralCableAndQaNotPaidAgain:true,newPaidOwnerCreated:false,actualPriceCoverageAuthenticated:false,actualWarehouseIdentityAuthenticated:false}}),publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,...(nonphysical?{rowKind:part?.kind==='PROCESS_NOTE'?'PROCESS_NOTE':'CALCULATION_DETAIL'}:{resourceKind:kind}),detailsRu:[part?.kind==='PROCESS_NOTE'?'Неплатный носитель обязательного принятия своего полного контекста опор; число1 не является физическим комплектом, постом, трудом или выполненным испытанием.':need?'Полный применимый состав, единица и количество этого обеспечения ещё требуют подтверждения.':detail?'Контрольная мера раскроя, партии, события или необходимого геометрического условия; это не отдельный физический ресурс или доказанное выполненное испытание.':'Фактический установленный расход и общая комплектность показаны у реальных потребителей; заводская поставка, целый остаток, заказ и стоимость различаются.','Включённый кронштейн и гвозди защиты верха не заказываются повторно; общий инструмент повторяется у реальных потребителей с одним владельцем. Отдельные ВЛ, Civil/Structural, заземление и QA сохраняют принятые границы оплаты.']}},source_metadata:{...r.source_metadata,...(exactPrimary&&part?{artifact_sha256:exactPrimary.sha256,exact_locator:part.quantityAuthority,primaryOfficialUrl:exactPrimary.url,manufacturerComponentEvidenceNotQuantityNorm:true,projectQuantitiesStillRequireObjectFacts:true}:{}),...(part?.key==='cap-nails'?{includedSupplyComponentEvidenceV1:s.sp19IncludedNailSourceR1153,installedQuantityStillActualParameter:f.cap_nails_installed}:{}),normativeTrace:[],normative_source_ids:[],sourceRole:need?'UNRESOLVED_APPLICATION_NORM':nonphysical?'ACTUAL_SCOPE_OR_NONPHYSICAL_MEASURE':'DECLARED_EXACT_MANUFACTURER_COMPONENT_OR_ACTUAL_INVENTORY',wholeSourceSha256:ELECTRICAL_POLES_04KV_WHOLE_SOURCE_SHA_R1117,actualProjectAuthenticated:false,sourceRegistryAdmission:null,newPaidOwnerCreated:false,priceCoverageAuthenticated:false,legacyGenericElectricalRouteApproved:false,full_technical_acceptance:false}});})];
 const model={parameters,formulas:[...nativeFormulas,...built.formulas],resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[s.legacyPrimaryMeasureId,f.pole_count]},consumers=buildMasterParameterCalculationConsumers(model);
 return {...model,parameters:model.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}))};
}
export function electricalPoles04kvWholeCompositionR1117(){const s=electricalPoles04kvWhole;const entry=(key:string,unitId:string,kind:string,uses:readonly string[],need=false)=>({expectedResourceId:s.prefix+':'+(need?'need:':'')+key,formulaId:s.prefix+':formula:'+(need?'need:':'')+key,unitId,resourceKind:kind,operationId:electricalPoles04kvOperationR1117(uses[0]).operationId,requiredOperationIds:uses.map(k=>electricalPoles04kvOperationR1117(k).operationId),sourceId:s.proposedBranchSourceKey,condition:'Explicit held exact utilitywood/IMWS assemblies and accepted pole/Foundation/Structural/lift/contacts/neutral/PE/fullnetworkQA with actual stock and soleexistingowners required',resolution:{kind:'ROW',rowId:s.prefix+':'+(need?'need:':'')+key}});const roster=s.operations.map(o=>electricalPoles04kvOperationR1117(o.key)),kinds=['MATERIAL','CONSUMABLE','TOOL','ACCESSORY','EQUIPMENT','MECHANISM','LABOR','SERVICE','TRANSPORT','PPE'];return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,evidenceSha256:ELECTRICAL_POLES_04KV_WHOLE_SOURCE_SHA_R1117,operationResourceBindingRequired:true,operationRoster:roster,
 entries:[...s.parts.filter(p=>!['CALCULATION_DETAIL','PROCESS_NOTE'].includes(p.kind)).map(p=>entry(p.key,p.unitId,p.kind,p.uses)),...s.unresolvedNeeds.map(n=>entry(n.key,n.unitId,n.kind,n.uses,true)),...s.parts.filter(p=>['CALCULATION_DETAIL','PROCESS_NOTE'].includes(p.kind)).map(p=>({expectedResourceId:s.prefix+':'+p.key,operationId:electricalPoles04kvOperationR1117(p.uses[0]).operationId,requiredOperationIds:p.uses.map(k=>electricalPoles04kvOperationR1117(k).operationId),sourceId:s.proposedBranchSourceKey,condition:'Actual balance, factorypack stockreference or project scope carrier is nonphysical, not admitted material/labour/norm/price',resolution:{kind:'NOT_APPLICABLE',reasonRu:'Баланс, справочная упаковка или носитель обязательного проектного допуска не является дополнительным физическим ресурсом, оплаченной услугой, испытанием или достаточной приёмкой.'}}))],
 operationRequirements:roster.filter(o=>o.processRole==='PROCESS').map(o=>({operationId:o.operationId,sourceId:s.proposedBranchSourceKey,requirements:Object.fromEntries(kinds.map(k=>[k,{status:'UNRESOLVED',rowIds:[],reasonRu:'Полный применимый '+k+' состав операции требует источника, единицы, количества и одного владельца; известная заводская часть не закрывает весь класс.',returnWhen:'Принят весь совместимый '+k+' состав или источник подтверждает точный N/A этой операции.'}]))})),nativeOriginal63RowsRetainedUnverified:true,nativeFormulaObjectsUnchanged:61,nativeRuntimeAstDeltaCount:2,historicalPoleSpacingLengthCapacityNotActualObject:true,mandatoryApplicabilityUsesRequiredWhenAndObjectScopeV1:true,acceptedStructuralCivilFactoryInterfacesRequired:true,scopeContextOriginalRowIdsUnionExact:true,scopeContextMaximum128:true,currentRegistrySourceCount:s.currentRegistryRows.sources.length,currentR2SourceLookupCount:s.proposedBranchLookupCount,normalReadNotFormalScopedCapture:true,sourceAdmission:null,newPaidOwnerCreated:false,physicalClosures:0,fullTechnicalAcceptance:false};}
export async function compileElectricalPoles04kvWholeCurrentR1117(parent:ElectricalPoles04kvCanonicalParentR1117,submittedParameters:Record<string,unknown>,rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']){const d=electricalPoles04kvWholeCurrentForwardR1117(parent),primary=submittedParameters[electricalPoles04kvWhole.fields.method]===electricalPoles04kvWhole.method?electricalPoles04kvWhole.fields.pole_count:electricalPoles04kvWhole.legacyPrimaryMeasureId;return compileCanonicalEstimateCore({operation:rowOverrides?'recalculate':'compile',catalogId:electricalPoles04kvWhole.catalogId,compilerVersion:electricalPoles04kvWhole.contract,primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters,confirmedParameters:{},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:async value=>estimateDeterministicHash(value)});}
export function electricalPoles04kvWholeOrdinaryMaterializerInputR1117(parent:ElectricalPoles04kvCanonicalParentR1117){return{catalogId:electricalPoles04kvWhole.catalogId,historicalLookupSourceKey:electricalPoles04kvWhole.historicalLookupSourceKey,proposedBranchSourceKey:electricalPoles04kvWhole.proposedBranchSourceKey,proposedBranchSourceCapture:null,proposedSourceAbsenceNotEstablishedByHistoricalLookup:true,proposedLookupActualCount:electricalPoles04kvWhole.proposedBranchLookupCount,currentLookupIsNotFormalCapture:true,currentNormalTargetReadR1153:electricalPoles04kvWhole.currentNormalTargetReadR1153,historicalLookupNotQueriedInR1117:true,currentHeader:parent.header,currentRawProofSha256:electricalPoles04kvWhole.currentParentProof.sha256,definition:electricalPoles04kvWholeCurrentForwardR1117(parent),independentCompletenessMap:electricalPoles04kvWholeCompositionR1117(),primaryMeasureSelectionV1:electricalPoles04kvWhole.primaryMeasureSelection,applicability:{primaryMeasureSelectionV1:electricalPoles04kvWhole.primaryMeasureSelection,newRootOnly:true,automaticMigrationAllowed:false,sourceAuthorityPromotedToGenericRoute:false,acceptedStructuralCivilFactoryInterfacesMandatory:true,mandatoryConditionContract:['requiredWhen','canonical-scope-requirement/v1'],acceptedExactPoleImwsAndSoleLineCivilQaOwnersMandatory:true},currentRegistryRows:electricalPoles04kvWhole.currentRegistryRows,sourceRegistryAdmission:null,existingMasterConfigOwner:'prepareMasterSingleDefinitionSuccessorR1',existingSourceProducer:'domains/electricalComplete/productionBinding.ts',newReady:false,fullTechnicalAcceptance:false};}
