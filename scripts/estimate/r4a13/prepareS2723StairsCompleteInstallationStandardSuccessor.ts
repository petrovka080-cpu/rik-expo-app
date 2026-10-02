import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_ACCEPTANCE_INPUT,
} from "./prepareS2723StairsCompleteInstallationStandardSuccessorInput";
import {
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_CATALOG_ID,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FORMULAS,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_NORM_ID,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_NORMATIVE_PARAMETER_IDS,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_PARAMETERS,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RESOURCES,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RUNTIME_INPUT,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RUNTIME_SOURCE_IDS,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SHORT_INPUT,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_ID,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_METADATA,
  compileStairsCompleteInstallationStandardS2723,
  stairsCompleteInstallationStandardMissingRowsS2723,
} from "../../../src/lib/estimate/v4/stairsCompleteInstallationStandardS2723";
import { CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT } from
  "./catalogFirstEstimateMinimumInputAudit.shared";
import {
  runMasterSingleDefinitionSuccessorR1,
  validateIndependentCompletenessMapReferences,
} from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const currentReleasePath = resolve(
  process.env.R4A13_CURRENT_RELEASE_PATH
    ?? "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId: string;
  searchReleaseId: string;
};
const resourceById = new Map(
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RESOURCES.map(
    (resource) => [resource.row_id, resource],
  ),
);

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256:
    STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP
      .evidenceSha256,
  entries: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP
    .entries.flatMap((component) => component.requiredRowIds.map((rowId) => ({
      operationId: component.semanticKey,
      expectedResourceId: rowId,
      condition: "required by the complete standard monolithic-stairs technology route",
      sourceId: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_ID,
      formulaId: String(resourceById.get(rowId)?.formula_id ?? ""),
      resolution: { kind: "ROW", rowId },
    }))),
});

function quantity(rows: readonly Json[], rowId: string): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
}

async function verifyCore(): Promise<Json> {
  const first = await compileStairsCompleteInstallationStandardS2723({
    ...STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SHORT_INPUT,
  });
  const complete = await compileStairsCompleteInstallationStandardS2723({
    ...STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_ACCEPTANCE_INPUT,
  });
  const changed = await compileStairsCompleteInstallationStandardS2723({
    ...STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_ACCEPTANCE_INPUT,
    stairs_concrete_volume_m3: 20,
    finishing_exposed_surface_area_m2: 100,
  });
  const rowIds = new Set(complete.rows.map((row) => row.row_id));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FORMULAS,
    resourceDefinitions: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RESOURCES,
  });
  const firstMissing = new Set(
    first.preliminaryNeeds.flatMap((need) => need.missing_parameter_ids),
  );
  const assertions = {
    firstEstimateAppearsImmediately:
      first.rows.length === 24 && first.preliminaryNeeds.length === 52,
    independentProcurementAppearsImmediately:
      first.rows.filter((row) => row.included_in_procurement).length === 11,
    dependentStagesRemainVisible:
      firstMissing.has("reinforcement_approved_reinforcement_schedule_weight_kg")
      && firstMissing.has("formwork_measured_formwork_contact_area_m2")
      && firstMissing.has("finishing_exposed_surface_area_m2")
      && firstMissing.has("external_curing_approved_external_curing_method"),
    noContextQuestionLeak:
      [...firstMissing].every((parameterId) =>
        !parameterId.startsWith("technical_room_")
        && !parameterId.startsWith("high_load_")),
    completeComposition:
      complete.rows.length === 58
      && complete.rows.filter((row) => row.included_in_estimate).length === 48
      && complete.preliminaryNeeds.length === 0,
    completeProcurementSubset:
      complete.rows.filter((row) => row.included_in_procurement).length === 34,
    independentMapComplete:
      stairsCompleteInstallationStandardMissingRowsS2723(rowIds).length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    legacyDoubleCountRemoved:
      !rowIds.has("work:concrete:place-and-compact")
      && !rowIds.has("equipment:concrete:deep-vibrator")
      && !rowIds.has("work:concrete:finish-surface")
      && !rowIds.has("work:concrete:cure")
      && rowIds.has("work:concrete:place")
      && rowIds.has("concrete-stairs-vibration:03:labor:vibration-crew")
      && rowIds.has("work:concrete:stairs-external-curing")
      && rowIds.has("labor:concrete:stairs-primary-surface-finishing"),
    volumeAndAreaRecalculate:
      quantity(changed.rows, "material:concrete:ready-mix") === 21.2
      && quantity(changed.rows,
        "concrete-stairs-vibration:03:labor:vibration-crew") === 25
      && quantity(changed.rows,
        "labor:concrete:stairs-primary-surface-finishing") === 50
      && quantity(changed.rows,
        "equipment:concrete:stairs-finishing-hand-tools") === 2,
    oneTimeCleaningNotRepeated:
      quantity(changed.rows,
        "concrete-stairs-vibration:04:labor:cleaning") === 0.25
      && quantity(changed.rows,
        "concrete-stairs-vibration:04:consumable:cleaning-water") === 0.025,
    unknownPricesRemainNull:
      complete.rows.every((row) => row.unit_price == null && row.amount == null),
  };
  const failed = Object.entries(assertions)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(
      `STOP_S27_23_STAIRS_COMPLETE_STANDARD_CORE:${failed.join(",")}`,
    );
  }
  return {
    status: "GREEN_S27_23_STAIRS_COMPLETE_STANDARD_CORE",
    assertions,
    firstEstimate: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      procurementRowCount:
        first.rows.filter((row) => row.included_in_procurement).length,
      distinctMissingParameterCount: firstMissing.size,
    },
    completeEstimate: {
      visibleRowCount: complete.rows.length,
      includedEstimateRowCount:
        complete.rows.filter((row) => row.included_in_estimate).length,
      procurementRowCount:
        complete.rows.filter((row) => row.included_in_procurement).length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
    },
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ first, complete, changed })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-23.stairs-complete-installation-standard-successor.v1",
  stopCode: "S27_23_STAIRS_COMPLETE_INSTALLATION_STANDARD",
  applicationName: "s27-23-stairs-complete-installation-standard-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (63).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "e1c70828ba30bb4dae395c2766f8ff7e13467ec51592198f4722a64edf8126ca",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? currentRelease.definitionReleaseId,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? currentRelease.searchReleaseId,
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-23/stairs-complete-installation-standard-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-standard-s27-23.json",
    "src/lib/estimate/v4/stairsCompleteInstallationR1.ts",
    "src/lib/estimate/v4/stairsConcretePlacementR1.ts",
    "src/lib/estimate/v4/stairsReinforcementR1.ts",
    "src/lib/estimate/v4/stairsProjectFormworkR1.ts",
    "src/lib/estimate/v4/stairsConcreteVibrationStandardS2723.ts",
    "src/lib/estimate/v4/concreteSlabCuringR1.ts",
    "src/lib/estimate/v4/stairsCompleteInstallationStandardS2723.ts",
    "tests/estimateNorms/stairsCompleteInstallationStandardS2723.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723StairsCompleteInstallationStandardSuccessorInput.ts",
    "scripts/estimate/r4a13/prepareS2723StairsCompleteInstallationStandardSuccessor.ts",
  ],
  catalogId: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_CATALOG_ID,
  sourceId: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_ID,
  normId: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_NORM_ID,
  sourceMetadata: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_METADATA,
  parameterDefinitions: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_PARAMETERS,
  formulaDefinitions: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FORMULAS,
  resourceDefinitions: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RESOURCES,
  shortInput: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SHORT_INPUT,
  acceptanceInput: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_ACCEPTANCE_INPUT,
  runtimeProfileInput: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RUNTIME_INPUT,
  runtimeProfileClassification:
    STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds:
    STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [136, 73, 76],
  benchmarkOrdinal: 0,
  validationScenario: "S27_23_STAIRS_COMPLETE_STANDARD_10_M3",
  passport: {
    canonicalRuName: "полное устройство монолитной бетонной лестницы",
    workKey: "concrete_foundation_interior_stairs_concrete_form_standard",
    physicalResultRu:
      "Монолитная железобетонная лестница стандартного контекста с опалубкой, армированием, укладкой, отдельным виброуплотнением, первичной отделкой и уходом.",
    includedScopeRu: [
      "временная опалубка, армирование, товарный бетон, укладка и контроль",
      "детальное виброуплотнение с трудом, арендой, электроэнергией, очисткой и логистикой без двойного учёта",
      "первичная отделка монолитной поверхности и внешний уход по выбранному проектному способу",
      "первый частичный расчёт до уточнения зависимых проектных ведомостей",
    ],
    excludedScopeRu: [
      "декоративное покрытие, облицовка и ремонтные составы без отдельного проектного назначения",
      "скрытые универсальные нормы опалубки, армирования, ухода или производительности",
      "цены без подтверждённого ценового снимка",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "COMPLETE_MONOLITHIC_REINFORCED_CONCRETE_STAIRS",
    catalogContext: "STANDARD",
    primaryMeasureParameterId: "stairs_concrete_volume_m3",
    sharedCoreComposition: true,
    firstEstimateBeforeClarification: true,
    contextQuestionLeakForbidden: true,
    legacyVibrationDoubleCountRemoved: true,
    stageCount: 6,
    normativeParameterIds: [
      ...STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_NORMATIVE_PARAMETER_IDS,
    ],
  },
  binding: {
    rowId: "material:concrete:ready-mix",
    applicability: {
      technology_class: "COMPLETE_MONOLITHIC_CONCRETE_STAIRS_STANDARD",
      source_id: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_ID,
      norm_id: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_NORM_ID,
      exact_locator:
        STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_METADATA.exact_locator,
      quantity_basis:
        STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_METADATA.quantity_basis,
      assumption_policy:
        "VISIBLE_REPLACEABLE_OPERATION_PROFILES_AND_DIRECT_PROJECT_SCHEDULES",
    },
  },
  locator: {
    key: "stairs-complete-installation-standard-s27-23",
    payload: {
      kind: "COMPLEX_WORK_COMPOSITION",
      independentCompletenessMap: true,
      stageCount: 6,
      vibrationSourcePackSha256:
        "248c48012ed587514fa90d6ca7ef4eae59604aed3b8fcc04a09e4a4cbdbf57ac",
      firstEstimateBeforeClarification: true,
      legacyVibrationDoubleCountRemoved: true,
    },
  },
  search: {
    primaryUom: "м3",
    canonicalNameRu: "полное устройство монолитной бетонной лестницы",
    aliases: [
      "монолитная лестница под ключ",
      "полная смета железобетонной лестницы",
      "опалубка армирование бетонирование лестницы",
    ],
    shortScopeRu:
      "Полная технологическая сборка: опалубка, арматура, бетон, укладка, виброуплотнение, первичная отделка и уход.",
    keyDistinguishingParameters: [
      "stairs_concrete_volume_m3",
      "reinforcement_approved_reinforcement_schedule_weight_kg",
      "formwork_measured_formwork_contact_area_m2",
      "finishing_exposed_surface_area_m2",
      "external_curing_approved_external_curing_method",
    ],
    clarificationFields: [
      "reinforcement_bar_bending_schedule_reference",
      "formwork_approved_formwork_drawing_reference",
      "external_curing_curing_method_statement_reference",
    ],
    includedBoundaries: [
      "обязательные этапы полной монолитной лестницы и их ресурсы",
      "видимые зависимые строки до ввода проектных ведомостей",
    ],
    excludedBoundaries: [
      "декоративная облицовка и отдельные ремонтные покрытия",
      "автоматический выбор неподтверждённой системы опалубки или армирования",
    ],
    extraSearchTermsRu:
      "лестница монолит бетон опалубка арматура вибратор отделка уход закупка полная смета",
    sourceProvenance: {
      composedFromExistingCoreOwners: true,
      vibrationBalanceSuccessorReused: true,
      curingApplicabilitySourceReused: true,
      hiddenUniversalNormsForbidden: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /__s27_23_complete_stairs_forbidden_adjacent_match__/u,
  ],
  owner: "S27_23_STAIRS_COMPLETE_INSTALLATION_STANDARD_SUCCESSOR",
  receiptFileStem: "S27_23_STAIRS_COMPLETE_INSTALLATION_STANDARD",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
