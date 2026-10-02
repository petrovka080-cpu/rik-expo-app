import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildEstimateFromInlineWorkPrompt } from
  "../../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { resolveCanonicalEstimateProfileInputsS2723 } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723";
import { estimateDeterministicHash } from
  "../../../src/lib/estimate/estimateDeterministicHash";
import { correctAsphaltFullCycleDefinitionS2723 } from
  "../../../src/lib/estimate/v4/asphalt/asphaltFullCycleFormulaCorrectionS2723";
import { loadS2721AsphaltCurrentDefinition } from
  "./prepareS2721AsphaltFullCycleSuccessor";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const CATALOG_ID = "canonical-work:expanded:asphalt_concrete_pavement";
const SOURCE_ID = "s2723_asphalt_full_cycle_automatic_runtime_and_r555_corpus";
const NORM_ID = "s2723-full-pavement-automatic-geometry-safe-v1";
const currentReleasePath = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

async function main(): Promise<void> {
  const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
    definitionReleaseId: string;
    searchReleaseId: string;
  };
  const current = await loadS2721AsphaltCurrentDefinition(currentRelease);
  const corrected = correctAsphaltFullCycleDefinitionS2723({
    formulas: current.formulas,
    resources: current.resources,
  });
  const upperMaterial = corrected.resources.find((resource) =>
    String(resource.resource_graph?.sourceRowId ?? "").endsWith(":asphalt_layer_2_material"));
  invariant(upperMaterial, "STOP_S2723_ASPHALT_UPPER_MATERIAL_MISSING");

  async function compileCase(submittedParameters: Json) {
    const profile = resolveCanonicalEstimateProfileInputsS2723({
      catalogId: CATALOG_ID,
      confirmedParameters: {},
      effectiveUserParameters: submittedParameters,
    });
    const result = await compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-23-asphalt-automatic-successor-acceptance",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "area_m2",
      parameterDefinitions: current.parameters as CanonicalEstimateParameterDefinition[],
      formulaDefinitions: corrected.formulas as CanonicalEstimateFormulaDefinition[],
      resourceDefinitions: corrected.resources as CanonicalEstimateResourceDefinition[],
      submittedParameters,
      confirmedParameters: profile.confirmedParameters as Json,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 1_000,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const bySourceRowId = (sourceRowId: string) => {
      const resource = corrected.resources.find((row) =>
        String(row.resource_graph?.sourceRowId ?? "").endsWith(`:${sourceRowId}`));
      return {
        row: result.rows.find((row) => row.row_id === resource?.row_id) ?? null,
        need: result.preliminaryNeeds.find((need) => need.row_id === resource?.row_id) ?? null,
      };
    };
    return { result, bySourceRowId, profile };
  }

  async function verifyCore(): Promise<Json> {
    const parsed = buildEstimateFromInlineWorkPrompt({
      rawInput: "Устройство асфальтобетонного покрытия 900 м² × 50 мм",
      selectedWorkKey: "asphalt_concrete_pavement",
    });
    invariant(parsed.canBuildPreliminaryEstimate === true
      && parsed.parseResult.extractedParams.length_m == null
      && parsed.parseResult.extractedParams.width_m == null,
    "STOP_S2723_ASPHALT_INLINE_AREA_THICKNESS_PARSE");

    const first = await compileCase({ area_m2: 900, wearing_layer_thickness_mm: 50 });
    invariant(first.profile.applied === true, "STOP_S2723_ASPHALT_PROFILE_NOT_APPLIED");
    invariant(first.result.rows.length === 104,
      `STOP_S2723_ASPHALT_FIRST_ROWS:${first.result.rows.length}`);
    invariant(first.result.preliminaryNeeds.length === 5,
      `STOP_S2723_ASPHALT_FIRST_PENDING:${first.result.preliminaryNeeds.length}`);
    invariant(first.result.rows.filter((row) => row.included_in_procurement).length === 10,
      "STOP_S2723_ASPHALT_FIRST_PROCUREMENT");
    invariant(first.bySourceRowId("asphalt_layer_1_material").row?.quantity === "129.438",
      "STOP_S2723_ASPHALT_LOWER_MIX");
    invariant(first.bySourceRowId("asphalt_layer_2_material").row?.quantity === "107.865",
      "STOP_S2723_ASPHALT_UPPER_MIX");
    for (const pendingRow of [
      "longitudinal_joints",
      "transverse_joints",
      "joint_sealing_material",
      "joint_sealing_application",
      "edge_treatment",
    ]) {
      invariant(first.bySourceRowId(pendingRow).need != null
        && first.bySourceRowId(pendingRow).row == null,
      `STOP_S2723_ASPHALT_GEOMETRY_PENDING:${pendingRow}`);
    }

    const changed = await compileCase({ area_m2: 900, wearing_layer_thickness_mm: 70 });
    invariant(changed.bySourceRowId("asphalt_layer_2_material").row?.quantity === "151.011",
      "STOP_S2723_ASPHALT_THICKNESS_RECALCULATION");

    const geometry = await compileCase({
      area_m2: 900,
      wearing_layer_thickness_mm: 50,
      length_m: 1200,
      width_m: 6,
      edge_treatment_length_m: 2400,
    });
    invariant(geometry.result.preliminaryNeeds.length === 0,
      `STOP_S2723_ASPHALT_GEOMETRY_PENDING_AFTER_INPUT:${geometry.result.preliminaryNeeds.length}`);
    invariant(geometry.bySourceRowId("longitudinal_joints").row?.quantity === "2400",
      "STOP_S2723_ASPHALT_LONGITUDINAL_QUANTITY");
    invariant(geometry.bySourceRowId("transverse_joints").row?.quantity === "24",
      "STOP_S2723_ASPHALT_TRANSVERSE_QUANTITY");
    invariant(geometry.bySourceRowId("joint_sealing_material").row?.quantity === "2424",
      "STOP_S2723_ASPHALT_JOINT_MATERIAL_QUANTITY");
    invariant(geometry.bySourceRowId("edge_treatment").row?.quantity === "2400",
      "STOP_S2723_ASPHALT_EDGE_QUANTITY");

    return {
      status: "GREEN_S27_23_ASPHALT_900X50_AUTOMATIC_CORE_NOT_UI_ACCEPTED",
      firstEstimate: {
        rows: first.result.rows.length,
        preliminaryNeeds: first.result.preliminaryNeeds.length,
        procurementRows: first.result.rows.filter((row) => row.included_in_procurement).length,
        lowerMixT: first.bySourceRowId("asphalt_layer_1_material").row?.quantity,
        upperMixT: first.bySourceRowId("asphalt_layer_2_material").row?.quantity,
      },
      changedThicknessUpperMixT: changed.bySourceRowId("asphalt_layer_2_material").row?.quantity,
      confirmedGeometry: {
        longitudinalM: geometry.bySourceRowId("longitudinal_joints").row?.quantity,
        transverseM: geometry.bySourceRowId("transverse_joints").row?.quantity,
        jointMaterialM: geometry.bySourceRowId("joint_sealing_material").row?.quantity,
        edgeTreatmentM: geometry.bySourceRowId("edge_treatment").row?.quantity,
      },
      webAccepted: false,
      androidAccepted: false,
      procurementUiAccepted: false,
      pdfAccepted: false,
    };
  }

  await runMasterSingleDefinitionSuccessorR1({
    contract: "rik-expo-app.s27-23.asphalt-900x50-automatic-successor.v1",
    stopCode: "S2723_ASPHALT_900X50_AUTOMATIC",
    applicationName: "s27-23-asphalt-900x50-automatic-successor",
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
      ?? ".release-runtime/r568/s27-23/asphalt-900x50-automatic-successor"),
    sourcePaths: [
      "data/estimate-benchmarks/source-packs/asphalt-level-small-area-s2716.json",
      "src/lib/ai/extractWorkParamsFromInlinePrompt.ts",
      "src/lib/estimate/v4/asphalt/asphaltPreliminaryAssemblyPolicyV4.ts",
      "src/lib/estimate/v4/asphalt/asphaltFullCycleAutomaticInputS2723.ts",
      "src/lib/estimate/v4/asphalt/asphaltFullCycleFormulaCorrectionS2723.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
      "src/lib/estimate/v4/asphalt/asphaltFullCycleFormulaCorrectionS2723.test.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723.test.ts",
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
      "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
      "scripts/estimate/r4a13/prepareS2721AsphaltFullCycleSuccessor.ts",
      "scripts/estimate/r4a13/prepareS2723Asphalt900x50AutomaticSuccessor.ts",
    ],
    catalogId: CATALOG_ID,
    sourceId: SOURCE_ID,
    normId: NORM_ID,
    sourceMetadata: {
      source_title: "Полный цикл асфальтобетонного покрытия: проверенный корпус R555 и расчётный контракт S27.23",
      source_authority: "КРЕР Кыргызской Республики и версионированный технологический профиль приложения",
      exact_locator: "R555 asphalt corpus aff2b476…; MASTER S27.23 §20.25; сценарий 900 м² × 50 мм",
      use_restriction: "Марка смеси, фактическая геометрия стыков, кромки, цены и условия поставки уточняются пользователем; площадь не подменяет длину.",
      source_kind: "NORMATIVE_CORPUS_AND_RUNTIME_CONTRACT",
      official_url: null,
      artifact_sha256: "aff2b476f05093f32da5f834afa14b2d7406a7e0b293a7e47a7650d1c19342b5",
    },
    parameterDefinitions: current.parameters,
    formulaDefinitions: corrected.formulas,
    resourceDefinitions: corrected.resources,
    shortInput: { area_m2: 900, wearing_layer_thickness_mm: 50 },
    acceptanceInput: {
      ...current.acceptanceInput,
      paving_shift_length_m: 500,
      edge_treatment_length_m: 40,
    },
    verifyCore,
    expectedParentShape: [127, 147, 147],
    benchmarkOrdinal: 0,
    validationScenario: "S2723_ASPHALT_900_M2_X_50_MM_AUTOMATIC_AND_GEOMETRY_SAFE",
    passport: {
      canonicalRuName: String(current.passport.titleRu ?? current.identity.title_ru),
      workKey: String(current.identity.work_key),
      physicalResultRu: "Полная дорожная одежда с подготовкой, основанием, двумя слоями горячей асфальтобетонной смеси, межслойной обработкой, раздельным уплотнением, логистикой и контролем.",
      includedScopeRu: [
        "подготовка, песчаный и два щебёночных слоя основания",
        "подгрунтовка, нижний и верхний слои горячей асфальтобетонной смеси",
        "межслойная эмульсия, три стадии уплотнения каждого слоя, логистика и контроль",
        "видимые строки продольных и поперечных стыков, герметизации и кромок до уточнения их геометрии",
      ],
      excludedScopeRu: [
        "цены без подтверждённого ценового источника",
        "необъявленные бордюры, водоотвод, разметка, знаки и освещение",
        "автоматический вывод длины стыков или кромок только из площади покрытия",
      ],
    },
    applicability: {
      ...current.applicability,
      masterEdition: "S27.23",
      firstEstimateBeforeOptionalClarification: true,
      automaticProfileOwner: "S27_23_ASPHALT_FULL_CYCLE_AUTOMATIC_INPUT_V1",
      areaTimesMillimetresMeansAreaAndWearingLayerThickness: true,
      jointAndEdgeRowsRemainPendingWithoutOwnGeometry: true,
    },
    binding: {
      rowId: String(upperMaterial.row_id),
      applicability: {
        technology_class: "FULL_HOT_ASPHALT_PAVEMENT_STRUCTURE",
        source_id: SOURCE_ID,
        norm_id: NORM_ID,
        quantity_basis: "AREA_X_EDITABLE_LAYER_THICKNESS_X_DENSITY_X_WASTE",
      },
    },
    locator: {
      key: "s2723-asphalt-900x50-automatic-runtime-v1",
      payload: {
        kind: "NORMATIVE_CORPUS_AND_RUNTIME_ACCEPTANCE",
        corpusSha256: "aff2b476f05093f32da5f834afa14b2d7406a7e0b293a7e47a7650d1c19342b5",
        scenario: "900 m2 x 50 mm",
        jointPolicy: "visible pending rows until confirmed own geometry",
      },
    },
    search: {
      primaryUom: String(current.search.primary_uom),
      canonicalNameRu: String(current.search.canonical_name_ru),
      aliases: current.search.aliases as string[],
      shortScopeRu: "Полный цикл дорожной одежды с основанием, двумя слоями горячей смеси, межслойной обработкой, уплотнением, логистикой и контролем.",
      keyDistinguishingParameters: ["area_m2", "wearing_layer_thickness_mm"],
      clarificationFields: current.search.clarification_fields as string[],
      includedBoundaries: [
        "подготовка и основание",
        "нижний и верхний слои асфальтобетона",
        "стыки и кромки как зависимые видимые строки",
      ],
      excludedBoundaries: [
        "только уплотнение",
        "выдуманные длины стыков и кромок из площади",
      ],
      extraSearchTermsRu: "полный цикл асфальтобетонного покрытия дорожная одежда 900 м² 50 мм",
      sourceProvenance: {
        ...current.search.source_provenance,
        masterEdition: "S27.23",
        automaticFirstEstimate: true,
        geometrySafeJoints: true,
      },
    },
    forbiddenAdjacentMatchers: [],
    owner: "S2723_ASPHALT_900X50_AUTOMATIC_SUCCESSOR",
    receiptFileStem: "S2723_ASPHALT_900X50_AUTOMATIC",
  });
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
