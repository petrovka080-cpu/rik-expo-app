import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
  ACCESS_CONTROL_SYSTEM_CATALOG_ID,
  ACCESS_CONTROL_SYSTEM_FORMULAS,
  ACCESS_CONTROL_SYSTEM_NORM_ID,
  ACCESS_CONTROL_SYSTEM_PARAMETERS,
  ACCESS_CONTROL_SYSTEM_RESOURCES,
  ACCESS_CONTROL_SYSTEM_RUNTIME_CLASSIFICATION,
  ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT,
  ACCESS_CONTROL_SYSTEM_RUNTIME_SOURCE_IDS,
  ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
  ACCESS_CONTROL_SYSTEM_SOURCE_ID,
  ACCESS_CONTROL_SYSTEM_SOURCE_METADATA,
  compileAccessControlSystemR1,
} from "../../../src/lib/estimate/v4/accessControlSystemR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileAccessControlSystemR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

const CONDITIONAL_INPUT = Object.freeze({
  intercom_integration_mode: "REQUIRED",
  intercom_gateway_designation: "Шлюз интеграции с домофонией по архитектуре",
  intercom_gateway_quantity_piece: 1,
  fire_release_integration_mode: "REQUIRED",
  fire_release_interface_designation: "Интерфейс сигнала аварийного открытия",
  fire_release_interface_quantity_piece: 1,
});

async function verifyCore(): Promise<Json> {
  const first = await compileAccessControlSystemR1({ ...ACCESS_CONTROL_SYSTEM_SHORT_INPUT });
  const complete = await compileAccessControlSystemR1({
    ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
  });
  const balanced = await compileAccessControlSystemR1({
    ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
    acs_controller_retained_spare_piece: 1,
    acs_controller_supplier_pack_size_piece: 4,
  });
  const conditional = await compileAccessControlSystemR1({
    ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 13 && first.preliminaryNeeds.length === 23
    && quantity(first, "rc09:acs_system_install_commission") === "1"
    && quantity(first, "rc09:acs_controller") === "2"
    && quantity(first, "rc09:acs_reader") === "16"
    && quantity(first, "rc09:acs_lock") === "8"
    && quantity(first, "rc09:acs_exit_device") === "8"
    && quantity(first, "rc09:acs_door_functional_test") === "8")) {
    throw new Error("STOP_S27_24_ACCESS_CONTROL_FIRST_ESTIMATE");
  }
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  for (const rowId of [
    "rc09:acs_door_contact", "rc09:acs_emergency_release",
    "rc09:acs_power_supply", "rc09:acs_standby_battery",
    "rc09:acs_network_cable", "rc09:acs_reader_cable", "rc09:acs_lock_cable",
    "rc09:acs_mounting_box", "rc09:acs_termination", "rc09:acs_label",
    "rc09:acs_fastening", "rc09:acs_consumable", "rc09:acs_grounding_conductor",
    "rc09:acs_test_report", "rc09:labor:acs-device-install",
    "rc09:labor:acs-cabling-termination",
    "rc09:labor:acs-configuration-commissioning",
    "rc09:equipment:acs-lifting", "rc09:equipment:acs-cable-device-tester",
    "rc09:logistics:acs-delivery", "rc09:logistics:acs-packaging-removal",
    "rc09:acs_intercom_gateway", "rc09:acs_fire_release_interface",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_ACCESS_CONTROL_NEED:${rowId}`);
  if (!(complete.rows.length === 34 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:acs_door_contact") === "8"
    && quantity(complete, "rc09:acs_emergency_release") === "8"
    && quantity(complete, "rc09:acs_power_supply") === "4"
    && quantity(complete, "rc09:acs_standby_battery") === "4"
    && quantity(complete, "rc09:acs_network_cable") === "180"
    && quantity(complete, "rc09:acs_reader_cable") === "520"
    && quantity(complete, "rc09:acs_lock_cable") === "360"
    && quantity(complete, "rc09:acs_termination") === "96"
    && quantity(complete, "rc09:labor:acs-cabling-termination") === "88"
    && quantity(complete, "rc09:equipment:acs-cable-device-tester") === "24"
    && quantity(complete, "rc09:logistics:acs-delivery") === "2")) {
    throw new Error("STOP_S27_24_ACCESS_CONTROL_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:acs-controller-balance:installed-net") === "2"
    && quantity(balanced, "rc09:acs-controller-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:acs-controller-balance:total-need") === "3"
    && quantity(balanced, "rc09:acs-controller-balance:package-count") === "1"
    && quantity(balanced, "rc09:acs_controller") === "4"
    && quantity(balanced, "rc09:acs-controller-balance:remainder") === "2"
    && quantity(balanced, "rc09:acs-controller-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_ACCESS_CONTROL_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 36 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_ACCESS_CONTROL_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:acs_system_install_commission", "rc09:acs_door_functional_test",
    "rc09:acs_door_register", "rc09:acs_test_report",
  ]) {
    const graph = ACCESS_CONTROL_SYSTEM_RESOURCES
      .find((row) => row.row_id === rowId)?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_ACCESS_CONTROL_DOUBLE_COST:${rowId}`);
    }
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  if (/cctv.system|fire.alarm.system|general.lan|general.ups/iu.test(serialized)) {
    throw new Error("STOP_S27_24_ACCESS_CONTROL_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S27_24_ACCESS_CONTROL_SYSTEM_BALANCED_CORE",
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:acs-controller-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:acs-controller-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:acs-controller-balance:total-need"),
      packageCount: quantity(balanced, "rc09:acs-controller-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:acs_controller"),
      remainderPiece: quantity(balanced, "rc09:acs-controller-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:acs-controller-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

if(require.main===module){
void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.access-control-system-balanced-successor.v1",
  stopCode: "S27_24_ACCESS_CONTROL_SYSTEM_BALANCED",
  applicationName: "s27-24-access-control-system-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "c7c5a9ad-bc7f-525d-8925-3bb84b6edc44",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "5a438edb-cdeb-5d27-8218-d8055b77c7d0",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/access-control-system-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/access-control-system-balanced-s27-24.json",
    "src/lib/estimate/v4/accessControlSystemR1.ts",
    "tests/estimateNorms/accessControlSystemR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724AccessControlSystemBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724AccessControlSystemBalancedIndependent.ts",
  ],
  catalogId: ACCESS_CONTROL_SYSTEM_CATALOG_ID,
  sourceId: ACCESS_CONTROL_SYSTEM_SOURCE_ID,
  normId: ACCESS_CONTROL_SYSTEM_NORM_ID,
  sourceMetadata: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA,
  parameterDefinitions: ACCESS_CONTROL_SYSTEM_PARAMETERS,
  formulaDefinitions: ACCESS_CONTROL_SYSTEM_FORMULAS,
  resourceDefinitions: ACCESS_CONTROL_SYSTEM_RESOURCES,
  shortInput: ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
  acceptanceInput: ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
  runtimeProfileInput: ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT,
  runtimeProfileClassification: ACCESS_CONTROL_SYSTEM_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: ACCESS_CONTROL_SYSTEM_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [5, 58, 58],
  benchmarkOrdinal: 33,
  validationScenario: "Q4_ACCESS_CONTROL_SYSTEM_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж и пусконаладка системы контроля и управления доступом",
    workKey: "access_control_system",
    physicalResultRu: "СКУД для 8 дверей с контроллерами ACS-CTRL-4D, считывателями READER-MF, замками MAGLOCK-300 и кнопками EXIT-NO смонтирована, настроена и проверена",
    includedScopeRu: [
      "контроллеры, считыватели, замки, кнопки выхода и датчики дверей по проекту",
      "устройства аварийного открытия, локальные блоки питания и аккумуляторы",
      "сетевые, считывательные и замковые кабели, окончания и монтажные коробки",
      "маркировка, крепёж, расходники и защитное заземление",
      "труд монтажа, кабельных работ, настройки и пусконаладки",
      "подъёмное средство, тестеры, функциональные проверки, реестр и логистика",
      "домофония и интерфейс аварийного открытия только по условным ветвям",
    ],
    excludedScopeRu: [
      "CCTV и оборудование пожарной сигнализации",
      "общая LAN, серверная инфраструктура и общая UPS",
      "интеграции и логика доступа без явной проектной ветви",
      "расчёт дверей, устройств и трасс только по площади",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "ACCESS_CONTROL_SYSTEM_INSTALLATION_AND_COMMISSIONING",
    accessControlSystem: "CONTROLLED_DOOR_CONTROLLER_READER_LOCK_EXPLICIT_SCHEDULE",
    primaryMeasureParameterId: "acs_system_count",
    knownScopeParameters: [
      "acs_controlled_door_count", "acs_controller_count", "acs_controller_designation",
      "acs_reader_count", "acs_reader_designation", "acs_lock_count",
      "acs_lock_designation", "acs_exit_device_count", "acs_exit_device_designation",
    ],
    visibleProcurementBalance: true,
    projectDoorDevicePowerMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true,
    floorAreaDerivedQuantitiesForbidden: true,
    adjacentSecurityAndInfrastructureSystemsExcluded: true,
  },
  binding: {
    rowId: "rc09:acs_system_install_commission",
    applicability: {
      technology_class: "ACCESS_CONTROL_AND_SECURITY",
      operation_class: "ACCESS_CONTROL_SYSTEM_INSTALLATION_AND_COMMISSIONING",
      access_control_system: "CONTROLLED_DOOR_CONTROLLER_READER_LOCK_EXPLICIT_SCHEDULE",
      scope_mode: "KNOWN_DOOR_DEVICE_IDENTITY_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: ACCESS_CONTROL_SYSTEM_SOURCE_ID,
      norm_id: ACCESS_CONTROL_SYSTEM_NORM_ID,
      exact_locator: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_SYSTEM_DOOR_CONTROLLER_READER_LOCK_EXIT_DEVICE_PLUS_APPROVED_PROJECT_PACKAGE",
    },
  },
  locator: {
    key: "access-control-system-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.exact_locator,
      sourcePackSha256: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "acs_system_count", "acs_controlled_door_count", "acs_controller_count",
        "acs_controller_designation", "acs_reader_count", "acs_reader_designation",
        "acs_lock_count", "acs_lock_designation", "acs_exit_device_count",
        "acs_exit_device_designation",
      ],
      visiblePreliminaryBalanceInputs: Object.keys(ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT),
      directProjectInputs: ACCESS_CONTROL_SYSTEM_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => ![
          ...Object.keys(ACCESS_CONTROL_SYSTEM_SHORT_INPUT),
          "intercom_integration_mode", "intercom_gateway_designation",
          "intercom_gateway_quantity_piece", "fire_release_integration_mode",
          "fire_release_interface_designation", "fire_release_interface_quantity_piece",
        ].includes(parameterId)),
      conditionalInputs: [
        "intercom_integration_mode", "intercom_gateway_designation",
        "intercom_gateway_quantity_piece", "fire_release_integration_mode",
        "fire_release_interface_designation", "fire_release_interface_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "system",
    canonicalNameRu: "Монтаж и пусконаладка системы контроля и управления доступом",
    aliases: [
      "монтаж системы СКУД",
      "установка контроллеров и считывателей доступа",
      "монтаж электрозамков и кнопок выхода",
      "access control system installation commissioning",
    ],
    shortScopeRu: "Одна СКУД: 8 дверей, 2 контроллера ACS-CTRL-4D, 16 считывателей READER-MF, 8 замков MAGLOCK-300 и 8 кнопок EXIT-NO; проектные материалы, труд, механизмы и ПНР уточняются по документам.",
    keyDistinguishingParameters: [
      "acs_system_count", "acs_controlled_door_count", "acs_controller_count",
      "acs_controller_designation", "acs_reader_count", "acs_reader_designation",
      "acs_lock_count", "acs_lock_designation", "acs_exit_device_count",
      "acs_exit_device_designation",
    ],
    clarificationFields: ACCESS_CONTROL_SYSTEM_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => !Object.hasOwn(ACCESS_CONTROL_SYSTEM_SHORT_INPUT, parameterId)),
    includedBoundaries: [
      "контроллеры, считыватели, замки, выходные и дверные устройства СКУД",
      "локальное питание, кабели, окончания, маркировка, крепёж и расходники",
      "труд, подъём, тестирование, настройка, ПНР и логистика",
      "видимый закупочный баланс контроллеров",
      "условные интерфейсы только по проекту",
    ],
    excludedBoundaries: [
      "CCTV, пожарная сигнализация, общая LAN, серверная и общая UPS",
      "автоматическое наполнение по площади или статической трассе 432 м",
      "неподтверждённые интерфейсы, логика и цены",
    ],
    extraSearchTermsRu: "СКУД контроль доступа дверь контроллер считыватель замок кнопка выхода питание кабель окончание маркировка настройка ПНР",
    sourceProvenance: {
      exactExpandedAccessControlOwner: true,
      knownSystemDoorControllerReaderLockAndExitDevice: true,
      visibleIndependentControllerProcurementBalance: true,
      exactProjectDoorDevicePowerMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /cctv.system|видеонаблюден/iu,
    /fire.alarm.system|оборудован.*пожарн.*сигнализац/iu,
    /general.lan|общ.*lan/iu,
    /general.ups|общ.*ups/iu,
  ],
  owner: "S27_24_ACCESS_CONTROL_SYSTEM_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_ACCESS_CONTROL_SYSTEM_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

}

import {readFileSync}from'node:fs';
import {ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2 as acsSourceR3,accessControlWholeDoorOrdinaryModelR3,accessControlWholePassageMeasuredModelR5}from'../../../src/lib/estimate/v4/accessControlSystemR1';
import {compileCanonicalEstimateCore}from'../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash}from'../../../src/lib/estimate/estimateDeterministicHash';
import type{MasterSingleDefinitionSuccessorConfig}from'./prepareMasterSingleDefinitionSuccessorR1';

type AcsQuantityContextR3=Readonly<{
 parentReleaseId:string;parentSearchReleaseId:string;currentReleasePath:string;selectedCurrentReleasePath:string;
 referencePointerMode:'PREPARED_NOT_ACTIVE_COPY';outputRoot:string;expectedBranch:string;masterPath:string;masterSha256:string;
 sourceRoot:string;capturedParentPath:string;capturedParentByteSha256:string;
 verifyTargetPrecondition:NonNullable<MasterSingleDefinitionSuccessorConfig['verifyTargetPrecondition']>;
 capturedScopedNormativeRegistry?:MasterSingleDefinitionSuccessorConfig['capturedScopedNormativeRegistry'];
}>;
const acsRequireR3=(ok:unknown,message:string)=>{if(!ok)throw Error('STOP_ACS_WHOLE_QUANTITY_R3_'+message);};
const acsByteShaR3=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
/** Test fixture only. No value here is an actual door fact, default or source admission. */
export function accessControlWholeDoorValidationFixtureR3(){
 const s=acsSourceR3,q=s.quantityForwardR3;
 return{...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,acs_system_count:1,acs_controlled_door_count:1,acs_controller_count:1,acs_reader_count:2,acs_lock_count:1,acs_exit_device_count:1,
  acs_door_contact_quantity_piece:1,acs_emergency_release_quantity_piece:1,acs_power_supply_quantity_piece:1,acs_standby_battery_quantity_piece:1,acs_controller_retained_spare_piece:0,acs_controller_supplier_pack_size_piece:1,
  ...Object.fromEntries(s.currentParentModel.parameters.filter(x=>x.parameter_id.endsWith('_record_r5')).map(x=>[x.parameter_id,'SOURCE_TEST_ONLY_NOT_ACTUAL:'+x.parameter_id])),
  acs_whole_operation_review_decision_r5:'Фактические методы и обеспечение подтверждены документами',
  ...Object.fromEntries(s.actualRecords.map(x=>[x.id,'SOURCE_TEST_ONLY_NOT_ACTUAL:'+x.id])),...Object.fromEntries(s.organisationalInputs.map(x=>[x.id,x.min])),
  [s.decisionId]:'DOCUMENTED_COMPATIBLE',[s.retentionId]:'THREAD_LOCKER',[s.markingId]:'HANDWRITTEN',[q.mountMethodId]:'FACTORY_WALL_VARIANT_1'}as Record<string,unknown>;
}
export function compileAccessControlWholeDoorValidationR3(input=accessControlWholeDoorValidationFixtureR3(),rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={}){
 const s=acsSourceR3,model=accessControlWholeDoorOrdinaryModelR3(s.profileId);
 return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:s.quantityForwardR3.contract,
  catalogId:s.catalogId,primaryMeasureParameterId:'acs_system_count',parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
  submittedParameters:{acs_system_count:1,acs_controlled_door_count:1,acs_controller_count:1,acs_reader_count:2,acs_lock_count:1,acs_exit_device_count:1},confirmedParameters:input,rowOverrides,
  currencyCode:'KGS',priceItems:[],maximumResourceRows:model.resources.length,hashJson:estimateDeterministicHash});
}
/** Pure existing Master config. ROOT supplies normal/locked current+registry
 * guards; importing this producer no longer launches its historic fixture. */
export function prepareAccessControlWholeDoorQuantityConfigR3(ctx:AcsQuantityContextR3):MasterSingleDefinitionSuccessorConfig{
 const s=acsSourceR3,q=s.quantityForwardR3;
 acsRequireR3(ctx.referencePointerMode==='PREPARED_NOT_ACTIVE_COPY'&&resolve(ctx.currentReleasePath).toLowerCase()!==resolve(ctx.selectedCurrentReleasePath).toLowerCase(),'PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');
 acsRequireR3(ctx.capturedParentByteSha256===q.actualCurrentParent.sha256&&acsByteShaR3(ctx.capturedParentPath)===q.actualCurrentParent.sha256,'EXACT_R794_PARENT_REQUIRED');
 const captured=JSON.parse(readFileSync(ctx.capturedParentPath,'utf8')),target=captured.results.find((x:Json)=>x.target?.catalogId===s.catalogId);
 acsRequireR3(target&&JSON.stringify(target.current.header)===JSON.stringify(q.actualHeader)&&target.currentBodyMatchesExistingReaderDigests===true&&captured.transactionRolledBack===true&&captured.connectionClosed===true,'CURRENT_HEADER_BODY_AND_READONLY_RECEIPT');
 acsRequireR3(ctx.parentReleaseId===captured.selectedReleaseId&&target.currentBody.parameters.length===61&&target.currentBody.formulas.length===36&&target.currentBody.resources.length===36,'EXACT_SELECTED_PARENT_SHAPE');
 const methodPath=resolve(ctx.sourceRoot,q.projectMethod.logicalPath);
 const verifyBytes=()=>{acsRequireR3(acsByteShaR3(methodPath)===q.projectMethod.sha256,'PROJECT_METHOD_BYTES');for(const p of q.primaryPins)acsRequireR3(acsByteShaR3(p.path)===p.sha256,'PRIMARY_BYTES:'+p.path);};verifyBytes();
 const model=accessControlWholeDoorOrdinaryModelR3(s.profileId),rows=model.resources,fixture=accessControlWholeDoorValidationFixtureR3();
 const sourcePaths=['src/lib/estimate/v4/accessControlSystemR1.ts','tests/estimateNorms/accessControlSystemR1.contract.test.ts','scripts/estimate/r4a13/prepareS2724AccessControlSystemBalancedSuccessor.ts',
  'data/estimate-benchmarks/source-packs/access-control-single-door-method-r1.json',q.projectMethod.logicalPath,
  'data/estimate-benchmarks/source-packs/access-control-system-balanced-s27-24.json','data/estimate-benchmarks/source-packs/access-control-six-whole-operation-references-r1.json'];
 return{contract:q.contract,stopCode:'ACS_WHOLE_QUANTITY_R3',applicationName:'acs-existing-whole-door-quantity-source',expectedBranch:ctx.expectedBranch,masterPath:ctx.masterPath,masterSha256:ctx.masterSha256,
  parentReleaseId:ctx.parentReleaseId,parentSearchReleaseId:ctx.parentSearchReleaseId,currentReleasePath:ctx.currentReleasePath,outputRoot:ctx.outputRoot,sourcePaths,catalogId:s.catalogId,sourceId:s.sourceId,
  normId:'PROJECT_SYSTEM:ACS_WHOLE_DOOR_EXACT_QUANTITY_R3',sourceMetadata:{source_title:'Состав и количественные основания выбранного дверного прохода',source_authority:'PROJECT_SYSTEM с точными первичными документами; не проект безопасности и не норма труда',source_kind:'PROJECT_SYSTEM',artifact_sha256:q.projectMethod.sha256,official_url:null,exact_locator:'acs-whole-door-r2-r752-quantity-r3:factory-wall-and-full-power-holds',use_restriction:'Только фактически выбранный полный internal profile; питание/аварийное освобождение/состав/source registry и 49 прежних needs не приняты.'},
  ...(ctx.capturedScopedNormativeRegistry===undefined?{}:{capturedScopedNormativeRegistry:ctx.capturedScopedNormativeRegistry}),
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:rows,shortInput:fixture,acceptanceInput:fixture,
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[61,36,36],benchmarkOrdinal:36,validationScenario:'EXISTING_ACS_WHOLE_SOURCE_QUANTITIES_WITH_VISIBLE_SOURCE_OBJECT_AND_CLASS_HOLDS',
  verifyTargetPrecondition:async(client,phase)=>{verifyBytes();await ctx.verifyTargetPrecondition(client,phase);verifyBytes();},
  verifyCore:async()=>{const result=await compileAccessControlWholeDoorValidationR3(),all=[...result.rows,...result.preliminaryNeeds];
   acsRequireR3(all.find(r=>r.row_id==='reference:acs:whole-door:r3:psu-ph1-driver')?.quantity==='1','DEFINED_ACTUAL_POST_STOCK');
   acsRequireR3(!all.some(r=>r.row_id==='reference:acs:whole-door:r2:controller-mount-fix'),'NO_EXTRA_FIXING_FOR_EXACT_FACTORY_WALL');
   return{status:'SOURCE_CONTRACT_ONLY_NOT_ORDINARY_OR_PHYSICAL_ACCEPTANCE',rowCount:result.rows.length,needCount:result.preliminaryNeeds.length,physicalClosures:0,sourceAdmission:false,FULL:false};},
  passport:{canonicalRuName:'Монтаж и наладка системы контроля доступа',workKey:'access_control_system',physicalResultRu:'Выбранный контролируемый проход установлен и представлен к полной проверке; выполнение и допуск подтверждаются отдельными фактическими результатами.',
   includedScopeRu:s.operationRoster.map(x=>x.operationTitleRu),excludedScopeRu:['CCTV, общая LAN, общая UPS и монтаж стойки остаются их владельцам.','Источник не проектирует эвакуацию и не подтверждает фактическую автономию.'],
   independentCompletenessMap:q.independentComposition,unresolvedApplicableResourceRowIds:q.resourceDeclarations.filter(x=>x.rowKind==='RESOURCE').map(x=>x.rowId)},
  applicability:{internalProfileId:s.profileId,quantityMethodId:q.methodId,currentParent:q.actualHeader,activationAllowed:false,productionEligible:false,automaticMigrationAllowed:false,fullTechnicalAcceptance:false},
  binding:{rowId:rows[0]!.row_id,additionalRowIds:rows.slice(1).map(r=>r.row_id),ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1',capturedSourcePreimage:{sourceKey:s.sourceId,expected:null}},
   applicability:{sourceReference:q.contract,internalProfileId:s.profileId,sourceAdmission:false},applicabilityByRowId:Object.fromEntries(q.resourceDeclarations.map(x=>[x.rowId,{formulaId:x.formulaId,operationIds:x.operationIds,sourceRole:'EXACT_SOURCE_WITH_VISIBLE_COMPOSITION_HOLDS'}]))},
  locator:{key:'acs-whole-door-r2-r752-quantity-r3:factory-wall-and-full-power-holds',payload:{contract:q.contract,independentCompletenessMap:q.independentComposition,sourceOwnedResourceDeclarations:q.resourceDeclarations,projectMethodSha256:q.projectMethod.sha256,sourceAdmission:false}},
  search:{primaryUom:'system',canonicalNameRu:'Монтаж и наладка системы контроля доступа',aliases:['СКУД контролируемый проход'],shortScopeRu:'Явно выбранный полный дверной метод с точными количественными основаниями и сохранёнными потребностями.',
   keyDistinguishingParameters:[s.decisionId,q.mountMethodId],clarificationFields:model.parameters.filter(p=>p.truth_metadata.value_source_role==='PROJECT_SPECIFIC_INPUT').map(p=>p.parameter_id),
   includedBoundaries:s.operationRoster.map(x=>x.operationTitleRu),excludedBoundaries:['Общая LAN/UPS, стойка и неподтверждённые технологии двери.'],extraSearchTermsRu:'СКУД дверь питание замок считыватель аварийное открытие проверка',sourceProvenance:{sourceId:s.sourceId,artifactSha256:q.projectMethod.sha256,preparedInternalReferenceOnly:true,sourceAdmission:false}},
  forbiddenAdjacentMatchers:[/cctv.system|видеонаблюден/iu,/general.lan|общ.*lan/iu,/general.ups|общ.*ups/iu],owner:'ACS_WHOLE_DOOR_QUANTITY_SOURCE_R3',receiptFileStem:'ACS_WHOLE_DOOR_QUANTITY_SOURCE_R3'};
}

/** Synthetic validation only. Every figure below is an explicit TEST_ONLY
 * source record; none is a production quantity, safe egress or autonomy fact. */
export function accessControlWholePassageValidationFixtureR5():Record<string,unknown>{
 const s=acsSourceR3,q=s.passageForwardR5,prior=accessControlWholeDoorValidationFixtureR3(),primary=['acs_system_count','acs_controlled_door_count','acs_controller_count','acs_reader_count','acs_lock_count','acs_exit_device_count','acs_door_contact_quantity_piece','acs_emergency_release_quantity_piece','acs_power_supply_quantity_piece','acs_standby_battery_quantity_piece','acs_controller_retained_spare_piece','acs_controller_supplier_pack_size_piece'],schema=accessControlWholePassageMeasuredModelR5(s.profileId),numeric=new Set(schema.parameters.filter(p=>['integer','decimal'].includes(p.value_type)).map(p=>p.parameter_id));
 const fixture:Record<string,unknown>=Object.fromEntries(Object.entries(prior).filter(([id])=>!numeric.has(id)||primary.includes(id)||s.organisationalInputs.some(p=>p.id===id)));
 return{...fixture,acs_controller_designation:'C2000-2 v2.75 TEST_ONLY',acs_reader_designation:'Proxy-3M rev6 TEST_ONLY',acs_lock_designation:'AL300 PRemium12V TEST_ONLY',acs_exit_device_designation:'AT-H805A TEST_ONLY',[q.quantityRecordId]:'TEST_ONLY reviewed same-batch netkg issue/return and actual cable route/service/end journal',[q.emergencyDecisionId]:'INDEPENDENT_RELEASE_AND_RESIDUAL_REVIEWED',acs_passage_actual_thread_locker_issued_kg_r5:'0.012',acs_passage_actual_thread_locker_returned_kg_r5:'0.007',acs_passage_actual_protective_paint_issued_kg_r5:'0.020',acs_passage_actual_protective_paint_returned_kg_r5:'0.005',acs_passage_actual_monitor_route_measured_m_r5:'17.4',acs_passage_actual_monitor_service_allowance_m_r5:'0.6',acs_passage_actual_monitor_end_allowance_m_r5:'0.3'};
}
export function compileAccessControlWholePassageValidationR5(input:Record<string,unknown>=accessControlWholePassageValidationFixtureR5(),rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={}){
 const s=acsSourceR3,m=accessControlWholePassageMeasuredModelR5(s.profileId);return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:s.passageForwardR5.contract,catalogId:s.catalogId,primaryMeasureParameterId:'acs_system_count',parameterDefinitions:[...m.parameters],formulaDefinitions:[...m.formulas],resourceDefinitions:[...m.resources],submittedParameters:Object.fromEntries(m.ordinaryParameterIds.map(id=>[id,input[id]])),confirmedParameters:input,rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:m.resources.length,hashJson:estimateDeterministicHash});
}

export function prepareAccessControlWholePassageConfigR5(ctx:AcsQuantityContextR3):MasterSingleDefinitionSuccessorConfig{
 const s=acsSourceR3,q=s.passageForwardR5;
 acsRequireR3(ctx.referencePointerMode==='PREPARED_NOT_ACTIVE_COPY'&&resolve(ctx.currentReleasePath).toLowerCase()!==resolve(ctx.selectedCurrentReleasePath).toLowerCase(),'PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');
 acsRequireR3(ctx.capturedParentByteSha256===q.actualCurrentParent.sha256&&acsByteShaR3(ctx.capturedParentPath)===q.actualCurrentParent.sha256,'EXACT_R867_PARENT_REQUIRED');
 const captured=JSON.parse(readFileSync(ctx.capturedParentPath,'utf8')),target=captured.results.find((x:Json)=>x.target?.catalogId===s.catalogId);
 acsRequireR3(target&&JSON.stringify(target.current.header)===JSON.stringify(q.actualHeader)&&target.currentBodyMatchesExistingReaderDigests===true&&captured.transactionRolledBack===true&&captured.connectionClosed===true,'CURRENT_HEADER_BODY_AND_READONLY_RECEIPT');
 acsRequireR3(ctx.parentReleaseId===captured.selectedReleaseId&&target.currentBody.parameters.length===61&&target.currentBody.formulas.length===36&&target.currentBody.resources.length===36,'EXACT_SELECTED_PARENT_SHAPE');
 const methodPath=resolve(ctx.sourceRoot,q.projectMethod.logicalPath);
 const verifyBytes=()=>{acsRequireR3(acsByteShaR3(methodPath)===q.projectMethod.sha256,'PROJECT_METHOD_BYTES');for(const p of q.primaryPins)acsRequireR3(acsByteShaR3(p.path)===p.sha256,'PRIMARY_BYTES:'+p.path);};verifyBytes();
 const model=accessControlWholePassageMeasuredModelR5(s.profileId),rows=model.resources,fixture=accessControlWholePassageValidationFixtureR5();
 const sourcePaths=['src/lib/estimate/v4/accessControlSystemR1.ts','tests/estimateNorms/accessControlSystemR1.contract.test.ts','scripts/estimate/r4a13/prepareS2724AccessControlSystemBalancedSuccessor.ts',
  'data/estimate-benchmarks/source-packs/access-control-single-door-method-r1.json',q.projectMethod.logicalPath,
  'data/estimate-benchmarks/source-packs/access-control-system-balanced-s27-24.json','data/estimate-benchmarks/source-packs/access-control-six-whole-operation-references-r1.json'];
 return{contract:q.contract,stopCode:'ACS_WHOLE_PASSAGE_MEASURED_R5',applicationName:'acs-existing-whole-passage-measured-source',expectedBranch:ctx.expectedBranch,masterPath:ctx.masterPath,masterSha256:ctx.masterSha256,
  parentReleaseId:ctx.parentReleaseId,parentSearchReleaseId:ctx.parentSearchReleaseId,currentReleasePath:ctx.currentReleasePath,outputRoot:ctx.outputRoot,sourcePaths,catalogId:s.catalogId,sourceId:s.sourceId,
  normId:'PROJECT_SYSTEM:ACS_WHOLE_PASSAGE_MEASURED_R5',sourceMetadata:{source_title:'Состав и количественные основания выбранного дверного прохода',source_authority:'PROJECT_SYSTEM с точными первичными документами; не проект безопасности и не норма труда',source_kind:'PROJECT_SYSTEM',artifact_sha256:q.projectMethod.sha256,official_url:null,exact_locator:'acs-whole-passage-r5:measured-mass-cable-and-independent-release',use_restriction:'Только фактически выбранный полный internal profile; питание/аварийное освобождение/состав/source registry и 49 прежних needs не приняты.'},
  ...(ctx.capturedScopedNormativeRegistry===undefined?{}:{capturedScopedNormativeRegistry:ctx.capturedScopedNormativeRegistry}),
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:rows,shortInput:fixture,acceptanceInput:fixture,
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[61,36,36],benchmarkOrdinal:36,validationScenario:'EXISTING_ACS_WHOLE_SOURCE_QUANTITIES_WITH_VISIBLE_SOURCE_OBJECT_AND_CLASS_HOLDS',
  verifyTargetPrecondition:async(client,phase)=>{verifyBytes();await ctx.verifyTargetPrecondition(client,phase);verifyBytes();},
  verifyCore:async()=>{const result=await compileAccessControlWholePassageValidationR5(),all=[...result.rows,...result.preliminaryNeeds];
   acsRequireR3(all.find(r=>r.row_id==='reference:acs:whole-door:r3:psu-ph1-driver')?.quantity==='1','DEFINED_ACTUAL_POST_STOCK');
   acsRequireR3(!all.some(r=>r.row_id==='reference:acs:whole-door:r2:controller-mount-fix'),'NO_EXTRA_FIXING_FOR_EXACT_FACTORY_WALL');
   acsRequireR3(all.find(r=>r.row_id==='reference:acs:whole-door:r2:monitor-field-cable')?.quantity==='18.3','ACTUAL_MEASURED_ROUTE_BALANCE');acsRequireR3(all.find(r=>r.row_id==='low-current:expanded-roster:r1:acs:thread-locker')?.quantity==='0.005','ACTUAL_SAME_BATCH_MASS_BALANCE');return{status:'SOURCE_CONTRACT_ONLY_NOT_ORDINARY_OR_PHYSICAL_ACCEPTANCE',rowCount:result.rows.length,needCount:result.preliminaryNeeds.length,physicalClosures:0,sourceAdmission:false,FULL:false};},
  passport:{canonicalRuName:'Монтаж и наладка системы контроля доступа',workKey:'access_control_system',physicalResultRu:'Выбранный контролируемый проход установлен и представлен к полной проверке; выполнение и допуск подтверждаются отдельными фактическими результатами.',
   includedScopeRu:s.operationRoster.map(x=>x.operationTitleRu),excludedScopeRu:['CCTV, общая LAN, общая UPS и монтаж стойки остаются их владельцам.','Источник не проектирует эвакуацию и не подтверждает фактическую автономию.'],
   independentCompletenessMap:q.independentComposition,unresolvedApplicableResourceRowIds:q.resourceDeclarations.filter(x=>x.rowKind==='RESOURCE').map(x=>x.rowId)},
  applicability:{internalProfileId:s.profileId,quantityMethodId:q.methodId,currentParent:q.actualHeader,activationAllowed:false,productionEligible:false,automaticMigrationAllowed:false,fullTechnicalAcceptance:false},
  binding:{rowId:rows[0]!.row_id,additionalRowIds:rows.slice(1).map(r=>r.row_id),ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1',capturedSourcePreimage:{sourceKey:s.sourceId,expected:null}},
   applicability:{sourceReference:q.contract,internalProfileId:s.profileId,sourceAdmission:false},applicabilityByRowId:Object.fromEntries(q.resourceDeclarations.map(x=>[x.rowId,{formulaId:x.formulaId,operationIds:x.operationIds,sourceRole:'EXACT_SOURCE_WITH_VISIBLE_COMPOSITION_HOLDS'}]))},
  locator:{key:'acs-whole-passage-r5:measured-mass-cable-and-independent-release',payload:{contract:q.contract,independentCompletenessMap:q.independentComposition,sourceOwnedResourceDeclarations:q.resourceDeclarations,projectMethodSha256:q.projectMethod.sha256,sourceAdmission:false}},
  search:{primaryUom:'system',canonicalNameRu:'Монтаж и наладка системы контроля доступа',aliases:['СКУД контролируемый проход'],shortScopeRu:'Явно выбранный полный дверной метод с точными количественными основаниями и сохранёнными потребностями.',
   keyDistinguishingParameters:[s.decisionId,q.mountMethodId],clarificationFields:model.parameters.filter(p=>p.truth_metadata.value_source_role==='PROJECT_SPECIFIC_INPUT').map(p=>p.parameter_id),
   includedBoundaries:s.operationRoster.map(x=>x.operationTitleRu),excludedBoundaries:['Общая LAN/UPS, стойка и неподтверждённые технологии двери.'],extraSearchTermsRu:'СКУД дверь питание замок считыватель аварийное открытие проверка',sourceProvenance:{sourceId:s.sourceId,artifactSha256:q.projectMethod.sha256,preparedInternalReferenceOnly:true,sourceAdmission:false}},
  forbiddenAdjacentMatchers:[/cctv.system|видеонаблюден/iu,/general.lan|общ.*lan/iu,/general.ups|общ.*ups/iu],owner:'ACS_WHOLE_PASSAGE_MEASURED_SOURCE_R5',receiptFileStem:'ACS_WHOLE_PASSAGE_MEASURED_SOURCE_R5'};
}


import{ACS_WHOLE_KIT_MEASUREMENT_SOURCE_R6,accessControlWholePassageKitMeasuredModelR6}from'../../../src/lib/estimate/v4/accessControlSystemR1';
/** Explicit TEST_ONLY measured journal; no value is an actual object default. */
export function accessControlWholePassageKitValidationFixtureR6():Record<string,unknown>{
 return{...accessControlWholePassageValidationFixtureR5(),
  acs_passage_actual_mains_route_m_r6:'15.2',acs_passage_actual_mains_service_m_r6:'0.4',
  acs_passage_actual_mains_ends_m_r6:'0.6',acs_passage_actual_insulation_cut_total_mm_r6:'347.5'};
}
export function compileAccessControlWholePassageKitValidationR6(
 input:Record<string,unknown>=accessControlWholePassageKitValidationFixtureR6(),
 rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={}){
 const s=acsSourceR3,q=ACS_WHOLE_KIT_MEASUREMENT_SOURCE_R6,m=accessControlWholePassageKitMeasuredModelR6(s.profileId);
 return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',
  compilerVersion:q.contract,catalogId:s.catalogId,primaryMeasureParameterId:'acs_system_count',
  parameterDefinitions:[...m.parameters],formulaDefinitions:[...m.formulas],resourceDefinitions:[...m.resources],
  submittedParameters:Object.fromEntries(m.ordinaryParameterIds.filter(id=>input[id]!==undefined).map(id=>[id,input[id]])),
  confirmedParameters:input,rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:m.resources.length,
  hashJson:estimateDeterministicHash});
}


/** Same existing Master publisher; actual R977 prepared-reference parent and
 * untouched normal/locked/scoped-registry authority checks are required. */
export function prepareAccessControlWholePassageKitConfigR6(ctx:AcsQuantityContextR3):MasterSingleDefinitionSuccessorConfig{
 const s=acsSourceR3,q=s.kitForwardR6;
 acsRequireR3(ctx.referencePointerMode==='PREPARED_NOT_ACTIVE_COPY'&&resolve(ctx.currentReleasePath).toLowerCase()!==resolve(ctx.selectedCurrentReleasePath).toLowerCase(),'PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');
 acsRequireR3(ctx.capturedParentByteSha256===q.actualCurrentParent.sha256&&acsByteShaR3(ctx.capturedParentPath)===q.actualCurrentParent.sha256,'EXACT_R977_PARENT_REQUIRED');
 const captured=JSON.parse(readFileSync(ctx.capturedParentPath,'utf8')),target=captured.results.find((x:Json)=>x.target?.catalogId===s.catalogId&&x.target?.sourceId===q.actualPublishedSourceId);
 acsRequireR3(target&&JSON.stringify(target.reference.header)===JSON.stringify(q.actualHeader)&&JSON.stringify(target.current.header)===JSON.stringify(q.actualHeader)&&target.currentBodyMatchesExistingReaderDigests===true&&(['parameters','formulas','resources']as const).every(k=>JSON.stringify(target.referenceBody[k])===JSON.stringify(q.nativeParentModel[k]))&&captured.transactionRolledBack===true&&captured.connectionClosed===true,'CURRENT_HEADER_BODY_AND_READONLY_RECEIPT');
 acsRequireR3(ctx.parentReleaseId===captured.referenceReleaseId&&ctx.parentReleaseId===q.actualReferenceReleaseId&&captured.selectedReleaseId===q.actualSelectedReleaseId&&captured.referenceReleaseId!==captured.selectedReleaseId&&target.referenceBody.parameters.length===61&&target.referenceBody.formulas.length===36&&target.referenceBody.resources.length===36,'EXACT_PREPARED_REFERENCE_R977_PARENT_SHAPE');
 acsRequireR3(typeof ctx.verifyTargetPrecondition==='function','ACTUAL_NORMAL_LOCKED_AUTHORITY_GUARD_REQUIRED');
 const methodPath=resolve(ctx.sourceRoot,q.projectMethod.logicalPath),priorMethodPath=resolve(ctx.sourceRoot,q.priorMethodPath);
 const verifyBytes=()=>{acsRequireR3(acsByteShaR3(methodPath)===q.projectMethod.sha256,'PROJECT_METHOD_BYTES');acsRequireR3(acsByteShaR3(priorMethodPath)===s.passageForwardR5.projectMethod.sha256,'PRIOR_R5_METHOD_BYTES');for(const p of q.primaryPins)acsRequireR3(acsByteShaR3(p.path)===p.sha256,'PRIMARY_BYTES:'+p.path);};verifyBytes();
 const model=accessControlWholePassageKitMeasuredModelR6(s.profileId),rows=model.resources,fixture=accessControlWholePassageKitValidationFixtureR6();
 const sourcePaths=['src/lib/estimate/v4/accessControlSystemR1.ts','tests/estimateNorms/accessControlSystemR1.contract.test.ts','scripts/estimate/r4a13/prepareS2724AccessControlSystemBalancedSuccessor.ts',
  'data/estimate-benchmarks/source-packs/access-control-single-door-method-r1.json',q.projectMethod.logicalPath,q.priorMethodPath,
  'data/estimate-benchmarks/source-packs/access-control-system-balanced-s27-24.json','data/estimate-benchmarks/source-packs/access-control-six-whole-operation-references-r1.json'];
 return{contract:q.contract,stopCode:'ACS_WHOLE_PASSAGE_KIT_MEASURED_R6',applicationName:'acs-existing-whole-passage-kit-measured-source',expectedBranch:ctx.expectedBranch,masterPath:ctx.masterPath,masterSha256:ctx.masterSha256,
  parentReleaseId:ctx.parentReleaseId,parentSearchReleaseId:ctx.parentSearchReleaseId,currentReleasePath:ctx.currentReleasePath,outputRoot:ctx.outputRoot,sourcePaths,catalogId:s.catalogId,sourceId:s.sourceId,
  normId:'PROJECT_SYSTEM:ACS_WHOLE_PASSAGE_KIT_MEASURED_R6',sourceMetadata:{source_title:'Состав и количественные основания выбранного дверного прохода',source_authority:'PROJECT_SYSTEM с точными первичными документами; не проект безопасности и не норма труда',source_kind:'PROJECT_SYSTEM',artifact_sha256:q.projectMethod.sha256,official_url:null,exact_locator:'acs-whole-passage-r6:exact-optional-kit-and-measured-route-cuts',use_restriction:'Только фактически выбранный полный internal profile; питание/аварийное освобождение/состав/source registry и 49 прежних needs не приняты.'},
  ...(ctx.capturedScopedNormativeRegistry===undefined?{}:{capturedScopedNormativeRegistry:ctx.capturedScopedNormativeRegistry}),
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:rows,shortInput:fixture,acceptanceInput:fixture,
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[61,36,36],benchmarkOrdinal:36,validationScenario:'EXISTING_ACS_WHOLE_SOURCE_QUANTITIES_WITH_VISIBLE_SOURCE_OBJECT_AND_CLASS_HOLDS',
  verifyTargetPrecondition:async(client,phase)=>{verifyBytes();await ctx.verifyTargetPrecondition(client,phase);verifyBytes();},
  verifyCore:async()=>{const result=await compileAccessControlWholePassageKitValidationR6(),all=[...result.rows,...result.preliminaryNeeds];
   acsRequireR3(all.find(r=>r.row_id==='reference:acs:whole-door:r3:psu-ph1-driver')?.quantity==='1','DEFINED_ACTUAL_POST_STOCK');
   acsRequireR3(!all.some(r=>r.row_id==='reference:acs:whole-door:r2:controller-mount-fix'),'NO_EXTRA_FIXING_FOR_EXACT_FACTORY_WALL');
   acsRequireR3(all.find(r=>r.row_id==='reference:acs:whole-door:r2:mains-cable')?.quantity==='16.2','ACTUAL_MAINS_MEASURED_ROUTE');acsRequireR3(all.find(r=>r.row_id==='reference:acs:whole-door:r2:heatshrink')?.quantity==='0.3475','ACTUAL_TUBE_CUT_SUM_MM_TO_M');acsRequireR3(all.find(r=>r.row_id==='low-current:expanded-roster:r1:acs:thread-locker')?.quantity==='0.005','ACTUAL_SAME_BATCH_MASS_BALANCE');return{status:'SOURCE_CONTRACT_ONLY_NOT_ORDINARY_OR_PHYSICAL_ACCEPTANCE',rowCount:result.rows.length,needCount:result.preliminaryNeeds.length,physicalClosures:0,sourceAdmission:false,FULL:false};},
  passport:{canonicalRuName:'Монтаж и наладка системы контроля доступа',workKey:'access_control_system',physicalResultRu:'Выбранный контролируемый проход установлен и представлен к полной проверке; выполнение и допуск подтверждаются отдельными фактическими результатами.',
   includedScopeRu:s.operationRoster.map(x=>x.operationTitleRu),excludedScopeRu:['CCTV, общая LAN, общая UPS и монтаж стойки остаются их владельцам.','Источник не проектирует эвакуацию и не подтверждает фактическую автономию.'],
   independentCompletenessMap:q.independentComposition,unresolvedApplicableResourceRowIds:q.resourceDeclarations.filter(x=>x.rowKind==='RESOURCE').map(x=>x.rowId)},
  applicability:{internalProfileId:s.profileId,quantityMethodId:q.methodId,currentParent:q.actualHeader,activationAllowed:false,productionEligible:false,automaticMigrationAllowed:false,fullTechnicalAcceptance:false},
  binding:{rowId:rows[0]!.row_id,additionalRowIds:rows.slice(1).map(r=>r.row_id),ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1',capturedSourcePreimage:{sourceKey:s.sourceId,expected:null}},
   applicability:{sourceReference:q.contract,internalProfileId:s.profileId,sourceAdmission:false},applicabilityByRowId:Object.fromEntries(q.resourceDeclarations.map(x=>[x.rowId,{formulaId:x.formulaId,operationIds:x.operationIds,sourceRole:'EXACT_SOURCE_WITH_VISIBLE_COMPOSITION_HOLDS'}]))},
  locator:{key:'acs-whole-passage-r6:exact-optional-kit-and-measured-route-cuts',payload:{contract:q.contract,independentCompletenessMap:q.independentComposition,sourceOwnedResourceDeclarations:q.resourceDeclarations,projectMethodSha256:q.projectMethod.sha256,sourceOrigin:{source_document_version:q.contract,definition_hash:q.projectMethod.sha256},actualReferenceParent:q.actualHeader,actualProof:q.actualCurrentParent,registryCaptureRequired:true,sourceAdmission:false}},
  search:{primaryUom:'system',canonicalNameRu:'Монтаж и наладка системы контроля доступа',aliases:['СКУД контролируемый проход'],shortScopeRu:'Явно выбранный полный дверной метод с точными количественными основаниями и сохранёнными потребностями.',
   keyDistinguishingParameters:[s.decisionId,s.quantityForwardR3.mountMethodId],clarificationFields:model.parameters.filter(p=>p.truth_metadata.value_source_role==='PROJECT_SPECIFIC_INPUT').map(p=>p.parameter_id),
   includedBoundaries:s.operationRoster.map(x=>x.operationTitleRu),excludedBoundaries:['Общая LAN/UPS, стойка и неподтверждённые технологии двери.'],extraSearchTermsRu:'СКУД дверь питание замок считыватель аварийное открытие проверка',sourceProvenance:{sourceId:s.sourceId,artifactSha256:q.projectMethod.sha256,preparedInternalReferenceOnly:true,sourceAdmission:false}},
  forbiddenAdjacentMatchers:[/cctv.system|видеонаблюден/iu,/general.lan|общ.*lan/iu,/general.ups|общ.*ups/iu],owner:'ACS_WHOLE_PASSAGE_KIT_MEASURED_SOURCE_R6',receiptFileStem:'ACS_WHOLE_PASSAGE_KIT_MEASURED_SOURCE_R6'};
}
