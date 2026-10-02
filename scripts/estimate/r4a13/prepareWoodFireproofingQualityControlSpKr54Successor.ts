import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_CATALOG_ID,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_FORMULAS,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_INDEPENDENT_COMPLETENESS_MAP,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_NORM_ID,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_PARAMETERS,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SHORT_INPUT,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_ID,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA,
  compileWoodFireproofingQualityControlSpKr54R1,
} from "../../../src/lib/estimate/v4/woodFireproofingQualityControlSpKr54R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileWoodFireproofingQualityControlSpKr54R1({
    ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SHORT_INPUT,
  });
  const complete = await compileWoodFireproofingQualityControlSpKr54R1({
    ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 1
    && short.preliminaryNeeds.length === 4
    && short.rows[0]?.row_id === "f09:wood_fireproofing_controlled_area"
    && short.rows[0]?.quantity === "100")) {
    throw new Error("STOP_S273_F09_WOOD_FIREPROOFING_QUALITY_CONTROL_SHORT_COMPOSITION");
  }
  if (!(complete.rows.length === 5
    && complete.preliminaryNeeds.length === 0
    && complete.rows.find((row) =>
      row.row_id === "f09:wood_fireproofing_surface_condition_inspection")?.quantity === "5"
    && complete.rows.find((row) =>
      row.row_id === "f09:wood_fireproofing_quality_control_protocol")?.quantity === "1")) {
    throw new Error("STOP_S273_F09_WOOD_FIREPROOFING_QUALITY_CONTROL_COMPLETE_FIXTURE");
  }
  const formulas = WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_FORMULAS.map((item) =>
    (item as typeof item & { expression_source: string }).expression_source);
  if (formulas.some((expression) => /[*/]|factor|norm/iu.test(expression))) {
    throw new Error("STOP_S273_F09_WOOD_FIREPROOFING_QUALITY_CONTROL_HIDDEN_FACTOR");
  }
  return {
    status: "GREEN_S273_F09_WOOD_FIREPROOFING_QUALITY_CONTROL_CORE",
    catalogId: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_CATALOG_ID,
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      preliminaryNeedRows: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: 0,
      rows: complete.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    universalSamplingRateClaimed: false,
    ageingResistanceFieldTestClaimed: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-3.f09-wood-fireproofing-quality-control-sp-kr54-successor.v1",
  stopCode: "S273_F09_WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54",
  applicationName: "s27-3-f09-wood-fireproofing-quality-control-sp-kr54-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "71b4baf6-f204-5854-a417-a3d5086d72ba",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "5be74665-f88b-5126-8672-1a1fef4d7266",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-fire-current-lineage/wood-fireproofing-quality-control-sp-kr54-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/woodFireproofingQualityControlSpKr54R1.ts",
    "tests/estimateNorms/woodFireproofingQualityControlSpKr54R1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareWoodFireproofingQualityControlSpKr54Successor.ts",
    ".release-runtime/r568/s27-3/f09-fire-current-lineage/official-snapshots/sp_kr_54_101_2023_ru.pdf",
  ],
  catalogId: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_CATALOG_ID,
  sourceId: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_ID,
  normId: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_NORM_ID,
  sourceMetadata: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA,
  parameterDefinitions: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_PARAMETERS,
  formulaDefinitions: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_FORMULAS,
  resourceDefinitions: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES,
  shortInput: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SHORT_INPUT,
  acceptanceInput: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: "F09_WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54",
  passport: {
    canonicalRuName: "Контроль качества огнезащитной обработки деревянных конструкций",
    workKey: "wood_fireproofing_quality_control",
    physicalResultRu:
      "Состояние огнезащищённой деревянной поверхности, соблюдение технологии нанесения и качество обработки проверены в подтверждённом объёме; результат оформлен протоколом",
    includedScopeRu: [
      "подтверждённая площадь деревянных конструкций как информационный объём контроля",
      "проверка состояния огнезащищённой поверхности, включая дефекты и повреждения",
      "проверка соблюдения технологии нанесения по технической документации состава",
      "качественная оценка огнезащитной обработки",
      "протокол контроля качества в количестве по утверждённому плану",
    ],
    excludedScopeRu: [
      "автоматически выдуманная частота проверок на квадратный метр",
      "универсальная трудоёмкость, время оборудования и цена",
      "полевое испытание устойчивости состава к старению без отдельной методики",
      "нанесение, ремонт или удаление огнезащитного покрытия",
      "контроль огнезащиты металла, бетона, кабелей и проходок",
    ],
    independentCompletenessMap:
      WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR_54_101_2023",
    primaryMeasureParameterId: "controlled_wood_area_m2",
    geometryParameters: ["controlled_wood_area_m2"],
    substrate: "WOOD",
    controlScope: [
      "PROTECTED_SURFACE_CONDITION",
      "APPLICATION_TECHNOLOGY_COMPLIANCE",
      "QUALITATIVE_FIREPROOFING_EVALUATION",
      "QUALITY_CONTROL_PROTOCOL",
    ],
    officialNormativeBoundarySource:
      WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_ID,
    officialArtifactSha256: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
    directApprovedControlPlanInputsRequired: true,
    universalSamplingRateClaimed: false,
    universalLaborOrEquipmentRateClaimed: false,
  },
  binding: {
    rowId: "f09:wood_fireproofing_surface_condition_inspection",
    applicability: {
      technology_class: "WOOD_FIREPROOFING_QUALITY_CONTROL",
      operation_class: "CHECK_EXECUTED_WOOD_FIREPROOFING_QUALITY",
      substrate: "WOOD",
      source_id: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_ID,
      norm_id: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_NORM_ID,
      exact_locator: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
      quantity_basis: "DIRECT_APPROVED_QUALITY_CONTROL_PLAN_INPUTS",
      universal_sampling_rate_claimed: false,
    },
  },
  locator: {
    key: "kg-sp-kr-54-101-2023-wood-fireproofing-quality-control-v1",
    payload: {
      kind: "OFFICIAL_KG_NORMATIVE_TECHNICAL_BOUNDARY",
      sections: ["10.24", "10.25", "10.26", "10.27"],
      printedPage: 80,
      pdfPage: 80,
      pdfPageIndex: 79,
      exactLocator: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
      knownScopeInputs: ["controlled_wood_area_m2"],
      projectSpecificInputs: [
        "surface_condition_inspection_count",
        "application_technology_check_count",
        "qualitative_evaluation_count",
        "quality_control_protocol_document_count",
      ],
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: "Контроль качества огнезащитной обработки деревянных конструкций",
    aliases: [
      "проверка качества огнезащиты дерева",
      "контроль огнезащитной обработки деревянных конструкций",
      "проверка огнезащищённой поверхности древесины",
      "wood fireproofing quality control",
    ],
    shortScopeRu:
      "Проверка состояния огнезащищённой деревянной поверхности, соблюдения технологии нанесения и качественная оценка обработки по СП КР 54-101:2023 §10.27; количества проверок задаёт утверждённый план контроля.",
    keyDistinguishingParameters: [
      "controlled_wood_area_m2",
      "surface_condition_inspection_count",
      "application_technology_check_count",
      "qualitative_evaluation_count",
    ],
    clarificationFields: [
      "surface_condition_inspection_count",
      "application_technology_check_count",
      "qualitative_evaluation_count",
      "quality_control_protocol_document_count",
    ],
    includedBoundaries: [
      "контроль состояния защищённой деревянной поверхности",
      "проверка технологии нанесения и качественная оценка обработки",
      "прямые количества по утверждённому плану контроля",
    ],
    excludedBoundaries: [
      "нанесение, ремонт и удаление огнезащиты",
      "металл, бетон, кабели и огнестойкие проходки",
      "универсальная частота отбора проб, трудоёмкость и цена",
    ],
    extraSearchTermsRu:
      "дерево деревянные конструкции огнезащита контроль качества проверка поверхности дефекты технология нанесения качественная оценка СП КР 54-101",
    sourceProvenance: {
      officialSpKr541012023Sections1024To1027: true,
      exactOfficialArtifactSha256: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
      approvedControlPlanInputsRequired: true,
      universalSamplingRateRejected: true,
      adjacentFireproofingOperationsRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /fireproof_paint|coating_application|нанесение огнезащитной краски/iu,
    /repair|remove|ремонт|удаление огнезащит/iu,
    /steel|concrete|metal|металл|бетон|железобетон/iu,
    /cable|penetration|кабел|проходк/iu,
    /universal.*(?:sampling|labor|equipment)|универсальн.*(?:частот|трудо[её]мк)/iu,
  ],
  owner: "S273_F09_WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SUCCESSOR",
  receiptFileStem: "S273_F09_WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
