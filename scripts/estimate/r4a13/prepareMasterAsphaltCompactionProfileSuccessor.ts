import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  ASPHALT_COMPACTION_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_COMPACTION_PROFILE_ACCEPTANCE_INPUT,
  ASPHALT_COMPACTION_PROFILE_CATALOG_ID,
  ASPHALT_COMPACTION_PROFILE_FORMULAS,
  ASPHALT_COMPACTION_PROFILE_NORM_ID,
  ASPHALT_COMPACTION_PROFILE_PARAMETERS,
  ASPHALT_COMPACTION_PROFILE_RESOURCES,
  ASPHALT_COMPACTION_PROFILE_RUNTIME_CLASSIFICATION,
  ASPHALT_COMPACTION_PROFILE_RUNTIME_INPUT,
  ASPHALT_COMPACTION_PROFILE_RUNTIME_SOURCE_IDS,
  ASPHALT_COMPACTION_PROFILE_SHORT_INPUT,
  ASPHALT_COMPACTION_PROFILE_SOURCE_ID,
  ASPHALT_COMPACTION_PROFILE_SOURCE_METADATA,
  ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
  compileAsphaltCompactionPreliminaryProfileR1,
} from "../../../src/lib/estimate/v4/asphaltCompactionPreliminaryProfileR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const firstEstimate = await compileAsphaltCompactionPreliminaryProfileR1({
    ...ASPHALT_COMPACTION_PROFILE_SHORT_INPUT,
  });
  const refined = await compileAsphaltCompactionPreliminaryProfileR1({
    ...ASPHALT_COMPACTION_PROFILE_SHORT_INPUT,
    breakdown_coverages: 6,
    roller_speed_km_h: 4,
    utilization_factor: 0.75,
  });
  const rows = new Map(firstEstimate.rows.map((row) => [row.row_id, row]));
  if (!(firstEstimate.preliminaryNeeds.length === 0
    && firstEstimate.rows.length === ASPHALT_COMPACTION_PROFILE_RESOURCES.length
    && firstEstimate.rows.every((row) => Number(row.quantity) > 0)
    && rows.get("rc09:asphalt_compaction_breakdown_roller")?.quantity === "3.472222222"
    && rows.get("rc09:asphalt_compaction_intermediate_roller")?.quantity === "1.479640152"
    && rows.get("rc09:asphalt_compaction_finish_roller")?.quantity === "1.736111111"
    && rows.get("asphalt-compaction:quality:main-mat-density")?.quantity === "5"
    && rows.get("rc09:asphalt_compaction_crew")?.quantity === "13.888888888")) {
    throw new Error("STOP_MASTER_ASPHALT_COMPACTION_FIRST_ESTIMATE");
  }
  if (!(refined.preliminaryNeeds.length === 0
    && refined.rows.find((row) =>
      row.row_id === "rc09:asphalt_compaction_breakdown_roller")?.quantity === "6.666666667")) {
    throw new Error("STOP_MASTER_ASPHALT_COMPACTION_REFINEMENT");
  }
  if (firstEstimate.rows.some((row) =>
    /укладк|асфальтоукладчик|смесь|основан|нижн(?:ий|его) слой|геотекстил/iu.test(
      `${row.row_id} ${row.title_ru}`,
    ))) {
    throw new Error("STOP_MASTER_ASPHALT_COMPACTION_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ firstEstimate, refined });
  const payableRowIds = ASPHALT_COMPACTION_PROFILE_RESOURCES.filter((resource) =>
    resource.resource_graph?.payable === true).map((resource) => resource.row_id);
  return {
    status: "GREEN_MASTER_ASPHALT_COMPACTION_PROFILE_CORE",
    firstEstimate: {
      input: ASPHALT_COMPACTION_PROFILE_SHORT_INPUT,
      rowCount: firstEstimate.rows.length,
      rowCountsByCategory: Object.fromEntries(
        ["material", "construction_work", "equipment", "service"].map((category) => [
          category,
          firstEstimate.rows.filter((row) => row.category === category).length,
        ]),
      ),
      preliminaryNeedCount: firstEstimate.preliminaryNeeds.length,
      calculatedPayableRowIds: payableRowIds,
      unknownPriceRowCount: firstEstimate.rows.filter((row) =>
        payableRowIds.includes(row.row_id) && row.unit_price == null).length,
    },
    refinement: {
      rowCount: refined.rows.length,
      preliminaryNeedCount: refined.preliminaryNeeds.length,
      breakdownRollerMachineH: refined.rows.find((row) =>
        row.row_id === "rc09:asphalt_compaction_breakdown_roller")?.quantity,
    },
    sourcePackSha256: ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s26-4.master-asphalt-compaction-complete-successor.v2",
  stopCode: "MASTER_ASPHALT_COMPACTION_PROFILE",
  applicationName: "s26-4-master-asphalt-compaction-complete-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (33).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "d858e45dd17a11169dd2dda7f941094081ba4a72250b64fcb801747997730af6",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "e5b0ade6-64e9-5766-abeb-9e63cd1e80ec",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "1df1788b-5e4e-508f-b5fa-bdae3384cddc",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s26-4/master-asphalt-compaction-complete-successor-v2"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/asphalt-compaction-preliminary-profile-r1.json",
    "src/lib/estimate/v4/asphaltCompactionPreliminaryProfileR1.ts",
    "tests/estimateNorms/asphaltCompactionPreliminaryProfileR1.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterAsphaltCompactionProfileSuccessor.ts",
  ],
  catalogId: ASPHALT_COMPACTION_PROFILE_CATALOG_ID,
  sourceId: ASPHALT_COMPACTION_PROFILE_SOURCE_ID,
  normId: ASPHALT_COMPACTION_PROFILE_NORM_ID,
  sourceMetadata: ASPHALT_COMPACTION_PROFILE_SOURCE_METADATA,
  parameterDefinitions: ASPHALT_COMPACTION_PROFILE_PARAMETERS,
  formulaDefinitions: ASPHALT_COMPACTION_PROFILE_FORMULAS,
  resourceDefinitions: ASPHALT_COMPACTION_PROFILE_RESOURCES,
  shortInput: ASPHALT_COMPACTION_PROFILE_SHORT_INPUT,
  acceptanceInput: ASPHALT_COMPACTION_PROFILE_ACCEPTANCE_INPUT,
  runtimeProfileInput: ASPHALT_COMPACTION_PROFILE_RUNTIME_INPUT,
  runtimeProfileClassification: ASPHALT_COMPACTION_PROFILE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: ASPHALT_COMPACTION_PROFILE_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [13, 11, 11],
  benchmarkOrdinal: 0,
  validationScenario: "S26_4_ASPHALT_COMPACTION_5000_M2_COMPLETE_FIRST_ESTIMATE",
  passport: {
    canonicalRuName: "Уплотнение асфальтового покрытия на большой площади",
    workKey: "paving_roads_landscape_interior_asphalt_compact_large_area",
    physicalResultRu: "Уже уложенное асфальтовое покрытие указанной площади уплотнено звеном катков по трёхфазной схеме с контролем температуры, проходов и плотности",
    includedScopeRu: [
      "предварительное, основное и финишное уплотнение уже уложенной асфальтобетонной смеси",
      "машино-часы тандемных и пневмоколёсного катков по формуле площади, ширины, скорости, покрытий и коэффициента использования",
      "труд трёх машинистов катков и дорожного рабочего по времени лимитирующей фазы непрерывного потока",
      "контроль температуры, схемы проходов и плотности по предварительным партиям",
      "журнал работ, операционный контроль и комплект исполнительной документации",
      "вода системы орошения, эксплуатационные расходники и скребки показаны в составе машино-часа без повторного счёта",
      "контроль кромок и швов, локальных зон, ровности, дефектов и полного покрытия",
      "безопасная рабочая зона и мобилизация выбранного трёхмашинного потока",
    ],
    excludedScopeRu: [
      "приготовление, доставка и укладка асфальтобетонной смеси",
      "подгрунтовка, обработка швов, основание, подстилающие и прочие слои дорожной одежды",
      "неподтверждённый разделительный состав; он добавляется отдельной строкой только при фактическом налипании смеси",
      "неподтверждённые цены; отсутствие цены не блокирует количественную смету",
    ],
    independentCompletenessMap: ASPHALT_COMPACTION_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "ASPHALT_COMPACTION_ONLY",
    scopeClass: "LARGE_AREA",
    constructionState: "ASPHALT_MAT_ALREADY_PLACED",
    primaryMeasureParameterId: "area_m2",
    geometryParameters: ["area_m2"],
    selectedPreliminaryProfile: ASPHALT_COMPACTION_PROFILE_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisible: true,
    trialStripRefinementRequiredWhenAvailable: true,
    noUniversalKrERProductivityClaim: true,
    adjacentPavementScopeExcluded: true,
  },
  binding: {
    rowId: "rc09:asphalt_compaction_breakdown_work",
    applicability: {
      technology_class: "ASPHALT_COMPACTION_THREE_PHASE",
      operation_class: "ASPHALT_COMPACTION_ONLY",
      scope_class: "LARGE_AREA",
      source_id: ASPHALT_COMPACTION_PROFILE_SOURCE_ID,
      norm_id: ASPHALT_COMPACTION_PROFILE_NORM_ID,
      exact_locator: ASPHALT_COMPACTION_PROFILE_SOURCE_METADATA.exact_locator,
      quantity_basis: "AREA_X_COVERAGES_DIVIDED_BY_SPEED_WIDTH_UTILIZATION",
      assumption_policy: "VISIBLE_AND_REPLACEABLE_BY_TRIAL_STRIP_PPR_AND_QA_PLAN",
      universal_productivity_claimed: false,
    },
  },
  locator: {
    key: "asphalt-compaction-large-area-preliminary-profile-r1",
    payload: {
      kind: "COMPOSITE_TECHNOLOGY_PROFILE",
      sourcePackSha256: ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
      exactLocator: ASPHALT_COMPACTION_PROFILE_SOURCE_METADATA.exact_locator,
      formula: "area_m2 * coverages / (speed_km_h * 1000 * working_width_m * utilization_factor)",
      normativeInputs: [
        "breakdown_roller_width_m",
        "intermediate_roller_width_m",
        "finish_roller_width_m",
      ],
      visibleAssumptions: [
        "roller_speed_km_h",
        "breakdown_coverages",
        "intermediate_coverages",
        "finish_coverages",
        "utilization_factor",
        "crew_person_count",
        "acceptance_lot_m2",
      ],
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "уплотнение асфальтового покрытия на большой площади",
    aliases: [
      "уплотнение асфальта 5000 м²",
      "укатка асфальта катками",
      "предварительное основное и финишное уплотнение асфальта",
      "asphalt compaction large area",
    ],
    shortScopeRu: "Самостоятельное трёхфазное уплотнение уже уложенного асфальта на большой площади; первая смета формируется сразу по видимому предварительному профилю катков.",
    keyDistinguishingParameters: ["area_m2"],
    clarificationFields: [],
    includedBoundaries: [
      "три фазы выбранного трёхмашинного профиля, бригада, расходники машин, контроль качества, безопасность, документы и мобилизация",
      "автоматические количества от площади, ширины, скорости, числа покрытий и коэффициента использования",
    ],
    excludedBoundaries: [
      "укладка смеси, доставка, основание и остальные слои дорожной одежды",
      "скрытая универсальная производительность или неподтверждённая цена",
    ],
    extraSearchTermsRu: "уплотнение укатка каток тандемный пневмоколёсный проход покрытие плотность температура пробная захватка большая площадь",
    sourceProvenance: {
      sourcePackSha256: ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
      firstEstimateFromAreaAndVisibleProfile: true,
      noMandatoryProfessionalQuestionnaire: true,
      runtimeProfileReplaceableByProjectData: true,
      independentCompletenessMap: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /асфальтоукладчик|asphalt_paver/iu,
    /смесь.*(?:достав|уклад)|mix_(?:delivery|placement)/iu,
    /(?:основан|подстилающ|нижн.*слой|геотекстил)|(?:base|subbase|lower_course|geotextile)/iu,
  ],
  owner: "S26_4_ASPHALT_COMPACTION_COMPLETE_SUCCESSOR",
  receiptFileStem: "S26_4_ASPHALT_COMPACTION_COMPLETE",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
