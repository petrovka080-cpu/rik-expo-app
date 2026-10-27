import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  CCTV_SYSTEM_ACCEPTANCE_INPUT,
  CCTV_SYSTEM_CATALOG_ID,
  CCTV_SYSTEM_FORMULAS,
  CCTV_SYSTEM_NORM_ID,
  CCTV_SYSTEM_PARAMETERS,
  CCTV_SYSTEM_RESOURCES,
  CCTV_SYSTEM_RUNTIME_CLASSIFICATION,
  CCTV_SYSTEM_RUNTIME_INPUT,
  CCTV_SYSTEM_RUNTIME_SOURCE_IDS,
  CCTV_SYSTEM_SHORT_INPUT,
  CCTV_SYSTEM_SOURCE_ID,
  CCTV_SYSTEM_SOURCE_METADATA,
  compileCctvSystemR1,
} from "../../../src/lib/estimate/v4/cctvSystemR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileCctvSystemR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

const CONDITIONAL_INPUT = Object.freeze({
  video_analytics_mode: "REQUIRED",
  video_analytics_license_designation: "Лицензия аналитики по проекту",
  video_analytics_license_quantity_piece: 16,
  external_integration_mode: "REQUIRED",
  external_integration_gateway_designation: "Шлюз интеграции по архитектуре",
  external_integration_gateway_quantity_piece: 1,
});

async function verifyCore(): Promise<Json> {
  const first = await compileCctvSystemR1({ ...CCTV_SYSTEM_SHORT_INPUT });
  const complete = await compileCctvSystemR1({ ...CCTV_SYSTEM_ACCEPTANCE_INPUT });
  const balanced = await compileCctvSystemR1({
    ...CCTV_SYSTEM_ACCEPTANCE_INPUT,
    cctv_camera_retained_spare_piece: 2,
    cctv_camera_supplier_pack_size_piece: 10,
  });
  const conditional = await compileCctvSystemR1({
    ...CCTV_SYSTEM_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 11 && first.preliminaryNeeds.length === 22
    && quantity(first, "rc09:cctv_system_install_commission") === "1"
    && quantity(first, "rc09:cctv_ip_camera") === "16"
    && quantity(first, "rc09:cctv_nvr") === "1"
    && quantity(first, "rc09:cctv_camera_test") === "16")) {
    throw new Error("STOP_S27_24_CCTV_FIRST_ESTIMATE");
  }
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  for (const rowId of [
    "rc09:cctv_camera_mounting_bracket", "rc09:cctv_camera_junction_box",
    "rc09:cctv_network_cable", "rc09:cctv_patch_panel", "rc09:cctv_poe_switch",
    "rc09:cctv_storage_drive", "rc09:cctv_monitor", "rc09:cctv_termination",
    "rc09:cctv_label", "rc09:cctv_fastening", "rc09:cctv_consumable",
    "rc09:cctv_grounding_conductor", "rc09:cctv_test_report",
    "rc09:labor:cctv-camera-equipment-install",
    "rc09:labor:cctv-cabling-termination",
    "rc09:labor:cctv-configuration-commissioning",
    "rc09:equipment:cctv-lifting", "rc09:equipment:cctv-network-tester",
    "rc09:logistics:cctv-delivery", "rc09:logistics:cctv-packaging-removal",
    "rc09:cctv_video_analytics_license", "rc09:cctv_external_integration_gateway",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_CCTV_NEED:${rowId}`);
  if (!(complete.rows.length === 31 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:cctv_camera_mounting_bracket") === "16"
    && quantity(complete, "rc09:cctv_camera_junction_box") === "16"
    && quantity(complete, "rc09:cctv_network_cable") === "720"
    && quantity(complete, "rc09:cctv_poe_switch") === "1"
    && quantity(complete, "rc09:cctv_storage_drive") === "4"
    && quantity(complete, "rc09:cctv_termination") === "32"
    && quantity(complete, "rc09:labor:cctv-cabling-termination") === "96"
    && quantity(complete, "rc09:equipment:cctv-network-tester") === "20"
    && quantity(complete, "rc09:logistics:cctv-delivery") === "2")) {
    throw new Error("STOP_S27_24_CCTV_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:cctv-camera-balance:installed-net") === "16"
    && quantity(balanced, "rc09:cctv-camera-balance:retained-spare") === "2"
    && quantity(balanced, "rc09:cctv-camera-balance:total-need") === "18"
    && quantity(balanced, "rc09:cctv-camera-balance:package-count") === "2"
    && quantity(balanced, "rc09:cctv_ip_camera") === "20"
    && quantity(balanced, "rc09:cctv-camera-balance:remainder") === "4"
    && quantity(balanced, "rc09:cctv-camera-balance:surplus-beyond-spare") === "2")) {
    throw new Error("STOP_S27_24_CCTV_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 33 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_CCTV_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:cctv_system_install_commission", "rc09:cctv_camera_test",
    "rc09:cctv_camera_register", "rc09:cctv_test_report",
  ]) {
    const graph = CCTV_SYSTEM_RESOURCES
      .find((row) => row.row_id === rowId)?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_CCTV_DOUBLE_COST:${rowId}`);
    }
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  if (/access.control.system|fire.alarm.system|general.lan|general.ups/iu.test(serialized)) {
    throw new Error("STOP_S27_24_CCTV_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S27_24_CCTV_SYSTEM_BALANCED_CORE",
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: CCTV_SYSTEM_SHORT_INPUT,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:cctv-camera-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:cctv-camera-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:cctv-camera-balance:total-need"),
      packageCount: quantity(balanced, "rc09:cctv-camera-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:cctv_ip_camera"),
      remainderPiece: quantity(balanced, "rc09:cctv-camera-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:cctv-camera-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

if(require.main===module){
void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.cctv-system-balanced-successor.v1",
  stopCode: "S27_24_CCTV_SYSTEM_BALANCED",
  applicationName: "s27-24-cctv-system-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "1851b879-c617-51a8-a7f9-94a963d77e5f",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "fd479bc1-f72e-5a80-84ca-3f3c9db09f73",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/cctv-system-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/cctv-system-balanced-s27-24.json",
    "src/lib/estimate/v4/cctvSystemR1.ts",
    "tests/estimateNorms/cctvSystemR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724CctvSystemBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724CctvSystemBalancedIndependent.ts",
  ],
  catalogId: CCTV_SYSTEM_CATALOG_ID,
  sourceId: CCTV_SYSTEM_SOURCE_ID,
  normId: CCTV_SYSTEM_NORM_ID,
  sourceMetadata: CCTV_SYSTEM_SOURCE_METADATA,
  parameterDefinitions: CCTV_SYSTEM_PARAMETERS,
  formulaDefinitions: CCTV_SYSTEM_FORMULAS,
  resourceDefinitions: CCTV_SYSTEM_RESOURCES,
  shortInput: CCTV_SYSTEM_SHORT_INPUT,
  acceptanceInput: CCTV_SYSTEM_ACCEPTANCE_INPUT,
  runtimeProfileInput: CCTV_SYSTEM_RUNTIME_INPUT,
  runtimeProfileClassification: CCTV_SYSTEM_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: CCTV_SYSTEM_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [5, 58, 58],
  benchmarkOrdinal: 32,
  validationScenario: "Q4_CCTV_SYSTEM_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж и пусконаладка системы видеонаблюдения CCTV",
    workKey: "CCTV_system",
    physicalResultRu: "Система CCTV с 16 PoE IP-камерами CAM-IP-4MP-IR, NVR-32CH и архивом 30 суток смонтирована, настроена и проверена",
    includedScopeRu: [
      "PoE IP-камеры, кронштейны и монтажные коробки по проекту",
      "NVR, диски архива, PoE-коммутатор, патч-панель и монитор",
      "сетевые кабели, окончания, маркировка, крепёж, расходники и заземление",
      "труд монтажа, кабельных работ, настройки и пусконаладки",
      "подъёмное средство, сетевой тестер, инженерная станция и логистика",
      "проверка изображения, записи, архива, исполнительный реестр и протокол",
      "аналитика и внешняя интеграция только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "СКУД и оборудование пожарной сигнализации",
      "общая LAN, серверная инфраструктура и общая UPS",
      "аналитика и интеграция без явной проектной ветви",
      "расчёт камер, трасс или архива только по площади",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "CCTV_SYSTEM_INSTALLATION_AND_COMMISSIONING",
    cctvSystem: "POE_IP_CAMERA_NVR_EXPLICIT_LAYOUT_AND_ARCHIVE",
    primaryMeasureParameterId: "cctv_system_count",
    knownScopeParameters: [
      "cctv_camera_count", "cctv_camera_designation", "cctv_camera_type",
      "cctv_nvr_count", "cctv_nvr_designation", "cctv_archive_retention_days",
    ],
    visibleProcurementBalance: true,
    projectLayoutArchiveNetworkMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true,
    floorAreaDerivedQuantitiesForbidden: true,
    adjacentSecurityAndInfrastructureSystemsExcluded: true,
  },
  binding: {
    rowId: "rc09:cctv_system_install_commission",
    applicability: {
      technology_class: "VIDEO_SURVEILLANCE_AND_SECURITY",
      operation_class: "CCTV_SYSTEM_INSTALLATION_AND_COMMISSIONING",
      cctv_system: "POE_IP_CAMERA_NVR_EXPLICIT_LAYOUT_AND_ARCHIVE",
      scope_mode: "KNOWN_CCTV_CAMERA_NVR_ARCHIVE_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: CCTV_SYSTEM_SOURCE_ID,
      norm_id: CCTV_SYSTEM_NORM_ID,
      exact_locator: CCTV_SYSTEM_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_SYSTEM_CAMERA_NVR_ARCHIVE_PLUS_APPROVED_PROJECT_PACKAGE",
    },
  },
  locator: {
    key: "cctv-system-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: CCTV_SYSTEM_SOURCE_METADATA.exact_locator,
      sourcePackSha256: CCTV_SYSTEM_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "cctv_system_count", "cctv_camera_count", "cctv_camera_designation",
        "cctv_camera_type", "cctv_nvr_count", "cctv_nvr_designation",
        "cctv_archive_retention_days",
      ],
      visiblePreliminaryBalanceInputs: Object.keys(CCTV_SYSTEM_RUNTIME_INPUT),
      directProjectInputs: CCTV_SYSTEM_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => ![
          ...Object.keys(CCTV_SYSTEM_SHORT_INPUT),
          "video_analytics_mode", "video_analytics_license_designation",
          "video_analytics_license_quantity_piece", "external_integration_mode",
          "external_integration_gateway_designation",
          "external_integration_gateway_quantity_piece",
        ].includes(parameterId)),
      conditionalInputs: [
        "video_analytics_mode", "video_analytics_license_designation",
        "video_analytics_license_quantity_piece", "external_integration_mode",
        "external_integration_gateway_designation",
        "external_integration_gateway_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "system",
    canonicalNameRu: "Монтаж и пусконаладка системы видеонаблюдения CCTV",
    aliases: [
      "монтаж системы CCTV",
      "установка IP камер видеонаблюдения",
      "монтаж PoE камер и NVR",
      "CCTV system installation commissioning",
    ],
    shortScopeRu: "Одна CCTV: 16 PoE IP-камер CAM-IP-4MP-IR, NVR-32CH и архив 30 суток; проектные материалы, труд, механизмы, ПНР и логистика уточняются по документам.",
    keyDistinguishingParameters: [
      "cctv_system_count", "cctv_camera_count", "cctv_camera_designation",
      "cctv_camera_type", "cctv_nvr_count", "cctv_nvr_designation",
      "cctv_archive_retention_days",
    ],
    clarificationFields: CCTV_SYSTEM_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => !Object.hasOwn(CCTV_SYSTEM_SHORT_INPUT, parameterId)),
    includedBoundaries: [
      "камеры, кронштейны, NVR, архивное и сетевое оборудование CCTV",
      "кабели, окончания, маркировка, крепёж, расходники и заземление",
      "труд, подъём, тестирование, настройка, ПНР и логистика",
      "видимый закупочный баланс камер",
      "условные аналитика и интеграция только по проекту",
    ],
    excludedBoundaries: [
      "СКУД, пожарная сигнализация, общая LAN, серверная и общая UPS",
      "автоматическое наполнение по площади или статической трассе 432 м",
      "неподтверждённые лицензии, интеграции и цены",
    ],
    extraSearchTermsRu: "CCTV видеонаблюдение IP PoE камера NVR архив диск коммутатор кабель окончание маркировка крепёж настройка ПНР",
    sourceProvenance: {
      exactExpandedCctvOwner: true,
      knownSystemCameraNvrArchive: true,
      visibleIndependentCameraProcurementBalance: true,
      exactProjectLayoutArchiveNetworkMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /access.control.system|скуд/iu,
    /fire.alarm.system|пожарн.*сигнализац/iu,
    /general.lan|общ.*lan/iu,
    /general.ups|общ.*ups/iu,
  ],
  owner: "S27_24_CCTV_SYSTEM_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_CCTV_SYSTEM_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

}

import {readFileSync}from'node:fs';
import {CCTV_WHOLE_CHANNEL_SOURCE_R2 as cctvSourceR3,cctvWholeOrdinaryQuantityModelR3}from'../../../src/lib/estimate/v4/cctvSystemR1';
import {compileCanonicalEstimateCore}from'../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash}from'../../../src/lib/estimate/estimateDeterministicHash';
import type{MasterSingleDefinitionSuccessorConfig}from'./prepareMasterSingleDefinitionSuccessorR1';
type CctvQuantityContextR3=Readonly<{parentReleaseId:string;parentSearchReleaseId:string;currentReleasePath:string;selectedCurrentReleasePath:string;referencePointerMode:'PREPARED_NOT_ACTIVE_COPY';outputRoot:string;expectedBranch:string;masterPath:string;masterSha256:string;sourceRoot:string;capturedParentPath:string;capturedParentByteSha256:string;verifyTargetPrecondition:NonNullable<MasterSingleDefinitionSuccessorConfig['verifyTargetPrecondition']>;capturedScopedNormativeRegistry?:MasterSingleDefinitionSuccessorConfig['capturedScopedNormativeRegistry']}>;
const cctvRequireR3=(ok:unknown,message:string)=>{if(!ok)throw Error('STOP_CCTV_WHOLE_QUANTITY_R3_'+message);};
const cctvByteShaR3=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
/** Validation fixture only: no camera count, post count or record is an actual default. */
export function cctvWholeQuantityValidationFixtureR3(){
 const s=cctvSourceR3,q=s.quantityForwardR3;
 return{...CCTV_SYSTEM_ACCEPTANCE_INPUT,cctv_system_count:1,cctv_camera_count:1,cctv_camera_type:'IP_POE_4MP_IR',cctv_nvr_count:1,cctv_poe_switch_quantity_piece:1,cctv_storage_drive_quantity_piece:1,cctv_camera_retained_spare_piece:0,cctv_camera_supplier_pack_size_piece:1,cctv_network_cable_length_m:5,cctv_archive_retention_days:7,
  ...Object.fromEntries(s.actualRecords.map(x=>[x.id,'SOURCE_TEST_ONLY_NOT_ACTUAL:'+x.id])),...Object.fromEntries(s.organisationalInputs.map(x=>[x.id,x.id==='cctv_whole_actual_factory_cord_length_m_r2'?5:x.min])),[s.decisionId]:'DOCUMENTED_COMPATIBLE',[s.markingId]:'HANDWRITTEN',[s.storageId]:'SINGLE_DRIVE_NO_REDUNDANCY_APPROVED',[q.methodId]:q.methodValue,[q.postId]:1,[q.recordId]:'TEST_ONLY reviewed dry inline kit, serial, lead, measurement plane/uncertainty, shield/PE and restoration; not actual source or project approval'}as Record<string,unknown>;
}
export function compileCctvWholeQuantityValidationR3(input=cctvWholeQuantityValidationFixtureR3(),rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={}){
 const s=cctvSourceR3,m=cctvWholeOrdinaryQuantityModelR3(s.profileId);
 return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:s.quantityForwardR3.contract,catalogId:s.catalogId,primaryMeasureParameterId:'cctv_system_count',parameterDefinitions:[...m.parameters],formulaDefinitions:[...m.formulas],resourceDefinitions:[...m.resources],submittedParameters:{cctv_system_count:input.cctv_system_count,cctv_camera_count:input.cctv_camera_count,cctv_camera_type:input.cctv_camera_type,cctv_nvr_count:input.cctv_nvr_count,cctv_archive_retention_days:input.cctv_archive_retention_days},confirmedParameters:input,rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:m.resources.length,hashJson:estimateDeterministicHash});
}
/** Pure configuration for the existing publisher and parameter-session owner.
 * Normal/locked current and registry guards are supplied by ROOT, not bypassed. */
export function prepareCctvWholeQuantityConfigR3(ctx:CctvQuantityContextR3):MasterSingleDefinitionSuccessorConfig{
 const s=cctvSourceR3,q=s.quantityForwardR3;
 cctvRequireR3(ctx.referencePointerMode==='PREPARED_NOT_ACTIVE_COPY'&&resolve(ctx.currentReleasePath).toLowerCase()!==resolve(ctx.selectedCurrentReleasePath).toLowerCase(),'PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');
 cctvRequireR3(ctx.capturedParentByteSha256===q.actualCurrentParent.sha256&&cctvByteShaR3(ctx.capturedParentPath)===q.actualCurrentParent.sha256,'EXACT_R809_PARENT_REQUIRED');
 const captured=JSON.parse(readFileSync(ctx.capturedParentPath,'utf8')),target=captured.results.find((x:Json)=>x.target?.catalogId===s.catalogId);
 cctvRequireR3(target&&JSON.stringify(target.current.header)===JSON.stringify(q.actualHeader)&&target.currentBodyMatchesExistingReaderDigests===true&&captured.transactionRolledBack===true&&captured.connectionClosed===true,'CURRENT_HEADER_BODY_AND_READONLY_RECEIPT');
 cctvRequireR3(ctx.parentReleaseId===captured.selectedReleaseId&&target.currentBody.parameters.length===48&&target.currentBody.formulas.length===33&&target.currentBody.resources.length===33,'EXACT_SELECTED_PARENT_SHAPE');
 const methodPath=resolve(ctx.sourceRoot,q.projectMethod.logicalPath),verifyBytes=()=>{cctvRequireR3(cctvByteShaR3(methodPath)===q.projectMethod.sha256,'PROJECT_METHOD_BYTES');for(const p of q.primaryPins)cctvRequireR3(cctvByteShaR3(p.path)===p.sha256,'PRIMARY_BYTES:'+p.path);};verifyBytes();
 const m=cctvWholeOrdinaryQuantityModelR3(s.profileId),rows=m.resources,fixture=cctvWholeQuantityValidationFixtureR3();
 return{contract:q.contract,stopCode:'CCTV_WHOLE_QUANTITY_R3',applicationName:'cctv-existing-whole-quantity-source',expectedBranch:ctx.expectedBranch,masterPath:ctx.masterPath,masterSha256:ctx.masterSha256,parentReleaseId:ctx.parentReleaseId,parentSearchReleaseId:ctx.parentSearchReleaseId,currentReleasePath:ctx.currentReleasePath,outputRoot:ctx.outputRoot,
  sourcePaths:['src/lib/estimate/v4/cctvSystemR1.ts','tests/estimateNorms/cctvSystemR1.contract.test.ts','scripts/estimate/r4a13/prepareS2724CctvSystemBalancedSuccessor.ts','data/estimate-benchmarks/source-packs/cctv-whole-g5-protect-method-r1.json','data/estimate-benchmarks/source-packs/cctv-system-balanced-s27-24.json',q.projectMethod.logicalPath],catalogId:s.catalogId,sourceId:s.sourceId,normId:'PROJECT_SYSTEM:CCTV_WHOLE_INLINE_STOCK_R3',
  sourceMetadata:{source_title:q.titleRu,source_authority:'PROJECT_SYSTEM с точными первичными документами; не норма труда и не проект объекта',source_kind:'PROJECT_SYSTEM',artifact_sha256:q.projectMethod.sha256,official_url:null,exact_locator:'cctv-whole-r2-quantity-r3:inline-kit-measurement-plane-whole-recording-holds',use_restriction:'Только явно выбранный прежний whole profile. Объектные записи, цена,31UNKNOWN, целый архив и source/factory/ordinary admission не приняты.'},
  ...(ctx.capturedScopedNormativeRegistry===undefined?{}:{capturedScopedNormativeRegistry:ctx.capturedScopedNormativeRegistry}),parameterDefinitions:m.parameters,formulaDefinitions:m.formulas,resourceDefinitions:rows,shortInput:fixture,acceptanceInput:fixture,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[48,33,33],benchmarkOrdinal:32,validationScenario:'EXISTING_CCTV_WHOLE_SOURCE_INLINE_STOCK_WITH_VISIBLE_OBJECT_SOURCE_AND_CLASS_HOLDS',
  verifyTargetPrecondition:async(client,phase)=>{verifyBytes();await ctx.verifyTargetPrecondition(client,phase);verifyBytes();},
  verifyCore:async()=>{const result=await compileCctvWholeQuantityValidationR3(),all=[...result.rows,...result.preliminaryNeeds];for(const id of [q.meterRowId,q.leadRowId])cctvRequireR3(all.find(r=>r.row_id===id)?.quantity==='1','DEFINED_ACTUAL_POST_STOCK:'+id);return{status:'SOURCE_CONTRACT_ONLY_NOT_ORDINARY_OR_PHYSICAL_ACCEPTANCE',rowCount:result.rows.length,needCount:result.preliminaryNeeds.length,physicalClosures:0,sourceAdmission:false,FULL:false};},
  passport:{canonicalRuName:'Монтаж и наладка системы видеонаблюдения',workKey:'CCTV_system',physicalResultRu:'Выбранный канал камеры представлен к полной проверке питания, сети, изображения и записи; выполнение и приёмка подтверждаются отдельными фактическими результатами.',includedScopeRu:s.operationRoster.map(o=>o.operationTitleRu),excludedScopeRu:['Общая LAN/UPS, стойка и upstream power остаются прежним владельцам.','Прибор питания и LinkIQ не заменяют запись, архив или сертификацию постоянной линии.'],independentCompletenessMap:q.independentComposition,unresolvedApplicableResourceRowIds:q.resourceDeclarations.filter(x=>x.rowKind==='RESOURCE').map(x=>x.rowId)},
  applicability:{internalProfileId:s.profileId,inlineMethodId:q.methodValue,currentParent:q.actualHeader,activationAllowed:false,productionEligible:false,automaticMigrationAllowed:false,fullTechnicalAcceptance:false},
  binding:{rowId:rows[0]!.row_id,additionalRowIds:rows.slice(1).map(r=>r.row_id),ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1',capturedSourcePreimage:{sourceKey:s.sourceId,expected:null}},applicability:{sourceReference:q.contract,internalProfileId:s.profileId,sourceAdmission:false},applicabilityByRowId:Object.fromEntries(q.resourceDeclarations.map(x=>[x.rowId,{formulaId:x.formulaId,operationIds:x.operationIds,sourceRole:'EXACT_SOURCE_WITH_VISIBLE_COMPOSITION_HOLDS'}]))},
  locator:{key:'cctv-whole-r2-quantity-r3:inline-kit-measurement-plane-whole-recording-holds',payload:{contract:q.contract,independentCompletenessMap:q.independentComposition,sourceOwnedResourceDeclarations:q.resourceDeclarations,projectMethodSha256:q.projectMethod.sha256,sourceAdmission:false}},
  search:{primaryUom:'system',canonicalNameRu:'Монтаж и наладка системы видеонаблюдения',aliases:['CCTV выбранный полный канал камеры'],shortScopeRu:'Явно выбранный полный канал камеры, сети и записи с точным оснащением проверки питания и сохранёнными потребностями.',keyDistinguishingParameters:[s.decisionId,q.methodId],clarificationFields:m.parameters.filter(p=>p.truth_metadata.value_source_role==='PROJECT_SPECIFIC_INPUT').map(p=>p.parameter_id),includedBoundaries:s.operationRoster.map(o=>o.operationTitleRu),excludedBoundaries:['Общая LAN/UPS, стойка и неподтверждённая технология.'],extraSearchTermsRu:'CCTV камера PoE запись архив воспроизведение проверка',sourceProvenance:{sourceId:s.sourceId,artifactSha256:q.projectMethod.sha256,preparedInternalReferenceOnly:true,sourceAdmission:false}},
  forbiddenAdjacentMatchers:[/access.control.system|скуд/iu,/fire.alarm.system|пожарн.*сигнализац/iu,/general.lan|общ.*lan/iu,/general.ups|общ.*ups/iu],owner:'CCTV_WHOLE_QUANTITY_SOURCE_R3',receiptFileStem:'CCTV_WHOLE_QUANTITY_SOURCE_R3'};
}

import {CCTV_WHOLE_MEASURED_SOURCE_R5 as cctvMeasuredR5,cctvWholeMeasuredModelR5}from'../../../src/lib/estimate/v4/cctvSystemR1';
type CctvMeasuredContextR5=CctvQuantityContextR3;
const cctvMeasuredRecordR5=(x:unknown):Record<string,unknown>=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('STOP_CCTV_R5_RECORD_REQUIRED');return x as Record<string,unknown>;};

/** Explicit SOURCE_TEST_ONLY data; none of these values is an object default. */
export function cctvWholeMeasuredValidationFixtureR5():Record<string,unknown>{
 const q=cctvMeasuredR5,f=cctvWholeQuantityValidationFixtureR3();
 delete f.cctv_whole_actual_factory_cord_length_m_r2;
 return{...f,[q.shieldMethodId]:q.supportedShieldMethod,...Object.fromEntries(q.measurements.map(m=>[m.id,m.id.includes('route_measured')?4:m.id.includes('installed_loops')?0.6:m.id.includes('installed_entries')?0.4:m.id.includes('waste_gross')?2.4:m.id.includes('waste_tare')?0.4:m.id.includes('unused_return')?1:5])),[q.quantityRecordId]:'SOURCE_TEST_ONLY reviewed disjoint one5m factory cord, per-media issue/unusedreturn/spoilage and same-lot weigh tickets; not actual',[q.shieldRecordId]:'SOURCE_TEST_ONLY reviewed actual shield/earth/ESD/surge interfaces and ownership; not approved lightning design'};
}
export function compileCctvWholeMeasuredValidationR5(input=cctvWholeMeasuredValidationFixtureR5(),rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={}){
 const s=cctvSourceR3,q=cctvMeasuredR5,m=cctvWholeMeasuredModelR5(s.profileId);
 return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:q.contract,catalogId:s.catalogId,primaryMeasureParameterId:'cctv_system_count',parameterDefinitions:[...m.parameters],formulaDefinitions:[...m.formulas],resourceDefinitions:[...m.resources],submittedParameters:{cctv_system_count:input.cctv_system_count,cctv_camera_count:input.cctv_camera_count,cctv_camera_type:input.cctv_camera_type,cctv_nvr_count:input.cctv_nvr_count,cctv_archive_retention_days:input.cctv_archive_retention_days},confirmedParameters:input,rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:m.resources.length,hashJson:estimateDeterministicHash});
}
/** Pure config consumed only by the existing governed publisher. It supplies
 * neither a source capture, a registry owner, a reader nor an admission bypass. */
export function prepareCctvWholeMeasuredConfigR5(ctx:CctvMeasuredContextR5):MasterSingleDefinitionSuccessorConfig{
 const s=cctvSourceR3,q=cctvMeasuredR5,fresh=q.freshParent;
 cctvRequireR3(ctx.referencePointerMode==='PREPARED_NOT_ACTIVE_COPY'&&resolve(ctx.currentReleasePath).toLowerCase()!==resolve(ctx.selectedCurrentReleasePath).toLowerCase(),'R5_PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');
 cctvRequireR3(fresh&&ctx.capturedParentByteSha256===fresh.proof.sha256&&cctvByteShaR3(ctx.capturedParentPath)===fresh.proof.sha256,'R5_FRESH_PARENT_BYTES_REQUIRED');
 const body=cctvMeasuredRecordR5(JSON.parse(readFileSync(ctx.capturedParentPath,'utf8'))),targets=body.results;
 cctvRequireR3(Array.isArray(targets),'R5_EXISTING_READER_RESULTS_REQUIRED');
 const items=(Array.isArray(targets)?targets:[]).map(cctvMeasuredRecordR5).filter(t=>t.target!==undefined);
 const target=items.find(t=>{const k=cctvMeasuredRecordR5(t.target);return k.catalogId===s.catalogId&&k.sourceId===s.quantityForwardR3.existingPublishedSourceId;});
 cctvRequireR3(target,'R5_EXACT_PUBLISHED_TARGET_REQUIRED');
 const current=cctvMeasuredRecordR5(target?.current),currentBody=cctvMeasuredRecordR5(target?.currentBody);
 cctvRequireR3(estimateDeterministicHash(current.header)===estimateDeterministicHash(fresh.actualHeader)&&estimateDeterministicHash({parameters:currentBody.parameters,formulas:currentBody.formulas,resources:currentBody.resources})===estimateDeterministicHash(fresh.nativeParentModel)&&body.transactionRolledBack===true&&body.connectionClosed===true,'R5_EXACT_BODY_AND_CLOSED_READER_REQUIRED');
 cctvRequireR3(ctx.parentReleaseId===body.selectedReleaseId,'R5_EXACT_SELECTED_PARENT_RELEASE_REQUIRED');
 const observedCandidate=items.find(t=>{const k=cctvMeasuredRecordR5(t.target);return k.catalogId===s.catalogId&&k.sourceId===s.sourceId;});
 cctvRequireR3(observedCandidate,'R5_CANDIDATE_OBSERVATION_REQUIRED_NOT_GUESSED_ABSENCE');
 const candidateRaw=cctvMeasuredRecordR5(observedCandidate?.currentRawSets).newSource;
 cctvRequireR3(Array.isArray(candidateRaw)&&candidateRaw.length===0,'R5_NEW_SOURCE_KEY_PREIMAGE_MUST_BE_REVIEWED');
 const methodPath=resolve(ctx.sourceRoot,q.projectMethod.logicalPath),verifyBytes=()=>{cctvRequireR3(cctvByteShaR3(methodPath)===q.projectMethod.sha256,'R5_PROJECT_METHOD_BYTES');for(const p of q.primaryPins)cctvRequireR3(cctvByteShaR3(p.path)===p.sha256,'R5_REUSED_PRIMARY_BYTES:'+p.path);};verifyBytes();
 const m=cctvWholeMeasuredModelR5(s.profileId),rows=m.resources,fixture=cctvWholeMeasuredValidationFixtureR5();
 return{contract:q.contract,stopCode:'CCTV_WHOLE_MEASURED_R5',applicationName:'cctv-existing-whole-measured-source',expectedBranch:ctx.expectedBranch,masterPath:ctx.masterPath,masterSha256:ctx.masterSha256,parentReleaseId:ctx.parentReleaseId,parentSearchReleaseId:ctx.parentSearchReleaseId,currentReleasePath:ctx.currentReleasePath,outputRoot:ctx.outputRoot,
  sourcePaths:['src/lib/estimate/v4/cctvSystemR1.ts','tests/estimateNorms/cctvSystemR1.contract.test.ts','scripts/estimate/r4a13/prepareS2724CctvSystemBalancedSuccessor.ts','data/estimate-benchmarks/source-packs/cctv-whole-g5-protect-method-r1.json','data/estimate-benchmarks/source-packs/cctv-system-balanced-s27-24.json',q.projectMethod.logicalPath],catalogId:s.catalogId,sourceId:s.sourceId,normId:CCTV_SYSTEM_NORM_ID,
  sourceMetadata:{source_title:q.titleRu,source_authority:'PROJECT_SYSTEM: actual measurement and bookkeeping; no object approval or application norm',source_kind:'PROJECT_SYSTEM',artifact_sha256:q.projectMethod.sha256,official_url:null,exact_locator:q.locatorKey,use_restriction:'Only the same explicit existing whole profile, with real source/object/price/composition/factory holds. Twenty operations are source declarations, not executed system acceptance.'},
  ...(ctx.capturedScopedNormativeRegistry===undefined?{}:{capturedScopedNormativeRegistry:ctx.capturedScopedNormativeRegistry}),parameterDefinitions:m.parameters,formulaDefinitions:m.formulas,resourceDefinitions:rows,shortInput:fixture,acceptanceInput:fixture,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[48,33,33],benchmarkOrdinal:32,validationScenario:'EXISTING_CCTV_WHOLE_ACTUAL_MEASURED_LEDGER_WITH_SEPARATE_MANDATORY_CONDITIONS',
  verifyTargetPrecondition:async(client,phase)=>{verifyBytes();await ctx.verifyTargetPrecondition(client,phase);verifyBytes();},
  verifyCore:async()=>{const compiled=await compileCctvWholeMeasuredValidationR5(),all=[...compiled.rows,...compiled.preliminaryNeeds];cctvRequireR3(all.find(r=>r.row_id==='reference:cctv:whole:r2:factory-cable-installed-m')?.quantity==='5','R5_SOURCE_TEST_ONLY_MEASURED_FACTORY_METRES');return{status:'SOURCE_CONTRACT_ONLY_NOT_OBJECT_OR_ORDINARY_ACCEPTANCE',rowCount:compiled.rows.length,needCount:compiled.preliminaryNeeds.length,sourceAdmission:false,physicalClosures:0,FULL:false};},
  passport:{canonicalRuName:'Монтаж и наладка системы видеонаблюдения',workKey:'CCTV_system',physicalResultRu:'Тот же выбранный полный канал камеры с измеренным обеспечением и отдельной обязательной программой питания, сети, сцены, записи, хранения и передачи.',includedScopeRu:s.operationRoster.map(o=>o.operationTitleRu),excludedScopeRu:['General LAN/UPS/upstream power, rack/support structures and lightning design remain with their actual owners.','A component, PoE, qualification or live-view test is not recording, retention or line certification.'],independentCompletenessMap:q.independentComposition,unresolvedApplicableResourceRowIds:q.resourceDeclarations.filter(d=>d.rowKind==='RESOURCE').map(d=>d.rowId)},
  applicability:{internalProfileId:s.profileId,existingCandidateSourceKey:s.sourceId,currentParent:fresh.actualHeader,activationAllowed:false,productionEligible:false,automaticMigrationAllowed:false,fullTechnicalAcceptance:false},
  binding:{rowId:rows[0]!.row_id,additionalRowIds:rows.slice(1).map(r=>r.row_id),ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1',capturedSourcePreimage:{sourceKey:s.sourceId,expected:null}},applicability:{sourceReference:q.contract,internalProfileId:s.profileId,sourceAdmission:false},applicabilityByRowId:Object.fromEntries(q.resourceDeclarations.map(d=>[d.rowId,{formulaId:d.formulaId,operationIds:d.operationIds,sourceRole:'EXACT_EXISTING_WHOLE_SOURCE_VISIBLE_HOLDS'}]))},
  locator:{key:q.locatorKey,payload:{contract:q.contract,sourceOrigin:{source_document_version:q.contract,definition_hash:q.projectMethod.sha256,artifact_sha256:q.projectMethod.sha256,exact_locator:q.locatorKey,authority:'PROJECT_METHOD_BYTES_NOT_MANUFACTURER_RATE'},independentCompletenessMap:q.independentComposition,sourceOwnedResourceDeclarations:q.resourceDeclarations,wholeOperationProgramme:q.operationProgramme,projectMethodSha256:q.projectMethod.sha256,sourceAdmission:false}},
  search:{primaryUom:'system',canonicalNameRu:'Монтаж и наладка системы видеонаблюдения',aliases:['CCTV выбранный целый канал камеры и записи'],shortScopeRu:'Выбранный канал камеры, PoE, сети и записи с фактическим измерением обеспечения и сохранёнными потребностями.',keyDistinguishingParameters:[s.decisionId,q.quantityRecordId,q.shieldRecordId],clarificationFields:m.parameters.filter(p=>p.truth_metadata.value_source_role==='PROJECT_SPECIFIC_INPUT').map(p=>p.parameter_id),includedBoundaries:s.operationRoster.map(o=>o.operationTitleRu),excludedBoundaries:['General LAN/UPS, rack, upstream protection and unsupported technology.'],extraSearchTermsRu:'камера видеонаблюдение PoE запись архив воспроизведение проверка',sourceProvenance:{sourceId:s.sourceId,artifactSha256:q.projectMethod.sha256,preparedInternalReferenceOnly:true,sourceAdmission:false}},
  forbiddenAdjacentMatchers:[/access.control.system|скуд/iu,/fire.alarm.system|пожарн.*сигнализац/iu,/general.lan|общ.*lan/iu,/general.ups|общ.*ups/iu],owner:'CCTV_WHOLE_MEASURED_SOURCE_R5',receiptFileStem:'CCTV_WHOLE_MEASURED_SOURCE_R5'};
}
