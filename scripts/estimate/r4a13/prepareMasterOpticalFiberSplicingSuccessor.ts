import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
  OPTICAL_FIBER_SPLICING_CATALOG_ID,
  OPTICAL_FIBER_SPLICING_FORMULAS,
  OPTICAL_FIBER_SPLICING_NORM_ID,
  OPTICAL_FIBER_SPLICING_PARAMETERS,
  OPTICAL_FIBER_SPLICING_RESOURCES,
  OPTICAL_FIBER_SPLICING_RUNTIME_CLASSIFICATION,
  OPTICAL_FIBER_SPLICING_RUNTIME_INPUT,
  OPTICAL_FIBER_SPLICING_RUNTIME_SOURCE_IDS,
  OPTICAL_FIBER_SPLICING_SHORT_INPUT,
  OPTICAL_FIBER_SPLICING_SOURCE_ID,
  OPTICAL_FIBER_SPLICING_SOURCE_METADATA,
  compileOpticalFiberSplicingR1,
} from "../../../src/lib/estimate/v4/opticalFiberSplicingR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const MINIMUM_REAL_QUANTITY_NEEDS = Object.freeze({
  "rc09:fiber_lint_free_wipe": ["wipe_quantity_piece"],
  "rc09:fiber_isopropyl_cleaner": ["cleaner_volume_l"],
  "rc09:fiber_splice_identification_marker": ["marker_quantity_piece"],
  "rc09:fiber_fusion_splicer": ["fusion_splicer_shift"],
  "rc09:optical_time_domain_reflectometer": ["otdr_shift"],
});

function quantity(result: Awaited<ReturnType<typeof compileOpticalFiberSplicingR1>>, rowId: string) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

async function verifyCore(): Promise<Json> {
  const short = await compileOpticalFiberSplicingR1({
    ...OPTICAL_FIBER_SPLICING_SHORT_INPUT,
  });
  const complete = await compileOpticalFiberSplicingR1({
    ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
  });
  const balanced = await compileOpticalFiberSplicingR1({
    ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
    sleeve_expected_waste_piece: 1,
    sleeve_retained_spare_piece: 2,
    sleeve_supplier_pack_size_piece: 50,
  });
  const conditional = await compileOpticalFiberSplicingR1({
    ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
    pigtail_mode: "REQUIRED",
    pigtail_designation: "Пигтейл OS2 LC/UPC по спецификации",
    pigtail_quantity_piece: 48,
    splice_tray_mode: "REQUIRED",
    splice_tray_designation: "Кассета на 24 сварки по спецификации",
    splice_tray_quantity_piece: 2,
  });
  const needs = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  if (!(short.rows.length === 10
    && quantity(short, "rc09:optical_fiber_fusion_splice") === "48"
    && quantity(short, "rc09:fiber_splice_heat_shrink_sleeve") === "48"
    && quantity(short, "rc09:fiber_otdr_measurement_protocol") === "48"
    && short.preliminaryNeeds.length === 11)) {
    throw new Error("STOP_MASTER_OPTICAL_FIBER_SPLICING_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:fiber_lint_free_wipe",
    "rc09:fiber_isopropyl_cleaner",
    "rc09:fiber_splice_identification_marker",
    "rc09:fiber_fusion_splicer",
    "rc09:optical_time_domain_reflectometer",
    "rc09:fiber_pigtail",
    "rc09:fiber_splice_tray",
    "fiber:labor:splicing",
    "fiber:labor:testing",
    "fiber:logistics:delivery",
    "fiber:logistics:waste-removal",
  ]) {
    if (!needs.has(rowId)) throw new Error(`STOP_MASTER_OPTICAL_FIBER_NEED:${rowId}`);
  }
  for (const [rowId, missingParameterIds] of Object.entries(MINIMUM_REAL_QUANTITY_NEEDS)) {
    const need = short.preliminaryNeeds.find((item) => item.row_id === rowId);
    if (JSON.stringify(need?.missing_parameter_ids) !== JSON.stringify(missingParameterIds)) {
      throw new Error(`STOP_S2724_OPTICAL_FIBER_MINIMUM_REAL_FACTS:${rowId}`);
    }
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 19
    && quantity(complete, "rc09:fiber_splice_heat_shrink_sleeve") === "48"
    && quantity(complete, "rc09:optical_time_domain_reflectometer") === "1"
    && quantity(complete, "fiber:labor:splicing") === "18"
    && quantity(complete, "fiber:logistics:delivery") === "1")) {
    throw new Error("STOP_MASTER_OPTICAL_FIBER_COMPLETE_FIXTURE");
  }
  if (!(quantity(balanced, "fiber:balance:installed-sleeves") === "48"
    && quantity(balanced, "fiber:balance:expected-waste") === "1"
    && quantity(balanced, "fiber:balance:retained-reserve") === "2"
    && quantity(balanced, "fiber:balance:total-need") === "51"
    && quantity(balanced, "fiber:balance:package-count") === "2"
    && quantity(balanced, "rc09:fiber_splice_heat_shrink_sleeve") === "100"
    && quantity(balanced, "fiber:balance:remainder-after-installation-waste") === "51"
    && quantity(balanced, "fiber:balance:surplus-beyond-reserve") === "49")) {
    throw new Error("STOP_S2724_OPTICAL_FIBER_SLEEVE_BALANCE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 21)) {
    throw new Error("STOP_MASTER_OPTICAL_FIBER_CONDITIONAL_FIXTURE");
  }
  if (!(complete.rows.find((row) => row.row_id === "rc09:optical_fiber_fusion_splice")
      ?.included_in_estimate === false
    && complete.rows.find((row) => row.row_id === "rc09:fiber_otdr_measurement_protocol")
      ?.included_in_estimate === false)) {
    throw new Error("STOP_S2724_OPTICAL_FIBER_DOUBLE_COST");
  }
  const serialized = JSON.stringify({ short, complete, balanced, conditional });
  if (/(fiber.optic.cable.route|optical.distribution.frame|server.cabinet)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_OPTICAL_FIBER_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S27_24_OPTICAL_FIBER_SPLICING_BALANCED_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      missingScalarFacts: short.preliminaryNeeds
        .flatMap((need) => need.missing_parameter_ids).length,
      optionalProductDesignationQuestionsRemoved: 6,
      knownSpliceCount: OPTICAL_FIBER_SPLICING_SHORT_INPUT.splice_count,
      knownFiberStandard: OPTICAL_FIBER_SPLICING_SHORT_INPUT.fiber_standard,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedSleeves: quantity(balanced, "fiber:balance:installed-sleeves"),
      expectedWaste: quantity(balanced, "fiber:balance:expected-waste"),
      retainedReserve: quantity(balanced, "fiber:balance:retained-reserve"),
      totalNeed: quantity(balanced, "fiber:balance:total-need"),
      packages: quantity(balanced, "fiber:balance:package-count"),
      ordered: quantity(balanced, "rc09:fiber_splice_heat_shrink_sleeve"),
      remainder: quantity(balanced, "fiber:balance:remainder-after-installation-waste"),
      surplusBeyondReserve: quantity(balanced, "fiber:balance:surplus-beyond-reserve"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

if(require.main===module){
void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.optical-fiber-splicing-balanced-successor.v2",
  stopCode: "S27_24_OPTICAL_FIBER_SPLICING_BALANCED",
  applicationName: "s27-24-optical-fiber-splicing-balanced-successor-r2",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "fbdcaf01-f621-547f-9ed4-90421ffb7225",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "3fe8da34-27e0-51f7-809e-b40e144a96e1",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/optical-fiber-splicing-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/optical-fiber-splicing-balanced-s27-24.json",
    "src/lib/estimate/v4/opticalFiberSplicingR1.ts",
    "tests/estimateNorms/opticalFiberSplicingR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
    "scripts/estimate/r4a13/masterBenchmarkEvidence.shared.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterOpticalFiberSplicingSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724OpticalFiberSplicingIndependent.ts",
  ],
  catalogId: OPTICAL_FIBER_SPLICING_CATALOG_ID,
  sourceId: OPTICAL_FIBER_SPLICING_SOURCE_ID,
  normId: OPTICAL_FIBER_SPLICING_NORM_ID,
  sourceMetadata: OPTICAL_FIBER_SPLICING_SOURCE_METADATA,
  parameterDefinitions: OPTICAL_FIBER_SPLICING_PARAMETERS,
  formulaDefinitions: OPTICAL_FIBER_SPLICING_FORMULAS,
  resourceDefinitions: OPTICAL_FIBER_SPLICING_RESOURCES,
  shortInput: OPTICAL_FIBER_SPLICING_SHORT_INPUT,
  acceptanceInput: OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
  runtimeProfileInput: OPTICAL_FIBER_SPLICING_RUNTIME_INPUT,
  runtimeProfileClassification: OPTICAL_FIBER_SPLICING_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: OPTICAL_FIBER_SPLICING_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [20, 10, 10],
  benchmarkOrdinal: 25,
  validationScenario: "S27_24_BENCHMARK_25_OPTICAL_FIBER_SPLICING_BALANCE_48_SPLICES",
  passport: {
    canonicalRuName: "Сварка волокон SM G.652D с измерением затухания OTDR",
    workKey: "fiber_optic_connection",
    physicalResultRu: "Оптические волокна SM G.652D сварены, соединения защищены и промаркированы, а затухание каждого волокна измерено с записью протокола",
    includedScopeRu: [
      "сварка по известному количеству волокон",
      "индивидуальная запись измерения затухания по каждому известному волокну",
      "одна установленная защитная гильза на каждое подтверждённое сварное соединение",
      "видимый баланс брака, резерва, упаковок, заказа и остатка защитных гильз",
      "очистка и маркировка только по проектной спецификации и ППР",
      "смены сварочного аппарата и OTDR только по ППР и программе QA",
      "труд и логистика только по ППР и плану объекта",
      "пигтейлы и кассеты только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "прокладка трассы волоконно-оптического кабеля",
      "оптический распределительный кросс",
      "серверный шкаф",
      "исторические погонные нормы расхода и производительности без источника",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "FUSION_SPLICE_SINGLE_MODE_OPTICAL_FIBER",
    fiberStandard: "SM_G652D",
    primaryMeasureParameterId: "splice_count",
    geometryParameters: ["splice_count"],
    knownScopeParameters: ["fiber_standard"],
    projectPackageRequiredForConsumablesEquipmentAndQa: true,
    visibleSleeveProcurementBalance: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    fiberCableRouteExcluded: true,
    opticalDistributionFrameExcluded: true,
    serverCabinetExcluded: true,
  },
  binding: {
    rowId: "rc09:optical_fiber_fusion_splice",
    applicability: {
      technology_class: "OPTICAL_FIBER_FUSION_SPLICE",
      operation_class: "FUSION_SPLICE_SINGLE_MODE_OPTICAL_FIBER",
      fiber_standard: "SM_G652D",
      scope_mode:
        "KNOWN_SPLICE_COUNT_PLUS_AUTOMATIC_SLEEVE_AND_VISIBLE_BALANCE_PLUS_PROJECT_RESOURCES",
      source_id: OPTICAL_FIBER_SPLICING_SOURCE_ID,
      norm_id: OPTICAL_FIBER_SPLICING_NORM_ID,
      exact_locator: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_scalar_rates_claimed: false,
      quantity_basis: "ONE_INSTALLED_SLEEVE_PER_SPLICE_PLUS_VISIBLE_WASTE_RESERVE_PACKAGE_AND_APPROVED_PROJECT_RESOURCES",
    },
  },
  locator: {
    key: "optical-fiber-splicing-krerm-project-balance-s27-24-v2",
    payload: {
      kind: "OFFICIAL_GUIDANCE_AND_PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      officialGuidanceArtifactSha256: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.artifact_sha256,
      officialGuidanceLocator: "КРЕРм-2015, Указания по применению, п. 2.9.2",
      exactLocator: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.exact_locator,
      geometryInputs: ["splice_count"],
      knownScopeInputs: ["fiber_standard"],
      visiblePreliminaryBalanceInputs: Object.keys(OPTICAL_FIBER_SPLICING_RUNTIME_INPUT),
      directProjectInputs: [
        "sleeve_designation",
        "wipe_designation", "wipe_quantity_piece",
        "cleaner_designation", "cleaner_volume_l",
        "marker_designation", "marker_quantity_piece",
        "fusion_splicer_designation", "fusion_splicer_shift",
        "otdr_designation", "otdr_shift",
      ],
      projectResourceInputs: ["fiber_splicing_labor_h", "fiber_testing_labor_h",
        "fiber_delivery_trip_count", "fiber_waste_removal_trip_count"],
      conditionalInputs: [
        "pigtail_mode", "pigtail_designation", "pigtail_quantity_piece",
        "splice_tray_mode", "splice_tray_designation", "splice_tray_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Сварка волокон SM G.652D с измерением затухания OTDR",
    aliases: [
      "сварка оптических волокон",
      "сварка ВОЛС G.652D",
      "fusion splice single mode fiber",
      "измерение затухания оптического волокна OTDR",
    ],
    shortScopeRu: "Сварка 48 волокон SM G.652D с 48 защитными гильзами и 48 записями OTDR; баланс заказа гильз видим сразу, остальные расходники, труд, оборудование и логистика уточняются по проекту и ППР.",
    keyDistinguishingParameters: ["splice_count", "fiber_standard"],
    clarificationFields: [
      "sleeve_expected_waste_piece", "sleeve_retained_spare_piece",
      "sleeve_supplier_pack_size_piece",
      "wipe_quantity_piece", "cleaner_volume_l", "marker_quantity_piece",
      "fusion_splicer_shift", "otdr_shift", "pigtail_mode", "splice_tray_mode",
      "fiber_splicing_labor_h", "fiber_testing_labor_h",
      "fiber_delivery_trip_count", "fiber_waste_removal_trip_count",
    ],
    includedBoundaries: [
      "сварка по количеству волокон",
      "защитная гильза по каждой сварке и видимый закупочный баланс гильз",
      "очистка и маркировка по проектным документам",
      "сварочный аппарат и OTDR по ППР и программе QA",
      "индивидуальные записи измерения затухания",
      "условные пигтейлы и кассеты",
    ],
    excludedBoundaries: [
      "трасса волоконно-оптического кабеля",
      "оптический распределительный кросс",
      "серверный шкаф",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: "ВОЛС оптика SM G652D сварка волокно КДЗС гильза салфетка изопропанол маркер сварочный аппарат OTDR рефлектометр протокол пигтейл кассета",
    sourceProvenance: {
      exactOpticalFiberSplicingOwner: true,
      explicitSemanticSuccessorOfExpandedFiberOpticConnectionOwner: true,
      officialKrermGuidanceSection292: true,
      visibleReplaceableSleeveBalance: true,
      exactProjectMethodAndQaPackageRequiredForNonCountQuantities: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /fiber.optic.cable.route|трасс.*оптич.*кабел/iu,
    /optical.distribution.frame|оптич.*(?:кросс|распределител)/iu,
    /server.cabinet|серверн.*шкаф/iu,
  ],
  owner: "S27_24_OPTICAL_FIBER_SPLICING_BALANCED_SUCCESSOR_R2",
  receiptFileStem: "S27_24_OPTICAL_FIBER_SPLICING_BALANCED_R2",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

}

import {readFileSync}from'node:fs';
import {OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1 as opticalSourceR2,opticalFiberWholeOrdinaryQuantityModelR2}from'../../../src/lib/estimate/v4/opticalFiberSplicingR1';
import {compileCanonicalEstimateCore}from'../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash}from'../../../src/lib/estimate/estimateDeterministicHash';
import type{MasterSingleDefinitionSuccessorConfig}from'./prepareMasterSingleDefinitionSuccessorR1';
type OpticalWholeContextR2=Readonly<{parentReleaseId:string;parentSearchReleaseId:string;currentReleasePath:string;selectedCurrentReleasePath:string;referencePointerMode:'PREPARED_NOT_ACTIVE_COPY';outputRoot:string;expectedBranch:string;masterPath:string;masterSha256:string;sourceRoot:string;capturedParentPath:string;capturedParentByteSha256:string;verifyTargetPrecondition:NonNullable<MasterSingleDefinitionSuccessorConfig['verifyTargetPrecondition']>;capturedScopedNormativeRegistry?:MasterSingleDefinitionSuccessorConfig['capturedScopedNormativeRegistry']}>;
const opticalRequireR2=(ok:unknown,message:string)=>{if(!ok)throw Error('STOP_OPTICAL_WHOLE_QUANTITY_R2_'+message);};
const opticalByteShaR2=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
/** Explicit TEST_ONLY inventory/record fixture, no ordinary defaults or actual
 * application-norm quantities, no current calibration or executed-test claim. */
export function opticalWholeQuantityValidationFixtureR2(){const s=opticalSourceR2,q=s.quantityForwardR2;return{splice_count:2,fiber_standard:'SM_G652D',pigtail_mode:'NOT_REQUIRED',splice_tray_mode:'NOT_REQUIRED',...Object.fromEntries(s.actualRecords.map(f=>[f.id,'TEST_ONLY:'+f.id])),[s.decisionId]:'DOCUMENTED_COMPATIBLE',[s.externalQaScopeParameterId]:'NOT_REQUIRED_BY_APPROVED_ATOMIC_PROGRAMME',[q.kitInput]:1,[q.otdrStock.quantityParameterId]:1,[q.recordId]:'TEST_ONLY reviewed exact poweredCT50 inventory/AAA and plainOTDRkit/separateinspection/currentprogramme; no actualproject'}as Record<string,unknown>;}
export function compileOpticalWholeQuantityValidationR2(input=opticalWholeQuantityValidationFixtureR2(),rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={}){const s=opticalSourceR2,m=opticalFiberWholeOrdinaryQuantityModelR2();return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:s.quantityForwardR2.contract,catalogId:s.catalogId,primaryMeasureParameterId:'splice_count',parameterDefinitions:[...m.parameters],formulaDefinitions:[...m.formulas],resourceDefinitions:[...m.resources],submittedParameters:{splice_count:input.splice_count,fiber_standard:input.fiber_standard},confirmedParameters:input,rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:m.resources.length,hashJson:estimateDeterministicHash});}
/** Pure source config for the existing Master pipeline. An imported producer
 * cannot execute its historic CLI. Normal/locked preimages remain ROOT-owned. */
export function prepareOpticalWholeQuantityConfigR2(ctx:OpticalWholeContextR2):MasterSingleDefinitionSuccessorConfig{
 const s=opticalSourceR2,q=s.quantityForwardR2;opticalRequireR2(ctx.referencePointerMode==='PREPARED_NOT_ACTIVE_COPY'&&resolve(ctx.currentReleasePath).toLowerCase()!==resolve(ctx.selectedCurrentReleasePath).toLowerCase(),'PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');
 opticalRequireR2(ctx.capturedParentByteSha256===q.actualCurrentParent.sha256&&opticalByteShaR2(ctx.capturedParentPath)===q.actualCurrentParent.sha256,'EXACT_R830_PARENT');const captured=JSON.parse(readFileSync(ctx.capturedParentPath,'utf8')),t=captured.results.find((x:Json)=>x.target?.catalogId===s.catalogId);
 opticalRequireR2(t&&JSON.stringify(t.current.header)===JSON.stringify(q.actualHeader)&&t.currentBodyMatchesExistingReaderDigests===true&&captured.transactionRolledBack===true&&captured.connectionClosed===true&&ctx.parentReleaseId===captured.selectedReleaseId,'CURRENT_HEADER_BODY_READONLY_SELECTED_PARENT');opticalRequireR2(t.currentBody.parameters.length===26&&t.currentBody.formulas.length===21&&t.currentBody.resources.length===21,'CURRENT_26_21_21');
 const verifyBytes=()=>{opticalRequireR2(opticalByteShaR2(resolve(ctx.sourceRoot,q.projectMethod.logicalPath))===q.projectMethod.sha256,'METHOD_BYTES');for(const p of q.primaryPins)opticalRequireR2(opticalByteShaR2(p.path)===p.sha256,'PRIMARY_BYTES:'+p.path);};verifyBytes();const m=opticalFiberWholeOrdinaryQuantityModelR2(),rows=m.resources,f=opticalWholeQuantityValidationFixtureR2();
 return{contract:q.contract,stopCode:'OPTICAL_WHOLE_QUANTITY_R2',applicationName:'optical-existing-whole-quantity-source',expectedBranch:ctx.expectedBranch,masterPath:ctx.masterPath,masterSha256:ctx.masterSha256,parentReleaseId:ctx.parentReleaseId,parentSearchReleaseId:ctx.parentSearchReleaseId,currentReleasePath:ctx.currentReleasePath,outputRoot:ctx.outputRoot,
  sourcePaths:['src/lib/estimate/v4/opticalFiberSplicingR1.ts','tests/estimateNorms/opticalFiberSplicingR1.contract.test.ts','scripts/estimate/r4a13/prepareMasterOpticalFiberSplicingSuccessor.ts','data/estimate-benchmarks/source-packs/optical-fiber-whole-splice-method-r1.json',q.projectMethod.logicalPath],catalogId:s.catalogId,sourceId:s.sourceId,normId:'PROJECT_SYSTEM:OPTICAL_WHOLE_EXACT_POWERED_STOCK_R2',sourceMetadata:{source_title:q.titleRu,source_authority:'PROJECT_SYSTEM и первичные документы изготовителей; не проект ВОЛС и не норма труда',source_kind:'PROJECT_SYSTEM',artifact_sha256:q.projectMethod.sha256,official_url:null,exact_locator:'optical-whole-r1-r2:powered-stock-plain-otdr-kit-and-whole-programme-holds',use_restriction:'Atomicsplice;44formerquantityUNKNOWN+guidecount,15actualrecords, fullmanual/source/class/factory/price/registry holds; no routeODFnewclosure/cabinet.'},
  ...(ctx.capturedScopedNormativeRegistry===undefined?{}:{capturedScopedNormativeRegistry:ctx.capturedScopedNormativeRegistry}),parameterDefinitions:m.parameters,formulaDefinitions:m.formulas,resourceDefinitions:rows,shortInput:f,acceptanceInput:f,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[26,21,21],benchmarkOrdinal:0,validationScenario:'EXISTING_ATOMIC_OPTICAL_WHOLE_SOURCE_EXACT_POWERED_TOOLKIT_AND_OTDR_STOCK_WITH_VISIBLE_HOLDS',verifyTargetPrecondition:async(client,phase)=>{verifyBytes();await ctx.verifyTargetPrecondition(client,phase);verifyBytes();},
  verifyCore:async()=>{const r=await compileOpticalWholeQuantityValidationR2(),all=[...r.rows,...r.preliminaryNeeds];for(const[id,qty]of[[q.otdrStock.rowId,'1'],['reference:fiber:method:cleaver-cells','2'],['reference:fiber:otdr-factory:mainframe','1']]as const)opticalRequireR2(all.find(r=>r.row_id===id)?.quantity===qty,'ACTUAL_STOCK_RULE:'+id);return{status:'SOURCE_CONTRACT_ONLY',sourceAdmission:false,ordinaryAccepted:false,physicalClosures:0,FULL:false};},
  passport:{canonicalRuName:'Сварка оптических волокон и контроль соединений',workKey:'fiber_optic_connection',physicalResultRu:'Подготовленные сварные соединения защищены и представлены к применимому контролю; выполнение и результаты подтверждаются отдельными записями.',includedScopeRu:s.operationRoster.map(o=>o.operationTitleRu),excludedScopeRu:['Строительство трассы ВОК, нового кросса/муфты/шкафа и активного uplink.','Оплата полной линии/OLTS без самостоятельного принятого владельца; нормы труда из технического времени.'],independentCompletenessMap:q.independentComposition,unresolvedApplicableResourceRowIds:q.resourceDeclarations.filter(d=>d.rowKind==='RESOURCE').map(d=>d.rowId)},applicability:{methodId:s.candidateMethodId,actualCurrentParent:q.actualHeader,exactPoweredMethodOnly:true,activationAllowed:false,productionEligible:false,automaticMigrationAllowed:false,fullTechnicalAcceptance:false},
  binding:{rowId:rows[0]!.row_id,additionalRowIds:rows.slice(1).map(r=>r.row_id),ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1',capturedSourcePreimage:{sourceKey:s.sourceId,expected:null}},applicability:{sourceReference:q.contract,internalMethodId:s.candidateMethodId,sourceAdmission:false},applicabilityByRowId:Object.fromEntries(q.resourceDeclarations.map(d=>[d.rowId,{formulaId:d.formulaId,operationIds:d.operationIds,sourceRole:'EXACT_SOURCE_WITH_VISIBLE_QUANTITY_AND_COMPOSITION_HOLDS'}]))},locator:{key:'optical-whole-r1-r2:powered-stock-plain-otdr-kit-and-whole-programme-holds',payload:{contract:q.contract,independentCompletenessMap:q.independentComposition,sourceOwnedResourceDeclarations:q.resourceDeclarations,projectMethodSha256:q.projectMethod.sha256,sourceAdmission:false}},
  search:{primaryUom:'pcs',canonicalNameRu:'Сварка оптических волокон и контроль соединений',aliases:['Оптические сварные соединения выбранный полный метод'],shortScopeRu:'Подготовка, сварка, защита и применимый контроль соединений; фактический запас оснащения отдельно от смен и числа измерений.',keyDistinguishingParameters:[s.decisionId],clarificationFields:m.parameters.filter(p=>p.truth_metadata.value_source_role==='PROJECT_SPECIFIC_INPUT').map(p=>p.parameter_id),includedBoundaries:s.operationRoster.map(o=>o.operationTitleRu),excludedBoundaries:['Новая трасса, муфта, кросс, шкаф, активная сеть и неоплаченный внешний OLTS.'],extraSearchTermsRu:'оптическое волокно подготовка очистка скол сварка гильза кассета OTDR протокол',sourceProvenance:{sourceId:s.sourceId,artifactSha256:q.projectMethod.sha256,preparedInternalReferenceOnly:true,sourceAdmission:false}},forbiddenAdjacentMatchers:[/cat6a|lvs.fiber.cable|active.uplink/iu,/скуд|видеонаблюден|пожарная сигнализация/iu],owner:'OPTICAL_WHOLE_QUANTITY_SOURCE_R2',receiptFileStem:'OPTICAL_WHOLE_QUANTITY_SOURCE_R2'};
}
