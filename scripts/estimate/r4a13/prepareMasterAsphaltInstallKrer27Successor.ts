import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ASPHALT_INSTALL_KRER27_ACCEPTANCE_INPUT,
  ASPHALT_INSTALL_KRER27_CATALOG_ID,
  ASPHALT_INSTALL_KRER27_FORMULAS,
  ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_INSTALL_KRER27_NORM_ID,
  ASPHALT_INSTALL_KRER27_PARAMETERS,
  ASPHALT_INSTALL_KRER27_RESOURCES,
  ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION,
  ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
  ASPHALT_INSTALL_KRER27_RUNTIME_SOURCE_IDS,
  ASPHALT_INSTALL_KRER27_SHORT_INPUT,
  ASPHALT_INSTALL_KRER27_SOURCE_ID,
  ASPHALT_INSTALL_KRER27_SOURCE_METADATA,
  ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
  compileAsphaltInstallKrer27ProfileR1,
} from "../../../src/lib/estimate/v4/asphaltInstallKrer27ProfileR1";
import {
  runMasterSingleDefinitionSuccessorR1,
  validateIndependentCompletenessMapReferences,
} from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const currentReleasePath = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId: string;
  searchReleaseId: string;
};

function quantity(rows: readonly Json[], rowId: string): string | null {
  return String(rows.find((row) => row.row_id === rowId)?.quantity ?? "") || null;
}

async function verifyCore(): Promise<Json> {
  const firstEstimate = await compileAsphaltInstallKrer27ProfileR1({
    ...ASPHALT_INSTALL_KRER27_SHORT_INPUT,
  });
  const refined = await compileAsphaltInstallKrer27ProfileR1({
    ...ASPHALT_INSTALL_KRER27_SHORT_INPUT,
    layer_thickness_mm: 55,
  });
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP,
    formulaDefinitions: ASPHALT_INSTALL_KRER27_FORMULAS,
    resourceDefinitions: ASPHALT_INSTALL_KRER27_RESOURCES,
  });
  if (completenessErrors.length > 0) {
    throw new Error(`STOP_MASTER_ASPHALT_INSTALL_INDEPENDENT_MAP:${completenessErrors.join(",")}`);
  }
  for (const removed of ASPHALT_INSTALL_KRER27_RESOURCES) {
    const errors = validateIndependentCompletenessMapReferences({
      completenessMap: ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP,
      formulaDefinitions: ASPHALT_INSTALL_KRER27_FORMULAS,
      resourceDefinitions: ASPHALT_INSTALL_KRER27_RESOURCES.filter(
        (candidate) => candidate.row_id !== removed.row_id,
      ),
    });
    if (!errors.some((error) => /_(?:ROW|PARENT_ROW)_REFERENCE$/u.test(error))) {
      throw new Error(`STOP_MASTER_ASPHALT_INSTALL_REMOVAL_NOT_DETECTED:${removed.row_id}`);
    }
  }
  if (!(firstEstimate.preliminaryNeeds.length === 0
    && firstEstimate.rows.length === ASPHALT_INSTALL_KRER27_RESOURCES.length
    && firstEstimate.rows.every((row) => Number(row.quantity) > 0)
    && quantity(firstEstimate.rows, "asphalt:material:hot-dense-fine-mix") === "604"
    && quantity(firstEstimate.rows, "asphalt:material:road-bitumen") === "0.068"
    && quantity(firstEstimate.rows, "asphalt:material:technical-kerosene") === "0.026"
    && quantity(firstEstimate.rows, "asphalt:material:hardwood-side-stop-bars") === "0.75"
    && quantity(firstEstimate.rows, "asphalt:labor:road-workers") === "192.4"
    && quantity(firstEstimate.rows, "asphalt:equipment:smooth-roller-8t") === "19.8"
    && quantity(firstEstimate.rows, "asphalt:equipment:asphalt-paver") === "15.95"
    && quantity(firstEstimate.rows, "asphalt:delivery:truck-trips") === "31"
    && quantity(firstEstimate.rows, "asphalt:delivery:ton-km") === "12080"
    && quantity(firstEstimate.rows, "asphalt:delivery:truck-machine-hours") === "46.5")) {
    throw new Error("STOP_MASTER_ASPHALT_INSTALL_FIRST_ESTIMATE");
  }
  if (!(refined.preliminaryNeeds.length === 0
    && quantity(refined.rows, "asphalt:material:hot-dense-fine-mix") === "664.5"
    && quantity(refined.rows, "asphalt:labor:road-workers") === "192.85"
    && quantity(refined.rows, "asphalt:equipment:surface-grinder") === "57.55")) {
    throw new Error("STOP_MASTER_ASPHALT_INSTALL_REFINEMENT");
  }
  const truckMetrics = firstEstimate.rows.filter((row) => [
    "asphalt:delivery:truck-trips",
    "asphalt:delivery:ton-km",
  ].includes(String(row.row_id)));
  const includedMachineComponents = firstEstimate.rows.filter((row) =>
    String((row.calculation_trace as Json)?.resourceGraph?.costTreatment)
      === "INCLUDED_IN_RESOURCE_ROWS");
  if (!(truckMetrics.every((row) => row.included_in_estimate === false)
    && firstEstimate.rows.find((row) =>
      row.row_id === "asphalt:delivery:truck-machine-hours")?.included_in_estimate === true
    && includedMachineComponents.length > 0
    && includedMachineComponents.every((row) => row.included_in_estimate === false))) {
    throw new Error("STOP_MASTER_ASPHALT_INSTALL_DOUBLE_COUNT");
  }
  const forbidden = ASPHALT_INSTALL_KRER27_RESOURCES.filter((resource) =>
    /(?:subbase|drainage|kerb|marking|milling|demolition|lower-course)/iu.test(
      `${resource.row_id} ${resource.title_ru}`,
    ));
  if (forbidden.length > 0) {
    throw new Error(`STOP_MASTER_ASPHALT_INSTALL_ADJACENT_SCOPE:${forbidden.map((row) =>
      row.row_id).join(",")}`);
  }

  const detailedLedger = firstEstimate.rows.map((row) => {
    const definition = ASPHALT_INSTALL_KRER27_RESOURCES.find((resource) =>
      resource.row_id === row.row_id)!;
    const trace = Array.isArray(row.normative_trace) ? row.normative_trace[0] as Json : {};
    return {
      rowId: row.row_id,
      titleRu: row.title_ru,
      category: row.category,
      specification: ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP.entries.find(
        (entry) => entry.resolution.rowId === row.row_id,
      )?.specification,
      unitId: row.unit_id,
      quantity: row.quantity,
      formulaId: definition.formula_id,
      sourceId: trace?.sourceId ?? trace?.source_id ?? null,
      exactLocator: trace?.exact_locator ?? null,
      procurementEligible: row.procurement_eligible,
      includedInEstimate: row.included_in_estimate,
      includedInProcurement: row.included_in_procurement,
      costTreatment: (row.calculation_trace as Json)?.resourceGraph?.costTreatment ?? null,
    };
  });
  const categoryCounts = ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP.entries.reduce(
    (counts, entry) => ({
      ...counts,
      [entry.category]: Number(counts[entry.category] ?? 0) + 1,
    }),
    {} as Record<string, number>,
  );
  const serialized = JSON.stringify({
    firstEstimate,
    refined,
    detailedLedger,
    independentCompletenessMap: ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP,
  });
  return {
    status: "GREEN_MASTER_ASPHALT_INSTALL_KRER27_CORE",
    scenarioBoundary: {
      input: ASPHALT_INSTALL_KRER27_SHORT_INPUT,
      selectedProfile: "one 50 mm hot dense fine-grained asphalt course on an accepted prepared base",
      visibleReplaceableAssumptions: ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
      excludedAdjacentScope: [
        "base and subbase construction",
        "drainage",
        "kerbs",
        "road marking",
        "milling or demolition",
      ],
    },
    actualComposition: {
      rowCount: detailedLedger.length,
      categoryCounts,
      preliminaryNeedCount: firstEstimate.preliminaryNeeds.length,
      payableUnknownPriceCount: firstEstimate.rows.filter((row) =>
        row.included_in_estimate && row.unit_price == null).length,
      independentlyRequiredComponentCount:
        ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP.entries.length,
      removalMutationCount: ASPHALT_INSTALL_KRER27_RESOURCES.length,
      removalMutationsDetected: ASPHALT_INSTALL_KRER27_RESOURCES.length,
      detailedLedger,
    },
    refinement: {
      layerThicknessMm: 55,
      hotMixT: quantity(refined.rows, "asphalt:material:hot-dense-fine-mix"),
      laborManH: quantity(refined.rows, "asphalt:labor:road-workers"),
      roller13tMachineH: quantity(refined.rows, "asphalt:equipment:surface-grinder"),
    },
    sourcePackSha256: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-21.master-asphalt-install-hot-krer27-successor.v4",
  stopCode: "MASTER_ASPHALT_INSTALL_KRER27",
  applicationName: "s27-21-master-asphalt-install-hot-krer27-successor-v4",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? currentRelease.definitionReleaseId,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? currentRelease.searchReleaseId,
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-21/asphalt-install-short-name-successor-v4"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/asphalt-install-large-area-krer27-profile-r1.json",
    "src/lib/estimate/backendPlatform/parameterConstraints.ts",
    "src/lib/estimate/backendPlatform/parameterConstraints.test.ts",
    "src/lib/estimate/v4/asphaltInstallKrer27ProfileR1.ts",
    "tests/estimateNorms/asphaltInstallKrer27ProfileR1.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareMasterAsphaltInstallKrer27Successor.ts",
  ],
  catalogId: ASPHALT_INSTALL_KRER27_CATALOG_ID,
  sourceId: ASPHALT_INSTALL_KRER27_SOURCE_ID,
  normId: ASPHALT_INSTALL_KRER27_NORM_ID,
  sourceMetadata: ASPHALT_INSTALL_KRER27_SOURCE_METADATA,
  parameterDefinitions: ASPHALT_INSTALL_KRER27_PARAMETERS,
  formulaDefinitions: ASPHALT_INSTALL_KRER27_FORMULAS,
  resourceDefinitions: ASPHALT_INSTALL_KRER27_RESOURCES,
  shortInput: ASPHALT_INSTALL_KRER27_SHORT_INPUT,
  acceptanceInput: ASPHALT_INSTALL_KRER27_ACCEPTANCE_INPUT,
  runtimeProfileInput: ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
  runtimeProfileClassification: ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: ASPHALT_INSTALL_KRER27_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: (process.env.S2719_ASPHALT_EXPECTED_PARENT_SHAPE
    ?.split(",").map(Number) ?? [30, 22, 56]) as [number, number, number],
  benchmarkOrdinal: 0,
  validationScenario: "S2719_ASPHALT_INSTALL_ACCEPTED_BASE_5000_M2_FIRST_ESTIMATE",
  passport: {
    canonicalRuName: "Устройство однослойного асфальтобетонного покрытия на принятом основании",
    workKey: "paving_roads_landscape_interior_asphalt_install_standard",
    physicalResultRu: "На принятом подготовленном основании устроено однослойное покрытие 50 мм из горячей плотной мелкозернистой асфальтобетонной смеси с доставкой, механизированной укладкой, уплотнением, контролем качества и исполнительными записями",
    includedScopeRu: [
      "приёмка и очистка существующего подготовленного основания без необоснованной замены основания",
      "боковые упоры, дорожный битум, технический керосин и горячая плотная мелкозернистая смесь по КРЕР 27-06-020-01 и 27-06-021-01",
      "труд рабочих, кран, гудронатор, катки 8 и 13 т, поливомоечная машина, асфальтоукладчик и бортовой автомобиль",
      "доставка смеси, мобилизация перевозимой техники, организация безопасной рабочей зоны и непрерывного потока",
      "контроль паспортов, температуры, нанесения битума, толщины, плотности, ровности, отметок и уклона",
      "видимые компоненты машино-часов без повторной оплаты; первая смета рассчитывается до необязательного уточнения профиля",
    ],
    excludedScopeRu: [
      "строительство или ремонт основания и подстилающих слоёв без факта их необходимости",
      "дренаж, бордюры, дорожная разметка, фрезерование и демонтаж существующего покрытия",
      "зимние и ночные мероприятия, если они не выбраны",
      "неподтверждённые цены; отсутствие цены не блокирует количественную смету и подтверждение",
    ],
    independentCompletenessMap: ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "ASPHALT_SURFACE_COURSE_INSTALLATION",
    scopeClass: "MECHANIZED_SINGLE_COURSE",
    constructionState: "ACCEPTED_PREPARED_BASE",
    primaryMeasureParameterId: "area_m2",
    geometryParameters: ["area_m2"],
    selectedPreliminaryProfile: ASPHALT_INSTALL_KRER27_NORM_ID,
    selectedLayerThicknessMm: 50,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisible: true,
    independentRequiredComposition: true,
    noArtificialRowQuotaOrCap: true,
    adjacentPavementScopeExcludedUnlessSelected: true,
  },
  binding: {
    rowId: "asphalt:material:hot-dense-fine-mix",
    applicability: {
      technology_class: "HOT_DENSE_FINE_GRAINED_ASPHALT_SINGLE_COURSE",
      operation_class: "ASPHALT_SURFACE_COURSE_INSTALLATION",
      scope_class: "MECHANIZED_SINGLE_COURSE",
      construction_state: "ACCEPTED_PREPARED_BASE",
      source_id: ASPHALT_INSTALL_KRER27_SOURCE_ID,
      norm_id: ASPHALT_INSTALL_KRER27_NORM_ID,
      exact_locator: ASPHALT_INSTALL_KRER27_SOURCE_METADATA.exact_locator,
      quantity_basis: "KRER_27_06_020_01_PER_1000_M2_BASE_40_MM_PLUS_27_06_021_01_5_MM_INCREMENTS",
      assumption_policy: "VISIBLE_AND_REPLACEABLE_BY_PROJECT_PPR_ROUTE_AND_QUALITY_PLAN",
    },
  },
  locator: {
    key: "asphalt-install-krer-27-06-020-01-021-01-r4-short-public-name",
    payload: {
      kind: "NORMATIVE_OPERATION_AND_RESOURCE_MAP",
      sourcePackSha256: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
      artifactSha256: ASPHALT_INSTALL_KRER27_SOURCE_METADATA.artifact_sha256,
      exactLocator: ASPHALT_INSTALL_KRER27_SOURCE_METADATA.exact_locator,
      baseMeasure: "1000 m2 at 40 mm",
      selectedProfile: "5000 m2 at 50 mm",
      independentCompletenessMap: true,
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "устройство однослойного асфальтобетонного покрытия на принятом основании",
    aliases: [
      "асфальтирование",
      "асфальтирование 5000 м²",
      "асфальтирование площадки 5000 м²",
      "устройство асфальтобетонного покрытия",
      "укладка асфальта 5000 м²",
      "укладка горячей асфальтобетонной смеси",
      "asphalt paving 5000 m2",
    ],
    shortScopeRu: "Комплексное устройство одного слоя горячего асфальтобетонного покрытия на принятом подготовленном основании: материалы, труд, механизмы, доставка, мобилизация и контроль рассчитываются сразу по видимому предварительному профилю.",
    keyDistinguishingParameters: ["area_m2"],
    clarificationFields: [],
    includedBoundaries: [
      "принятое подготовленное основание, один слой 50 мм, горячая плотная мелкозернистая смесь",
      "очистка, упоры, обработка битумом, доставка, укладка, уплотнение, отделка, контроль и передача",
      "самостоятельные материалы и ресурсы раскрыты; включённые компоненты видимы без двойного счёта",
    ],
    excludedBoundaries: [
      "новое основание и подстилающие слои, дренаж, бордюры, разметка, фрезерование и демонтаж",
      "проектные отклонения от предварительного профиля до их выбора пользователем",
    ],
    extraSearchTermsRu: "асфальтирование асфальт укладка устройство покрытие горячая смесь асфальтоукладчик каток битум доставка 5000 м² принятое основание",
    sourceProvenance: {
      sourcePackSha256: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
      masterEdition: "S27.19",
      firstEstimateFromAreaAndVisibleProfile: true,
      independentRequiredComposition: true,
      removalMutationVerified: true,
      noMandatoryProfessionalQuestionnaire: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:subbase|drainage|kerb|marking|milling|demolition|lower-course)/iu,
    /(?:подстилающ|дренаж|бордюр|разметк|фрезерован|демонтаж)/iu,
  ],
  owner: "S2721_ASPHALT_INSTALL_SHORT_NAME_SUCCESSOR",
  receiptFileStem: "S2721_ASPHALT_INSTALL_SHORT_NAME",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
