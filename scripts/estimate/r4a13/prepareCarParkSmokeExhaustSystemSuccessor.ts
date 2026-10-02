import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  CAR_PARK_SMOKE_EXHAUST_ACCEPTANCE_INPUT,
  CAR_PARK_SMOKE_EXHAUST_CATALOG_ID,
  CAR_PARK_SMOKE_EXHAUST_FORMULAS,
  CAR_PARK_SMOKE_EXHAUST_INDEPENDENT_COMPLETENESS_MAP,
  CAR_PARK_SMOKE_EXHAUST_NORM_ID,
  CAR_PARK_SMOKE_EXHAUST_PARAMETERS,
  CAR_PARK_SMOKE_EXHAUST_RESOURCES,
  CAR_PARK_SMOKE_EXHAUST_SHORT_INPUT,
  CAR_PARK_SMOKE_EXHAUST_SOURCE_ID,
  CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA,
  compileCarParkSmokeExhaustSystemR1,
} from "../../../src/lib/estimate/v4/carParkSmokeExhaustSystemR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileCarParkSmokeExhaustSystemR1({
    ...CAR_PARK_SMOKE_EXHAUST_SHORT_INPUT,
  });
  const complete = await compileCarParkSmokeExhaustSystemR1({
    ...CAR_PARK_SMOKE_EXHAUST_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "f09:smoke_control_design_basis_review"
    && short.rows[0]?.quantity === "4870"
    && short.preliminaryNeeds.length === 24)) {
    throw new Error("STOP_S273_F09_CAR_PARK_SMOKE_EXHAUST_SHORT_COMPOSITION");
  }
  if (!(complete.rows.length === 25 && complete.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S273_F09_CAR_PARK_SMOKE_EXHAUST_COMPLETE_FIXTURE");
  }
  const actualRows = JSON.stringify(CAR_PARK_SMOKE_EXHAUST_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    formula_id: row.formula_id,
  })));
  if (/отоплен|радиатор|кот[её]л|heating|boiler|radiator/iu.test(actualRows)) {
    throw new Error("STOP_S273_F09_CAR_PARK_SMOKE_EXHAUST_CROSS_SYSTEM_SCOPE");
  }
  const serialized = JSON.stringify({ short, complete });
  return {
    status: "GREEN_S273_F09_CAR_PARK_SMOKE_EXHAUST_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      visibleRowIds: short.rows.map((row) => row.row_id),
    },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
      includedComponentCount: CAR_PARK_SMOKE_EXHAUST_RESOURCES.filter((row) =>
        row.resource_graph.costTreatment === "INCLUDED_IN_RESOURCE_ROWS").length,
      controlDocumentCount: CAR_PARK_SMOKE_EXHAUST_RESOURCES.filter((row) =>
        row.resource_graph.costTreatment === "CONTROL_OR_DOCUMENT").length,
    },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-3.f09-car-park-smoke-exhaust-system-successor.v1",
  stopCode: "S273_F09_CAR_PARK_SMOKE_EXHAUST_SYSTEM",
  applicationName: "s27-3-f09-car-park-smoke-exhaust-system-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "b4754cb1-a74f-5061-8681-522628786318",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "d2a88778-4f3a-54ac-84c2-50fc6a5dea04",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-fire-current-lineage/car-park-smoke-exhaust-system-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/carParkSmokeExhaustSystemR1.ts",
    "tests/estimateNorms/carParkSmokeExhaustSystemR1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareCarParkSmokeExhaustSystemSuccessor.ts",
  ],
  catalogId: CAR_PARK_SMOKE_EXHAUST_CATALOG_ID,
  sourceId: CAR_PARK_SMOKE_EXHAUST_SOURCE_ID,
  normId: CAR_PARK_SMOKE_EXHAUST_NORM_ID,
  sourceMetadata: CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA,
  parameterDefinitions: CAR_PARK_SMOKE_EXHAUST_PARAMETERS,
  formulaDefinitions: CAR_PARK_SMOKE_EXHAUST_FORMULAS,
  resourceDefinitions: CAR_PARK_SMOKE_EXHAUST_RESOURCES,
  shortInput: CAR_PARK_SMOKE_EXHAUST_SHORT_INPUT,
  acceptanceInput: CAR_PARK_SMOKE_EXHAUST_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [5, 58, 58],
  benchmarkOrdinal: 0,
  validationScenario: "F09_CAR_PARK_SMOKE_EXHAUST_SYSTEM",
  passport: {
    canonicalRuName: "Монтаж и пусконаладка системы дымоудаления автостоянки",
    workKey: "smoke_exhaust_system",
    physicalResultRu:
      "Система струйной вентиляции и дымоудаления подземной или крытой автостоянки смонтирована, настроена и испытана по утверждённому проекту",
    includedScopeRu: [
      "вентиляторы дымоудаления, компенсации и струйные вентиляторы по проектной спецификации",
      "противопожарные дымовые клапаны, воздуховоды, огнезащита, опоры и шкафы управления",
      "системные интерфейсы пожарной автоматики без передачи владельца внешней системы",
      "монтажные операции внутри прямой проектной трудоёмкости без двойного счёта",
      "функциональные и интегрированные испытания, измерения и исполнительная документация",
    ],
    excludedScopeRu: [
      "отопление, радиаторы, котлы и общая система отопления",
      "общеобменная комфортная вентиляция вне выбранной системы дымоудаления",
      "монтаж извещателей и логика автоматической пожарной сигнализации",
      "вводные электрофидеры и общезданийное аварийное питание",
      "универсальные нормы расхода, производительности, труда и цены",
    ],
    independentCompletenessMap: CAR_PARK_SMOKE_EXHAUST_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_AND_COMMISSION_CAR_PARK_JET_SMOKE_CONTROL",
    facilityClass: "ENCLOSED_OR_COVERED_CAR_PARK",
    systemVariant: "JET_VENTILATION_AND_SMOKE_EXHAUST",
    primaryMeasureParameterId: "parking_area_m2",
    geometryParameters: ["parking_area_m2"],
    officialTechnicalBoundarySource: CAR_PARK_SMOKE_EXHAUST_SOURCE_ID,
    approvedProjectSpecificationRequired: true,
    approvedMethodStatementRequired: true,
    approvedCommissioningProgramRequired: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    heatingScopeExcluded: true,
    generalComfortVentilationExcluded: true,
    adjacentSystemOwnershipPreserved: true,
  },
  binding: {
    rowId: "f09:smoke_control_design_basis_review",
    applicability: {
      technology_class: "CAR_PARK_JET_SMOKE_CONTROL",
      operation_class: "INSTALL_AND_COMMISSION_SMOKE_EXHAUST_SYSTEM",
      facility_class: "ENCLOSED_OR_COVERED_CAR_PARK",
      scope_mode: "DIRECT_APPROVED_PROJECT_SPECIFICATION_METHOD_AND_TEST_INPUTS",
      source_id: CAR_PARK_SMOKE_EXHAUST_SOURCE_ID,
      norm_id: CAR_PARK_SMOKE_EXHAUST_NORM_ID,
      exact_locator: CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA.artifact_sha256,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      quantity_basis: "DIRECT_APPROVED_PROJECT_INPUT",
    },
  },
  locator: {
    key: "sp-kr-41-101-2025-car-park-smoke-control-project-inputs-v1",
    payload: {
      kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_PROJECT_INPUTS_REQUIRED",
      exactLocator: CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: ["parking_area_m2"],
      directProjectInputs: CAR_PARK_SMOKE_EXHAUST_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => parameterId !== "parking_area_m2"),
      universalProductivityClaimed: false,
      universalConsumptionClaimed: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: "Монтаж и пусконаладка системы дымоудаления автостоянки",
    aliases: [
      "система дымоудаления подземной автостоянки",
      "струйная вентиляция паркинга",
      "противодымная вентиляция крытой автостоянки",
      "car park jet ventilation smoke exhaust system",
    ],
    shortScopeRu:
      "Монтаж и системная пусконаладка струйной вентиляции и дымоудаления подземной или крытой автостоянки по утверждённому проекту без отопительных подстановок.",
    keyDistinguishingParameters: ["parking_area_m2"],
    clarificationFields: [
      "smoke_exhaust_fan_count",
      "makeup_air_fan_count",
      "jet_fan_count",
      "smoke_damper_count",
      "smoke_duct_area_m2",
      "duct_fire_protection_area_m2",
      "installation_commissioning_labor_man_hour",
      "integrated_scenario_test_count",
    ],
    includedBoundaries: [
      "оборудование, воздуховоды, огнезащита, опоры и шкафы по проектной спецификации",
      "монтаж и пусконаладка с явным владельцем труда без двойного счёта",
      "функциональные и интегрированные испытания",
      "протоколы измерений и исполнительная документация",
    ],
    excludedBoundaries: [
      "отопление, радиаторы и котлы",
      "общая комфортная вентиляция",
      "монтаж пожарных извещателей и внешних электрофидеров",
      "неподтверждённые нормы и цены",
    ],
    extraSearchTermsRu:
      "дымоудаление паркинг автостоянка струйный вентилятор противодымная вентиляция дымовой клапан воздуховод огнезащита ПНР",
    sourceProvenance: {
      officialSpKr411012025TechnicalBoundary: true,
      exactOfficialArtifactSha256: CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA.artifact_sha256,
      directApprovedProjectInputsRequired: true,
      heatingSubstitutionRejected: true,
      universalRatesRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /отоплен|радиатор|кот[её]л|heating|boiler|radiator/iu,
    /канализац|sewer/iu,
    /спринклер|sprinkler|гидрант|hydrant/iu,
  ],
  owner: "S273_F09_CAR_PARK_SMOKE_EXHAUST_SYSTEM_SUCCESSOR",
  receiptFileStem: "S273_F09_CAR_PARK_SMOKE_EXHAUST_SYSTEM",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
