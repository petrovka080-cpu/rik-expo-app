import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";
import { buildRoadCrossingSleevesSelectedJackingR1, assertRoadCrossingSleevesSelectedJackingPublicationR1 } from "../../../src/lib/estimate/v4/roadCrossingSleevesSelectedJackingR1";
import { compileAutomaticConstructionOwnerR1 } from "../../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { parseRoadCrossingSleevesSelectedJackingPromptR1 } from "../../../src/lib/estimate/v4/roadCrossingSleevesSelectedJackingPromptR1";

const SOURCE_PACK = "data/estimate-benchmarks/source-packs/road-crossing-sleeves-selected-jacking-s27-31.json";
const sourceHash = createHash("sha256").update(readFileSync(resolve(SOURCE_PACK))).digest("hex");
const SOURCE_ID = "road-crossing-sleeves-selected-jacking-s27-31";
const NORM_ID = "actual-selected-project-facts-no-engineering-defaults";
const sourceMetadata = { source_title: "Выбранный прямой переход продавливанием: полный ограниченный состав и фактические проектные источники",
  source_authority: "Primary-source scope boundaries; actual project/product/method confirmation remains required",
  source_document_version: "S27.31 selected jacking v1", definition_hash: sourceHash, artifact_sha256: sourceHash,
  exact_locator: `${SOURCE_PACK}#implementation`, use_restriction: "No universal rates, synthetic project approval, runtime engineering defaults or unsupported alternative programmes" };
const component = buildRoadCrossingSleevesSelectedJackingR1(sourceMetadata);
assertRoadCrossingSleevesSelectedJackingPublicationR1(component);
const definition = component.definition;
const SHORT_INPUT = parseRoadCrossingSleevesSelectedJackingPromptR1("переход продавливанием, длина футляра 24 м, наружный диаметр 720 мм, внутренний 700 мм, рабочая труба 110 мм");
async function verifyCore() {
  assertRoadCrossingSleevesSelectedJackingPublicationR1(component);
  const first = await compileAutomaticConstructionOwnerR1({ compilerVersion: "s27-31-selected-jacking-core", catalogId: component.scope.catalogId,
    primaryMeasureParameterId: "rcs_crossing_length_m", definition, submittedParameters: SHORT_INPUT });
  if (!first.preliminaryNeeds.length || first.preliminaryNeeds.some(row => row.missing_parameter_ids.some(id => id.startsWith("effective_resource_quantity_")))) {
    throw new Error("STOP_S27_31_CROSSING_ORIGINAL_LOCAL_NEEDS");
  }
  if (Object.keys(definition.runtimeInput).length) throw new Error("STOP_S27_31_CROSSING_HIDDEN_RUNTIME_DEFAULT");
  return { status: "GREEN_SELECTED_TECHNICAL_COMPOSITION_WITH_EXPLICIT_PROJECT_NEEDS", engineeringAccepted: false,
    fixtureClassification: "VALIDATION_FIXTURE", runtimeDefaultCount: 0, parameterCount: definition.parameters.length,
    resourceCount: definition.resources.length, firstSolvedRowCount: first.rows.length, firstLocalNeedCount: first.preliminaryNeeds.length,
    stageCoverage: component.stageMatrix.map(stage => ({ stageId: stage.stageId, resourceCount: stage.ownResourceIds.length })),
    missingProjectFactsAreNotEngineeringDefaults: true, serializedSha256: createHash("sha256").update(JSON.stringify(first)).digest("hex") };
}
void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-31.road-crossing-sleeves-selected-jacking-successor.v1", stopCode: "S27_31_CROSSING_SELECTED_JACKING",
  applicationName: "s27-31-crossing-selected-jacking-successor", expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (71).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256 ?? "783d0425e1f0f0f0ea8a262be454e39d13e94e1a2ad5d1c6cc4b1e1314e624f1",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID ?? "cff26f4d-563f-5b93-8aae-378a20922a8a",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID ?? "bb819ef0-0d54-5409-af67-d2660f56e227",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-31/road-crossing-sleeves-selected-jacking-successor"),
  sourcePaths: [SOURCE_PACK, "src/lib/estimate/v4/roadCrossingSleevesSelectedJackingR1.ts", "src/lib/estimate/v4/roadCrossingSleevesSelectedCompletionR1.ts",
    "src/lib/estimate/v4/roadCrossingSleevesComponentsR1.ts", "src/lib/estimate/v4/roadCrossingSleevesServiceWasteR1.ts", "src/lib/estimate/v4/automaticConstructionOwnerR1.ts",
    "src/lib/estimate/v4/roadCrossingSleevesSelectedJackingPromptR1.ts", "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts", "tests/estimateNorms/roadCrossingSleevesSelectedJackingR1.contract.test.ts",
    "tests/estimateNorms/roadCrossingSleevesSelectedCompletionR1.contract.test.ts", "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2731RoadCrossingSleevesSelectedJackingSuccessor.ts", "scripts/estimate/r4a13/readbackS2731RoadCrossingSleevesSelectedJackingIndependent.ts"],
  catalogId: component.scope.catalogId, sourceId: SOURCE_ID, normId: NORM_ID, sourceMetadata,
  parameterDefinitions: definition.parameters, formulaDefinitions: definition.formulas, resourceDefinitions: definition.resources,
  shortInput: SHORT_INPUT, acceptanceInput: SHORT_INPUT, runtimeProfileInput: {}, runtimeProfileClassification: {}, runtimeProfileSourceIds: {},
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 39, validationScenario: "Q5_ROAD_CROSSING_SELECTED_JACKING_S27_31",
  passport: { canonicalRuName: "Строительство выбранного перехода продавливанием в футляре", workKey: "road_crossing_sleeves",
    physicalResultRu: "Один прямой футляр с рабочей трубой, поддержанными котлованами и всеми применимыми подтверждёнными ресурсными программами",
    includedScopeRu: component.stageMatrix.map(stage => stage.titleRu),
    excludedScopeRu: ["Открытый способ и неподдержанные другие ресурсные программы", "Другая/многослойная конструкция восстановления", "Иной геологический/injection объём наружного заполнения", "Неподтверждённые проектные решения и цены"] },
  applicability: { country: "KG", operationClass: "SELECTED_STRAIGHT_JACKED_CASING_CROSSING", primaryMeasureParameterId: "rcs_crossing_length_m",
    selectedScope: component.scope, ordinaryPromptInputs: Object.keys(SHORT_INPUT), missingProjectFactsRemainOriginalLocalNeeds: true, engineeringApproved: false,
    universalProductivityClaimed: false, universalConsumptionClaimed: false, derivedFinalQuantitiesAsQuestionsForbidden: true, runtimeProfileInput: {} },
  binding: { rowId: "rcs:casing:ordered_casing_length_m", applicability: { source_id: SOURCE_ID, norm_id: NORM_ID, exact_locator: sourceMetadata.exact_locator,
    technology_class: "PIPE_JACKING", scope_mode: "ONE_STRAIGHT_UNIFORM_CASING_RECTANGULAR_PITS_SUPPORTED_PROGRAMMES", universal_productivity_claimed: false } },
  locator: { key: "road-crossing-sleeves-selected-jacking-s27-31-v1", payload: { kind: "ACTUAL_PROJECT_FACTS_NO_RUNTIME_DEFAULTS",
    exactLocator: sourceMetadata.exact_locator, sourcePackSha256: sourceHash, technicalScope: component.scope,
    stageResourceIds: component.stageMatrix.map(stage => ({ stageId: stage.stageId, resourceIds: stage.ownResourceIds })) } },
  search: { primaryUom: "m", canonicalNameRu: "Переход продавливанием в футляре", aliases: ["переход продавливанием", "футляр под дорогой", "продавливание футляра", "pipe jacking casing crossing"],
    shortScopeRu: component.scope.boundaryRu, keyDistinguishingParameters: ["rcs_crossing_length_m", "rcs_casing_outside_diameter_mm", "rcs_casing_inside_diameter_mm", "rcs_carrier_outside_diameter_mm"],
    clarificationFields: [], includedBoundaries: component.stageMatrix.map(stage => stage.titleRu), excludedBoundaries: ["Открытая траншея", "Неподдержанные другие схемы ресурсов"],
    extraSearchTermsRu: "стартовый приёмный котлован футляр рабочая труба опоры доставка отходы испытания", sourceProvenance: { sourceId: SOURCE_ID, sourcePackSha256: sourceHash, runtimeProfileInput: {}, engineeringApproved: false } },
  forbiddenAdjacentMatchers: [/gravity.sewer|самотечн.*коллектор/iu, /pressure.sewer.pipeline|напорная канализационная линия/iu],
  owner: "S27_31_ROAD_CROSSING_SELECTED_JACKING_SUCCESSOR", receiptFileStem: "S27_31_ROAD_CROSSING_SELECTED_JACKING",
}).catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
