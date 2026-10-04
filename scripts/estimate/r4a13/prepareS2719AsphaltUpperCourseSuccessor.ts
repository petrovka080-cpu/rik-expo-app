import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileCanonicalEstimateCore } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../../src/lib/estimate/estimateDeterministicHash";

import {
  ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION,
  ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
  ASPHALT_INSTALL_KRER27_RUNTIME_SOURCE_IDS,
} from "../../../src/lib/estimate/v4/asphaltInstallLargeAreaKrer27ProfileR1";
import {
  ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT,
  ASPHALT_UPPER_COURSE_CATALOG_ID,
  ASPHALT_UPPER_COURSE_FORMULAS,
  ASPHALT_UPPER_COURSE_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_UPPER_COURSE_NORM_ID,
  ASPHALT_UPPER_COURSE_PARAMETERS,
  ASPHALT_UPPER_COURSE_RESOURCES,
  ASPHALT_UPPER_COURSE_SHORT_INPUT,
  ASPHALT_UPPER_COURSE_SOURCE_ID,
  ASPHALT_UPPER_COURSE_SOURCE_METADATA,
  compileAsphaltUpperCourseR1,
} from "../../../src/lib/estimate/v4/asphaltUpperCourseR1";
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
  const first = await compileAsphaltUpperCourseR1({ ...ASPHALT_UPPER_COURSE_SHORT_INPUT });
  const edited = await compileAsphaltUpperCourseR1({
    ...ASPHALT_UPPER_COURSE_SHORT_INPUT,
    layer_thickness_mm: 55,
  });
  const errors = validateIndependentCompletenessMapReferences({
    completenessMap: ASPHALT_UPPER_COURSE_INDEPENDENT_COMPLETENESS_MAP,
    formulaDefinitions: ASPHALT_UPPER_COURSE_FORMULAS,
    resourceDefinitions: ASPHALT_UPPER_COURSE_RESOURCES,
  });
  if (errors.length > 0) {
    throw new Error(`STOP_S2719_ASPHALT_UPPER_COMPLETENESS:${errors.join(",")}`);
  }
  for (const removed of ASPHALT_UPPER_COURSE_RESOURCES) {
    const removalErrors = validateIndependentCompletenessMapReferences({
      completenessMap: ASPHALT_UPPER_COURSE_INDEPENDENT_COMPLETENESS_MAP,
      formulaDefinitions: ASPHALT_UPPER_COURSE_FORMULAS,
      resourceDefinitions: ASPHALT_UPPER_COURSE_RESOURCES.filter(
        (resource) => resource.row_id !== removed.row_id,
      ),
    });
    if (!removalErrors.some((error) => /_(?:ROW|PARENT_ROW)_REFERENCE$/u.test(error))) {
      throw new Error(`STOP_S2719_ASPHALT_UPPER_REMOVAL_NOT_DETECTED:${removed.row_id}`);
    }
  }
  if (!(first.preliminaryNeeds.length === 0
    && first.rows.length === ASPHALT_UPPER_COURSE_RESOURCES.length
    && quantity(first.rows, "asphalt:control:geometric-compacted-volume") === "45"
    && quantity(first.rows, "asphalt:material:hot-dense-fine-mix") === "108.72"
    && quantity(first.rows, "asphalt:labor:road-workers") === "34.632"
    && quantity(first.rows, "asphalt:equipment:smooth-roller-8t") === "3.564"
    && quantity(first.rows, "asphalt:delivery:truck-trips") === "6")) {
    throw new Error("STOP_S2719_ASPHALT_UPPER_FIRST_ESTIMATE");
  }
  if (!(quantity(edited.rows, "asphalt:control:geometric-compacted-volume") === "49.5"
    && quantity(edited.rows, "asphalt:material:hot-dense-fine-mix") === "119.61"
    && quantity(edited.rows, "asphalt:labor:road-workers") === "34.713")) {
    throw new Error("STOP_S2719_ASPHALT_UPPER_RESIZE");
  }
  const serialized = JSON.stringify({ first, edited });
  if (/27-06-019-02|холодн/iu.test(serialized)) {
    throw new Error("STOP_S2719_ASPHALT_UPPER_COLD_MIX_REFERENCE");
  }
  const orderCases = [];
  for (const [acceptedOrder, trips, tonKm, machineHours, shortage] of [
    ["650.125", "33", "13002.5", "49.5", "0"], ["600", "30", "12000", "45", "4"],
  ]) {
    const result = await compileCanonicalEstimateCore({ operation: "recalculate",
      compilerVersion: "s27-31-asphalt-accepted-order-publication-control", catalogId: ASPHALT_UPPER_COURSE_CATALOG_ID,
      primaryMeasureParameterId: "area_m2", parameterDefinitions: [...ASPHALT_UPPER_COURSE_PARAMETERS],
      formulaDefinitions: [...ASPHALT_UPPER_COURSE_FORMULAS], resourceDefinitions: [...ASPHALT_UPPER_COURSE_RESOURCES],
      submittedParameters: { area_m2: 5000, layer_thickness_mm: 50 }, confirmedParameters: ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
      rowOverrides: { "asphalt:material:hot-dense-fine-mix": { quantity: acceptedOrder, includedInProcurement: true,
        provenance: { kind: "manual", reason: "VALIDATION_FIXTURE accepted bulk order; no engineering approval" } } },
      currencyCode: "KGS", priceItems: [], maximumResourceRows: 57, hashJson: async value => estimateDeterministicHash(value) });
    const owner = result.rows.find(row => row.row_id === "asphalt:material:hot-dense-fine-mix");
    const balance = (owner?.calculation_trace as Json | undefined)?.purchaseBalance as Json | undefined;
    if (result.preliminaryNeeds.length || result.rows.length !== 57 || owner?.quantity !== acceptedOrder
      || balance?.quantityMode !== "canonical_decimal" || balance.quantum !== null
      || balance.consumed !== "604" || balance.consumptionShortage !== shortage
      || owner.included_in_procurement !== (shortage === "0")
      || quantity(result.rows, "asphalt:delivery:truck-trips") !== trips
      || quantity(result.rows, "asphalt:delivery:ton-km") !== tonKm
      || quantity(result.rows, "asphalt:delivery:truck-machine-hours") !== machineHours
      || quantity(result.rows, "asphalt:quality:mix-temperature") !== trips
      || quantity(result.rows, "asphalt:operation:mix-receiving-feed") !== "604"
      || quantity(result.rows, "asphalt:control:geometric-compacted-volume") !== "250")
      throw new Error("STOP_S2731_ASPHALT_ACCEPTED_ORDER_CONTROL");
    orderCases.push({ acceptedOrder, trips, tonKm, machineHours, balance });
  }
  return {
    status: "GREEN_S2731_ASPHALT_ACCEPTED_ORDER_CORE",
    orderCases,
    first: {
      areaM2: 900,
      thicknessMm: 50,
      volumeM3: quantity(first.rows, "asphalt:control:geometric-compacted-volume"),
      hotMixT: quantity(first.rows, "asphalt:material:hot-dense-fine-mix"),
      laborManH: quantity(first.rows, "asphalt:labor:road-workers"),
      rowCount: first.rows.length,
    },
    resize: {
      thicknessMm: 55,
      volumeM3: quantity(edited.rows, "asphalt:control:geometric-compacted-volume"),
      hotMixT: quantity(edited.rows, "asphalt:material:hot-dense-fine-mix"),
    },
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-31.asphalt-upper-course-accepted-order-successor.v1",
  stopCode: "S2719_ASPHALT_UPPER_COURSE",
  applicationName: "s27-31-asphalt-upper-course-accepted-order-successor-v1",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (71).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "783d0425e1f0f0f0ea8a262be454e39d13e94e1a2ad5d1c6cc4b1e1314e624f1",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? currentRelease.definitionReleaseId,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? currentRelease.searchReleaseId,
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-31/asphalt-upper-course-accepted-order-successor-v1"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/asphalt-install-large-area-krer27-profile-r1.json",
    "src/lib/estimate/v4/asphaltInstallLargeAreaKrer27ProfileR1.ts",
    "src/lib/estimate/v4/asphaltUpperCourseR1.ts",
    "src/lib/estimate/v4/effectivePurchaseBalanceR1.ts",
    "src/lib/estimate/backendPlatform/formulaGraph.ts",
    "src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1.ts",
    "tests/estimateNorms/asphaltUpperCourseR1.contract.test.ts",
    "scripts/estimate/r4a13/prepareS2719AsphaltUpperCourseSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2731AsphaltAcceptedOrderIndependent.ts",
  ],
  catalogId: ASPHALT_UPPER_COURSE_CATALOG_ID,
  sourceId: ASPHALT_UPPER_COURSE_SOURCE_ID,
  normId: ASPHALT_UPPER_COURSE_NORM_ID,
  sourceMetadata: ASPHALT_UPPER_COURSE_SOURCE_METADATA,
  parameterDefinitions: ASPHALT_UPPER_COURSE_PARAMETERS,
  formulaDefinitions: ASPHALT_UPPER_COURSE_FORMULAS,
  resourceDefinitions: ASPHALT_UPPER_COURSE_RESOURCES,
  shortInput: ASPHALT_UPPER_COURSE_SHORT_INPUT,
  acceptanceInput: ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT,
  runtimeProfileInput: ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
  runtimeProfileClassification: ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: ASPHALT_INSTALL_KRER27_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [30, 23, 57],
  benchmarkOrdinal: 0,
  validationScenario: "S2719_ASPHALT_900_M2_50_MM_ORDINARY_FIRST_INPUT",
  passport: {
    canonicalRuName: "Устройство верхнего слоя горячего асфальтобетонного покрытия",
    workKey: "paving_roads_landscape_interior_asphalt_lay_standard",
    physicalResultRu: "На принятом основании устроен верхний слой 50 мм из горячей плотной мелкозернистой смеси с доставкой, укладкой, уплотнением и контролем",
    includedScopeRu: [
      "геометрический объём рассчитывается из площади и толщины",
      "горячая смесь, битум, керосин и боковые упоры по КРЕР 27-06-020-01 и 27-06-021-01",
      "труд, механизмы, доставка, мобилизация, контроль и исполнительные записи",
      "масса смеси и машино-часы рассчитываются системой до уточнений",
      "доставка и температурный контроль следуют принятому заказу смеси; дефицит относительно расчётного расхода блокирует готовность закупки",
    ],
    excludedScopeRu: [
      "основание, дренаж, бордюры, разметка и демонтаж без отдельного выбора",
      "цены без подтверждённого ценового источника",
    ],
    independentCompletenessMap: ASPHALT_UPPER_COURSE_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "HOT_ASPHALT_SURFACE_COURSE_INSTALLATION",
    constructionState: "ACCEPTED_PREPARED_BASE",
    primaryMeasureParameterId: "area_m2",
    geometryParameters: ["area_m2", "layer_thickness_mm"],
    selectedPreliminaryProfile: ASPHALT_UPPER_COURSE_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisibleAndEditable: true,
    acceptedOrderBalanceScope: "new_order_vs_required_consumption",
  },
  binding: {
    rowId: "asphalt:material:hot-dense-fine-mix",
    applicability: {
      technology_class: "HOT_DENSE_FINE_GRAINED_ASPHALT_SURFACE_COURSE",
      source_id: ASPHALT_UPPER_COURSE_SOURCE_ID,
      norm_id: ASPHALT_UPPER_COURSE_NORM_ID,
      exact_locator: ASPHALT_UPPER_COURSE_SOURCE_METADATA.exact_locator,
      quantity_basis: "KRER_27_06_020_01_40MM_PLUS_27_06_021_01_5MM_INCREMENTS",
    },
  },
  locator: {
    key: "asphalt-upper-course-krer-27-06-020-01-021-01-s27-31-accepted-order",
    payload: {
      kind: "NORMATIVE_OPERATION_AND_RESOURCE_MAP",
      exactLocator: ASPHALT_UPPER_COURSE_SOURCE_METADATA.exact_locator,
      baseMeasure: "1000 m2 at 40 mm",
      selectedProfile: "900 m2 at 50 mm",
      expectedResourceIds: ASPHALT_UPPER_COURSE_RESOURCES.map(row => row.row_id),
      expectedFormulaIds: ASPHALT_UPPER_COURSE_FORMULAS.map(row => row.formula_id),
      sourcePackSha256: ASPHALT_UPPER_COURSE_SOURCE_METADATA.definition_hash,
      acceptedOrderScope: "new_order_vs_required_consumption",
      transportPrimaryReference: { url: "https://handbook.asphaltpavement.org/chapter/mixture-delivery/",
        locator: "NAPA Asphalt Paving Handbook 2025, 6.2, 6.5.2, 6.7",
        useRestriction: "Actual delivery/temperature/ticket relationship only; no new quantities, temperatures, supplier packaging or engineering approval. No inventory credit; surplus does not prove reusable hot mix." },
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "устройство верхнего слоя горячего асфальтобетонного покрытия",
    aliases: ["асфальтирование", "асфальт 900 м² 50 мм", "укладка горячего асфальта", "верхний слой асфальта"],
    shortScopeRu: "Горячая смесь, материалы, труд, техника, доставка и контроль рассчитываются автоматически из площади и толщины.",
    keyDistinguishingParameters: ["area_m2", "layer_thickness_mm"],
    clarificationFields: [],
    includedBoundaries: ["принятое основание", "один верхний слой горячей смеси"],
    excludedBoundaries: ["новое основание", "дренаж, бордюры, разметка и демонтаж"],
    extraSearchTermsRu: "асфальтирование горячая смесь верхний слой асфальтоукладчик каток",
    sourceProvenance: {
      masterEdition: "S27.31",
      firstEstimateFromAreaAndThickness: true,
      independentRequiredComposition: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:subbase|drainage|kerb|marking|milling|demolition|lower-course)/iu,
    /(?:подстилающ|дренаж|бордюр|разметк|фрезерован|демонтаж)/iu,
  ],
  owner: "S2731_ASPHALT_UPPER_COURSE_ACCEPTED_ORDER_SUCCESSOR",
  receiptFileStem: "S2731_ASPHALT_UPPER_COURSE_ACCEPTED_ORDER",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
