import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID,
  ADDRESSABLE_SMOKE_DETECTOR_FORMULAS,
  ADDRESSABLE_SMOKE_DETECTOR_NORM_ID,
  ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS,
  ADDRESSABLE_SMOKE_DETECTOR_RESOURCES,
  ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_CLASSIFICATION,
  ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_SOURCE_IDS,
  ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID,
  ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA,
  compileAddressableSmokeDetectorR1,
} from "../../../src/lib/estimate/v4/addressableSmokeDetectorR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileAddressableSmokeDetectorR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

async function verifyCore(): Promise<Json> {
  const first = await compileAddressableSmokeDetectorR1({
    ...ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  });
  const complete = await compileAddressableSmokeDetectorR1({
    ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
  });
  const balanced = await compileAddressableSmokeDetectorR1({
    ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
    detector_retained_spare_piece: 2,
    detector_supplier_pack_size_piece: 10,
    base_retained_spare_piece: 1,
    base_supplier_pack_size_piece: 20,
  });
  const conditional = await compileAddressableSmokeDetectorR1({
    ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
    loop_isolator_mode: "REQUIRED",
    loop_isolator_designation: "Изолятор адресного шлейфа по схеме",
    loop_isolator_quantity_piece: 2,
    junction_box_mode: "REQUIRED",
    junction_box_designation: "Коробка E30 по узлу",
    junction_box_quantity_piece: 5,
  });
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  if (!(first.rows.length === 16 && first.preliminaryNeeds.length === 12
    && quantity(first, "rc09:addressable_smoke_detector_install") === "25"
    && quantity(first, "rc09:addressable_optical_smoke_detector") === "25"
    && quantity(first, "rc09:addressable_detector_base") === "25"
    && first.rows.filter((row) => row.included_in_procurement).length === 3)) {
    throw new Error("STOP_S27_24_ADDRESSABLE_DETECTOR_FIRST_ESTIMATE");
  }
  for (const rowId of [
    "rc09:detector_fire_resistant_fastener", "rc09:smoke_detector_test_aerosol",
    "rc09:smoke_detector_test_dispenser", "rc09:smoke_detector_activation_record",
    "rc09:addressable_loop_isolator", "rc09:fire_resistant_junction_box",
    "rc09:labor:installation", "rc09:labor:programming-testing",
    "rc09:equipment:mounting-tool", "rc09:equipment:loop-programmer",
    "rc09:logistics:delivery", "rc09:logistics:waste-removal",
  ]) if (!needs.has(rowId)) {
    throw new Error(`STOP_S27_24_ADDRESSABLE_DETECTOR_NEED:${rowId}`);
  }
  if (!(complete.rows.length === 26 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:detector_fire_resistant_fastener") === "25"
    && quantity(complete, "rc09:smoke_detector_test_aerosol") === "0.18"
    && quantity(complete, "rc09:labor:installation") === "15"
    && quantity(complete, "rc09:equipment:loop-programmer") === "4"
    && quantity(complete, "rc09:logistics:delivery") === "1")) {
    throw new Error("STOP_S27_24_ADDRESSABLE_DETECTOR_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:detector-balance:installed-net") === "25"
    && quantity(balanced, "rc09:detector-balance:retained-spare") === "2"
    && quantity(balanced, "rc09:detector-balance:total-need") === "27"
    && quantity(balanced, "rc09:detector-balance:package-count") === "3"
    && quantity(balanced, "rc09:addressable_optical_smoke_detector") === "30"
    && quantity(balanced, "rc09:detector-balance:remainder") === "5"
    && quantity(balanced, "rc09:detector-balance:surplus-beyond-reserve") === "3"
    && quantity(balanced, "rc09:base-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:base-balance:total-need") === "26"
    && quantity(balanced, "rc09:base-balance:package-count") === "2"
    && quantity(balanced, "rc09:addressable_detector_base") === "40"
    && quantity(balanced, "rc09:base-balance:remainder") === "15"
    && quantity(balanced, "rc09:base-balance:surplus-beyond-reserve") === "14")) {
    throw new Error("STOP_S27_24_ADDRESSABLE_DETECTOR_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 28 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_ADDRESSABLE_DETECTOR_CONDITIONAL_PROFILE");
  }
  const ownedRows = ADDRESSABLE_SMOKE_DETECTOR_RESOURCES
    .map((row) => `${row.row_id} ${row.title_ru}`).join("\n");
  if (/(?:fire.alarm.loop.cable|fire.alarm.control.panel|sounder|power.supply|full.fire.alarm.system)/iu
    .test(ownedRows)) {
    throw new Error("STOP_S27_24_ADDRESSABLE_DETECTOR_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_ADDRESSABLE_SMOKE_DETECTOR_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      knownDetectorCount: ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT.detector_count,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id) },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      detector: {
        installedPiece: quantity(balanced, "rc09:detector-balance:installed-net"),
        retainedSparePiece: quantity(balanced, "rc09:detector-balance:retained-spare"),
        totalNeedPiece: quantity(balanced, "rc09:detector-balance:total-need"),
        packageCount: quantity(balanced, "rc09:detector-balance:package-count"),
        orderedPiece: quantity(balanced, "rc09:addressable_optical_smoke_detector"),
        remainderPiece: quantity(balanced, "rc09:detector-balance:remainder"),
        surplusBeyondReservePiece:
          quantity(balanced, "rc09:detector-balance:surplus-beyond-reserve"),
      },
      base: {
        installedPiece: quantity(balanced, "rc09:base-balance:installed-net"),
        retainedSparePiece: quantity(balanced, "rc09:base-balance:retained-spare"),
        totalNeedPiece: quantity(balanced, "rc09:base-balance:total-need"),
        packageCount: quantity(balanced, "rc09:base-balance:package-count"),
        orderedPiece: quantity(balanced, "rc09:addressable_detector_base"),
        remainderPiece: quantity(balanced, "rc09:base-balance:remainder"),
        surplusBeyondReservePiece:
          quantity(balanced, "rc09:base-balance:surplus-beyond-reserve"),
      },
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

if(require.main===module){
void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.addressable-smoke-detector-balanced-successor.v2",
  stopCode: "S27_24_ADDRESSABLE_SMOKE_DETECTOR_BALANCED",
  applicationName: "s27-24-addressable-smoke-detector-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "86216a7e-d589-58bc-b036-45114384575b",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "035c2091-e930-5cbe-a05c-c9852e56516f",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/addressable-smoke-detector-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/addressable-smoke-detector-balanced-s27-24.json",
    "src/lib/estimate/v4/addressableSmokeDetectorR1.ts",
    "tests/estimateNorms/addressableSmokeDetectorR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724AddressableSmokeDetectorBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724AddressableSmokeDetectorBalancedIndependent.ts",
  ],
  catalogId: ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID,
  sourceId: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID,
  normId: ADDRESSABLE_SMOKE_DETECTOR_NORM_ID,
  sourceMetadata: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA,
  parameterDefinitions: ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS,
  formulaDefinitions: ADDRESSABLE_SMOKE_DETECTOR_FORMULAS,
  resourceDefinitions: ADDRESSABLE_SMOKE_DETECTOR_RESOURCES,
  shortInput: ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  acceptanceInput: ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
  runtimeProfileInput: ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT,
  runtimeProfileClassification: ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [17, 10, 10],
  benchmarkOrdinal: 26,
  validationScenario: "MASTER_BENCHMARK_26_ADDRESSABLE_SMOKE_DETECTOR_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж адресного оптико-электронного дымового извещателя с базой",
    workKey: "electrical_interior_fire_alarm_install_standard",
    physicalResultRu:
      "Выбранные адресные дымовые извещатели с совместимыми базами установлены, промаркированы, адресованы и проверены по программе пусконаладки",
    includedScopeRu: [
      "монтаж известного количества извещателей и совместимых баз точных выбранных марок",
      "индивидуальная адресная метка на установленное устройство",
      "видимые раздельные балансы извещателей и баз: установка, резерв, упаковка, заказ и остаток",
      "крепёж и тестовый аэрозоль только по проекту и программе ПНР",
      "труд монтажников и наладчиков, монтажный инструмент, устройство подачи аэрозоля и программатор по ППР и программе ПНР",
      "протокол адресации и срабатывания, доставка и вывоз отходов по проектным документам",
      "изоляторы шлейфа и огнестойкие коробки только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "кабель адресного шлейфа", "приёмно-контрольный прибор",
      "оповещатели и блок питания", "полная система пожарной сигнализации",
      "автоматический выбор извещателя, базы или топологии",
      "универсальные нормы расхода, производительности или неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_ADDRESSABLE_OPTICAL_SMOKE_DETECTOR",
    detectorSystem: "ADDRESSABLE_OPTICAL_SMOKE_WITH_MATCHED_BASE",
    primaryMeasureParameterId: "detector_count",
    knownScopeParameters: [
      "detector_type", "base_type", "detector_product_designation",
      "base_product_designation",
    ],
    visibleProcurementBalance: true,
    projectPackageRequiredForFixingTestingLaborEquipmentQaAndLogistics: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    loopCableExcluded: true,
    controlPanelExcluded: true,
    sounderAndPowerExcluded: true,
    fullFireAlarmSystemExcluded: true,
  },
  binding: {
    rowId: "rc09:addressable_smoke_detector_install",
    applicability: {
      technology_class: "ADDRESSABLE_OPTICAL_SMOKE_DETECTOR",
      operation_class: "INSTALL_ADDRESSABLE_OPTICAL_SMOKE_DETECTOR",
      detector_system: "ADDRESSABLE_OPTICAL_SMOKE_WITH_MATCHED_BASE",
      scope_mode:
        "KNOWN_SELECTED_DEVICE_AND_BASE_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID,
      norm_id: ADDRESSABLE_SMOKE_DETECTOR_NORM_ID,
      exact_locator: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_qa_rates_claimed: false,
      quantity_basis:
        "KNOWN_DEVICE_CARDINALITY_PLUS_VISIBLE_PACKAGING_AND_APPROVED_PROJECT_METHOD_QA_LOGISTICS",
    },
  },
  locator: {
    key: "addressable-smoke-detector-project-balance-s27-24-v2",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.exact_locator,
      sourcePackSha256: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "detector_count", "detector_type", "base_type",
        "detector_product_designation", "base_product_designation",
      ],
      visiblePreliminaryBalanceInputs:
        Object.keys(ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT),
      directProjectInputs: [
        "fastener_designation", "fastener_quantity_set",
        "aerosol_designation", "aerosol_volume_l",
        "dispenser_designation", "dispenser_machine_hour",
        "activation_protocol_designation", "activation_protocol_quantity_document",
        "detector_installation_labor_h", "detector_programming_testing_labor_h",
        "detector_mounting_tool_machine_h", "addressable_loop_programmer_machine_h",
        "detector_delivery_trip_count", "detector_waste_removal_trip_count",
      ],
      conditionalInputs: [
        "loop_isolator_mode", "loop_isolator_designation", "loop_isolator_quantity_piece",
        "junction_box_mode", "junction_box_designation", "junction_box_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Монтаж адресного оптико-электронного дымового извещателя с базой",
    aliases: [
      "монтаж адресного дымового пожарного извещателя",
      "адресный оптический дымовой датчик с базой",
      "addressable optical smoke detector installation",
      "установка адресного извещателя пожарной сигнализации",
    ],
    shortScopeRu:
      "Монтаж 25 выбранных адресных оптических дымовых извещателей DET-A25-OPT с совместимыми базами BASE-A25 и видимыми раздельными балансами закупки; крепёж, ПНР, труд, инструмент и логистика уточняются по проектным документам.",
    keyDistinguishingParameters: [
      "detector_count", "detector_type", "detector_product_designation",
      "base_type", "base_product_designation",
    ],
    clarificationFields: ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "detector_count", "detector_type", "detector_product_designation",
        "base_type", "base_product_designation",
      ].includes(parameterId)),
    includedBoundaries: [
      "выбранные извещатели, совместимые базы и адресные метки",
      "видимый баланс резерва, упаковок, заказа и остатка для извещателей и баз",
      "проектные крепёж, аэрозоль, труд, инструмент, ПНР, протоколы и логистика",
      "условные изоляторы шлейфа и огнестойкие коробки",
    ],
    excludedBoundaries: [
      "кабель шлейфа пожарной сигнализации", "приёмно-контрольный прибор",
      "оповещатели и блок питания", "полная система пожарной сигнализации",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "АПС адресный дымовой оптический извещатель датчик база адрес метка резерв упаковка закупка крепёж аэрозоль тестер программатор ПНР протокол изолятор коробка труд доставка",
    sourceProvenance: {
      exactAddressableSmokeDetectorOwner: true,
      exactSelectedDetectorAndBaseRequired: true,
      visibleProcurementBalance: true,
      exactProjectMethodQaLaborEquipmentAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /fire.alarm.loop.cable|кабел.*шлейф/iu,
    /fire.alarm.control.panel|при[её]мн.*контрол.*прибор/iu,
    /sounder|оповещател/iu,
    /power.supply|блок.*питан/iu,
    /full.fire.alarm.system|полн.*систем.*пожарн.*сигнал/iu,
  ],
  owner: "S27_24_ADDRESSABLE_SMOKE_DETECTOR_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_ADDRESSABLE_SMOKE_DETECTOR_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

}

import {readFileSync}from'node:fs';
import {SMOKE_WHOLE_SOURCE_R1 as smokeSource,addressableSmokeWholeDeviceModelR1}from'../../../src/lib/estimate/v4/addressableSmokeDetectorR1';
import {compileCanonicalEstimateCore}from'../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash}from'../../../src/lib/estimate/estimateDeterministicHash';
import type{MasterSingleDefinitionSuccessorConfig}from'./prepareMasterSingleDefinitionSuccessorR1';
type SmokeWholeContextR1=Readonly<{parentReleaseId:string;parentSearchReleaseId:string;currentReleasePath:string;selectedCurrentReleasePath:string;referencePointerMode:'PREPARED_NOT_ACTIVE_COPY';outputRoot:string;expectedBranch:string;masterPath:string;masterSha256:string;sourceRoot:string;capturedParentPath:string;capturedParentByteSha256:string;verifyTargetPrecondition:NonNullable<MasterSingleDefinitionSuccessorConfig['verifyTargetPrecondition']>;capturedScopedNormativeRegistry?:MasterSingleDefinitionSuccessorConfig['capturedScopedNormativeRegistry']}>;
const smokeRequire=(ok:unknown,message:string)=>{if(!ok)throw Error('STOP_SMOKE_WHOLE_R1_'+message);},smokeByteSha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
/** TEST_ONLY reviewed records and whole group supply inputs, never a project
 * selection, automatic norm, production default or physical test result. */
export function addressableSmokeWholeValidationFixtureR1(){const s=smokeSource;return{detector_count:1,detector_type:'ADDRESSABLE_OPTICAL_SMOKE',base_type:'MATCHED_ADDRESSABLE_DETECTOR_BASE',detector_product_designation:'DIP-34A-03 TEST_ONLY',base_product_designation:'MATCHED_NEW_SUPPLIED_BASE TEST_ONLY',detector_retained_spare_piece:0,detector_supplier_pack_size_piece:10,loop_isolator_mode:'NOT_REQUIRED',junction_box_mode:'NOT_REQUIRED',...Object.fromEntries(s.actualRecords.map(f=>[f.id,'TEST_ONLY:'+f.id])),[s.decisionId]:'DOCUMENTED_COMPATIBLE',[s.mountId]:'DIRECT_BASE_REVIEWED',[s.supplyId]:'SEALED_GROUP10_REVIEWED',[s.programmeId]:'FULL_SMOKE_RESTORE_REVIEWED',[s.addressId]:'KDL_PC_LIGHTGUIDE_REVIEWED',[s.cageId]:'NOT_REQUIRED'}as Record<string,unknown>;}
export function compileAddressableSmokeWholeValidationR1(input=addressableSmokeWholeValidationFixtureR1(),rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={}){const s=smokeSource,m=addressableSmokeWholeDeviceModelR1();return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:s.contract,catalogId:s.catalogId,primaryMeasureParameterId:'detector_count',parameterDefinitions:[...m.parameters],formulaDefinitions:[...m.formulas],resourceDefinitions:[...m.resources],submittedParameters:{detector_count:input.detector_count},confirmedParameters:input,rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:m.resources.length,hashJson:estimateDeterministicHash});}
/** Existing ordinary Master publisher config. Normal/locked preimages,
 * registry, unit, factory and independent composition guards stay intact. */
export function prepareAddressableSmokeWholeConfigR1(ctx:SmokeWholeContextR1):MasterSingleDefinitionSuccessorConfig{
 const s=smokeSource;smokeRequire(ctx.referencePointerMode==='PREPARED_NOT_ACTIVE_COPY'&&resolve(ctx.currentReleasePath).toLowerCase()!==resolve(ctx.selectedCurrentReleasePath).toLowerCase(),'PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');smokeRequire(ctx.capturedParentByteSha256===s.actualCurrentParent.sha256&&smokeByteSha(ctx.capturedParentPath)===s.actualCurrentParent.sha256,'EXACT_R858_PARENT');const p=JSON.parse(readFileSync(ctx.capturedParentPath,'utf8')),t=p.results.find((x:Json)=>x.target?.catalogId===s.catalogId);smokeRequire(t&&JSON.stringify(t.current.header)===JSON.stringify(s.actualHeader)&&t.currentBodyMatchesExistingReaderDigests===true&&p.transactionRolledBack===true&&p.connectionClosed===true&&ctx.parentReleaseId===p.selectedReleaseId,'CURRENT_HEADER_BODY_READONLY_SELECTED_PARENT');smokeRequire(t.currentBody.parameters.length===29&&t.currentBody.formulas.length===28&&t.currentBody.resources.length===28,'CURRENT_29_28_28');
 const verifyBytes=()=>{smokeRequire(smokeByteSha(resolve(ctx.sourceRoot,s.projectMethod.logicalPath))===s.projectMethod.sha256,'METHOD_BYTES');for(const f of s.primaryPins)smokeRequire(smokeByteSha(f.path)===f.sha256,'PRIMARY_BYTES:'+f.path);};verifyBytes();const m=addressableSmokeWholeDeviceModelR1(),rows=m.resources,f=addressableSmokeWholeValidationFixtureR1();
 return{contract:s.contract,stopCode:'SMOKE_WHOLE_R1',applicationName:'existing-addressable-smoke-whole-device-source',expectedBranch:ctx.expectedBranch,masterPath:ctx.masterPath,masterSha256:ctx.masterSha256,parentReleaseId:ctx.parentReleaseId,parentSearchReleaseId:ctx.parentSearchReleaseId,currentReleasePath:ctx.currentReleasePath,outputRoot:ctx.outputRoot,sourcePaths:['src/lib/estimate/v4/addressableSmokeDetectorR1.ts','tests/estimateNorms/addressableSmokeDetectorR1.contract.test.ts','scripts/estimate/r4a13/prepareS2724AddressableSmokeDetectorBalancedSuccessor.ts','data/estimate-benchmarks/source-packs/addressable-smoke-detector-balanced-s27-24.json',s.projectMethod.logicalPath],catalogId:s.catalogId,sourceId:s.sourceId,normId:'PROJECT_ADDRESSABLE_SMOKE_WHOLE_DEVICE_METHOD_R1',sourceMetadata:{source_title:s.titleRu,source_kind:'PROJECT_SYSTEM',source_authority:'Первичные документы изготовителя и обязательные фактические проектные/ППР/QA записи',artifact_sha256:s.projectMethod.sha256,official_url:null,exact_locator:'DIP34A03Rev14-PDF6/8/9/11-17-full12operation-device-cycle',use_restriction:'Only exact selected device/newbase/currentKDL/sealedgroup10 method with16actualrecords. No automatic project/safety design, loopcable/panel/PSU/wholeFAS or paymentnorm.'},...(ctx.capturedScopedNormativeRegistry===undefined?{}:{capturedScopedNormativeRegistry:ctx.capturedScopedNormativeRegistry}),parameterDefinitions:m.parameters,formulaDefinitions:m.formulas,resourceDefinitions:rows,shortInput:f,acceptanceInput:f,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[29,28,28],benchmarkOrdinal:24,validationScenario:'EXISTING_ATOMIC_SMOKE_FULL_DEVICE_CYCLE_WITH_VISIBLE_QUANTITY_AND_OBJECT_HOLDS',verifyTargetPrecondition:async(client,phase)=>{verifyBytes();await ctx.verifyTargetPrecondition(client,phase);verifyBytes();},verifyCore:async()=>{const r=await compileAddressableSmokeWholeValidationR1(),all=[...r.rows,...r.preliminaryNeeds];for(const[id,qty]of[['rc09:addressable_optical_smoke_detector','10'],['rc09:addressable_detector_base','10'],['rc09:detector_address_label','1'],['reference:smoke:factory:dust-cap','10'],['reference:smoke:factory:group-manual','1']]as const)smokeRequire(all.find(x=>x.row_id===id)?.quantity===qty,'SOURCE_QUANTITY_EXPRESSION:'+id);return{status:'SOURCE_CONTRACT_ONLY',actualProjectApproved:false,actualSmokeProgrammeExecuted:false,wholeFASPass:false,sourceAdmission:false,physicalClosures:0,FULL:false};},
  passport:{canonicalRuName:s.titleRu,workKey:'electrical_interior_fire_alarm_install_standard',physicalResultRu:'Выбранный дымовой адресный извещатель закреплён, подключён, адресован и представлен к дымовой проверке и сдаче; фактическое выполнение подтверждается отдельно.',includedScopeRu:s.operationRoster.map(o=>o.operationTitleRu),excludedScopeRu:['Кабель шлейфа, ППКП, оповещатели, блок питания и полная АПС.','Автоматический выбор размещения/системы и неподтверждённые нормы/цены.'],independentCompletenessMap:s.independentComposition,unresolvedApplicableResourceRowIds:s.resourceDeclarations.filter(d=>d.rowKind==='RESOURCE').map(d=>d.rowId)},applicability:{methodId:s.candidateMethodId,actualCurrentParent:s.actualHeader,activationAllowed:false,productionEligible:false,broadPrimaryReplacement:false,fullTechnicalAcceptance:false},binding:{rowId:'rc09:addressable_smoke_detector_install',additionalRowIds:rows.filter(r=>r.row_id!=='rc09:addressable_smoke_detector_install').map(r=>r.row_id),ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1',capturedSourcePreimage:{sourceKey:s.sourceId,expected:null}},applicability:{internalMethodId:s.candidateMethodId,sourceAdmission:false},applicabilityByRowId:Object.fromEntries(s.resourceDeclarations.map(d=>[d.rowId,{formulaId:d.formulaId,operationIds:d.operationIds,sourceRole:'EXACT_DEVICE_CYCLE_WITH_VISIBLE_SOURCE_AND_COMPOSITION_HOLDS'}]))},locator:{key:'addressable-smoke:dip34a03-rev14-full-device-cycle-r1',payload:{contract:s.contract,independentCompletenessMap:s.independentComposition,sourceOwnedResourceDeclarations:s.resourceDeclarations,projectMethodSha256:s.projectMethod.sha256,sourceAdmission:false}},search:{primaryUom:'pcs',canonicalNameRu:s.titleRu,aliases:['Монтаж выбранного адресного дымового извещателя с совместимой базой'],shortScopeRu:'Полный объявленный цикл одного приборного метода: база, местные подключения, адресация, дымовая проверка, восстановление, сдача и уборка.',keyDistinguishingParameters:[s.decisionId],clarificationFields:m.parameters.filter(p=>p.truth_metadata.value_source_role==='PROJECT_SPECIFIC_INPUT').map(p=>p.parameter_id),includedBoundaries:s.operationRoster.map(o=>o.operationTitleRu),excludedBoundaries:['Внешний кабель шлейфа, ППКП, питание, оповещатели и полная АПС.'],extraSearchTermsRu:'дымовой адресный извещатель база адрес дымовая проверка пусконаладка',sourceProvenance:{sourceId:s.sourceId,artifactSha256:s.projectMethod.sha256,preparedInternalReferenceOnly:true,sourceAdmission:false}},forbiddenAdjacentMatchers:[/fire.alarm.loop.cable|full.fire.alarm.system|rc09:fire_alarm_control_panel|rc09:power_supply/iu],owner:'ADDRESSABLE_SMOKE_WHOLE_DEVICE_SOURCE_R1',receiptFileStem:'ADDRESSABLE_SMOKE_WHOLE_DEVICE_SOURCE_R1'};
}
