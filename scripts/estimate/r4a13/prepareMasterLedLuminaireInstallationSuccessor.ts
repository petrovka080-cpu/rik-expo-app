import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LED_SURFACE_WHOLE_SOURCE_R1, LED_SURFACE_WHOLE_SOURCE_SHA_R1, LED_SURFACE_FACTORY_DEMO_R1,
  ledSurfaceWholeDefinitionR1, ledSurfaceWholeCompletenessR1, ledSurfaceFactoryComponentRowIdsR1,
  LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
  LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  LED_LUMINAIRE_INSTALLATION_FORMULAS,
  LED_LUMINAIRE_INSTALLATION_NORM_ID,
  LED_LUMINAIRE_INSTALLATION_PARAMETERS,
  LED_LUMINAIRE_INSTALLATION_RESOURCES,
  LED_LUMINAIRE_INSTALLATION_RUNTIME_CLASSIFICATION,
  LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT,
  LED_LUMINAIRE_INSTALLATION_RUNTIME_SOURCE_IDS,
  LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
  LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA,
  compileLedLuminaireInstallationR1,
} from "../../../src/lib/estimate/v4/ledLuminaireInstallationR1";
import { runMasterSingleDefinitionSuccessorR1, readMasterSuccessorTargetPreimageR1, validateIndependentCompletenessMapReferences, type MasterSingleDefinitionSuccessorConfig } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
import type {AutomaticOwnerDefinition} from "../../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import {canonicalEstimateStableJson} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";

function quantity(
  result: Awaited<ReturnType<typeof compileLedLuminaireInstallationR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

export async function verifyLedSurfaceWholeCoreR1():Promise<Json>{
 const d=ledSurfaceWholeDefinitionR1(),map=ledSurfaceWholeCompletenessR1();
 const check=(ok:unknown,code:string)=>{if(!ok)throw Error('STOP_LED_SURFACE_WHOLE_SOURCE:'+code);};
 check([d.parameters.length,d.formulas.length,d.resources.length].join(':')==='35:29:29','SHAPE');
 check(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,requireOperationBindings:true}).length===0,'INDEPENDENT_REFERENCES');
 const short=await compileLedLuminaireInstallationR1({...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT});
 for(const id of ledSurfaceFactoryComponentRowIdsR1)check(short.preliminaryNeeds.some(n=>n.row_id===id),'UNCONFIRMED_FACTORY_SOURCE:'+id);
 const demo=await compileLedLuminaireInstallationR1({...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,...LED_SURFACE_FACTORY_DEMO_R1,luminaire_count:3});
 for(const c of LED_SURFACE_WHOLE_SOURCE_R1.factoryComponents)check(quantity(demo,LED_SURFACE_WHOLE_SOURCE_R1.prefix+':'+c.key)===String(c.countPerLuminaire*3),'FACTORY_CONSUMPTION:'+c.key);
 check(!demo.rows.some(r=>r.row_id==='rc09:luminaire_mounting_anchor_set'),'NO_DUPLICATE_FACTORY_ANCHORS');
 check(demo.preliminaryNeeds.length>0,'DEMO_IS_NOT_COMPLETE_PROJECT');
 return {status:'SOURCE_CASES_ONLY_NOT_RUNTIME_PUBLISHER_OR_FULL',shape:[35,29,29],operations:14,independentUnresolvedClassDeclarations:140,
  sourceSha256:LED_SURFACE_WHOLE_SOURCE_SHA_R1,actualObjectFactsAuthenticated:false,fullTechnicalAcceptance:false,acceptedCompleteTypes:0};
}
/** Existing ordinary writer config. ROOT supplies the exact whole current body
 * and bounded preimage from its existing reader; no source arrays masquerade as
 * a fresh target, and no registry/source admission is fabricated here. */
export function ledSurfaceInstallationConfigR1(parent:{releaseId:string;searchReleaseId:string;
 currentBody:Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>;expectedPreimage:{header:Json;sets:Json}}):MasterSingleDefinitionSuccessorConfig{
 const d=ledSurfaceWholeDefinitionR1(parent.currentBody),expected=parent.expectedPreimage,source=LED_SURFACE_WHOLE_SOURCE_R1;
 if(expected.header.definition_version_id!==source.currentParent.definitionVersionId
  ||expected.header.definition_sha256!==source.currentParent.definitionSha256||Object.keys(expected.sets).length!==10)
  throw Error('LED_SURFACE_ACTUAL_R830_PREIMAGE_REQUIRED');
 return {

  contract: "rik-expo-app.s27-23.led-luminaire-installation-balanced-successor.v1",
  stopCode: "S27_23_LED_LUMINAIRE_INSTALLATION_BALANCED",
  applicationName: "s27-23-led-luminaire-installation-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_24_2026-10-27.txt"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "92c04a456ecd85afcc699e7da5e6cf97114db1a74019fd203f1816c2b81ca08f",
  parentReleaseId: parent.releaseId,
  parentSearchReleaseId: parent.searchReleaseId,
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-23/led-luminaire-installation-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/led-luminaire-installation-balanced-s27-23.json",
    "src/lib/estimate/v4/ledLuminaireInstallationR1.ts",
    "tests/estimateNorms/ledLuminaireInstallationR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterLedLuminaireInstallationSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2723LedLuminaireInstallationIndependent.ts",
  ],
  catalogId: LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  sourceId: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
  normId: LED_LUMINAIRE_INSTALLATION_NORM_ID,
  sourceMetadata: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA,
  parameterDefinitions: d.parameters,
  formulaDefinitions: d.formulas,
  resourceDefinitions: d.resources,
  shortInput: LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  acceptanceInput: LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
  runtimeProfileInput: LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT,
  runtimeProfileClassification: LED_LUMINAIRE_INSTALLATION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: LED_LUMINAIRE_INSTALLATION_RUNTIME_SOURCE_IDS,
  verifyCore:verifyLedSurfaceWholeCoreR1,
  verifyTargetPrecondition:async(client,phase)=>{
   const current=await readMasterSuccessorTargetPreimageR1(client,{releaseId:parent.releaseId,catalogId:LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
    sourceId:LED_LUMINAIRE_INSTALLATION_SOURCE_ID,lock:phase==='LOCKED_BEFORE'});
   if(canonicalEstimateStableJson({header:current.header,sets:current.sets})!==canonicalEstimateStableJson(expected))
    throw Error('LED_SURFACE_ACTUAL_PARENT_DRIFT:'+phase);
  },
  expectedParentShape: [31, 23, 23],
  benchmarkOrdinal: 23,
  validationScenario: "MASTER_BENCHMARK_23_LED_LUMINAIRE_INSTALLATION",
  passport: {
    canonicalRuName: "Монтаж накладного светодиодного светильника 36 Вт IP40",
    workKey: "electrical_interior_lighting_install_standard",
    physicalResultRu: "Цикл монтажа точных накладных36ВтIP40 представлен по операциям. Фактические основание, соединения, снабжение, испытания и результаты должны быть подтверждены отдельно; готовность объекта не заявлена.",
    independentCompletenessMap:ledSurfaceWholeCompletenessR1(),
    includedScopeRu: ["монтаж известного количества точных светильников",
      "видимый баланс установленных светильников, резерва, упаковки, заказа и остатка",
      "крепёж только по основанию и узлу монтажа",
      "соединители, провод и PE-наконечники только по схеме подключения",
      "труд, монтажное и измерительное оборудование только по ППР и программе QA",
      "доставка и вывоз отходов только по проектному плану логистики",
      "отдельный драйвер и потолочный адаптер только по условным ветвям"],
    excludedScopeRu: ["кабельная линия освещения", "выключатели", "распределительный щит",
      "автоматические поштучные и погонные нормы", "неподтверждённые цены"],
  },
  applicability: { country: "KG", sourceOnlyUnrun:true,fullTechnicalAcceptance:false,acceptedCompleteTypes:0,
    actualProjectAuthenticated:false,manufacturerBOMNotInstallationNorm:true,wholeCycleSourceSha256:LED_SURFACE_WHOLE_SOURCE_SHA_R1, operationClass: "INSTALL_LED_LUMINAIRE",
    materialSystem: "SURFACE_LED_36W_IP40", primaryMeasureParameterId: "luminaire_count",
    geometryParameters: ["luminaire_count"],
    knownScopeParameters: ["rated_power", "ingress_protection", "mounting_type"],
    visibleProcurementBalance: true,
    projectScheduleRequiredForLaborMachineryAccessoriesAccessAndQa: true,
    conditionalScopeFailClosed: true, universalProductivityClaimed: false,
    universalConsumptionClaimed: false, lightingCableLineExcluded: true,
    lightSwitchExcluded: true, distributionBoardExcluded: true },
  binding: { rowId: "rc09:led_luminaire_install", applicability: {
    technology_class: "LED_LUMINAIRE_INSTALLATION",
    operation_class: "INSTALL_LED_LUMINAIRE", material_system: "SURFACE_LED_36W_IP40",
    scope_mode: "KNOWN_COUNT_PLUS_VISIBLE_PROCUREMENT_BALANCE_AND_PROJECT_RESOURCE_SCHEDULE",
    source_id: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
    norm_id: LED_LUMINAIRE_INSTALLATION_NORM_ID,
    exact_locator: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_linear_rates_claimed: false,
    quantity_basis: "NET_INSTALLED_COUNT_PLUS_VISIBLE_SPARE_PACKAGING_AND_APPROVED_PROJECT_RESOURCES" } },
  locator: { key: "led-luminaire-installation-krerm-project-balance-s27-23-v2", payload: {
    kind: "OFFICIAL_GUIDANCE_AND_PROJECT_DOCUMENT_PACKAGE_REQUIRED",
    exactLocator: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.exact_locator,
    geometryInputs: ["luminaire_count"],
    knownScopeInputs: ["rated_power", "ingress_protection", "mounting_type"],
    officialGuidanceArtifactSha256: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.artifact_sha256,
    visiblePreliminaryBalanceInputs: Object.keys(LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT),
    wholeCycleSourceSha256:LED_SURFACE_WHOLE_SOURCE_SHA_R1,
    factoryRevisionFacts:[source.factoryProfileId,source.factoryDocumentId,source.factoryFitId,source.additionalMountingId],
    manufacturerFactorySourceEvidence:source.sources,returnWhen:source.returnWhen,
    directProjectInputs: ["anchor_set_designation", "anchor_set_quantity_set",
      "terminal_connector_designation", "terminal_connector_quantity_piece",
      "connection_wire_designation", "connection_wire_length_m", "pe_lug_designation",
      "pe_lug_quantity_piece", "work_platform_designation", "work_platform_shift",
      "pe_test_designation", "pe_test_count", "luminaire_installation_labor_h",
      "luminaire_testing_labor_h", "luminaire_drilling_tool_machine_h",
      "luminaire_installation_tool_machine_h", "luminaire_tester_machine_h",
      "luminaire_delivery_trip_count", "luminaire_waste_removal_trip_count"],
    conditionalInputs: ["separate_driver_mode", "separate_driver_designation",
      "separate_driver_quantity_piece", "ceiling_adapter_mode", "ceiling_adapter_designation",
      "ceiling_adapter_quantity_set"] } },
  search: { primaryUom: "pcs",
    canonicalNameRu: "Монтаж накладного светодиодного светильника 36 Вт IP40",
    aliases: ["монтаж LED светильника 36 Вт IP40", "установка накладного светильника",
      "подключение светодиодного светильника", "surface LED luminaire installation"],
    shortScopeRu: "Монтаж накладных LED-светильников36ВтIP40 по фактической ведомости. Штатный комплект точной ревизии показан отдельно; основание, соединения, инструмент, труд, логистика и контроль требуют применимых источников и фактов.",
    keyDistinguishingParameters: ["luminaire_count", "rated_power", "ingress_protection",
      "mounting_type"],
    clarificationFields: [source.factoryProfileId,source.factoryDocumentId,source.factoryFitId,source.additionalMountingId,"luminaire_retained_spare_piece",
      "luminaire_supplier_pack_size_piece", "anchor_set_designation", "anchor_set_quantity_set",
      "terminal_connector_designation", "terminal_connector_quantity_piece",
      "connection_wire_designation", "connection_wire_length_m", "pe_lug_quantity_piece",
      "work_platform_shift", "pe_test_count", "luminaire_installation_labor_h",
      "luminaire_testing_labor_h", "luminaire_drilling_tool_machine_h",
      "luminaire_installation_tool_machine_h", "luminaire_tester_machine_h",
      "luminaire_delivery_trip_count", "luminaire_waste_removal_trip_count",
      "separate_driver_mode", "ceiling_adapter_mode"],
    includedBoundaries: ["операция и точные светильники по известному количеству",
      "видимый баланс резерва, упаковки, заказа и остатка",
      "крепёж по основанию и узлу", "соединители, провод и PE-наконечники по схеме",
      "труд, средство доступа, инструмент и проверки по ППР и QA",
      "логистика по проектному плану", "условные драйвер и потолочный адаптер"],
    excludedBoundaries: ["кабельная линия освещения", "выключатели",
      "распределительный щит", "неподтверждённые цены"],
    extraSearchTermsRu: "LED светильник 36 Вт IP40 накладной резерв упаковка заказ остаток труд анкер клемма провод 3×1,5 PE наконечник вышка инструмент проверка доставка драйвер потолочный адаптер",
    sourceProvenance: { exactSurfaceLed36wIp40Owner: true,
      officialKrermGuidanceCaptured: true,
      visibleProcurementBalance: true,
      exactMountingConnectionAccessQaPackageRequiredForResourceQuantities: true } },
  forbiddenAdjacentMatchers: [/lighting.cable.line|кабельн.*лини.*освещен/iu,
    /light.switch|выключател/iu, /distribution.board|распределительн.*щит/iu],
  owner: "S27_23_LED_LUMINAIRE_INSTALLATION_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_23_LED_LUMINAIRE_INSTALLATION_BALANCED",
 };}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareMasterLedLuminaireInstallationSuccessor.ts')){
 // Same existing ordinary entrypoint; a reviewed R830 body is mandatory. ROOT
 // owns execution, fresh common source capture and all publication decisions.
 const path=process.env.R4A13_LED_TARGET_PARENT_PROOF_PATH;
 if(!path)throw Error('LED_SURFACE_EXISTING_READER_PROOF_PATH_REQUIRED');
 const bytes=readFileSync(resolve(path));
 if(createHash('sha256').update(bytes).digest('hex')!==LED_SURFACE_WHOLE_SOURCE_R1.currentParent.proofSha256)
  throw Error('LED_SURFACE_EXISTING_READER_PROOF_SHA_REQUIRED');
 const proof=JSON.parse(bytes.toString('utf8')),target=proof.results.find((r:Json)=>r.target.catalogId===LED_LUMINAIRE_INSTALLATION_CATALOG_ID);
 if(!target?.currentBody)throw Error('LED_SURFACE_WHOLE_CURRENT_BODY_REQUIRED');
 const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 void runMasterSingleDefinitionSuccessorR1(ledSurfaceInstallationConfigR1({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId,
  currentBody:target.currentBody,expectedPreimage:{header:target.current.header,sets:target.current.sets}})).catch((error:unknown)=>{
   process.stderr.write(`${error instanceof Error?error.stack??error.message:String(error)}\n`);process.exitCode=1;
  });
}

