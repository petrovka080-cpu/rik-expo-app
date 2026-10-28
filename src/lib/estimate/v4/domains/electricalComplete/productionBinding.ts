import groundingSourceR867 from '../../../../../../data/estimate-benchmarks/source-packs/grounding-system-current-r867-r1.json';
import retainedSourceQuantityPolicyR871 from '../../../../../../data/estimate-benchmarks/source-packs/electrical-retained-unbound-quantity-source-r871-r1.json';
import {compileFormulaGraph} from '../../../backendPlatform/formulaGraph';
import testingSourceR858 from '../../../../../../data/estimate-benchmarks/source-packs/electrical-testing-commissioning-current-r858-r1.json';
import outdoorBoardSourceR846 from '../../../../../../data/estimate-benchmarks/source-packs/outdoor-distribution-board-current-r846-r1.json';
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


/** Exact existing canonical sibling of this registered domain owner. This
 * ordinary source adapter consumes ROOT's actual whole parent; it does not
 * relabel the445-template domain factory as a DB read or create another work. */
export const OUTDOOR_BOARD_CURRENT_SOURCE_R846=outdoorBoardSourceR846;
export const OUTDOOR_BOARD_CURRENT_SOURCE_SHA_R846=canonicalEstimateSha256HexText(canonicalEstimateStableJson(outdoorBoardSourceR846));
type OutdoorCanonicalParentR846={header:Record<string,unknown>;body:Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>};
const outdoorSource=OUTDOOR_BOARD_CURRENT_SOURCE_R846;
function outdoorOperationR846(key:string):Record<string,any>{
 const op=outdoorSource.operations.find(o=>o.key===key);if(!op)throw Error('OUTDOOR_BOARD_EXACT_OPERATION_REQUIRED:'+key);
 const {key:_key,...value}=op;return {...value,contractVersion:'canonical-operation-resource/v1'};
}
function outdoorUsesR846(keys:readonly string[]){const uses=keys.map(outdoorOperationR846);return {...uses[0],additionalOperations:uses.slice(1)};}
/** Historical network aggregates are retained and visibly SOURCE_HELD. They
 * are not physical kits, admitted norms or zero-cost substitutions. */
export function outdoorDistributionBoardCurrentForwardR846(parent:OutdoorCanonicalParentR846):AutomaticOwnerDefinition{
 if(parent.header.definition_version_id!==outdoorSource.currentParent.definition_version_id
  ||parent.header.definition_sha256!==outdoorSource.currentParent.definition_sha256
  ||[parent.body.parameters.length,parent.body.formulas.length,parent.body.resources.length].join(':')!=='6:58:58')
  throw Error('OUTDOOR_BOARD_EXACT_CURRENT_R846_REQUIRED');
 for(const anchor of outdoorSource.legacySourceRows){const r=parent.body.resources.find(r=>r.row_id===anchor.row_id);
  if(!r||r.ordinal!==anchor.ordinal||r.category!==anchor.category||r.formula_id!==anchor.formula_id||r.unit_id!==anchor.unit_id||r.cost_owner_id!==anchor.cost_owner_id)
   throw Error('OUTDOOR_BOARD_CURRENT_ROW_DRIFT:'+anchor.row_id);}
 for(const anchor of outdoorSource.legacySourceFormulas){const f=parent.body.formulas.find(f=>f.formula_id===anchor.formula_id);
  if(!f||f.expression_source!==anchor.expression_source||f.output_unit_id!==anchor.output_unit_id
   ||canonicalEstimateStableJson(f.input_parameter_ids)!==canonicalEstimateStableJson(anchor.input_parameter_ids))throw Error('OUTDOOR_BOARD_CURRENT_FORMULA_DRIFT:'+anchor.formula_id);}
 const selected={kind:'equals' as const,parameterId:outdoorSource.profileId,value:outdoorSource.profileValue};
 const fit={kind:'equals' as const,parameterId:outdoorSource.fitId,value:outdoorSource.fitValue};
 const canopy={kind:'equals' as const,parameterId:outdoorSource.canopyScopeId,value:outdoorSource.canopyApplied};
 const facts=[outdoorSource.boardCountId,outdoorSource.profileId,outdoorSource.documentId,outdoorSource.fitId];
 const extra=buildAutomaticConstructionOwnerR1({contract:outdoorSource.contract,semanticOwner:outdoorSource.catalogId,
  sourceId:outdoorSource.historicalSourceKey,normId:'MANUFACTURER_EXACT_BOM_NOT_ACCEPTED_INSTALLATION_NORM',
  sourceMetadata:{source_title:'Наружный щит: точная заводская поставка и применимый козырёк',source_document_version:outdoorSource.contract,
   definition_hash:OUTDOOR_BOARD_CURRENT_SOURCE_SHA_R846,artifact_sha256:outdoorSource.sources[0]!.sha256,
   exact_locator:'Polymer IP66 УХЛ1 edition4 PDF1–2/10; canopy PDF1–2. Separate PEpoint and flange guides retain their own applicability.'},
  applicabilityRu:'Только точная подтверждённая комплектация существующего наружного щита. Поставка корпуса не является готовым НКУ или расходом всех деталей при установке.',
  ordinary:[{id:outdoorSource.boardCountId,title:'Фактическое количество устанавливаемых наружных щитов',valueType:'integer',unitId:'pcs',kind:'ordinary',min:1}],
  profile:[],conditional:[
   {id:outdoorSource.receivedCountId,title:'Принятое число поставленных точных корпусов по накладной',valueType:'integer',unitId:'pcs',kind:'conditional',min:0,requiredWhen:selected},
   {id:outdoorSource.profileId,title:'Точная комплектация корпуса из первичного источника',valueType:'enum',unitId:null,kind:'conditional',values:[outdoorSource.profileValue]},
   {id:outdoorSource.documentId,title:'Фактический проект, спецификация и границы поставки НКУ',valueType:'text',unitId:null,kind:'conditional',requiredWhen:selected},
   {id:outdoorSource.fitId,title:'Применимость полной наружной сборки и монтажного узла',valueType:'enum',unitId:null,kind:'conditional',values:[outdoorSource.fitValue],requiredWhen:selected},
   {id:outdoorSource.canopyScopeId,title:'Применимость совместимого защитного козырька',valueType:'enum',unitId:null,kind:'conditional',values:[outdoorSource.canopyApplied,outdoorSource.canopyNotApplicable],requiredWhen:selected},
   {id:outdoorSource.canopyCountId,title:'Фактическое число монтируемых совместимых козырьков',valueType:'integer',unitId:'pcs',kind:'conditional',min:1,requiredWhen:canopy},
   {id:outdoorSource.legacySourceGateId,title:'Источник и применимость58 старых формул не приняты',valueType:'enum',unitId:null,kind:'internal',values:[outdoorSource.legacySourceGateValue]}],
  rows:[...outdoorSource.factoryParts.map(p=>({rowId:outdoorSource.prefix+':'+p.key,formulaId:outdoorSource.prefix+':formula:'+p.key,
   section:'Точная поставка корпуса',category:'material',title:p.titleRu,unitId:p.unitId,expression:p.basis,
   inputParameterIds:facts,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,procurement:false,inclusion:{kind:'and' as const,operands:[selected,fit]}})),
   ...outdoorSource.canopyAppliedParts.map(p=>({rowId:outdoorSource.prefix+':'+p.key,formulaId:outdoorSource.prefix+':formula:'+p.key,
    section:'Монтаж совместимого козырька',category:'material',title:p.titleRu,unitId:p.unitId,expression:p.basis,
    inputParameterIds:facts,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,procurement:false,inclusion:{kind:'and' as const,operands:[selected,fit,canopy]}})),
   {rowId:outdoorSource.measureRowId,formulaId:outdoorSource.prefix+':formula:installed-count-detail',section:'Исходный объём',category:'material',title:'Количество устанавливаемых наружных щитов',unitId:'pcs',expression:outdoorSource.boardCountId,costTreatment:'INFORMATIONAL_SCOPE',procurement:false},
   ...outdoorSource.canopyBalance.map(p=>({rowId:p.rowId,formulaId:p.formulaId,section:'Паспортный баланс деталей козырька',category:'material',title:p.titleRu,unitId:'pcs',
    expression:outdoorSource.canopyCountId+'*'+p.countPerCanopy,costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false,
    inclusion:{kind:'and' as const,operands:[selected,fit,canopy]}}))],
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:outdoorSource.returnWhen.map(n=>n.id+': '+n.returnWhen)});
 const parameters=[...parent.body.parameters,...extra.parameters.map((p,i)=>({...p,ordinal:6+i,truth_metadata:p.parameter_id===outdoorSource.legacySourceGateId
  ?unresolvedApplicationNormTruthR1(p.truth_metadata,'R846 current has0source/binding/locator/registry rows. Retained58 generic network formulas are not admitted outdoor-board quantity norms.')
  :{...p.truth_metadata,actualProjectAuthenticated:false,provenance:{...p.truth_metadata.provenance as Record<string,unknown>,consumer_input_role_v1:'OBJECT_FACT'},
   guide:{...p.truth_metadata.guide as Record<string,unknown>,guide_kind:'PROJECT_DEFINED',source_role:'PROJECT_DOCUMENTATION',guide_validation_policy:'MANDATORY_BLOCK',
    guide_version:outdoorSource.contract,source_snapshot_hash:OUTDOOR_BOARD_CURRENT_SOURCE_SHA_R846,source_document:outdoorSource.historicalSourceKey,
    source_locator:'ACTUAL_OBJECT_DOCUMENT_REQUIRED_SOURCE_FACTS_DO_NOT_AUTHENTICATE_PROJECT',verified_at:'2026-10-28T00:00:00+06:00'}}}))];
 const rehash=(r:AutomaticOwnerDefinition['resources'][number])=>{const {row_sha256:_old,...body}=r;return {...body,row_sha256:estimateDeterministicHash(body)};};
 const resources=[...parent.body.resources.map(r=>rehash({...r,inclusion_ast:{kind:'and',operands:[r.inclusion_ast,
  {kind:'equals',parameterId:outdoorSource.legacySourceGateId,value:outdoorSource.legacySourceGateValue}]},
  resource_graph:{...r.resource_graph,operationCompositionV1:{...outdoorSource.legacyReference,contractVersion:'canonical-operation-resource/v1'},legacyPhysicalScopeUnverifiedR846:true,
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,
    detailsRu:['Сохранена историческая позиция. Полный физический состав, источник количества и область применения не подтверждены.']}},
  source_metadata:{...r.source_metadata,currentLegacySourceHeldR846:true,full_technical_acceptance:false,sourceAdmissionProved:false}})),
  ...extra.resources.map((r,i)=>{const part=[...outdoorSource.factoryParts,...outdoorSource.canopyAppliedParts][i];const detail=[outdoorSource.measureRowId,...outdoorSource.canopyBalance.map(p=>p.rowId)].includes(r.row_id);
   return rehash({...r,ordinal:58+i,cost_owner_id:detail?r.cost_owner_id:outdoorSource.primaryExistingCostOwner,
    resource_graph:{...r.resource_graph,...(detail?{calculationDetailV1:true}:{parentCostOwnerId:outdoorSource.primaryPaidRowId,includedInResourceOwnerRowId:outdoorSource.primaryPaidRowId,
     operationCompositionV1:outdoorUsesR846(part!.uses)}),
     publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,
      ...(detail?{rowKind:'CALCULATION_DETAIL'}:{resourceKind:part!.kind}),detailsRu:[detail?'Расчётная величина по паспорту или исходному объёму; не фактическая поставка, складской остаток, заказ или второй оплачиваемый ресурс.':i<outdoorSource.factoryParts.length
       ?'Заводская поставка по накладной, не расход при монтаже и не новый заказ. Применение деталей и граница цены подтверждаются отдельно.'
       :'Четыре применяемые детали на подтверждённый совместимый козырёк; пятая поставляемая заглушка не объявлена установленной.']}},
    source_metadata:{...r.source_metadata,normativeTrace:[],normative_source_ids:[],wholeSourceSha256:OUTDOOR_BOARD_CURRENT_SOURCE_SHA_R846,
     manufacturerBOMNotInstallationNorm:true,independentPurchaseAllowed:false,priceCoverageAuthenticated:false,actualProjectAuthenticated:false,
     quantityAuthority:detail?'Actual user measure, nonphysical count':part!.basis,supplyNotInstalledConsumption:!detail&&i<outdoorSource.factoryParts.length}});
  })];
 const held=holdRetainedUnboundSourceQuantityR871({parameters,formulas:[...parent.body.formulas,...extra.formulas],resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[outdoorSource.boardCountId]},parent.body,'odb-r846');
 const consumers=buildMasterParameterCalculationConsumers(held);
 return {...held,parameters:held.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}))};
}
export function outdoorDistributionBoardIndependentCompositionR846(){
 const entry=(rowId:string,formulaId:string,unitId:string,keys:string[])=>({expectedResourceId:rowId,formulaId,unitId,operationId:outdoorSource.prefix+':'+keys[0],
  requiredOperationIds:keys.map(k=>outdoorSource.prefix+':'+k),sourceId:outdoorSource.historicalSourceKey,condition:'Exact source/application/project facts required; no norm or owner-price closure from a count.',resolution:{kind:'ROW' as const,rowId}});
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,
  operationResourceBindingRequired:true,evidenceSha256:OUTDOOR_BOARD_CURRENT_SOURCE_SHA_R846,
  operationRoster:[outdoorSource.legacyReference,...outdoorSource.operations.map(({key:_key,...op})=>op)],
  operationRequirements:outdoorSource.independentClassRequirements.map(op=>({operationId:op.operationId,sourceId:outdoorSource.historicalSourceKey,
   requirements:Object.fromEntries(op.classes.map(({kind,...r})=>[kind,r]))})),
  entries:[...outdoorSource.legacySourceRows.map(r=>entry(r.row_id,r.formula_id,r.unit_id,['legacy-source-review'])),
   ...[...outdoorSource.factoryParts,...outdoorSource.canopyAppliedParts].map(p=>({...entry(outdoorSource.prefix+':'+p.key,outdoorSource.prefix+':formula:'+p.key,p.unitId,p.uses),
    resolution:{kind:'INCLUDED_COMPONENT_ROW' as const,rowId:outdoorSource.prefix+':'+p.key,parentRowId:outdoorSource.primaryPaidRowId}})),
   ...[outdoorSource.measureRowId,...outdoorSource.canopyBalance.map(p=>p.rowId)].map(id=>({expectedResourceId:id,operationId:outdoorSource.prefix+':accept',sourceId:outdoorSource.historicalSourceKey,
    condition:'Nonphysical measure or passport balance is not actual supply, retained stock or another physical resource.',resolution:{kind:'NOT_APPLICABLE' as const,reasonRu:'Расчётный счётчик сохранён отдельно; не физическое изделие, закупка, фактический запас или дополнительная работа.'}}))]};
}
/** Finite materializer input for ROOT's existing generic Master config. All
 *58 legacy rows and their current owner keys remain in the denominator. This
 *declaration never supplies a missing source/registry/locator receipt. */
export function outdoorDistributionBoardOrdinaryMaterializerInputR846(parent:OutdoorCanonicalParentR846){
 const definition=outdoorDistributionBoardCurrentForwardR846(parent);
 return {catalogId:outdoorSource.catalogId,sourceKey:outdoorSource.historicalSourceKey,currentHeader:parent.header,
  expectedParentShape:[6,58,58] as const,definition,independentCompletenessMap:outdoorDistributionBoardIndependentCompositionR846(),
  currentRegistryRows:{bindings:0,locators:0,sources:0,newSource:0},sourceRegistryAdmission:null,existingMasterConfigOwner:'prepareMasterSingleDefinitionSuccessorR1',
  existingSourceProducer:'domains/electricalComplete/productionBinding.ts',fullTechnicalAcceptance:false,newReady:false};
}


/** Existing canonical testing sibling. The exact actual R858 body is mandatory;
 * neither the registered domain factory nor an approved demo is a DB parent. */
export const ELECTRICAL_TESTING_CURRENT_SOURCE_R858=testingSourceR858;
export const ELECTRICAL_TESTING_CURRENT_SOURCE_SHA_R858=canonicalEstimateSha256HexText(canonicalEstimateStableJson(testingSourceR858));
type TestingCanonicalParentR858={header:Record<string,unknown>;body:Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>};
const qaSource=ELECTRICAL_TESTING_CURRENT_SOURCE_R858;
function testingOperationR858(key:string):Record<string,any>{
 const op=qaSource.operations.find(o=>o.key===key);if(!op)throw Error('ELECTRICAL_TESTING_EXACT_OPERATION_REQUIRED:'+key);
 const {key:_key,...value}=op;return {...value,contractVersion:'canonical-operation-resource/v1'};
}
function testingUsesR858(keys:readonly string[]){const uses=keys.map(testingOperationR858);return {...uses[0],additionalOperations:uses.slice(1)};}
export function electricalTestingCurrentForwardR858(parent:TestingCanonicalParentR858):AutomaticOwnerDefinition{
 if(parent.header.definition_version_id!==qaSource.currentParent.definition_version_id
  ||parent.header.definition_sha256!==qaSource.currentParent.definition_sha256
  ||[parent.body.parameters.length,parent.body.formulas.length,parent.body.resources.length].join(':')!=='6:63:63')throw Error('ELECTRICAL_TESTING_EXACT_CURRENT_R858_REQUIRED');
 for(const a of qaSource.legacySourceRows){const r=parent.body.resources.find(r=>r.row_id===a.row_id);
  if(!r||r.ordinal!==a.ordinal||r.category!==a.category||r.formula_id!==a.formula_id||r.unit_id!==a.unit_id||r.cost_owner_id!==a.cost_owner_id)throw Error('ELECTRICAL_TESTING_CURRENT_ROW_DRIFT:'+a.row_id);}
 for(const a of qaSource.legacySourceFormulas){const f=parent.body.formulas.find(f=>f.formula_id===a.formula_id);
  if(!f||f.expression_source!==a.expression_source||f.output_unit_id!==a.output_unit_id||canonicalEstimateStableJson(f.input_parameter_ids)!==canonicalEstimateStableJson(a.input_parameter_ids))throw Error('ELECTRICAL_TESTING_CURRENT_FORMULA_DRIFT:'+a.formula_id);}
 if(qaSource.parts.length!==24||qaSource.parts.reduce((n,p)=>n+p.countPerWhole,0)!==34)throw Error('ELECTRICAL_TESTING_EXACT_FULL_STANDARD_INSTRUMENT_KIT_REQUIRED');
 const selected={kind:'equals' as const,parameterId:qaSource.kitProfileId,value:qaSource.kitProfile};
 const fit={kind:'equals' as const,parameterId:qaSource.programFitId,value:qaSource.programFit};
 const method={kind:'equals' as const,parameterId:qaSource.methodId,value:qaSource.method};
 const active={kind:'and' as const,operands:[selected,fit,method]};
 const renewal={kind:'equals' as const,parameterId:qaSource.renewalScopeId,value:qaSource.renewalApplied};
 const facts=[qaSource.kitProfileId,qaSource.kitCountId,qaSource.inventoryId,qaSource.programId,qaSource.programFitId,qaSource.cordId,qaSource.methodId];
 const built=buildAutomaticConstructionOwnerR1({contract:qaSource.contract,semanticOwner:qaSource.catalogId,
  sourceId:qaSource.historicalSourceKey,normId:'MANUFACTURER_OWNED_INSTRUMENT_BOM_NOT_TEST_OR_SERVICE_NORM',
  sourceMetadata:{source_title:'Электроизмерения: полный собственный измерительный комплект и документированные замены питания',source_document_version:qaSource.contract,
   definition_hash:ELECTRICAL_TESTING_CURRENT_SOURCE_SHA_R858,artifact_sha256:qaSource.sources[4]!.sha256,exact_locator:qaSource.sources[4]!.locatorRu},
  applicabilityRu:'Только подтверждённый полный собственный1662EU/совместимый двухполюсный указатель и устройство проверки. Реальная программа, пригодность, условия и результаты отдельно обязательны. Нет автоматической нормы услуги, поста, часов, измерений или заказа.',
  ordinary:[{id:qaSource.planCountId,title:'Число реальных измерительных записей в утверждённом плане',kind:'ordinary',valueType:'integer',unitId:'pcs',min:1}],profile:[],conditional:[
   {id:qaSource.kitProfileId,title:'Точный полный собственный измерительный комплект',kind:'conditional',valueType:'enum',unitId:null,values:[qaSource.kitProfile]},
   {id:qaSource.kitCountId,title:'Фактическое число полных пригодных комплектов по ведомости',kind:'conditional',valueType:'integer',unitId:'set',min:1,requiredWhen:selected},
   {id:qaSource.inventoryId,title:'Фактическая ведомость состава, состояния и документов проверки приборов',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
   {id:qaSource.programId,title:'Утверждённая программа с цепями, режимами, критериями и ответственными',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
   {id:qaSource.programFitId,title:'Подтверждённая применимость комплекта ко всей заявленной программе',kind:'conditional',valueType:'enum',unitId:null,values:[qaSource.programFit],requiredWhen:selected},
   {id:qaSource.methodId,title:'Границы методов утверждённой программы',kind:'conditional',valueType:'enum',unitId:null,values:[qaSource.method],requiredWhen:selected},
   {id:qaSource.cordId,title:'Точное совместимое исполнение сетевого измерительного шнура из ведомости',kind:'conditional',valueType:'enum',unitId:null,values:qaSource.cordVariants.map(c=>c.value),requiredWhen:selected},
   {id:qaSource.renewalScopeId,title:'Документированные полные замены питания в данном объёме',kind:'conditional',valueType:'enum',unitId:null,values:[qaSource.renewalApplied,qaSource.renewalNone],requiredWhen:selected},
   {id:qaSource.renewalRecordId,title:'Фактический журнал полных замен питания по приборам',kind:'conditional',valueType:'text',unitId:null,requiredWhen:renewal},
   ...qaSource.renewals.map(p=>({id:p.countId,title:p.titleRu+' — число событий',kind:'conditional' as const,valueType:'integer' as const,unitId:'pcs',min:0,requiredWhen:renewal})),
   {id:qaSource.legacyGateId,title:'Источник и применимость63 исторических формул не приняты',kind:'internal',valueType:'enum',unitId:null,values:[qaSource.legacyGateValue]}],
  rows:[...qaSource.parts.map(p=>({rowId:qaSource.prefix+':'+p.key,formulaId:qaSource.prefix+':formula:'+p.key,section:'Полный собственный измерительный комплект',category:'equipment',title:p.titleRu,unitId:p.unitId,
   expression:p.quantityBasis,inputParameterIds:facts,inclusion:active,costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false})),
   ...qaSource.renewals.map(p=>({rowId:qaSource.prefix+':'+p.key,formulaId:qaSource.prefix+':formula:'+p.key,section:'Документированные полные замены питания',category:'material',title:p.titleRu,unitId:'pcs',expression:p.countId+'*'+p.multiplier,
    inputParameterIds:[...facts,qaSource.renewalRecordId],inclusion:{kind:'and' as const,operands:[active,renewal]},costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false})),
   {rowId:qaSource.measureRowId,formulaId:qaSource.prefix+':formula:measurement-plan-entry-count-detail',section:'Фактическая программа',category:'material',title:'Число записей утверждённого плана измерений',unitId:'pcs',expression:qaSource.planCountId,
    costTreatment:'INFORMATIONAL_SCOPE',procurement:false}],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:qaSource.returnWhen.map(n=>n.id+': '+n.returnWhen)});
 const parameters=[...parent.body.parameters,...built.parameters.map((p,i)=>({...p,ordinal:6+i,truth_metadata:p.parameter_id===qaSource.legacyGateId
  ?unresolvedApplicationNormTruthR1(p.truth_metadata,'ActualR858 has0bindings/locators/sources/newSource. Retained63pole/network aggregates have no accepted electrical-testing quantity norm or application source.')
  :{...p.truth_metadata,actualProjectAuthenticated:false,provenance:{...p.truth_metadata.provenance as Record<string,unknown>,consumer_input_role_v1:'OBJECT_FACT'},
   guide:{...p.truth_metadata.guide as Record<string,unknown>,guide_kind:'PROJECT_DEFINED',source_role:'PROJECT_DOCUMENTATION',guide_validation_policy:'MANDATORY_BLOCK',guide_version:qaSource.contract,
    source_snapshot_hash:ELECTRICAL_TESTING_CURRENT_SOURCE_SHA_R858,source_document:qaSource.historicalSourceKey,source_locator:'ACTUAL_APPROVED_PROGRAM_AND_INVENTORY_REQUIRED_NOT_CONTROL_FIXTURE',verified_at:'2026-10-28T00:00:00+06:00'}}}))];
 const rehash=(r:AutomaticOwnerDefinition['resources'][number])=>{const {row_sha256:_old,...body}=r;return {...body,row_sha256:estimateDeterministicHash(body)};};
 const resources=[...parent.body.resources.map(r=>rehash({...r,inclusion_ast:{kind:'and',operands:[r.inclusion_ast,{kind:'equals',parameterId:qaSource.legacyGateId,value:qaSource.legacyGateValue}]},
  resource_graph:{...r.resource_graph,operationCompositionV1:{...qaSource.legacyReference,contractVersion:'canonical-operation-resource/v1'},legacyPhysicalScopeUnverifiedR858:true,
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:['Историческая позиция сохранена с неподтверждённым источником. Общая строка, длина, опоры или цена не доказывают физический состав электроизмерений.']}},
  source_metadata:{...r.source_metadata,currentLegacySourceHeldR858:true,full_technical_acceptance:false,sourceAdmissionProved:false}})),
  ...built.resources.map((r,i)=>{const part=qaSource.parts.find(p=>qaSource.prefix+':'+p.key===r.row_id),replacement=qaSource.renewals.find(p=>qaSource.prefix+':'+p.key===r.row_id),detail=r.row_id===qaSource.measureRowId;
   const f=built.formulas.find(f=>f.formula_id===r.formula_id)!;
   return rehash({...r,ordinal:63+i,cost_owner_id:null,resource_graph:{...r.resource_graph,
    ...(detail?{calculationDetailV1:true}:{operationCompositionV1:testingUsesR858((part??replacement)!.uses),
     physicalProvisionV1:{basis:part?'ACTUAL_OWNED_COMPLETE_STANDARD_INSTRUMENT_INVENTORY':'DOCUMENTED_FULL_BATTERY_REPLACEMENT_EVENTS',sharedOwnerId:qaSource.ownedKitOwnerId,
      actualWarehouseClaimed:false,newPurchaseClaimed:false,rentalDurationClaimed:false,servicePriceCoverageAuthenticated:false,actualTestsOrResultsProved:false},
     ...(part?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:f.input_parameter_ids,reasonRu:'Полный собственный комплект задаётся фактической ведомостью; число измерительных записей не число приборов.'}}:{})}),
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,
     ...(detail?{rowKind:'CALCULATION_DETAIL'}:{resourceKind:part?.kind??'CONSUMABLE'}),detailsRu:[detail?'Счётчик утверждённого плана, не выполненные измерения, часы, протоколы или новая оплачиваемая услуга.':part
      ?'Первоначально пригодная собственная принадлежность общего комплекта. Не расход на измерение, покупка, аренда или подтверждение цены услуги.'
      :'Шесть элементов на документированное событие полной замены конкретного прибора; первоначальные элементы и срок службы не пересчитаны в расход.']}},
    source_metadata:{...r.source_metadata,normativeTrace:[],normative_source_ids:[],wholeSourceSha256:ELECTRICAL_TESTING_CURRENT_SOURCE_SHA_R858,
     sourceRole:detail?'ACTUAL_PROGRAM_NONPHYSICAL_MEASURE':part?'PRIMARY_MANUFACTURER_INITIAL_BOM':'PRIMARY_MANUFACTURER_FULL_REPLACEMENT_BOM',quantityAuthority:part?.quantityBasis??(replacement?replacement.countId+'*6':qaSource.planCountId),
     exact_locator:part?.locator??replacement?.locator??'ACTUAL_APPROVED_PLAN_ENTRY_COUNT',actualProjectAuthenticated:false,actualElectricalTestsOrSafeIsolationProved:false,
     independentPurchaseAllowed:false,automaticGenericPriceInheritanceAllowed:false,full_technical_acceptance:false,sourceAuthorityPromoted:false}});
  })];
 const held=holdRetainedUnboundSourceQuantityR871({parameters,formulas:[...parent.body.formulas,...built.formulas],resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[qaSource.planCountId]},parent.body,'qa-r858');
 const consumers=buildMasterParameterCalculationConsumers(held);
 return {...held,parameters:held.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}))};
}
export function electricalTestingIndependentCompositionR858(){
 const entry=(rowId:string,formulaId:string,unitId:string,keys:readonly string[])=>({expectedResourceId:rowId,formulaId,unitId,operationId:qaSource.prefix+':'+keys[0],requiredOperationIds:keys.map(k=>qaSource.prefix+':'+k),sourceId:qaSource.historicalSourceKey,
  condition:'Only actual applicable programme and usable complete inventory; not electrical results, accepted service norms or new procurement.',resolution:{kind:'ROW' as const,rowId}});
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:ELECTRICAL_TESTING_CURRENT_SOURCE_SHA_R858,
  operationRoster:[qaSource.legacyReference,...qaSource.operations.map(({key:_key,...op})=>op)],operationRequirements:qaSource.independentClassRequirements.map(o=>({operationId:o.operationId,sourceId:qaSource.historicalSourceKey,requirements:Object.fromEntries(o.classes.map(({kind,...c})=>[kind,c]))})),
  entries:[...qaSource.legacySourceRows.map(r=>entry(r.row_id,r.formula_id,r.unit_id,['legacy-source-review'])),...qaSource.parts.map(p=>entry(qaSource.prefix+':'+p.key,qaSource.prefix+':formula:'+p.key,p.unitId,p.uses)),
   ...qaSource.renewals.map(p=>entry(qaSource.prefix+':'+p.key,qaSource.prefix+':formula:'+p.key,'pcs',p.uses)),
   {expectedResourceId:qaSource.measureRowId,operationId:qaSource.prefix+':program',sourceId:qaSource.historicalSourceKey,condition:'Actual plan entries do not equal apparatus, performed tests, labour hours or issued protocols.',resolution:{kind:'NOT_APPLICABLE' as const,reasonRu:'Нефизический счётчик утверждённой программы; не ресурс, услуга, цена или доказанный результат.'}}]};
}
export function electricalTestingOrdinaryMaterializerInputR858(parent:TestingCanonicalParentR858){
 return {catalogId:qaSource.catalogId,sourceKey:qaSource.historicalSourceKey,currentHeader:parent.header,expectedParentShape:[6,63,63] as const,definition:electricalTestingCurrentForwardR858(parent),
  independentCompletenessMap:electricalTestingIndependentCompositionR858(),currentRegistryRows:qaSource.currentRegistryRows,sourceRegistryAdmission:null,
  existingMasterConfigOwner:'prepareMasterSingleDefinitionSuccessorR1',existingSourceProducer:'domains/electricalComplete/productionBinding.ts',fullTechnicalAcceptance:false,newReady:false};
}


/** Retain the exact historical source bytes, while replacing only a proved
 * unbound frozen runtime quantity with an application-owned unknown. This is
 * not a new source norm, user input, stock/order/price driver or guard bypass. */
export const RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_R871=retainedSourceQuantityPolicyR871;
export const RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_SHA_R871=canonicalEstimateSha256HexText(canonicalEstimateStableJson(retainedSourceQuantityPolicyR871));
function holdRetainedUnboundSourceQuantityR871(definition:AutomaticOwnerDefinition,parent:Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>,key:string):AutomaticOwnerDefinition{
 const policy=retainedSourceQuantityPolicyR871.targets.find(t=>t.key===key);if(!policy)throw Error('RETAINED_UNBOUND_EXACT_SOURCE_POLICY_REQUIRED:'+key);
 const additions:AutomaticOwnerDefinition['parameters'][number][]=[];
 const formulas=definition.formulas.map(f=>{const b=policy.bindings.find(b=>b.formulaId===f.formula_id);if(!b)return f;
  const original=parent.formulas.find(p=>p.formula_id===b.formulaId),resource=parent.resources.find(r=>r.row_id===b.rowId);
  if(!original||!resource||original.expression_source!==b.originalFormula.expression_source
   ||canonicalEstimateStableJson(original.ast)!==canonicalEstimateStableJson(b.originalFormula.ast)
   ||canonicalEstimateStableJson(original.input_parameter_ids)!==canonicalEstimateStableJson(b.originalFormula.input_parameter_ids)
   ||resource.unit_id!==b.unitId||resource.cost_owner_id!==b.costOwnerId||resource.ordinal!==b.ordinal
   ||canonicalEstimateStableJson(resource.source_metadata)!==canonicalEstimateStableJson(b.originalSourceMetadata))throw Error('RETAINED_UNBOUND_CURRENT_SOURCE_DRIFT:'+b.rowId);
  if(definition.parameters.some(p=>p.parameter_id===b.parameterId))throw Error('RETAINED_UNBOUND_PARAMETER_COLLISION:'+b.parameterId);
  additions.push({parameter_id:b.parameterId,ordinal:definition.parameters.length+additions.length,title_ru:'Неустановленное автоматическое количество сохранённой позиции «'+resource.title_ru+'»',
   value_type:'decimal',unit_id:b.unitId,required:false,default_value:null,constraints_json:{min:0},
   truth_metadata:unresolvedApplicationNormTruthR1({semantic_parameter_key:policy.catalogId+':'+b.parameterId,
    provenance:{retainedSourceContract:retainedSourceQuantityPolicyR871.contract,originalFormulaRawSha256:b.originalFormulaRawSha256,originalResourceRawSha256:b.originalResourceRawSha256},
    guide:{guide_kind:'PROJECT_DEFINED',source_role:'UNRESOLVED_APPLICATION_NORM',guide_validation_policy:'MANDATORY_BLOCK',source_document:policy.proofSha256,source_locator:b.formulaId}},b.reasonRu)});
  const compiled=compileFormulaGraph(b.parameterId);
  return {...f,expression_source:b.parameterId,ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,ast_sha256:estimateDeterministicHash(compiled.ast)};
 });
 const resources=definition.resources.map(r=>{const b=policy.bindings.find(b=>b.rowId===r.row_id);if(!b)return r;
  const {row_sha256:_old,...rest}=r;const next={...rest,source_metadata:{...r.source_metadata,runtimeExpressionSource:b.parameterId,
   retainedUnboundSourceQuantityV1:{contractVersion:retainedSourceQuantityPolicyR871.contract,sourcePolicySha256:RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_SHA_R871,
    targetKey:key,originalFormulaId:b.formulaId,originalFormulaRawSha256:b.originalFormulaRawSha256,originalResourceRawSha256:b.originalResourceRawSha256,
    originalSourceMetadataPreservedInPolicy:true,runtimeFormulaAstChanged:true,originalFrozenExampleNotActualQuantity:true,automaticQuantityParameterId:b.parameterId,
    quantitySourceApproved:false,priceStockSupplyOrderDriver:false}}};return {...next,row_sha256:estimateDeterministicHash(next)};
 });
 if(additions.length!==policy.bindings.length)throw Error('RETAINED_UNBOUND_SOURCE_POLICY_NOT_FULLY_CONSUMED');
 return {...definition,parameters:[...definition.parameters,...additions],formulas,resources};
}


/** Grounding is the existing canonical R867 whole target. Known manufacturer
 * assembly quantities never substitute for the actual design, soil, safe work,
 * exact contacts, results or accepted normative/price source. */
export const GROUNDING_CURRENT_SOURCE_R867=groundingSourceR867;
export const GROUNDING_CURRENT_SOURCE_SHA_R867=canonicalEstimateSha256HexText(canonicalEstimateStableJson(groundingSourceR867));
type GroundingCanonicalParentR867={header:Record<string,unknown>;body:Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>};
const groundSource=GROUNDING_CURRENT_SOURCE_R867;
function groundingOperationR867(key:string):Record<string,any>{
 const op=groundSource.operations.find(o=>o.key===key);if(!op)throw Error('GROUNDING_EXACT_OPERATION_REQUIRED:'+key);
 const {key:_key,...rest}=op;return {...rest,contractVersion:'canonical-operation-resource/v1'};
}
function groundingUsesR867(keys:readonly string[]){const uses=keys.map(groundingOperationR867);return {...uses[0],additionalOperations:uses.slice(1)};}
export function groundingSystemCurrentForwardR867(parent:GroundingCanonicalParentR867):AutomaticOwnerDefinition{
 if(parent.header.definition_version_id!==groundSource.currentParent.definition_version_id||parent.header.definition_sha256!==groundSource.currentParent.definition_sha256
  ||[parent.body.parameters.length,parent.body.formulas.length,parent.body.resources.length].join(':')!=='6:63:63')throw Error('GROUNDING_EXACT_CURRENT_R867_REQUIRED');
 for(const a of groundSource.legacyControlParameters){const p=parent.body.parameters.find(p=>p.parameter_id===a.parameter_id);
  if(!p||p.ordinal!==a.ordinal||p.title_ru!==a.title_ru||p.value_type!==a.value_type||p.unit_id!==a.unit_id||canonicalEstimateStableJson(p.default_value)!==canonicalEstimateStableJson(a.default_value))throw Error('GROUNDING_CURRENT_PARAMETER_DRIFT:'+a.parameter_id);}
 for(const a of groundSource.legacySourceRows){const r=parent.body.resources.find(r=>r.row_id===a.row_id);
  if(!r||r.ordinal!==a.ordinal||r.category!==a.category||r.unit_id!==a.unit_id||r.formula_id!==a.formula_id||r.cost_owner_id!==a.cost_owner_id)throw Error('GROUNDING_CURRENT_ROW_DRIFT:'+a.row_id);
  if(canonicalEstimateStableJson(r.source_metadata)!==canonicalEstimateStableJson(groundSource.legacyResourceSourceMetadataByRowId[a.row_id as keyof typeof groundSource.legacyResourceSourceMetadataByRowId]))throw Error('GROUNDING_CURRENT_ROW_SOURCE_DRIFT:'+a.row_id);}
 for(const a of groundSource.legacySourceFormulas){const f=parent.body.formulas.find(f=>f.formula_id===a.formula_id);
  if(!f||f.expression_source!==a.expression_source||f.output_unit_id!==a.output_unit_id||canonicalEstimateStableJson(f.input_parameter_ids)!==canonicalEstimateStableJson(a.input_parameter_ids)
   ||canonicalEstimateStableJson(f.ast)!==canonicalEstimateStableJson(groundSource.legacyFormulaAstsByFormulaId[a.formula_id as keyof typeof groundSource.legacyFormulaAstsByFormulaId]))throw Error('GROUNDING_CURRENT_FORMULA_DRIFT:'+a.formula_id);}
 const eq=(parameterId:string,value:string)=>({kind:'equals' as const,parameterId,value});
 const selected=eq(groundSource.profileId,groundSource.manualProfile),fit=eq(groundSource.actualFitId,groundSource.actualFit),active={kind:'and' as const,operands:[selected,fit]};
 const rect=eq(groundSource.rectScopeId,groundSource.rectNew),corrosion=eq(groundSource.corrosionMethodId,groundSource.ksbMethod);
 const test=eq(groundSource.testMethodId,groundSource.threePoleMethod),topology=eq(groundSource.testTopologyId,groundSource.testTopology);
 const waste=eq(groundSource.measuredWaste.scopeId,groundSource.measuredWaste.pairedScope);
 const facts=[groundSource.profileId,groundSource.assemblyCountId,groundSource.actualProjectId,groundSource.actualFitId];
 const kitFacts=[...facts,groundSource.kitCountId,groundSource.kitInventoryId,groundSource.testMethodId,groundSource.testTopologyId,groundSource.testProgramId];
 const components=[...groundSource.manualAppliedParts,...groundSource.conductorParts];
 const built=buildAutomaticConstructionOwnerR1({contract:groundSource.contract,semanticOwner:groundSource.catalogId,sourceId:groundSource.historicalSourceKey,
  normId:'EXACT_MANUFACTURER_ASSEMBLY_AND_OWNED_KIT_NOT_SYSTEM_DESIGN_OR_LABOUR_NORM',
  sourceMetadata:{source_title:'Система заземления: точные совместимые узлы и полное оснащение по фактической программе',source_document_version:groundSource.contract,
   definition_hash:GROUNDING_CURRENT_SOURCE_SHA_R867,artifact_sha256:groundSource.sourceCaptures.find(s=>s.file==='ZANDZ-ZZ6-official.html')!.sha256,
   exact_locator:'ZZ6 D17 Применение:fourmodules/threeappliedsleeves; exact1625KITmanualTable2 and3pole/Rdc clauses; DEHN557130USAGE50percent; current63legacy source held.'},
  applicabilityRu:'Существующая система заземления по фактическому принятому проекту; только точный ручной безмуфтовый четырёхмодульный узел в допустимом грунте. Проект/метод/грунт/контакты/защита/QA и ценовые границы отдельно обязательны; нет автоматического сопротивления, глубины, поста, труда или доставки.',
  ordinary:[{id:groundSource.assemblyCountId,title:'Фактическое число принятых четырёхмодульных узлов по проекту',kind:'ordinary',valueType:'integer',unitId:'pcs',min:1}],profile:[],conditional:[
   {id:groundSource.profileId,title:'Точная совместимая технология электродного узла',kind:'conditional',valueType:'enum',unitId:null,values:[groundSource.manualProfile]},
   {id:groundSource.actualProjectId,title:'Фактический проект всей системы, грунт, схема и критерии',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
   {id:groundSource.actualFitId,title:'Применимость всего выбранного узла и условий объекта',kind:'conditional',valueType:'enum',unitId:null,values:[groundSource.actualFit],requiredWhen:selected},
   {id:groundSource.toolCountId,title:'Фактическое число целых пригодных собственных ручных комплектов',kind:'conditional',valueType:'integer',unitId:'set',min:1,requiredWhen:selected},
   {id:groundSource.toolInventoryId,title:'Ведомость совместимых инструментов, оснастки, доступа и защиты',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
   {id:groundSource.kitCountId,title:'Фактическое число целых пригодных измерительных комплектов',kind:'conditional',valueType:'integer',unitId:'set',min:1,requiredWhen:selected},
   {id:groundSource.kitInventoryId,title:'Ведомость измерителей, всех принадлежностей, состояния и документов проверки',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
   {id:groundSource.testMethodId,title:'Точный метод утверждённой измерительной программы',kind:'conditional',valueType:'enum',unitId:null,values:[groundSource.threePoleMethod],requiredWhen:selected},
   {id:groundSource.testTopologyId,title:'Фактическая топология, разрешённое разделение и восстановление для измерений',kind:'conditional',valueType:'enum',unitId:null,values:[groundSource.testTopology],requiredWhen:selected},
   {id:groundSource.testProgramId,title:'Реальная программа, размещение электродов, режимы и критерии испытаний',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
   {id:groundSource.conductorProfileId,title:'Точный принятый заводской проводник с наконечником',kind:'conditional',valueType:'enum',unitId:null,values:groundSource.conductorProfiles.map(p=>p.value),requiredWhen:selected},
   {id:groundSource.conductorCountId,title:'Фактическое количество принятых целых проводников по ведомости',kind:'conditional',valueType:'integer',unitId:'pcs',min:0,requiredWhen:selected},
   {id:groundSource.conductorDocumentId,title:'Фактическая трасса, receivedpassport и оба контактных узла проводника',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
   {id:groundSource.rectScopeId,title:'Фактическая граница земляных работ',kind:'conditional',valueType:'enum',unitId:null,values:[groundSource.rectNew,groundSource.rectReady],requiredWhen:selected},
   ...[{id:groundSource.rectLengthId,title:'Фактическая длина принятой прямоугольной выемки'},{id:groundSource.rectWidthId,title:'Фактическая ширина принятой прямоугольной выемки'},{id:groundSource.rectDepthId,title:'Фактическая глубина принятой прямоугольной выемки'}].map(p=>({...p,kind:'conditional' as const,valueType:'decimal' as const,unitId:'m',min:0,requiredWhen:rect})),
   {id:groundSource.rectDocumentId,title:'Фактические пределы, готовность и принятый безопасный метод земляных работ',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
   {id:groundSource.corrosionMethodId,title:'Применимость точного защитного узла соединений',kind:'conditional',valueType:'enum',unitId:null,values:[groundSource.ksbMethod,groundSource.corrosionNone],requiredWhen:selected},
   {id:groundSource.corrosionDocumentId,title:'Принятый реальный узел защиты и количественное основание',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
   {id:groundSource.corrosionQuantityId,title:'Неустановленный автоматический расход точной ленты по принятому узлу',kind:'internal',valueType:'decimal',unitId:'m',requiredWhen:corrosion},
   {id:groundSource.measuredWaste.scopeId,title:'Фактическая граница расчёта одной партии отходов по взвешиванию',kind:'conditional',valueType:'enum',unitId:null,values:[groundSource.measuredWaste.pairedScope,groundSource.measuredWaste.noPairScope],requiredWhen:selected},
   {id:groundSource.measuredWaste.grossId,title:'Принятая измеренная масса брутто этой партии с тарой',kind:'conditional',valueType:'decimal',unitId:'kg',min:0,requiredWhen:waste},
   {id:groundSource.measuredWaste.tareId,title:'Принятая измеренная масса той же тары без этой партии',kind:'conditional',valueType:'decimal',unitId:'kg',min:0,requiredWhen:waste},
   {id:groundSource.measuredWaste.recordId,title:'Парная запись: партия, тара, весы, единицы, точность и условия расчёта',kind:'conditional',valueType:'text',unitId:null,requiredWhen:waste},
   ...groundSource.renewalParts.map(p=>({id:p.countId,title:'Фактическое число полных замен питания: '+p.titleRu,kind:'conditional' as const,valueType:'integer' as const,unitId:'pcs',min:0,requiredWhen:selected})),
   {id:groundSource.renewalRecordId,title:'Запись реальных полных замен питания либо подтверждённых нулевых событий',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
   {id:groundSource.legacyGateId,title:'Источник и применимость63 исторических формул не приняты',kind:'internal',valueType:'enum',unitId:null,values:[groundSource.legacyGateValue]},
   ...groundSource.retainedUnboundBindings.map(b=>({id:b.parameterId,title:'Неустановленное автоматическое количество сохранённой позиции '+b.rowId,kind:'internal' as const,valueType:'decimal' as const,unitId:b.unitId,min:0}))],
  rows:[...groundSource.manualAppliedParts.map(p=>({rowId:groundSource.prefix+':'+p.key,formulaId:groundSource.prefix+':formula:'+p.key,section:'Совместимый электродный узел',category:'material',title:p.titleRu,unitId:p.unitId,expression:p.expression,inputParameterIds:facts,inclusion:active,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,procurement:false})),
   ...groundSource.manualOwnedToolParts.map(p=>({rowId:groundSource.prefix+':'+p.key,formulaId:groundSource.prefix+':formula:'+p.key,section:'Общее собственное монтажное оснащение',category:'equipment',title:p.titleRu,unitId:p.unitId,expression:p.expression,inputParameterIds:[...facts,groundSource.toolInventoryId],inclusion:active,costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false})),
   ...groundSource.ownedTestKitParts.map(p=>({rowId:groundSource.prefix+':'+p.key,formulaId:groundSource.prefix+':formula:'+p.key,section:'Полное собственное измерительное оснащение',category:'equipment',title:p.titleRu,unitId:p.unitId,expression:p.expression,inputParameterIds:kitFacts,inclusion:{kind:'and' as const,operands:[active,test,topology]},costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false})),
   ...groundSource.conductorParts.map(p=>({rowId:groundSource.prefix+':'+p.key,formulaId:groundSource.prefix+':formula:'+p.key,section:'Принятый проводник с заводским окончанием',category:'material',title:p.titleRu,unitId:p.unitId,expression:p.expression,inputParameterIds:[...facts,groundSource.conductorDocumentId],inclusion:{kind:'and' as const,operands:[active,eq(groundSource.conductorProfileId,p.profileValue)]},costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,procurement:false})),
   {rowId:groundSource.prefix+':connection-corrosion-tape',formulaId:groundSource.prefix+':formula:connection-corrosion-tape',section:'Защита применимых соединений',category:'material',title:'Антикоррозионная лента шириной100мм для принятого узла',unitId:'m',expression:groundSource.corrosionQuantityId,inputParameterIds:[...facts,groundSource.corrosionDocumentId],inclusion:{kind:'and' as const,operands:[active,corrosion]},costTreatment:'INFORMATIONAL_SCOPE',procurement:false},
   {rowId:groundSource.prefix+':rectangular-excavation-volume-detail',formulaId:groundSource.prefix+':formula:rectangular-excavation-volume-detail',section:'Геометрический объём',category:'material',title:'Геометрический объём принятой прямоугольной выемки',unitId:'m3',expression:groundSource.rectVolumeExpression,inputParameterIds:[...facts,groundSource.rectDocumentId],inclusion:{kind:'and' as const,operands:[active,rect]},costTreatment:'INFORMATIONAL_SCOPE',procurement:false},
   {rowId:groundSource.prefix+':'+groundSource.measuredWaste.key,formulaId:groundSource.prefix+':formula:'+groundSource.measuredWaste.key,section:'Измеренная партия отходов',category:'service',title:'Расчётная масса одной принятой партии отходов по паре взвешиваний',unitId:'kg',expression:groundSource.measuredWaste.expression,inputParameterIds:[...facts,groundSource.measuredWaste.recordId],inclusion:{kind:'and' as const,operands:[active,waste]},costTreatment:'INFORMATIONAL_SCOPE',procurement:false,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg',minimum:0,reasonRu:'Масса брутто принятой партии не может быть меньше массы той же тары; проверьте сопоставимость парных взвешиваний.'}},
   ...groundSource.renewalParts.map(p=>({rowId:groundSource.prefix+':'+p.key,formulaId:groundSource.prefix+':formula:'+p.key,section:'Фактические полные замены питания',category:'material',title:p.titleRu,unitId:p.unitId,expression:p.expression,inputParameterIds:[...facts,groundSource.renewalRecordId],inclusion:active,costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false})),
   ...groundSource.sleevePassportBalances.map(p=>({rowId:groundSource.prefix+':'+p.key,formulaId:groundSource.prefix+':formula:'+p.key,section:'Паспортный баланс втулок',category:'material',title:p.titleRu,unitId:'pcs',expression:groundSource.assemblyCountId+'*'+p.multiplier,inputParameterIds:facts,inclusion:active,costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false}))],
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:groundSource.returnWhen.map(n=>n.id+': '+n.returnWhen)});
 const parameters=[...parent.body.parameters,...built.parameters.map((p,i)=>({...p,ordinal:6+i,truth_metadata:[groundSource.legacyGateId,groundSource.corrosionQuantityId,...groundSource.retainedUnboundBindings.map(b=>b.parameterId)].includes(p.parameter_id)
  ?unresolvedApplicationNormTruthR1(p.truth_metadata,p.parameter_id===groundSource.legacyGateId?'ActualR8670bindings/locators/sources/newSource:63genericpoles/network formulas not accepted grounding norms.':p.parameter_id===groundSource.corrosionQuantityId?'Exact KSB50percent spiral method known, but actual compatible protected geometry/end covers/consumption quantity basis absent; not one roll per electrode or2A/Wnorm.':'Historical unbound frozen formula is archived in exact rawsource bytes; missing automatic quantity is application-owned, not a default, consumer source fact, price, stock, supply or order driver.')
  :{...p.truth_metadata,actualProjectAuthenticated:false,provenance:{...p.truth_metadata.provenance as Record<string,unknown>,consumer_input_role_v1:'OBJECT_FACT'},guide:{...p.truth_metadata.guide as Record<string,unknown>,guide_kind:'PROJECT_DEFINED',source_role:'PROJECT_DOCUMENTATION',guide_validation_policy:'MANDATORY_BLOCK',guide_version:groundSource.contract,source_snapshot_hash:GROUNDING_CURRENT_SOURCE_SHA_R867,source_document:groundSource.historicalSourceKey,source_locator:'ACTUAL_DESIGN_SOIL_CONTACTS_INVENTORY_PROGRAMME_REQUIRED_NOT_DEMO',verified_at:'2026-10-28T00:00:00+06:00'}}}))];
 const retainedFormulas=parent.body.formulas.map(f=>{const b=groundSource.retainedUnboundBindings.find(b=>b.formulaId===f.formula_id);if(!b)return f;
  const r=parent.body.resources.find(r=>r.row_id===b.rowId);if(!r||canonicalEstimateStableJson(f.ast)!==canonicalEstimateStableJson(b.originalFormula.ast)||canonicalEstimateStableJson(r.source_metadata)!==canonicalEstimateStableJson(b.originalSourceMetadata))throw Error('GROUNDING_RETAINED_UNBOUND_CURRENT_SOURCE_DRIFT:'+b.rowId);
  const c=compileFormulaGraph(b.parameterId);return {...f,expression_source:b.parameterId,ast:c.ast,input_parameter_ids:c.inputParameterIds,ast_sha256:estimateDeterministicHash(c.ast)};
 });
 const rehash=(r:AutomaticOwnerDefinition['resources'][number])=>{const {row_sha256:_old,...body}=r;return {...body,row_sha256:estimateDeterministicHash(body)};};
 const resources=[...parent.body.resources.map(r=>rehash({...r,inclusion_ast:{kind:'and',operands:[r.inclusion_ast,eq(groundSource.legacyGateId,groundSource.legacyGateValue)]},
  resource_graph:{...r.resource_graph,operationCompositionV1:{...groundSource.legacyReference,contractVersion:'canonical-operation-resource/v1'},legacyPhysicalScopeUnverifiedR867:true,
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:['Историческая позиция сохранена с неподтверждённым источником количества и применимости. Опоры, СИП, котлованы и общие агрегаты не являются полным составом системы заземления.']}},source_metadata:{...r.source_metadata,currentLegacySourceHeldR867:true,full_technical_acceptance:false,sourceAdmissionProved:false,
    ...Object.fromEntries(groundSource.retainedUnboundBindings.filter(b=>b.rowId===r.row_id).flatMap(b=>[['runtimeExpressionSource',b.parameterId],['retainedUnboundSourceQuantityV1',{contractVersion:groundSource.contract,sourcePolicySha256:GROUNDING_CURRENT_SOURCE_SHA_R867,originalFormulaId:b.formulaId,originalFormulaRawSha256:b.originalFormulaRawSha256,originalResourceRawSha256:b.originalResourceRawSha256,originalSourceMetadataPreservedInPolicy:true,runtimeFormulaAstChanged:true,originalFrozenExampleNotActualQuantity:true,automaticQuantityParameterId:b.parameterId,quantitySourceApproved:false,priceStockSupplyOrderDriver:false}]]))}})),
  ...built.resources.map((r,i)=>{const component=components.find(p=>groundSource.prefix+':'+p.key===r.row_id),tool=groundSource.manualOwnedToolParts.find(p=>groundSource.prefix+':'+p.key===r.row_id),kit=groundSource.ownedTestKitParts.find(p=>groundSource.prefix+':'+p.key===r.row_id);
   const detail=groundSource.sleevePassportBalances.some(p=>groundSource.prefix+':'+p.key===r.row_id)||r.row_id===groundSource.prefix+':rectangular-excavation-volume-detail';
   const measuredWaste=r.row_id===groundSource.prefix+':'+groundSource.measuredWaste.key,renewal=groundSource.renewalParts.find(p=>r.row_id===groundSource.prefix+':'+p.key);
   const tape=r.row_id===groundSource.prefix+':connection-corrosion-tape';
   const using=component?.uses??tool?.uses??kit?.uses??renewal?.uses??(measuredWaste?groundSource.measuredWaste.uses:['receive','logistics','corrosion','pre-backfill']);const f=built.formulas.find(f=>f.formula_id===r.formula_id)!;
   return rehash({...r,ordinal:63+i,cost_owner_id:component?groundSource.primaryExistingGroundingCostOwner:null,
    resource_graph:{...r.resource_graph,...(detail?{calculationDetailV1:true}:{operationCompositionV1:groundingUsesR867(using)}),
     ...(component?{parentCostOwnerId:groundSource.primaryExistingGroundingRowId,includedInResourceOwnerRowId:groundSource.primaryExistingGroundingRowId}:{}),
     ...(measuredWaste?{physicalProvisionV1:{basis:'ONE_ACCEPTED_ACTUAL_PAIRED_WEIGHING_RECORD',sharedOwnerId:groundSource.measuredWaste.ownerId,existingPotentialIncludedOwnerId:groundSource.primaryExistingGroundingCostOwner,serviceCostBoundary:'UNRESOLVED_INCLUDED_VERSUS_SEPARATE_NOT_PAID_TWICE',newPurchaseClaimed:false,quantityDoesNotAdmitPriceOrService:true}}:{}),
     ...(renewal?{physicalProvisionV1:{basis:'ACTUAL_DOCUMENTED_FULL_NEW_ALKALINE_REPLACEMENT_EVENTS',sharedOwnerId:groundSource.ownedTestOwnerId,initialKitInventoryIsNotThisConsumption:true,measurementCountIsNotWearNorm:true,rechargeEventsExcluded:true,replacedOldCellsDisposalNotInferred:true,newPurchaseClaimed:false,servicePriceCoverageAuthenticated:false}}:{}),
     ...(tape?{physicalProvisionV1:{basis:'PROTECTED_UNRESOLVED_APPLICATION_QUANTITY_FOR_EXACT_ACCEPTED_PROTECTION_NODE',sharedOwnerId:groundSource.prefix+':single-corrosion-consumption-owner',newPurchaseClaimed:false,servicePriceCoverageAuthenticated:false,sourceNormOrActualConsumptionAuthenticated:false}}:{}),
     ...((tool||kit)?{physicalProvisionV1:{basis:'ACTUAL_COMPLETE_OWNED_INVENTORY',sharedOwnerId:tool?groundSource.ownedToolOwnerId:groundSource.ownedTestOwnerId,newPurchaseClaimed:false,rentalDurationClaimed:false,servicePriceCoverageAuthenticated:false,actualInstallationOrTestsProved:false},derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:f.input_parameter_ids,reasonRu:'Фактический целый комплект по ведомости; число электродов не число инструментов, приборов или постов.'}}:{}),
     publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,...(detail?{rowKind:'CALCULATION_DETAIL'}:{resourceKind:component?.kind??tool?.kind??kit?.kind??(measuredWaste?'SERVICE':'CONSUMABLE')}),detailsRu:[detail?'Расчётная геометрия или паспортный баланс, не фактический запас, заказ, вывоз, труд или дополнительный физический ресурс.':component?'Точный совместимый компонент, один сохранённый владелец комплекта. Применимость, фактическая приёмка и граница цены отдельно обязательны.':tool||kit?'Целое пригодное собственное оснащение по фактической ведомости. Повторное использование у операций не создаёт оплаты или заказа.':renewal?'Шесть новых элементов на документированное событие полной замены точного прибора; начальное оснащение и зарядка не являются этим расходом.':measuredWaste?'Разность двух принятых сопоставимых взвешиваний одной партии. Не заменяет готовое нетто в талоне; не задаёт объём грунта, рейсы, полную услугу или цену.':'Точный метод защиты известен; фактический расход остаётся не рассчитанным без подтверждённого количественного основания.']}},
    source_metadata:{...r.source_metadata,normativeTrace:[],normative_source_ids:[],wholeSourceSha256:GROUNDING_CURRENT_SOURCE_SHA_R867,actualProjectAuthenticated:false,independentPurchaseAllowed:false,automaticGenericPriceInheritanceAllowed:false,priceCoverageAuthenticated:false,actualInstallationOrTestsProved:false,full_technical_acceptance:false,sourceAuthorityPromoted:false,
     quantityAuthority:component?.expression??tool?.expression??kit?.expression??renewal?.expression??(measuredWaste?groundSource.measuredWaste.expression:detail?'GEOMETRY_OR_PASSPORT_REFERENCE_NOT_PHYSICAL_CONSUMPTION':'UNRESOLVED_APPLICATION_NORM'),...(renewal?{exactPowerRenewalSource:renewal.source,fullReplacementCells:6,actualEventCountRequired:true,initialInventoryPaidAgain:false,priceCoverageAuthenticated:false}:{}),...(measuredWaste?{measuredWasteSourceBoundary:groundSource.measuredWaste.boundary,applicableLocalMetrologicalNormAdmitted:false,servicePriceCoverageAuthenticated:false}:{}),exactSourceFacts:r.row_id===groundSource.prefix+':connection-corrosion-tape'?{spiralOverlapFraction:0.5,cleanDryGreaseFree:true,exactProfile557130:true,consumptionNormClaimed:false}:undefined}});
  })];
 const formulas=[...retainedFormulas,...built.formulas],consumers=buildMasterParameterCalculationConsumers({parameters,formulas,resources});
 return {parameters:parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}})),formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[groundSource.assemblyCountId]};
}
export function groundingSystemIndependentCompositionR867(){
 const entry=(id:string,formulaId:string,unitId:string,keys:readonly string[])=>({expectedResourceId:id,formulaId,unitId,operationId:groundSource.prefix+':'+keys[0],requiredOperationIds:keys.map(k=>groundSource.prefix+':'+k),sourceId:groundSource.historicalSourceKey,condition:'Exact actual design, source/method and compatible complete provision required. A quantity is not an accepted system or price source.',resolution:{kind:'ROW' as const,rowId:id}});
 const component=(p:typeof groundSource.manualAppliedParts[number]|typeof groundSource.conductorParts[number])=>({...entry(groundSource.prefix+':'+p.key,groundSource.prefix+':formula:'+p.key,p.unitId,p.uses),resolution:{kind:'INCLUDED_COMPONENT_ROW' as const,rowId:groundSource.prefix+':'+p.key,parentRowId:groundSource.primaryExistingGroundingRowId}});
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:GROUNDING_CURRENT_SOURCE_SHA_R867,
  operationRoster:[groundSource.legacyReference,...groundSource.operations.map(({key:_key,...op})=>op)],operationRequirements:groundSource.independentClassRequirements.map(o=>({operationId:o.operationId,sourceId:groundSource.historicalSourceKey,requirements:Object.fromEntries(o.classes.map(({kind,...c})=>[kind,c]))})),
  entries:[...groundSource.legacySourceRows.map(r=>entry(r.row_id,r.formula_id,r.unit_id,['legacy-source-review'])),...groundSource.manualAppliedParts.map(component),...groundSource.conductorParts.map(component),
   ...[...groundSource.manualOwnedToolParts,...groundSource.ownedTestKitParts].map(p=>entry(groundSource.prefix+':'+p.key,groundSource.prefix+':formula:'+p.key,p.unitId,p.uses)),
   entry(groundSource.prefix+':connection-corrosion-tape',groundSource.prefix+':formula:connection-corrosion-tape','m',['receive','logistics','corrosion','pre-backfill']),
   entry(groundSource.prefix+':'+groundSource.measuredWaste.key,groundSource.prefix+':formula:'+groundSource.measuredWaste.key,'kg',groundSource.measuredWaste.uses),
   ...groundSource.renewalParts.map(p=>entry(groundSource.prefix+':'+p.key,groundSource.prefix+':formula:'+p.key,p.unitId,p.uses)),
   ...['rectangular-excavation-volume-detail',...groundSource.sleevePassportBalances.map(p=>p.key)].map(key=>({expectedResourceId:groundSource.prefix+':'+key,operationId:groundSource.prefix+':'+(key==='rectangular-excavation-volume-detail'?'earthworks':'drive'),sourceId:groundSource.historicalSourceKey,condition:'Nonphysical geometry/passport balance only, not installed parts, stock, order or labour.',resolution:{kind:'NOT_APPLICABLE' as const,reasonRu:'Геометрическая мера или паспортная разность сохранена отдельно от физического расхода, фактического склада и оплаты.'}}))]};
}
export function groundingSystemOrdinaryMaterializerInputR867(parent:GroundingCanonicalParentR867){
 return {catalogId:groundSource.catalogId,sourceKey:groundSource.historicalSourceKey,currentHeader:parent.header,expectedParentShape:[6,63,63] as const,definition:groundingSystemCurrentForwardR867(parent),independentCompletenessMap:groundingSystemIndependentCompositionR867(),currentRegistryRows:groundSource.currentRegistryRows,sourceRegistryAdmission:null,existingMasterConfigOwner:'prepareMasterSingleDefinitionSuccessorR1',existingSourceProducer:'domains/electricalComplete/productionBinding.ts',fullTechnicalAcceptance:false,newReady:false};
}
