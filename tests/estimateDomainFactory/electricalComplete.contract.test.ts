import {GROUNDING_CURRENT_SOURCE_R867,groundingSystemCurrentForwardR867,groundingSystemIndependentCompositionR867,groundingSystemOrdinaryMaterializerInputR867} from '../../src/lib/estimate/v4/domains/electricalComplete/productionBinding';
import {RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_R871} from '../../src/lib/estimate/v4/domains/electricalComplete/productionBinding';
import {ELECTRICAL_TESTING_CURRENT_SOURCE_R858,electricalTestingCurrentForwardR858,electricalTestingIndependentCompositionR858,electricalTestingOrdinaryMaterializerInputR858} from '../../src/lib/estimate/v4/domains/electricalComplete/productionBinding';
import {OUTDOOR_BOARD_CURRENT_SOURCE_R846,outdoorDistributionBoardCurrentForwardR846,outdoorDistributionBoardIndependentCompositionR846,outdoorDistributionBoardOrdinaryMaterializerInputR846} from '../../src/lib/estimate/v4/domains/electricalComplete/productionBinding';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {compileFormulaGraph} from '../../src/lib/estimate/backendPlatform/formulaGraph';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateSha256HexText} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalOperationCompositionEvidenceFromPassportV1,canonicalEstimateSavedOperationAcceptanceV1,assertCanonicalEstimateSavedArtifactStructureV1} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {buildCanonicalRevisionCommitPayload} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {validateIndependentCompletenessMapReferences} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {auditCanonicalPublisherSuccessorOperationResourcesR1 as outdoorAuditPublisher} from '../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { compileProfessionalEstimateDomainV1, constructionNormativeRegistryV1, createProfessionalEstimateDomainFactoryV1, type ProfessionalDomainParameterDefinitionV1 } from "../../src/lib/estimate/v4/domainFactory";
import {
  ELECTRICAL_CANONICAL_PARAMETER_SCHEMAS,
  ELECTRICAL_COMPLETE_ALIAS_COUNT,
  ELECTRICAL_COMPLETE_RECORD_COUNT,
  ELECTRICAL_COMPLETE_TECHNOLOGY_COUNT,
  ELECTRICAL_COMPLETENESS_SLOTS_V2,
  ELECTRICAL_COMPLETE_DOMAIN_PACKAGE_BUILD_TIME_HASH_V1,
  ELECTRICAL_DOMAIN_INVENTORY,
  ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
  ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
  ELECTRICAL_REVIEWED_EXCLUSIONS,
  buildElectricalProductionDraftV1,
  electricalCompletenessDecisionsV2,
  electricalComplexityClassV2,
  electricalCompleteDomainFactory,
  electricalMaximumResourceCandidatesForV2,
} from "../../src/lib/estimate/v4/domains/electricalComplete";

const CAPTURED_AT = "2026-08-13T00:00:00.000Z";
type Scope = "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE";
const SHARD_COUNT = Math.max(1, Number(process.env.ELECTRICAL_TEST_SHARD_COUNT ?? 1));
const SHARD_INDEX = Math.max(0, Number(process.env.ELECTRICAL_TEST_SHARD_INDEX ?? 0));
const TEST_INVENTORY = ELECTRICAL_DOMAIN_INVENTORY.filter((_, index) => index % SHARD_COUNT === SHARD_INDEX);

function ratedVoltageForIdentity(catalogId: string): number {
  const match = catalogId.match(/(?:^|[_:-])(\d+)(?:kv)(?:[_:-]|$)/iu);
  return match ? Number(match[1]) * 1_000 : 400;
}

function rawValue(parameter: ProfessionalDomainParameterDefinitionV1, scopeCapability: string, scope: Scope, catalogId: string): string | number | boolean {
  if (parameter.parameter_id === "work_included") return true;
  if (parameter.parameter_id === "estimate_scope_mode") return scope;
  if (parameter.parameter_id === "scope_capability") return scopeCapability;
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "ELECTRICAL_PROJECT";
  if (parameter.parameter_id === "rated_voltage_v") return ratedVoltageForIdentity(catalogId);
  if (parameter.parameter_id === "phase_count") return 3;
  if (parameter.parameter_id === "earthing_system") return "TN-S";
  if (parameter.parameter_id === "installation_environment") return "PROJECT_SPECIFIED";
  if (parameter.parameter_id === "product_specification_id") return "PROJECT-ELECTRICAL-SPEC-001";
  if (parameter.parameter_id === "exact_krerm_rate_code") return ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1;
  if (parameter.parameter_id === "exact_krerp_rate_code") return ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1;
  if (parameter.parameter_id === "price_basis_reference") return "SUPPLIER-QUOTATION-2026-08-13";
  if (parameter.parameter_id === "price_basis_date") return "2026-08-13";
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  return Math.max(parameter.minimum ?? 1, 1);
}

function parameterValues(catalogId: string, scope: Scope): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = electricalCompleteDomainFactory.binding_by_catalog_id.get(catalogId);
  const technology = electricalCompleteDomainFactory.technology_by_id.get(binding?.canonical_technology_id ?? "");
  const schema = electricalCompleteDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!binding || !technology || !schema) throw new Error(`TEST_ELECTRICAL_SCHEMA_NOT_FOUND:${catalogId}`);
  return Object.fromEntries(schema.parameters.flatMap((parameter) => {
    if (scope === "MINIMAL_EXPLICIT_SCOPE" && parameter.priority === "P1") return [];
    const sourceType: ProfessionalParameterValueV4["source_type"] = parameter.parameter_id.startsWith("unit_price_")
      ? "USER_EXPLICIT"
      : parameter.parameter_id.includes("product")
        ? "MATERIAL_PASSPORT"
        : parameter.parameter_id.includes("rate_code") || parameter.parameter_id.includes("project") || parameter.parameter_id.includes("price_basis")
          ? "PROJECT_DOCUMENT"
          : "USER_EXPLICIT";
    return [[parameter.parameter_id, {
      value: rawValue(parameter, binding.scope_capability, scope, catalogId),
      unit_id: parameter.unit_id,
      source_type: sourceType,
      source_id: `electrical-complete-fixture:${catalogId}:${parameter.parameter_id}`,
      captured_at: CAPTURED_AT,
      confidence: "high" as const,
      applicability: `Exact deterministic Electrical fixture for ${catalogId}`,
    } satisfies ProfessionalParameterValueV4]];
  }));
}

function compile(catalogId: string, scope: Scope) {
  const inventory = ELECTRICAL_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId);
  const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory?.canonical_technology_id ?? "");
  if (!inventory || !technology) throw new Error(`TEST_ELECTRICAL_INVENTORY_NOT_FOUND:${catalogId}`);
  return compileProfessionalEstimateDomainV1(electricalCompleteDomainFactory, constructionNormativeRegistryV1, {
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: scope,
    parent_revision_id: null,
    parameter_values: parameterValues(catalogId, scope),
    normative_request: {
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "ELECTRICAL_PROJECT",
      construction_state: ["TEST", "COMMISSION"].includes(inventory.operation_class) ? "COMMISSIONING" : "NEW",
      contract_basis: [],
      effective_date: "2026-08-13",
      material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: {
        KG_KRERM_08_2015_ELECTRICAL: ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
        KG_KRERP_01_2015_ELECTRICAL: ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
      },
    },
  });
}

describe("Full Electrical professional domain", () => {
  test("freezes exact E445 / 107 groups / excluded309 with no aliases", () => {
    // Exactly 160 owned and 96 excluded area identities were retired: 605→445 and 405→309.
    expect(ELECTRICAL_COMPLETE_RECORD_COUNT).toBe(445);
    expect(ELECTRICAL_COMPLETE_TECHNOLOGY_COUNT).toBe(445);
    expect(ELECTRICAL_COMPLETE_ALIAS_COUNT).toBe(0);
    expect(ELECTRICAL_DOMAIN_INVENTORY).toHaveLength(445);
    expect(ELECTRICAL_REVIEWED_EXCLUSIONS).toHaveLength(309);
    expect(ELECTRICAL_CANONICAL_PARAMETER_SCHEMAS).toHaveLength(445);
    expect(electricalCompleteDomainFactory.binding_by_catalog_id.size).toBe(445);
    expect(electricalCompleteDomainFactory.package_hash).toBe("eh_734606360cef2658");
    expect(ELECTRICAL_COMPLETE_DOMAIN_PACKAGE_BUILD_TIME_HASH_V1).toEqual(expect.objectContaining({
      hash_contract: "canonical-domain-package-content:v1",
      domain_id: "electrical_complete",
      catalog_record_count: 445,
    }));
    expect(() => createProfessionalEstimateDomainFactoryV1(
      electricalCompleteDomainFactory.package,
      { ...ELECTRICAL_COMPLETE_DOMAIN_PACKAGE_BUILD_TIME_HASH_V1, domain_version: "tampered-version" },
    )).toThrow("DOMAIN_BUILD_TIME_PACKAGE_HASH_IDENTITY_MISMATCH");
    expect(new Set(ELECTRICAL_DOMAIN_INVENTORY.map((row) => row.candidate_canonical_technology_id)).size).toBe(107);
    expect(new Set(ELECTRICAL_DOMAIN_INVENTORY.map((row) => row.canonical_technology_id)).size).toBe(445);
  });

  test("retired area identities cannot enter the domain compiler", () => {
    const standard = ELECTRICAL_DOMAIN_INVENTORY.find((row) => row.work_key.endsWith("_standard"))!;
    expect(standard).toBeDefined();
    expect(ELECTRICAL_DOMAIN_INVENTORY.filter((row) => /_(?:small|medium|large)_area$/u.test(row.work_key))).toEqual([]);
    for (const size of ["small", "medium", "large"]) {
      const retired = standard.work_key.replace(/_standard$/u, `_${size}_area`);
      expect(electricalCompleteDomainFactory.binding_by_catalog_id.has(retired)).toBe(false);
      expect(() => compileProfessionalEstimateDomainV1(electricalCompleteDomainFactory, constructionNormativeRegistryV1, {
        catalog_id: retired,
        work_key: retired,
        scope_mode: "MINIMAL_EXPLICIT_SCOPE",
        parent_revision_id: null,
        parameter_values: {},
        normative_request: { country: "KG", region: "Bishkek", funding_source: "PRIVATE_RECOMMENDED",
          operation_class: electricalCompleteDomainFactory.technology_by_id.get(standard.canonical_technology_id)!.operation_class,
          material_system: electricalCompleteDomainFactory.technology_by_id.get(standard.canonical_technology_id)!.material_system,
          project_type: "RESIDENTIAL_INTERIOR", construction_state: "NEW", contract_basis: [], effective_date: "2026-08-11" },
      })).toThrow(`DOMAIN_EXACT_BINDING_NOT_FOUND:${retired}`);
    }
  });

  test("compiles all 445 individual estimates in minimal and full scopes without hidden quantities", () => {
    for (const inventory of TEST_INVENTORY) {
      for (const scope of ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const) {
        const result = compile(inventory.catalog_id, scope);
        if (result.status !== "COMPILED") throw new Error(`ELECTRICAL_BATCH_RED:${inventory.catalog_id}:${scope}:${result.blockers.join("|")}`);
        const rows = result.compilation?.compiled_rows ?? [];
        expect(rows.length).toBe(scope === "FULL_APPLICABLE_SCOPE"
          ? electricalMaximumResourceCandidatesForV2(inventory).length
          : electricalMaximumResourceCandidatesForV2(inventory).filter((candidate) => candidate.minimal).length);
        expect(result.compilation?.assumptions_count).toBe(0);
        expect(result.compilation?.hidden_quantity_defaults).toBe(0);
        expect(rows.every((row) => row.quantity > 0 && (row.cost_ownership === "informational_output" || (row.unit_price ?? 0) > 0))).toBe(true);
        expect(rows.every((row) => row.formula_expression.length > 0 && row.normative_trace_v3.length === 1)).toBe(true);
        expect(rows.every((row) => row.cost_ownership === "informational_output"
          ? row.price_route_v3?.kind === "NOT_APPLICABLE_INFORMATIONAL_OUTPUT"
          : row.price_route_v3?.kind === "RUNTIME_VALIDATED_INPUT")).toBe(true);
        expect(rows.every((row) => row.resource_graph_node_v3?.graph_version === "ProfessionalResourceGraphV3")).toBe(true);
        expect(new Set(rows.map((row) => row.semantic_owner)).size).toBe(rows.length);
        if (scope === "FULL_APPLICABLE_SCOPE") {
          expect(rows.length).toBeGreaterThanOrEqual(35);
          const categories = new Set(rows.map((row) => row.category));
          expect(categories.size).toBeGreaterThanOrEqual(7);
          for (const category of categories) expect(["material", "labor", "equipment", "machinery", "transport", "temporary_work", "testing", "documentation", "waste", "subcontract_service", "work"]).toContain(category);
        }
      }
    }
  });

  test("records 36 independent completeness decisions per catalog ID and rejects generic bundles", () => {
    expect(ELECTRICAL_COMPLETENESS_SLOTS_V2).toHaveLength(36);
    expect(ELECTRICAL_COMPLETENESS_SLOTS_V2.length * ELECTRICAL_DOMAIN_INVENTORY.length).toBe(16_020);
    const forbidden = /^(комплект|прочие материалы|кабель и комплектующие|щит в комплекте|электроизмерения)$/iu;
    for (const inventory of TEST_INVENTORY) {
      const candidates = electricalMaximumResourceCandidatesForV2(inventory);
      expect(new Set(candidates.map((candidate) => candidate.candidate_id)).size).toBe(candidates.length);
      expect(electricalCompletenessDecisionsV2(inventory)).toHaveLength(36);
      expect(electricalComplexityClassV2(inventory)).toMatch(/^E_/u);
      expect(candidates.some((candidate) => candidate.category === "labor" || candidate.category === "testing")).toBe(true);
      expect(candidates.every((candidate) => !forbidden.test(candidate.title_ru.trim()))).toBe(true);
    }
  });

  test("registers every exact Electrical identity in the canonical runtime", () => {
    const { resolveRegisteredProfessionalEstimateSelectionV1 } = require("../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1") as typeof import("../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1");
    for (const inventory of TEST_INVENTORY) {
      const selection = resolveRegisteredProfessionalEstimateSelectionV1(inventory.catalog_id);
      expect(selection?.domain_id).toBe("electrical_complete");
      expect(selection?.catalog_id).toBe(inventory.catalog_id);
      expect(selection?.work_key).toBe(inventory.work_key);
      expect(selection?.category_key).toBe("electrical");
      expect(selection?.canonical_parameter_schema.canonicalWorkKey).toBe(inventory.work_key);
    }
  });

  test("binds explicit kV catalog identities to matching rated-voltage proof inputs", () => {
    const highVoltage = ELECTRICAL_DOMAIN_INVENTORY.find((inventory) => /110kv/iu.test(inventory.catalog_id));
    const mediumVoltage = ELECTRICAL_DOMAIN_INVENTORY.find((inventory) => /35kv/iu.test(inventory.catalog_id));
    if (!highVoltage || !mediumVoltage) throw new Error("TEST_ELECTRICAL_VOLTAGE_IDENTITIES_MISSING");
    expect(parameterValues(highVoltage.catalog_id, "FULL_APPLICABLE_SCOPE").rated_voltage_v?.value).toBe(110_000);
    expect(parameterValues(mediumVoltage.catalog_id, "FULL_APPLICABLE_SCOPE").rated_voltage_v?.value).toBe(35_000);
    const compiled = compile(highVoltage.catalog_id, "FULL_APPLICABLE_SCOPE");
    const conditionalTraces = compiled.compilation?.compiled_rows.flatMap((row) => row.normative_trace_v3)
      .filter((trace) => ["EAEU_TR_TS_004_2011", "KG_ELECTRICAL_ACCEPTANCE_2023"].includes(trace.source_id)) ?? [];
    expect(conditionalTraces.length).toBeGreaterThan(0);
    expect(conditionalTraces.every((trace) => trace.applicability.includes("N_A_WITH_REASON"))).toBe(true);
  });

  test("rejects generic rate verification markers that are neither exact codes nor justified individual norms", () => {
    const inventory = ELECTRICAL_DOMAIN_INVENTORY[0];
    const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    if (!technology) throw new Error(`TEST_ELECTRICAL_TECHNOLOGY_MISSING:${inventory.catalog_id}`);
    expect(() => buildElectricalProductionDraftV1({
      catalog_id: inventory.catalog_id,
      work_key: inventory.work_key,
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parent_revision_id: null,
      parameter_values: parameterValues(inventory.catalog_id, "FULL_APPLICABLE_SCOPE"),
      normative_request: {
        country: "KG",
        region: "Bishkek",
        funding_source: "PRIVATE_RECOMMENDED",
        project_type: "ELECTRICAL_PROJECT",
        construction_state: "NEW",
        contract_basis: [],
        effective_date: "2026-08-14",
        material_system: technology.material_system,
        operation_class: technology.operation_class,
        rate_code_by_source_id: {
          KG_KRERM_08_2015_ELECTRICAL: "KRERM-08-PROJECT-VERIFIED",
          KG_KRERP_01_2015_ELECTRICAL: "KRERP-01-PROJECT-VERIFIED-OR-N_A_WITH_REASON",
        },
      },
      raw_input: inventory.localized_name_ru,
      currency: "KGS",
    })).toThrow("ELECTRICAL_NORMATIVE_RATE_RESOLUTION_RED");
  });

  test("preserves every full BOQ through production draft durable JSON, PDF and procurement projections", () => {
    for (const inventory of TEST_INVENTORY) {
      const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
      if (!technology) throw new Error(`TEST_ELECTRICAL_TECHNOLOGY_MISSING:${inventory.catalog_id}`);
      const production = buildElectricalProductionDraftV1({
        catalog_id: inventory.catalog_id,
        work_key: inventory.work_key,
        scope_mode: "FULL_APPLICABLE_SCOPE",
        parent_revision_id: null,
        parameter_values: parameterValues(inventory.catalog_id, "FULL_APPLICABLE_SCOPE"),
        normative_request: {
          country: "KG",
          region: "Bishkek",
          funding_source: "PRIVATE_RECOMMENDED",
          project_type: "ELECTRICAL_PROJECT",
          construction_state: ["TEST", "COMMISSION"].includes(inventory.operation_class) ? "COMMISSIONING" : "NEW",
          contract_basis: [],
          effective_date: "2026-08-13",
          material_system: technology.material_system,
          operation_class: technology.operation_class,
          rate_code_by_source_id: {
            KG_KRERM_08_2015_ELECTRICAL: ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
            KG_KRERP_01_2015_ELECTRICAL: ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
          },
        },
        raw_input: inventory.localized_name_ru,
        currency: "KGS",
      });
      if (!production.draft) throw new Error(`TEST_ELECTRICAL_PRODUCTION_BLOCKED:${inventory.catalog_id}`);
      const durableJson = JSON.stringify(production.draft);
      expect(Buffer.byteLength(durableJson, "utf8")).toBeLessThanOrEqual(16 * 1024 * 1024);
      const cold = JSON.parse(durableJson) as typeof production.draft;
      const compiledRows = production.compile_result.compilation?.compiled_rows ?? [];
      expect(cold.items).toHaveLength(compiledRows.length);
      expect(cold.items.map((item) => item.sourceParameters?.rowCode)).toEqual(compiledRows.map((row) => row.row_id));
      expect(cold.items.every((item) => item.formulaId && item.normSourceId && ["REFERENCE_PRICE_ESTIMATE", "PRICE_MISSING"].includes(item.priceStatus ?? ""))).toBe(true);
      expect(cold.items.every((item) => item.priceStatus === "PRICE_MISSING"
        ? item.priceSource === "missing" && item.priceSourceId == null
        : item.priceSource === "reference_price_book" && Boolean(item.priceSourceId))).toBe(true);
      const pdfProjection = cold.items.map((item) => [item.titleRu, item.quantity, item.unit, item.unitPrice]);
      expect(pdfProjection).toHaveLength(cold.items.length);
      const procurementProjection = cold.items.filter((item) => item.sourceParameters?.includedInProcurement === true);
      expect(procurementProjection.length).toBe(compiledRows.filter((row) => row.procurement_eligible).length);
    }
  });
});


describe('outdoor board existing R846 whole source cycle',()=>{
 const source=OUTDOOR_BOARD_CURRENT_SOURCE_R846;
 // Synthetic contract fixture preserving exact source logical identities. This
 // is not the R846 readback, a DB registry/admission receipt or actual object.
 const nativeControlRows=[['source_prompt','text',null,'CONTROL_NOT_ACTUAL_PPR'],['length_m','decimal','m',432],['capacity','decimal',null,100],
   ['project_location','decimal',null,1],['drawings_or_specification','decimal',null,1],['diameter_mm','decimal',null,1]] as const;
 // Existing synthetic test controls are explicit input, never a new default,
 // accepted baseline, actual project, source norm or source approval.
 const nativeControlValues=Object.fromEntries(nativeControlRows.map(([id,_type,_unit,value])=>[id,value]));
 const controlParent=()=>({header:{definition_version_id:source.currentParent.definition_version_id,definition_sha256:source.currentParent.definition_sha256},body:{
  parameters:nativeControlRows.map(([id,type,unit,_value],ordinal)=>({parameter_id:String(id),ordinal,title_ru:String(id),value_type:String(type),unit_id:unit as string|null,required:false,default_value:null,constraints_json:{},truth_metadata:{value_source_role:'USER_INPUT'}})),
  formulas:source.legacySourceFormulas.map(f=>({...f,ast:compileFormulaGraph(f.expression_source).ast,input_parameter_ids:[...f.input_parameter_ids],ast_sha256:'CONTROL_NOT_PERSISTED'})),
  resources:source.legacySourceRows.map(r=>({...r,id:'CONTROL_PARENT_UUID_'+r.ordinal,section:'CONTROL_PRESERVED_LEGACY',title_ru:r.title_ru,
   inclusion_ast:{kind:'literal',value:true},procurement_eligible:false,resource_graph:{},source_metadata:{...RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_R871.targets.find(t=>t.catalogId===source.catalogId)!.resourceSourceMetadataByRowId[r.row_id as keyof typeof RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_R871.targets[number]['resourceSourceMetadataByRowId']]},row_sha256:'CONTROL_NOT_PERSISTED'})),
 }});
 const demo=(n=2,received=3)=>({[source.boardCountId]:n,[source.receivedCountId]:received,[source.profileId]:source.profileValue,
  [source.documentId]:'EXPLICIT_DEMO_NOT_ACTUAL_BOARD_PROJECT_OR_PRICE',[source.fitId]:source.fitValue,[source.canopyScopeId]:source.canopyNotApplicable});
 const run=(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>{
  const d=outdoorDistributionBoardCurrentForwardR846(controlParent());
  return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',catalogId:source.catalogId,compilerVersion:source.contract,
   primaryMeasureParameterId:source.boardCountId,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
   submittedParameters:{...nativeControlValues,...parameters},confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
 };
 const projectSaved=(result:Awaited<ReturnType<typeof run>>,parameters:Record<string,unknown>,parentRevisionId:string|null=null)=>{
  const releaseId='CONTROL_UNSAVED_OUTDOOR_RELEASE',definitionVersionId='CONTROL_UNSAVED_OUTDOOR_DEFINITION';
  const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId,definitionVersionId,passport:{definition_version_id:definitionVersionId,
   payload_sha256:'e'.repeat(64),decision:{independentCompletenessMap:outdoorDistributionBoardIndependentCompositionR846()}}})!;
  const checksum=canonicalEstimateSha256HexText(canonicalEstimateStableJson({...result.revisionProjection,operationCompositionEvidenceV1:evidence}));
  const commit=buildCanonicalRevisionCommitPayload({rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,checksumSha256:checksum,
   compilerVersion:source.contract,parameters:result.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:{...nativeControlValues,...parameters},
   parentRevisionId,identityContract:{},preliminaryNeeds:result.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
  const saved={id:parentRevisionId?'CONTROL_UNSAVED_OUTDOOR_AMENDED':'CONTROL_UNSAVED_OUTDOOR_INITIAL',release_id:releaseId,definition_version_id:definitionVersionId,
   catalog_id:source.catalogId,checksum_sha256:checksum,row_count:result.rows.length,input_parameters:result.parameters,
   amendment_contract:{parameterSources:commit.parameterSources}};
  return JSON.parse(JSON.stringify({saved,resources:[...result.rows,...canonicalArtifactPreliminaryNeeds(saved)]})) as {saved:typeof saved;resources:Record<string,unknown>[]};
 };
 test('retains all58 current identities and owners without substituting the registered domain factory for the canonical parent',()=>{
  const p=controlParent(),d=outdoorDistributionBoardCurrentForwardR846(p),request=outdoorDistributionBoardOrdinaryMaterializerInputR846(p),map=outdoorDistributionBoardIndependentCompositionR846();
  expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([14+10,75,75]);
  for(const r of p.body.resources)expect(d.resources.find(x=>x.row_id===r.row_id)).toMatchObject({id:r.id,ordinal:r.ordinal,unit_id:r.unit_id,formula_id:r.formula_id,cost_owner_id:r.cost_owner_id});
  expectRetainedUnboundSourcesR871(d,p.body,source.catalogId);
  for(const native of p.body.parameters)expect(native).toMatchObject({default_value:null,truth_metadata:{value_source_role:'USER_INPUT'}});
  const target=RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_R871.targets.find(t=>t.catalogId===source.catalogId)!;
  for(const binding of target.bindings){const parameter=d.parameters.find(p=>p.parameter_id===binding.parameterId)!;expect(parameter).toMatchObject({default_value:null,truth_metadata:{value_source_role:'UNRESOLVED_APPLICATION_NORM',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}});const provenance=parameter.truth_metadata?.provenance as Record<string,unknown>;for(const key of ['baselineOwner','approvedTemplateBinding','acceptedTraceBindings'])expect(provenance).not.toHaveProperty(key);}
  expect(map.operationRoster.filter(o=>o.processRole==='PROCESS')).toHaveLength(16);
  expect(map.operationRoster.filter(o=>o.processRole==='REFERENCE_ONLY')).toHaveLength(1);
  expect(map.operationRequirements.flatMap(o=>Object.values(o.requirements))).toHaveLength(160);
  expect(map.operationRequirements.every(o=>Object.values(o.requirements).every(r=>r.status==='UNRESOLVED'&&r.rowIds.length===0))).toBe(true);
  expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,requireOperationBindings:true})).toEqual([]);
  expect(request.currentRegistryRows).toEqual({bindings:0,locators:0,sources:0,newSource:0});expect(request.sourceRegistryAdmission).toBeNull();
 });
 test.each([1,3])('calculates the exact full factory supply at received count=%i independently of installed boards',async received=>{
  const r=await run(demo(1,received)),d=outdoorDistributionBoardCurrentForwardR846(controlParent());
  for(const part of source.factoryParts){const id=source.prefix+':'+part.key;
   expect(r.rows.find(x=>x.row_id===id)).toMatchObject({quantity:String(received*part.countPerEnclosure),unit_id:'pcs',included_in_estimate:false,included_in_procurement:false});
   expect(d.resources.find(x=>x.row_id===id)).toMatchObject({cost_owner_id:source.primaryExistingCostOwner,resource_graph:{parentCostOwnerId:source.primaryPaidRowId},source_metadata:{supplyNotInstalledConsumption:true,priceCoverageAuthenticated:false,normativeTrace:[]}});
  }
  expect(r.rows.find(x=>x.row_id===source.measureRowId)?.quantity).toBe('1');
  expect(r.preliminaryNeeds.filter(x=>source.legacySourceRows.some(old=>old.row_id===x.row_id))).toHaveLength(58);
 });
 test('calculates four applied canopy plugs and bolts without consuming the fifth supplied spare',async()=>{
  const r=await run({...demo(2,2),[source.canopyScopeId]:source.canopyApplied,[source.canopyCountId]:2});
  expect(source.scopeFacts.canopySuppliedPlugsPerUnit).toBe(5);expect(source.scopeFacts.canopyAppliedPlugsPerUnit).toBe(4);
  expect(r.rows.find(x=>x.row_id===source.prefix+':canopy-installed-plug')?.quantity).toBe('8');
  expect(r.rows.find(x=>x.row_id===source.prefix+':canopy-installed-bolt')?.quantity).toBe('8');
  expect(r.rows.find(x=>x.row_id===source.canopyBalance[0]!.rowId)?.quantity).toBe('10');
  expect(r.rows.find(x=>x.row_id===source.canopyBalance[1]!.rowId)).toMatchObject({quantity:'2',included_in_estimate:false,included_in_procurement:false});
  expect(outdoorDistributionBoardCurrentForwardR846(controlParent()).resources.find(x=>x.row_id===source.canopyBalance[1]!.rowId)?.resource_graph.publicResourcePresentationV1).toMatchObject({rowKind:'CALCULATION_DETAIL'});
  const none=await run(demo(2,2));expect(none.rows.some(x=>x.row_id===source.prefix+':canopy-installed-plug')).toBe(false);
 });
 test('holds omitted manufacturer revision and actual applicability separately from manual numeric supply',async()=>{
  const parameters={...demo(1,1)} as Record<string,unknown>;delete parameters[source.fitId];delete parameters[source.documentId];
  const id=source.prefix+':ground-conductor',r=await run(parameters,{[id]:{quantity:'1',provenance:{kind:'manual',reason:'CONTROL_AMOUNT_NOT_ACTUAL_PE_METHOD'}}});
  expect(r.preliminaryNeeds.find(n=>n.row_id===id)).toMatchObject({quantity:'1',need_state:'CONDITION_REQUIRED',calculation_trace:{manualQuantityOverride:true}});
  expect(r.preliminaryNeeds.find(n=>n.row_id===id)?.missing_parameter_ids).toEqual(expect.arrayContaining([source.fitId,source.documentId]));
  await expect(run({...demo(1,1),[source.documentId]:''})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('rejects unsupported enclosure or accessory conditions and fractional quantities',async()=>{
  for(const value of ['STAINLESS_AISI316_IK09_OTHER_PASSPORT','INDOOR_IP31','UNKNOWN_AS_APPROVED'])await expect(run({...demo(1,1),[source.profileId]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  for(const value of [1.5,-1])await expect(run({...demo(1,1),[source.receivedCountId]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  await expect(run({...demo(1,1),[source.canopyScopeId]:'EVERY_BOARD_AUTOMATICALLY_HAS_ONE_CANOPY'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('retains all legacy source needs with manual amounts and rejects a consumer supplied protected source approval',async()=>{
  const parameters=demo(1,1),id=source.primaryPaidRowId;
  // This explicit synthetic parent disables procurement; captured actual R846
  // eligibility is retained separately and is not changed by this guard test.
  expect(outdoorDistributionBoardCurrentForwardR846(controlParent()).resources.find(r=>r.row_id===id)?.procurement_eligible).toBe(false);
  await expect(run(parameters,{[id]:{quantity:'1',unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance:{kind:'manual',reason:'CONTROL_ILLEGAL_PROCUREMENT_FLAG_NOT_SOURCE_APPROVAL'}}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  const r=await run(parameters,{[id]:{quantity:'1',unitPrice:'77',includedInEstimate:true,includedInProcurement:false,provenance:{kind:'manual',reason:'CONTROL_MANUAL_AMOUNT_NOT_SOURCE_ADMISSION'}}});
  expect(r.preliminaryNeeds.find(n=>n.row_id===id)).toMatchObject({quantity:'1',need_state:'CONDITION_REQUIRED',missing_parameter_ids:expect.arrayContaining([source.legacySourceGateId]),calculation_trace:{manualQuantityOverride:true}});
  expect(r.rows.some(n=>n.row_id===id)).toBe(false);
  expect(r.rows.filter(x=>x.included_in_procurement)).toEqual([]);
  await expect(run({...parameters,[source.legacySourceGateId]:source.legacySourceGateValue})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED',message:'unresolved application norm cannot be supplied '+source.legacySourceGateId});
  for(const b of RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_R871.targets.find(t=>t.catalogId===source.catalogId)!.bindings)await expect(run({...parameters,[b.parameterId]:1})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED',message:'unresolved application norm cannot be supplied '+b.parameterId});
 });
 test('keeps current header and row/formula drift blocking before any materializer request',()=>{
  const wrong=controlParent();wrong.header.definition_sha256='f'.repeat(64);
  expect(()=>outdoorDistributionBoardCurrentForwardR846(wrong)).toThrow('OUTDOOR_BOARD_EXACT_CURRENT_R846_REQUIRED');
  const owner=controlParent();owner.body.resources[0].cost_owner_id='FOREIGN_OWNER';
  expect(()=>outdoorDistributionBoardCurrentForwardR846(owner)).toThrow('OUTDOOR_BOARD_CURRENT_ROW_DRIFT');
  const formula=controlParent();formula.body.formulas[0].expression_source='1';formula.body.formulas[0].output_unit_id='kg';
  expect(()=>outdoorDistributionBoardCurrentForwardR846(formula)).toThrow('OUTDOOR_BOARD_CURRENT_FORMULA_DRIFT');
 });
 test('detects loss of a supplied part, wrong owner binding or changed real-operation consumer in independent references',()=>{
  const d=outdoorDistributionBoardCurrentForwardR846(controlParent()),map=outdoorDistributionBoardIndependentCompositionR846(),id=source.prefix+':canopy-installed-plug';
  const check=(resources:typeof d.resources)=>validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:resources,requireOperationBindings:true});
  expect(check(d.resources.filter(r=>r.row_id!==id)).length).toBeGreaterThan(0);
  expect(check(d.resources.map(r=>r.row_id===id?{...r,resource_graph:{...r.resource_graph,parentCostOwnerId:'FOREIGN'}}:r)).length).toBeGreaterThan(0);
  expect(check(d.resources.map(r=>r.row_id===id?{...r,resource_graph:{...r.resource_graph,operationCompositionV1:{...source.legacyReference,contractVersion:'canonical-operation-resource/v1'}}}:r)).length).toBeGreaterThan(0);
 });
 test('preserves Core to saved source HOLD through manual edits, exclusion and cold JSON projection',async()=>{
  const parameters=demo(1,1),r=await run(parameters),saved=projectSaved(r,parameters),before=JSON.stringify(saved);
  const gate=canonicalEstimateSavedOperationAcceptanceV1({revision:saved.saved,resources:saved.resources});
  expect(gate.pdfAllowed).toBe(false);expect(gate.completeClaimAllowed).toBe(false);
  expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(gate)).toThrow(expect.objectContaining({httpStatus:409}));
  expect(JSON.stringify(saved)).toBe(before);
  const id=source.primaryPaidRowId,amended=await run(parameters,{[id]:{quantity:'0',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual',reason:'CONTROL_EXCLUSION_NOT_SOURCE_OR_PHYSICAL_CLOSURE'}}});
  const reopened=projectSaved(amended,parameters,saved.saved.id);
  expect(reopened.saved.amendment_contract.parameterSources).toMatchObject({parentRevisionId:saved.saved.id});
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:reopened.saved,resources:reopened.resources}).pdfAllowed).toBe(false);
  expect(outdoorAuditPublisher({resourceDefinitions:outdoorDistributionBoardCurrentForwardR846(controlParent()).resources,independentComposition:outdoorDistributionBoardIndependentCompositionR846()}).definitionAdmissionAllowed).toBe(false);
 });
});


describe('electrical testing existing R858 whole source cycle',()=>{
 const source=ELECTRICAL_TESTING_CURRENT_SOURCE_R858;
 // Synthetic contract fixture, not the actual R858 body, an actual programme,
 // site tests, source registry admission, database save or published PDF.
 // Captured historical values are explicit SYNTHETIC controls only; no actual object or accepted baseline is asserted.
 const nativeControlValues=Object.fromEntries(source.legacyControlParameters.map(p=>[p.parameter_id,p.default_value]));
 const controlParent=()=>({header:{definition_version_id:source.currentParent.definition_version_id,definition_sha256:source.currentParent.definition_sha256},body:{
  parameters:source.legacyControlParameters.map(p=>({...p,required:false,default_value:null,constraints_json:{},truth_metadata:{value_source_role:'USER_INPUT'}})),
  formulas:source.legacySourceFormulas.map(f=>({...f,ast:compileFormulaGraph(f.expression_source).ast,input_parameter_ids:[...f.input_parameter_ids],ast_sha256:'CONTROL_NOT_PERSISTED'})),
  resources:source.legacySourceRows.map(r=>({...r,id:'CONTROL_PARENT_UUID_'+r.ordinal,section:'CONTROL_PRESERVED_LEGACY',title_ru:r.title_ru,inclusion_ast:{kind:'literal',value:true},procurement_eligible:false,resource_graph:{},
   source_metadata:{...RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_R871.targets.find(t=>t.catalogId===source.catalogId)!.resourceSourceMetadataByRowId[r.row_id as keyof typeof RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_R871.targets[number]['resourceSourceMetadataByRowId']]},row_sha256:'CONTROL_NOT_PERSISTED'})),
 }});
 const demo=(k=1,entries=7)=>({[source.planCountId]:entries,[source.kitProfileId]:source.kitProfile,[source.kitCountId]:k,
  [source.inventoryId]:'EXPLICIT_DEMO_OWNED_KIT_WITH_SERIALS_CONDITION_AND_VERIFICATION_NOT_ACTUAL',[source.programId]:'EXPLICIT_DEMO_APPROVED_PROGRAM_NOT_ACTUAL',
  [source.programFitId]:source.programFit,[source.methodId]:source.method,[source.cordId]:source.cordVariants[0]!.value,[source.renewalScopeId]:source.renewalNone});
 const run=(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>{
  const d=electricalTestingCurrentForwardR858(controlParent());
  return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',catalogId:source.catalogId,compilerVersion:source.contract,
   primaryMeasureParameterId:source.planCountId,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:{...nativeControlValues,...parameters},confirmedParameters:{},rowOverrides,
   priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
 };
 const projectSaved=(result:Awaited<ReturnType<typeof run>>,parameters:Record<string,unknown>,parentRevisionId:string|null=null)=>{
  const releaseId='CONTROL_UNSAVED_QA_RELEASE',definitionVersionId='CONTROL_UNSAVED_QA_DEFINITION';
  const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId,definitionVersionId,passport:{definition_version_id:definitionVersionId,payload_sha256:'d'.repeat(64),decision:{independentCompletenessMap:electricalTestingIndependentCompositionR858()}}})!;
  const checksum=canonicalEstimateSha256HexText(canonicalEstimateStableJson({...result.revisionProjection,operationCompositionEvidenceV1:evidence}));
  const commit=buildCanonicalRevisionCommitPayload({rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,checksumSha256:checksum,compilerVersion:source.contract,parameters:result.parameters,
   approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:{...nativeControlValues,...parameters},parentRevisionId,identityContract:{},preliminaryNeeds:result.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
  const saved={id:parentRevisionId?'CONTROL_UNSAVED_QA_AMENDED':'CONTROL_UNSAVED_QA_INITIAL',release_id:releaseId,definition_version_id:definitionVersionId,catalog_id:source.catalogId,checksum_sha256:checksum,row_count:result.rows.length,
   input_parameters:result.parameters,amendment_contract:{parameterSources:commit.parameterSources}};
  return JSON.parse(JSON.stringify({saved,resources:[...result.rows,...canonicalArtifactPreliminaryNeeds(saved)]})) as {saved:typeof saved;resources:Record<string,unknown>[]};
 };
 test('retains exact63 current rows formulas and owners while exposing the whole17operation programme and finite existing materializer',()=>{
  const p=controlParent(),d=electricalTestingCurrentForwardR858(p),m=electricalTestingIndependentCompositionR858(),request=electricalTestingOrdinaryMaterializerInputR858(p);
  expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([19+2,90,90]);
  expectRetainedUnboundSourcesR871(d,p.body,source.catalogId);
  for(const native of p.body.parameters)expect(native).toMatchObject({default_value:null,truth_metadata:{value_source_role:'USER_INPUT'}});
  const target=RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_R871.targets.find(t=>t.catalogId===source.catalogId)!;
  for(const binding of target.bindings){const parameter=d.parameters.find(p=>p.parameter_id===binding.parameterId)!;expect(parameter).toMatchObject({default_value:null,truth_metadata:{value_source_role:'UNRESOLVED_APPLICATION_NORM',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}});const provenance=parameter.truth_metadata?.provenance as Record<string,unknown>;for(const key of ['baselineOwner','approvedTemplateBinding','acceptedTraceBindings'])expect(provenance).not.toHaveProperty(key);}
  for(const r of p.body.resources)expect(d.resources.find(x=>x.row_id===r.row_id)).toMatchObject({id:r.id,ordinal:r.ordinal,category:r.category,unit_id:r.unit_id,formula_id:r.formula_id,cost_owner_id:r.cost_owner_id});
  expect(m.operationRoster.filter(o=>o.processRole==='PROCESS')).toHaveLength(17);expect(m.operationRoster.filter(o=>o.processRole==='REFERENCE_ONLY')).toHaveLength(1);
  expect(m.operationRequirements.flatMap(o=>Object.values(o.requirements))).toHaveLength(170);
  expect(m.operationRequirements.every(o=>Object.values(o.requirements).every(r=>r.status==='UNRESOLVED'&&r.rowIds.length===0))).toBe(true);
  expect(validateIndependentCompletenessMapReferences({completenessMap:m,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,requireOperationBindings:true})).toEqual([]);
  expect(request.currentRegistryRows).toEqual({bindings:0,locators:0,sources:0,newSource:0});expect(request.sourceRegistryAdmission).toBeNull();
 });
 test.each([1,3])('uses all24 standard positions and34 initial pieces per documented complete kit K=%i independently of plan entries',async k=>{
  const r=await run(demo(k,17)),d=electricalTestingCurrentForwardR858(controlParent());let sum=0;
  for(const p of source.parts){const id=source.prefix+':'+p.key,amount=k*p.countPerWhole;sum+=amount;
   expect(r.rows.find(x=>x.row_id===id)).toMatchObject({quantity:String(amount),unit_id:'pcs',included_in_estimate:false,included_in_procurement:false});
   expect(d.resources.find(x=>x.row_id===id)).toMatchObject({cost_owner_id:null,resource_graph:{physicalProvisionV1:{sharedOwnerId:source.ownedKitOwnerId,newPurchaseClaimed:false,servicePriceCoverageAuthenticated:false}},source_metadata:{normativeTrace:[],actualElectricalTestsOrSafeIsolationProved:false}});
  }
  expect(sum).toBe(34*k);expect(r.rows.find(x=>x.row_id===source.measureRowId)?.quantity).toBe('17');
  expect(r.preliminaryNeeds.filter(n=>source.legacySourceRows.some(old=>old.row_id===n.row_id))).toHaveLength(63);
 });
 test('includes the complete blue accessories remote probe and exact country cord without assuming Schuko or extending measurement CAT',async()=>{
  const r=await run({...demo(1,2),[source.cordId]:'NEMA5_15_4601134'});
  for(const key of ['blue-lead','blue-probe','blue-gs38-cap','blue-clip','remote-probe','mains-cord'])expect(r.rows.find(x=>x.row_id===source.prefix+':'+key)?.quantity).toBe('1');
  expect(source.cordVariants).toHaveLength(7);
  await expect(run({...demo(),[source.cordId]:'UNSPECIFIED_TRAVEL_ADAPTER_ASSUMED_COMPATIBLE'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  const unknown={...demo()} as Record<string,unknown>;delete unknown[source.cordId];const u=await run(unknown);
  expect(u.preliminaryNeeds.find(n=>n.row_id===source.prefix+':mains-cord')?.missing_parameter_ids).toContain(source.cordId);
 });
 test('requires actual program inventory fitness and count independently instead of deriving a post from apparatus or plan entries',async()=>{
  const p={...demo()} as Record<string,unknown>;for(const id of [source.programId,source.inventoryId,source.programFitId,source.kitCountId])delete p[id];
  const r=await run(p),n=r.preliminaryNeeds.find(n=>n.row_id===source.prefix+':installation-tester');
  expect(n?.missing_parameter_ids).toEqual(expect.arrayContaining([source.programId,source.inventoryId,source.programFitId,source.kitCountId]));
  expect(r.rows.some(x=>x.row_id===source.prefix+':installation-tester')).toBe(false);
  const d=electricalTestingCurrentForwardR858(controlParent());
  for(const id of [source.programId,source.inventoryId,source.programFitId,source.cordId])expect(d.parameters.find(p=>p.parameter_id===id)?.truth_metadata.resource_branch_consumers).toContain(source.prefix+':installation-tester');
 });
 test('rejects unsupported model method and fractional whole kit instead of borrowing1663or1664 functions',async()=>{
  for(const method of source.unsupportedCapabilities)await expect(run({...demo(),[source.methodId]:method})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  for(const k of [0,-1,1.5])await expect(run({...demo(),[source.kitCountId]:k})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  await expect(run({...demo(),[source.kitProfileId]:'ANY_166X_OR_SINGLE_POLE_INDICATOR'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  expect(source.sourceContradictions).toHaveLength(1);expect(source.separateNonNormativeFacts.testerSafetyPretestAvailable).toBe(false);expect(source.separateNonNormativeFacts.proverCALCHECKAvailable).toBe(false);
 });
 test('calculates six AA per separately documented full replacement event without consuming the initial12AAagain or battery life as a norm',async()=>{
  const p={...demo(2,50),[source.renewalScopeId]:source.renewalApplied,[source.renewalRecordId]:'EXPLICIT_DEMO_FULL_REPLACEMENT_LOG_NOT_ACTUAL',
   [source.renewals[0]!.countId]:3,[source.renewals[1]!.countId]:1},r=await run(p);
  expect(r.rows.find(x=>x.row_id===source.prefix+':prover-renewal-aa')?.quantity).toBe('18');
  expect(r.rows.find(x=>x.row_id===source.prefix+':tester-renewal-aa')?.quantity).toBe('6');
  expect(r.rows.find(x=>x.row_id===source.prefix+':proving-batteries')?.quantity).toBe('12');
  expect(r.rows.find(x=>x.row_id===source.prefix+':continuity-batteries')?.quantity).toBe('12');
  const none=await run(demo());expect(none.rows.some(x=>x.row_id===source.prefix+':prover-renewal-aa')).toBe(false);
  for(const value of [-1,1.5])await expect(run({...p,[source.renewals[0]!.countId]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('distinguishes omitted replacement record from invalid empty text and explicit zero real events',async()=>{
  const p={...demo(),[source.renewalScopeId]:source.renewalApplied,[source.renewals[0]!.countId]:0,[source.renewals[1]!.countId]:0},r=await run(p);
  expect(r.preliminaryNeeds.find(n=>n.row_id===source.prefix+':prover-renewal-aa')?.missing_parameter_ids).toContain(source.renewalRecordId);
  await expect(run({...p,[source.renewalRecordId]:''})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  const known=await run({...p,[source.renewalRecordId]:'EXPLICIT_DEMO_ZERO_REPLACEMENT_RECORD'});
  expect(known.rows.find(x=>x.row_id===source.prefix+':prover-renewal-aa')?.quantity).toBe('0');
 });
 test('leaves legacy source needs through manual amounts and forbids consumer approval of the protected source gate',async()=>{
  const id=source.primaryExistingServiceRowId;
  // The synthetic fixture has procurement disabled; this does not rewrite
  // the captured actual R858 service eligibility or approve its source.
  expect(electricalTestingCurrentForwardR858(controlParent()).resources.find(r=>r.row_id===id)?.procurement_eligible).toBe(false);
  await expect(run(demo(),{[id]:{quantity:'1',unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance:{kind:'manual',reason:'CONTROL_ILLEGAL_PROCUREMENT_FLAG_NOT_PROGRAM_ADMISSION'}}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  const r=await run(demo(),{[id]:{quantity:'1',unitPrice:'77',includedInEstimate:true,includedInProcurement:false,provenance:{kind:'manual',reason:'CONTROL_MANUAL_SERVICE_AMOUNT_NOT_PROGRAM_SOURCE_OR_RESULTS'}}});
  expect(r.preliminaryNeeds.find(n=>n.row_id===id)).toMatchObject({quantity:'1',need_state:'CONDITION_REQUIRED',missing_parameter_ids:expect.arrayContaining([source.legacyGateId]),calculation_trace:{manualQuantityOverride:true}});
  expect(r.rows.filter(x=>x.included_in_estimate||x.included_in_procurement)).toEqual([]);
  await expect(run({...demo(),[source.legacyGateId]:source.legacyGateValue})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED',message:'unresolved application norm cannot be supplied '+source.legacyGateId});
  for(const b of RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_R871.targets.find(t=>t.catalogId===source.catalogId)!.bindings)await expect(run({...demo(),[b.parameterId]:1})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED',message:'unresolved application norm cannot be supplied '+b.parameterId});
 });
 test('keeps unknown programme application separate from a legitimate manual preliminary amount',async()=>{
  const p={...demo()} as Record<string,unknown>;delete p[source.programFitId];delete p[source.programId];const id=source.prefix+':installation-tester';
  const r=await run(p,{[id]:{quantity:'1',provenance:{kind:'manual',reason:'CONTROL_PRELIMINARY_AMOUNT_NOT_PROGRAM_OR_FIT'}}});
  expect(r.preliminaryNeeds.find(n=>n.row_id===id)).toMatchObject({quantity:'1',need_state:'CONDITION_REQUIRED',missing_parameter_ids:expect.arrayContaining([source.programFitId,source.programId]),calculation_trace:{manualQuantityOverride:true}});
  const saved=projectSaved(r,p);expect(canonicalEstimateSavedOperationAcceptanceV1({revision:saved.saved,resources:saved.resources}).pdfAllowed).toBe(false);
 });
 test('blocks exact parent owner ordinal and formula drift before materialization',()=>{
  const wrong=controlParent();wrong.header.definition_sha256='e'.repeat(64);expect(()=>electricalTestingCurrentForwardR858(wrong)).toThrow('ELECTRICAL_TESTING_EXACT_CURRENT_R858_REQUIRED');
  const owner=controlParent();owner.body.resources[0].cost_owner_id='FOREIGN_PAYMENT_OWNER';expect(()=>electricalTestingCurrentForwardR858(owner)).toThrow('ELECTRICAL_TESTING_CURRENT_ROW_DRIFT');
  const ordinal=controlParent();ordinal.body.resources[0].ordinal=999;expect(()=>electricalTestingCurrentForwardR858(ordinal)).toThrow('ELECTRICAL_TESTING_CURRENT_ROW_DRIFT');
  const formula=controlParent(),originalExpression=formula.body.formulas[0].expression_source;
  expect(originalExpression).toBe(source.legacySourceFormulas[0]!.expression_source);
  formula.body.formulas[0].expression_source='('+originalExpression+')+1';expect(formula.body.formulas[0].expression_source).not.toBe(originalExpression);
  expect(()=>electricalTestingCurrentForwardR858(formula)).toThrow('ELECTRICAL_TESTING_CURRENT_FORMULA_DRIFT');
  const unit=controlParent(),originalUnit=unit.body.formulas[0].output_unit_id;unit.body.formulas[0].output_unit_id=originalUnit==='kg'?'m':'kg';expect(unit.body.formulas[0].output_unit_id).not.toBe(originalUnit);
  expect(()=>electricalTestingCurrentForwardR858(unit)).toThrow('ELECTRICAL_TESTING_CURRENT_FORMULA_DRIFT');
 });
 test('uses one shared owned resource at each actual consumer and detects a missing lead or foreign operation',()=>{
  const d=electricalTestingCurrentForwardR858(controlParent()),m=electricalTestingIndependentCompositionR858(),id=source.prefix+':continuity-red-lead';
  const tester=d.resources.find(r=>r.row_id===source.prefix+':installation-tester')!;
  expect(tester.cost_owner_id).toBeNull();expect(tester.resource_graph.physicalProvisionV1).toMatchObject({sharedOwnerId:source.ownedKitOwnerId});
  expect(d.resources.filter(r=>r.row_id===tester.row_id)).toHaveLength(1);
  const check=(resources:typeof d.resources)=>validateIndependentCompletenessMapReferences({completenessMap:m,formulaDefinitions:d.formulas,resourceDefinitions:resources,requireOperationBindings:true});
  expect(check(d.resources.filter(r=>r.row_id!==id)).length).toBeGreaterThan(0);
  expect(check(d.resources.map(r=>r.row_id===id?{...r,resource_graph:{...r.resource_graph,operationCompositionV1:{...source.legacyReference,contractVersion:'canonical-operation-resource/v1'}}}:r)).length).toBeGreaterThan(0);
 });
 test('retains source and whole service HOLD through commit cold projection manual exclusion and saved common gate',async()=>{
  const p=demo(),r=await run(p),saved=projectSaved(r,p),before=JSON.stringify(saved),gate=canonicalEstimateSavedOperationAcceptanceV1({revision:saved.saved,resources:saved.resources});
  expect(gate.pdfAllowed).toBe(false);expect(gate.completeClaimAllowed).toBe(false);expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(gate)).toThrow(expect.objectContaining({httpStatus:409}));expect(JSON.stringify(saved)).toBe(before);
  const id=source.primaryExistingServiceRowId,amended=await run(p,{[id]:{quantity:'0',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual',reason:'CONTROL_EXCLUSION_NOT_WHOLE_SERVICE_CLOSURE'}}}),reopened=projectSaved(amended,p,saved.saved.id);
  expect(reopened.saved.amendment_contract.parameterSources).toMatchObject({parentRevisionId:saved.saved.id});
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:reopened.saved,resources:reopened.resources}).pdfAllowed).toBe(false);
  expect(outdoorAuditPublisher({resourceDefinitions:electricalTestingCurrentForwardR858(controlParent()).resources,independentComposition:electricalTestingIndependentCompositionR858()}).definitionAdmissionAllowed).toBe(false);
 });
});


function expectRetainedUnboundSourcesR871(d:ReturnType<typeof outdoorDistributionBoardCurrentForwardR846>,parent:Pick<typeof d,'formulas'|'resources'>,catalogId:string){
 const policy=RETAINED_FROZEN_SOURCE_QUANTITY_FORWARD_R871.targets.find(t=>t.catalogId===catalogId)!;
 for(const f of parent.formulas){const b=policy.bindings.find(b=>b.formulaId===f.formula_id),current=d.formulas.find(x=>x.formula_id===f.formula_id)!;
  if(!b){expect(current).toEqual(f);continue;}
  expect(JSON.parse(b.originalFormulaRawJson)).toEqual(b.originalFormula);
  expect(b.originalFormula).toMatchObject({expression_source:f.expression_source,input_parameter_ids:[],ast:f.ast,output_unit_id:f.output_unit_id});
  expect(JSON.parse(b.originalResourceRawJson)).toMatchObject({row_id:b.rowId,formula_id:b.formulaId,unit_id:b.unitId,cost_owner_id:b.costOwnerId,source_metadata:b.originalSourceMetadata});
  expect(current).toMatchObject({formula_id:b.formulaId,output_unit_id:b.unitId,expression_source:b.parameterId,ast:{kind:'parameter',id:b.parameterId},input_parameter_ids:[b.parameterId]});
  expect(d.parameters.find(p=>p.parameter_id===b.parameterId)).toMatchObject({default_value:null,unit_id:b.unitId,truth_metadata:{visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}});
  expect(d.resources.find(r=>r.row_id===b.rowId)).toMatchObject({cost_owner_id:b.costOwnerId,unit_id:b.unitId,formula_id:b.formulaId,source_metadata:{originalQuantityFormula:b.originalSourceMetadata.originalQuantityFormula,runtimeExpressionSource:b.parameterId,retainedUnboundSourceQuantityV1:{runtimeFormulaAstChanged:true,originalFormulaRawSha256:b.originalFormulaRawSha256,originalResourceRawSha256:b.originalResourceRawSha256,quantitySourceApproved:false,priceStockSupplyOrderDriver:false}}});
 }
 for(const id of policy.nativeParameterIds)expect(d.parameters.some(p=>p.parameter_id===id)).toBe(true);
}


describe('grounding system existing R867 whole source cycle',()=>{
 const source=GROUNDING_CURRENT_SOURCE_R867;
 // Explicit synthetic controls preserve the captured exact-parent defaults,
 // while the synthetic compiler view has no default/baseline authority.
 const nativeControlValues=Object.fromEntries(source.legacyControlParameters.map(p=>[p.parameter_id,p.default_value]));
 // Explicit synthetic logical contract fixture. Not actual soil/design/works,
 // electrical results, registry admission, DB save or published PDF.
 const controlParent=()=>({header:{definition_version_id:source.currentParent.definition_version_id,definition_sha256:source.currentParent.definition_sha256},body:{
  parameters:source.legacyControlParameters.map(p=>({...p,required:false,constraints_json:{},truth_metadata:{value_source_role:'USER_INPUT'}})),
  formulas:source.legacySourceFormulas.map(f=>({...f,ast:JSON.parse(JSON.stringify(source.legacyFormulaAstsByFormulaId[f.formula_id as keyof typeof source.legacyFormulaAstsByFormulaId])),input_parameter_ids:[...f.input_parameter_ids],ast_sha256:'CONTROL_NOT_PERSISTED'})),
  resources:source.legacySourceRows.map(r=>({...r,id:'CONTROL_PARENT_UUID_'+r.ordinal,section:'CONTROL_PRESERVED_LEGACY',inclusion_ast:{kind:'literal',value:true},procurement_eligible:false,resource_graph:{},
   source_metadata:{...source.legacyResourceSourceMetadataByRowId[r.row_id as keyof typeof source.legacyResourceSourceMetadataByRowId]},row_sha256:'CONTROL_NOT_PERSISTED'})),
 }});
 const demo=(n=1,toolK=1,testK=1,c=1)=>({[source.assemblyCountId]:n,[source.profileId]:source.manualProfile,[source.actualProjectId]:'EXPLICIT_DEMO_WHOLE_GROUNDING_DESIGN_NOT_ACTUAL',
  [source.actualFitId]:source.actualFit,[source.toolCountId]:toolK,[source.toolInventoryId]:'EXPLICIT_DEMO_COMPATIBLE_FULL_MANUAL_TOOLS_PPE_ACCESS_NOT_ACTUAL',
  [source.kitCountId]:testK,[source.kitInventoryId]:'EXPLICIT_DEMO_1625KIT_AND_MATCHED_ABSENCE_INVENTORY_VERIFICATION_NOT_ACTUAL',
  [source.testMethodId]:source.threePoleMethod,[source.testTopologyId]:source.testTopology,[source.testProgramId]:'EXPLICIT_DEMO_REAL_PROGRAM_REFERENCE_REQUIRED_NO_DEFAULT_OHM',
  [source.conductorProfileId]:source.conductorProfiles[0]!.value,[source.conductorCountId]:c,[source.conductorDocumentId]:'EXPLICIT_DEMO_ROUTE_RECEIVED_CLASS_AND_BOTH_CONTACT_NODES_NOT_ACTUAL',
  [source.rectScopeId]:source.rectReady,[source.rectDocumentId]:'EXPLICIT_DEMO_READY_ACCEPTED_TRENCH_NOT_ACTUAL',[source.corrosionMethodId]:source.corrosionNone,[source.corrosionDocumentId]:'EXPLICIT_DEMO_ACCEPTED_NO_KSB_NODE_NOT_ACTUAL',[source.measuredWaste.scopeId]:source.measuredWaste.noPairScope,[source.renewalParts[0]!.countId]:0,[source.renewalParts[1]!.countId]:0,[source.renewalRecordId]:'EXPLICIT_DEMO_OBSERVED_ZERO_FULL_NEW_CELL_REPLACEMENTS_NOT_ACTUAL'});
 const run=(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>{
  const d=groundingSystemCurrentForwardR867(controlParent());return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',catalogId:source.catalogId,compilerVersion:source.contract,
   primaryMeasureParameterId:source.assemblyCountId,parameterDefinitions:d.parameters.map(p=>source.legacyControlParameters.some(a=>a.parameter_id===p.parameter_id)?{...p,default_value:null}:p),formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:{...nativeControlValues,...parameters},confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
 };
 const projectSaved=(result:Awaited<ReturnType<typeof run>>,parameters:Record<string,unknown>,parentRevisionId:string|null=null)=>{
  const releaseId='CONTROL_UNSAVED_GROUND_RELEASE',definitionVersionId='CONTROL_UNSAVED_GROUND_DEFINITION';
  const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId,definitionVersionId,passport:{definition_version_id:definitionVersionId,payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:groundingSystemIndependentCompositionR867()}}})!;
  const checksum=canonicalEstimateSha256HexText(canonicalEstimateStableJson({...result.revisionProjection,operationCompositionEvidenceV1:evidence}));
  const commit=buildCanonicalRevisionCommitPayload({rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,checksumSha256:checksum,compilerVersion:source.contract,parameters:result.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:{...nativeControlValues,...parameters},parentRevisionId,identityContract:{},preliminaryNeeds:result.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
  const saved={id:parentRevisionId?'CONTROL_UNSAVED_GROUND_AMENDED':'CONTROL_UNSAVED_GROUND_INITIAL',release_id:releaseId,definition_version_id:definitionVersionId,catalog_id:source.catalogId,checksum_sha256:checksum,row_count:result.rows.length,input_parameters:result.parameters,amendment_contract:{parameterSources:commit.parameterSources}};
  return JSON.parse(JSON.stringify({saved,resources:[...result.rows,...canonicalArtifactPreliminaryNeeds(saved)]})) as {saved:typeof saved;resources:Record<string,unknown>[]};
 };
 test('preserves native6 and all63 identities owners and true original source snapshots while replacing only2unbound frozen runtime quantities',()=>{
  const p=controlParent(),d=groundingSystemCurrentForwardR867(p),m=groundingSystemIndependentCompositionR867(),request=groundingSystemOrdinaryMaterializerInputR867(p);
  expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([38,97,97]);
  for(const old of p.body.parameters)expect(d.parameters.some(p=>p.parameter_id===old.parameter_id&&p.ordinal===old.ordinal)).toBe(true);
  for(const r of p.body.resources)expect(d.resources.find(x=>x.row_id===r.row_id)).toMatchObject({id:r.id,ordinal:r.ordinal,unit_id:r.unit_id,formula_id:r.formula_id,cost_owner_id:r.cost_owner_id});
  for(const f of p.body.formulas){const b=source.retainedUnboundBindings.find(b=>b.formulaId===f.formula_id),current=d.formulas.find(x=>x.formula_id===f.formula_id)!;
   if(!b){expect(current).toEqual(f);continue;}
   expect(JSON.parse(b.originalFormulaRawJson)).toEqual(b.originalFormula);expect(b.originalFormula).toMatchObject({ast:f.ast,expression_source:f.expression_source,input_parameter_ids:[]});
   expect(JSON.parse(b.originalResourceRawJson)).toMatchObject({row_id:b.rowId,unit_id:b.unitId,cost_owner_id:b.costOwnerId,source_metadata:b.originalSourceMetadata});
   expect(current).toMatchObject({formula_id:b.formulaId,output_unit_id:b.unitId,expression_source:b.parameterId,ast:{kind:'parameter',id:b.parameterId},input_parameter_ids:[b.parameterId]});
   expect(d.parameters.find(p=>p.parameter_id===b.parameterId)).toMatchObject({default_value:null,unit_id:b.unitId,truth_metadata:{visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}});
  }
  expect(m.operationRoster.filter(o=>o.processRole==='PROCESS')).toHaveLength(20);expect(m.operationRequirements.flatMap(o=>Object.values(o.requirements))).toHaveLength(200);
  expect(m.operationRequirements.every(o=>Object.values(o.requirements).every(r=>r.status==='UNRESOLVED'&&r.rowIds.length===0))).toBe(true);
  expect(validateIndependentCompletenessMapReferences({completenessMap:m,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,requireOperationBindings:true})).toEqual([]);
  expect(request.sourceRegistryAdmission).toBeNull();expect(request.currentRegistryRows).toEqual({bindings:0,locators:0,sources:0,newSource:0});
 });
 test.each([1,3])('uses four manual modules and three installed sleeves at actual assembly N=%i without treating supplied fourth sleeve as installed stock or another purchase',async n=>{
  const r=await run(demo(n,1,1,1)),d=groundingSystemCurrentForwardR867(controlParent());
  expect(r.rows.find(x=>x.row_id===source.prefix+':manual-rods')?.quantity).toBe(String(4*n));
  expect(r.rows.find(x=>x.row_id===source.prefix+':manual-applied-sleeves')?.quantity).toBe(String(3*n));
  expect(r.rows.find(x=>x.row_id===source.prefix+':manual-electrode-clamp')?.quantity).toBe(String(n));
  expect(r.rows.find(x=>x.row_id===source.prefix+':manual-passport-sleeve-count')?.quantity).toBe(String(4*n));
  expect(r.rows.find(x=>x.row_id===source.prefix+':manual-unapplied-sleeve-reference')).toMatchObject({quantity:String(n),included_in_estimate:false,included_in_procurement:false});
  for(const p of source.manualAppliedParts)expect(d.resources.find(x=>x.row_id===source.prefix+':'+p.key)).toMatchObject({cost_owner_id:source.primaryExistingGroundingCostOwner,resource_graph:{parentCostOwnerId:source.primaryExistingGroundingRowId},source_metadata:{priceCoverageAuthenticated:false,actualInstallationOrTestsProved:false}});
  expect(r.preliminaryNeeds.filter(x=>source.legacySourceRows.some(old=>old.row_id===x.row_id))).toHaveLength(63);
 });
 test('uses whole documented manual tool inventory independently of electrodes and never infers wrench size torque labour or one post',async()=>{
  const r=await run(demo(3,2,1,1));expect(r.rows.find(x=>x.row_id===source.prefix+':manual-driving-pin')?.quantity).toBe('2');
  expect(r.rows.find(x=>x.row_id===source.prefix+':manual-impact-tool')?.quantity).toBe('2');expect(r.rows.find(x=>x.row_id===source.prefix+':manual-spanners')?.quantity).toBe('4');
  const d=groundingSystemCurrentForwardR867(controlParent());expect(d.parameters.find(p=>p.parameter_id===source.toolCountId)?.default_value).toBeNull();
  for(const p of source.manualOwnedToolParts)expect(d.resources.find(x=>x.row_id===source.prefix+':'+p.key)).toMatchObject({cost_owner_id:null,resource_graph:{physicalProvisionV1:{sharedOwnerId:source.ownedToolOwnerId,newPurchaseClaimed:false,rentalDurationClaimed:false}}});
 });
 test('uses the whole exact earth tester and matched absence equipment with all18components from documented K not electrode count',async()=>{
  const r=await run(demo(3,1,2,1));let count=0;
  for(const p of source.ownedTestKitParts){const expected=2*p.multiplier;count+=expected;expect(r.rows.find(x=>x.row_id===source.prefix+':'+p.key)).toMatchObject({quantity:String(expected),unit_id:'pcs',included_in_estimate:false,included_in_procurement:false});}
  expect(count).toBe(66);expect(r.rows.find(x=>x.row_id===source.prefix+':earth-kit-stakes')?.quantity).toBe('8');
  expect(r.rows.find(x=>x.row_id===source.prefix+':earth-kit-tester')?.quantity).toBe('2');
  expect(r.rows.find(x=>x.row_id===source.prefix+':absence-voltage-indicator')?.quantity).toBe('2');
  expect(r.rows.find(x=>x.row_id===source.prefix+':absence-proving-batteries')?.quantity).toBe('12');
  const d=groundingSystemCurrentForwardR867(controlParent()),ops=(id:string)=>{const ref=d.resources.find(x=>x.row_id===source.prefix+':'+id)!.resource_graph.operationCompositionV1 as {operationId:string,additionalOperations?:{operationId:string}[]};return [ref.operationId,...(ref.additionalOperations??[]).map(o=>o.operationId)];};
  for(const id of ['earth-kit-sensing-clamp','earth-kit-inducing-clamp']){expect(ops(id)).not.toContain(source.prefix+':earth-test');expect(ops(id)).toEqual(expect.arrayContaining(['receive','logistics','tools','clean'].map(k=>source.prefix+':'+k)));}
  for(const p of [...source.manualOwnedToolParts,...source.ownedTestKitParts])expect(ops(p.key)).toEqual(expect.arrayContaining(['receive','logistics','clean'].map(k=>source.prefix+':'+k)));
  const observed={...demo(3,1,2,1),[source.renewalParts[0]!.countId]:3,[source.renewalParts[1]!.countId]:2,[source.renewalRecordId]:'EXPLICIT_DEMO_SERIALS_FULL_NEW_ALKALINE_REPLACEMENT_EVENTS_NOT_RECHARGE_NOT_ACTUAL'},renewed=await run(observed);
  expect(renewed.rows.find(x=>x.row_id===source.prefix+':'+source.renewalParts[0]!.key)?.quantity).toBe('18');expect(renewed.rows.find(x=>x.row_id===source.prefix+':'+source.renewalParts[1]!.key)?.quantity).toBe('12');
  expect(renewed.rows.find(x=>x.row_id===source.prefix+':earth-kit-batteries')?.quantity).toBe('12');
  for(const part of source.renewalParts)expect(d.resources.find(x=>x.row_id===source.prefix+':'+part.key)).toMatchObject({cost_owner_id:null,procurement_eligible:false,resource_graph:{physicalProvisionV1:{sharedOwnerId:source.ownedTestOwnerId,initialKitInventoryIsNotThisConsumption:true,rechargeEventsExcluded:true}}});
  const numericUnknown={...observed} as Record<string,unknown>;delete numericUnknown[source.renewalParts[0]!.countId];expect((await run(numericUnknown)).preliminaryNeeds.find(x=>x.row_id===source.prefix+':'+source.renewalParts[0]!.key)).toMatchObject({need_state:'QUANTITY_REQUIRED',missing_parameter_ids:expect.arrayContaining([source.renewalParts[0]!.countId])});
  const noRecord={...observed} as Record<string,unknown>;delete noRecord[source.renewalRecordId];expect((await run(noRecord)).preliminaryNeeds.find(x=>x.row_id===source.prefix+':'+source.renewalParts[0]!.key)).toMatchObject({need_state:'CONDITION_REQUIRED',missing_parameter_ids:expect.arrayContaining([source.renewalRecordId])});
  await expect(run({...observed,[source.renewalRecordId]:''})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  for(const value of [-1,1.5])await expect(run({...observed,[source.renewalParts[0]!.countId]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 test.each([3,5,10])('uses only the selected nominal%im factory terminated conductor at independent actual C without inferring route length or duplicating the lug',async length=>{
  const profile=source.conductorProfiles.find(p=>p.nominalLengthM===length)!,r=await run({...demo(3,1,1,2),[source.conductorProfileId]:profile.value});
  expect(r.rows.find(x=>x.row_id===source.prefix+':preterminated-cu25-'+length+'m')?.quantity).toBe('2');
  expect(r.rows.filter(x=>String(x.row_id).startsWith(source.prefix+':preterminated-cu25-'))).toHaveLength(1);
  const d=groundingSystemCurrentForwardR867(controlParent());expect(d.resources.find(x=>x.row_id===source.prefix+':preterminated-cu25-'+length+'m')).toMatchObject({cost_owner_id:source.primaryExistingGroundingCostOwner,procurement_eligible:false,resource_graph:{parentCostOwnerId:source.primaryExistingGroundingRowId},source_metadata:{priceCoverageAuthenticated:false}});
  expect(source.conductorSourceBoundary).toContain('±5percent');
 });
 test('calculates only accepted rectangular excavation geometry and does not pay a second excavation for ready trench or turn volume into backfill transport labour',async()=>{
  const p={...demo(),[source.rectScopeId]:source.rectNew,[source.rectLengthId]:1.2,[source.rectWidthId]:0.3,[source.rectDepthId]:0.5,[source.rectDocumentId]:'EXPLICIT_DEMO_ACCEPTED_RECTANGULAR_LIMITS_AND_SAFE_METHOD_NOT_ACTUAL'},r=await run(p);
  expect(r.rows.find(x=>x.row_id===source.prefix+':rectangular-excavation-volume-detail')).toMatchObject({quantity:'0.18',unit_id:'m3',included_in_estimate:false,included_in_procurement:false});
  const ready=await run(demo());expect(ready.rows.some(x=>x.row_id===source.prefix+':rectangular-excavation-volume-detail')).toBe(false);
  await expect(run({...p,[source.rectWidthId]:-1})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  const missing={...p} as Record<string,unknown>;delete missing[source.rectWidthId];const u=await run(missing);expect(u.preliminaryNeeds.find(x=>x.row_id===source.prefix+':rectangular-excavation-volume-detail')?.missing_parameter_ids).toContain(source.rectWidthId);
  const mass={...demo(),[source.measuredWaste.scopeId]:source.measuredWaste.pairedScope,[source.measuredWaste.grossId]:125,[source.measuredWaste.tareId]:100,[source.measuredWaste.recordId]:'EXPLICIT_DEMO_SAME_BATCH_TARE_SCALE_PRECISION_AND_ACCEPTED_CALCULATED_DIFFERENCE_NOT_ACTUAL'};
  const batch=await run(mass),id=source.prefix+':'+source.measuredWaste.key;expect(batch.rows.find(x=>x.row_id===id)).toMatchObject({quantity:'25',unit_id:'kg',included_in_estimate:false,included_in_procurement:false});
  const zero=await run({...mass,[source.measuredWaste.grossId]:100});expect(zero.rows.find(x=>x.row_id===id)).toMatchObject({quantity:'0',included_in_estimate:false,included_in_procurement:false});
  const small=await run({...mass,[source.measuredWaste.grossId]:100.125});expect(small.rows.find(x=>x.row_id===id)?.quantity).toBe('0.125');
  expect(ready.rows.some(x=>x.row_id===id)).toBe(false);await expect(run({...mass,[source.measuredWaste.grossId]:99})).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
  await expect(run({...mass,[source.measuredWaste.tareId]:-1})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  const noTare={...mass} as Record<string,unknown>;delete noTare[source.measuredWaste.tareId];const unknown=await run(noTare);expect(unknown.preliminaryNeeds.find(x=>x.row_id===id)).toMatchObject({need_state:'QUANTITY_REQUIRED',missing_parameter_ids:expect.arrayContaining([source.measuredWaste.tareId])});
  const noWeights={...noTare};delete noWeights[source.measuredWaste.grossId];const bothUnknown=await run(noWeights);expect(bothUnknown.preliminaryNeeds.find(x=>x.row_id===id)).toMatchObject({need_state:'QUANTITY_REQUIRED',missing_parameter_ids:expect.arrayContaining([source.measuredWaste.grossId,source.measuredWaste.tareId])});
  const d=groundingSystemCurrentForwardR867(controlParent());for(const pid of [source.measuredWaste.grossId,source.measuredWaste.tareId])expect(d.parameters.find(p=>p.parameter_id===pid)?.constraints_json).not.toHaveProperty('greaterThanOrEqualParameter');
  expect(d.resources.find(x=>x.row_id===id)?.resource_graph.formulaOutputBoundsV1).toMatchObject({schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg',minimum:0});
 });
 test('holds actual system and measurement application even when quantities are known and omitted text differs from invalid empty input',async()=>{
  const p={...demo()} as Record<string,unknown>;for(const id of [source.actualProjectId,source.actualFitId,source.testProgramId,source.testTopologyId])delete p[id];
  const r=await run(p);expect(r.preliminaryNeeds.find(x=>x.row_id===source.prefix+':manual-rods')?.missing_parameter_ids).toEqual(expect.arrayContaining([source.actualProjectId,source.actualFitId]));
  expect(r.preliminaryNeeds.find(x=>x.row_id===source.prefix+':earth-kit-tester')?.missing_parameter_ids).toEqual(expect.arrayContaining([source.actualProjectId,source.actualFitId,source.testProgramId,source.testTopologyId]));
  await expect(run({...demo(),[source.actualProjectId]:''})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('refuses incompatible threaded source and unsupported test topology instead of borrowing a driving tool soil norm stakeless loop or166x earth method',async()=>{
  for(const value of ['D14_THREADED_ZZ6S','D14_THREADED_ZZ6T','ANY_ROD_ANY_SOIL'])await expect(run({...demo(),[source.profileId]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  for(const value of ['STAKELSS_ISOLATED_SINGLE_ELECTRODE','1662_EARTH_RESISTANCE','1663_ASSUMED_EQUIVALENT'])await expect(run({...demo(),[source.testMethodId]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  await expect(run({...demo(),[source.testTopologyId]:'CLOSED_LOOP_ASSUMED_WITHOUT_ACTUAL_TOPOLOGY'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  await expect(run({...demo(),[source.measuredWaste.scopeId]:'WASTE_FROM_LWD_TIMES_ASSUMED_DENSITY'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  for(const value of [0,-1,1.5])await expect(run({...demo(),[source.assemblyCountId]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('keeps true source quantities protected and does not turn exact50percent corrosion method into an invented tape consumption norm',async()=>{
  const d=groundingSystemCurrentForwardR867(controlParent()),p={...demo(),[source.corrosionMethodId]:source.ksbMethod},r=await run(p),id=source.prefix+':connection-corrosion-tape';
  expect(r.preliminaryNeeds.find(x=>x.row_id===id)?.missing_parameter_ids).toContain(source.corrosionQuantityId);
  expect(d.resources.find(x=>x.row_id===id)?.source_metadata?.exactSourceFacts).toMatchObject({spiralOverlapFraction:0.5,cleanDryGreaseFree:true,exactProfile557130:true,consumptionNormClaimed:false});
  for(const id of [source.legacyGateId,source.corrosionQuantityId,...source.retainedUnboundBindings.map(b=>b.parameterId)])await expect(run({...p,[id]:id===source.legacyGateId?source.legacyGateValue:1})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED',message:'unresolved application norm cannot be supplied '+id});
 });
 test('allows explicit manual preliminary amounts while preserving unknown mandatory protection condition and legacy source needs',async()=>{
  const p={...demo(),[source.corrosionMethodId]:source.ksbMethod} as Record<string,unknown>;delete p[source.corrosionDocumentId];const id=source.prefix+':connection-corrosion-tape';
  const r=await run(p,{[id]:{quantity:'2',provenance:{kind:'manual',reason:'CONTROL_ACTUAL_AMOUNT_NOT_SOURCE_NORM_OR_APPROVED_PROTECTION_NODE'}}});
  expect(r.preliminaryNeeds.find(n=>n.row_id===id)).toMatchObject({quantity:'2',need_state:'CONDITION_REQUIRED',missing_parameter_ids:expect.arrayContaining([source.corrosionDocumentId]),calculation_trace:{manualQuantityOverride:true}});
  expect(r.preliminaryNeeds.filter(n=>source.legacySourceRows.some(old=>old.row_id===n.row_id))).toHaveLength(63);
 });
 test('blocks wrong current header owner ordinal formula AST or original source metadata and detects missing physical or foreign consumer bindings',()=>{
  const wrong=controlParent();wrong.header.definition_sha256='e'.repeat(64);expect(()=>groundingSystemCurrentForwardR867(wrong)).toThrow('GROUNDING_EXACT_CURRENT_R867_REQUIRED');
  const parameter=controlParent();parameter.body.parameters[0].parameter_id='FOREIGN_PARAMETER';expect(()=>groundingSystemCurrentForwardR867(parameter)).toThrow('GROUNDING_CURRENT_PARAMETER_DRIFT');
  const owner=controlParent();owner.body.resources[0].cost_owner_id='FOREIGN';expect(()=>groundingSystemCurrentForwardR867(owner)).toThrow('GROUNDING_CURRENT_ROW_DRIFT');
  const ordinal=controlParent();ordinal.body.resources[0].ordinal=999;expect(()=>groundingSystemCurrentForwardR867(ordinal)).toThrow('GROUNDING_CURRENT_ROW_DRIFT');
  const changed=controlParent(),binding=source.retainedUnboundBindings[0]!,changedFormula=changed.body.formulas.find(f=>f.formula_id===binding.formulaId)!;
  const capturedAst=JSON.parse(JSON.stringify(changedFormula.ast));
  expect(capturedAst).toEqual(binding.originalFormula.ast);
  changedFormula.ast={kind:'binary',operator:'+',left:capturedAst,right:{kind:'literal',value:'1'}};
  expect(changedFormula.ast).not.toEqual(capturedAst);
  expect(()=>groundingSystemCurrentForwardR867(changed)).toThrow('GROUNDING_CURRENT_FORMULA_DRIFT:'+binding.formulaId);
  const ordinaryAst=controlParent();ordinaryAst.body.formulas.find(f=>!source.retainedUnboundBindings.some(b=>b.formulaId===f.formula_id))!.ast={kind:'literal',value:'123456'};expect(()=>groundingSystemCurrentForwardR867(ordinaryAst)).toThrow('GROUNDING_CURRENT_FORMULA_DRIFT');
  const metadata=controlParent();const resource=metadata.body.resources.find(r=>r.row_id===binding.rowId)!;resource.source_metadata={...resource.source_metadata,originalQuantityFormula:'FOREIGN_SOURCE_AS_IF_CURRENT'};expect(()=>groundingSystemCurrentForwardR867(metadata)).toThrow('GROUNDING_CURRENT_ROW_SOURCE_DRIFT');
  const ordinaryMetadata=controlParent();const ordinaryResource=ordinaryMetadata.body.resources.find(r=>!source.retainedUnboundBindings.some(b=>b.rowId===r.row_id))!;ordinaryResource.source_metadata={...ordinaryResource.source_metadata,originalQuantityFormula:'FOREIGN_NONFROZEN_SOURCE'};expect(()=>groundingSystemCurrentForwardR867(ordinaryMetadata)).toThrow('GROUNDING_CURRENT_ROW_SOURCE_DRIFT');
  const d=groundingSystemCurrentForwardR867(controlParent()),m=groundingSystemIndependentCompositionR867(),id=source.prefix+':manual-applied-sleeves';
  const check=(resources:typeof d.resources)=>validateIndependentCompletenessMapReferences({completenessMap:m,formulaDefinitions:d.formulas,resourceDefinitions:resources,requireOperationBindings:true});
  expect(check(d.resources.filter(r=>r.row_id!==id)).length).toBeGreaterThan(0);
  expect(check(d.resources.map(r=>r.row_id===id?{...r,resource_graph:{...r.resource_graph,parentCostOwnerId:'FOREIGN'}}:r)).length).toBeGreaterThan(0);
  expect(check(d.resources.map(r=>r.row_id===id?{...r,resource_graph:{...r.resource_graph,operationCompositionV1:{...source.legacyReference,contractVersion:'canonical-operation-resource/v1'}}}:r)).length).toBeGreaterThan(0);
 });
 test('preserves source and fullsystem HOLD across Core commit cold projection manual exclusion and saved common controls without duplicating shared cost or procurement',async()=>{
  const p=demo(),r=await run(p),saved=projectSaved(r,p),before=JSON.stringify(saved),gate=canonicalEstimateSavedOperationAcceptanceV1({revision:saved.saved,resources:saved.resources});
  expect(gate.pdfAllowed).toBe(false);expect(gate.completeClaimAllowed).toBe(false);expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(gate)).toThrow(expect.objectContaining({httpStatus:409}));expect(JSON.stringify(saved)).toBe(before);
  expect(r.rows.filter(x=>x.included_in_estimate||x.included_in_procurement)).toEqual([]);
  const id=source.primaryExistingGroundingRowId,amended=await run(p,{[id]:{quantity:'0',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual',reason:'CONTROL_EXCLUSION_NOT_ACCEPTED_SYSTEM_SOURCE_OR_RESULTS'}}}),reopened=projectSaved(amended,p,saved.saved.id);
  expect(reopened.saved.amendment_contract.parameterSources).toMatchObject({parentRevisionId:saved.saved.id});expect(canonicalEstimateSavedOperationAcceptanceV1({revision:reopened.saved,resources:reopened.resources}).pdfAllowed).toBe(false);
  const mass={...p,[source.measuredWaste.scopeId]:source.measuredWaste.pairedScope,[source.measuredWaste.grossId]:125,[source.measuredWaste.tareId]:100,[source.measuredWaste.recordId]:'EXPLICIT_DEMO_COMPARABLE_SAME_BATCH_PAIR_NOT_ACTUAL'},batch=await run(mass),batchSaved=projectSaved(batch,mass),d=groundingSystemCurrentForwardR867(controlParent()),wid=source.prefix+':'+source.measuredWaste.key;
  expect(d.resources.find(x=>x.row_id===wid)).toMatchObject({cost_owner_id:null,procurement_eligible:false,resource_graph:{physicalProvisionV1:{sharedOwnerId:source.measuredWaste.ownerId,serviceCostBoundary:'UNRESOLVED_INCLUDED_VERSUS_SEPARATE_NOT_PAID_TWICE',quantityDoesNotAdmitPriceOrService:true}}});
  expect(batch.rows.filter(x=>x.included_in_estimate||x.included_in_procurement)).toEqual([]);expect(canonicalEstimateSavedOperationAcceptanceV1({revision:batchSaved.saved,resources:batchSaved.resources}).pdfAllowed).toBe(false);
  const noRecord={...mass} as Record<string,unknown>;delete noRecord[source.measuredWaste.recordId];const manual=await run(noRecord,{[wid]:{quantity:'99',provenance:{kind:'manual',reason:'CONTROL_MANUAL_MASS_NOT_WEIGHING_RECORD_OR_SERVICE_ADMISSION'}}});
  await expect(run({...mass,[source.measuredWaste.recordId]:''})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  expect(manual.preliminaryNeeds.find(x=>x.row_id===wid)).toMatchObject({quantity:'99',need_state:'CONDITION_REQUIRED',missing_parameter_ids:expect.arrayContaining([source.measuredWaste.recordId]),calculation_trace:{manualQuantityOverride:true}});
  const manualSaved=projectSaved(manual,noRecord,batchSaved.saved.id);expect(canonicalEstimateSavedOperationAcceptanceV1({revision:manualSaved.saved,resources:manualSaved.resources}).pdfAllowed).toBe(false);
  const noBasis={...p} as Record<string,unknown>;delete noBasis[source.measuredWaste.scopeId];const missing=await run(noBasis);expect(missing.preliminaryNeeds.find(x=>x.row_id===wid)?.missing_parameter_ids).toContain(source.measuredWaste.scopeId);
  const unknownSaved=projectSaved(missing,noBasis);expect(canonicalEstimateSavedOperationAcceptanceV1({revision:unknownSaved.saved,resources:unknownSaved.resources}).pdfAllowed).toBe(false);expect(JSON.stringify(unknownSaved)).toContain(source.measuredWaste.scopeId);
  const power={...p,[source.renewalParts[0]!.countId]:3,[source.renewalParts[1]!.countId]:2,[source.renewalRecordId]:'EXPLICIT_DEMO_DOCUMENTED_FULL_NEW_ALKALINE_EVENTS_NOT_ACTUAL'},powerResult=await run(power),powerSaved=projectSaved(powerResult,power);
  for(const part of source.renewalParts)expect(powerSaved.resources.find(x=>x.row_id===source.prefix+':'+part.key)).toMatchObject({included_in_estimate:false,included_in_procurement:false});
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:powerSaved.saved,resources:powerSaved.resources}).pdfAllowed).toBe(false);expect(powerResult.preliminaryNeeds.filter(x=>source.legacySourceRows.some(old=>old.row_id===x.row_id))).toHaveLength(63);
  expect(outdoorAuditPublisher({resourceDefinitions:groundingSystemCurrentForwardR867(controlParent()).resources,independentComposition:groundingSystemIndependentCompositionR867()}).definitionAdmissionAllowed).toBe(false);
 });
});
