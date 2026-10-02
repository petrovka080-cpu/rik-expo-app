import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

import { buildEstimateFromInlineWorkPrompt } from "../../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import {
  compileAsphaltProfessionalEstimateV4,
  validateAsphaltWorkAssemblyCoverageV4,
} from "../../../src/lib/estimate/v4/asphalt";
import { evaluateFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:expanded:asphalt_concrete_pavement";
const SOURCE_ID = "s2721_asphalt_full_cycle_runtime_and_r555_corpus";
const NORM_ID = "s2721-full-pavement-structure-r555-runtime-v1";
const currentReleasePath = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function rowQuantity(result: ReturnType<typeof buildEstimateFromInlineWorkPrompt>, rowId: string): number | null {
  const value = result.draft?.items.find(
    (item) => item.sourceParameters?.rowCode === rowId,
  )?.quantity;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function loadS2721AsphaltCurrentDefinition(input: {
  definitionReleaseId: string;
  searchReleaseId: string;
}) {
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "s27-21-asphalt-full-cycle-source-read",
  });
  await client.connect();
  try {
    const manifest = (await client.query(`select manifest.definition_version_id::text,
        manifest.approved_template_baseline_id::text,definition.passport,definition.applicability
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition
        on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [
      input.definitionReleaseId,
      CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(manifest, "STOP_S2721_ASPHALT_FULL_CYCLE_PARENT_TARGET_MISSING");

    const definitionId = String(manifest.definition_version_id);
    const parameters = await client.query(`select parameter_id,ordinal,value_type,unit_id,title_ru,required,
        constraints_json,truth_metadata
      from public.estimate_parameter_definition
      where definition_version_id=$1 order by ordinal,parameter_id`, [definitionId]);
    const formulas = await client.query(`select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
      from public.estimate_formula_graph
      where definition_version_id=$1 order by formula_id`, [definitionId]);
    const resources = await client.query(`select row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,
        inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata
      from public.estimate_resource_spec
      where definition_version_id=$1 order by ordinal,row_id`, [definitionId]);
    const baselineResult = await client.query(`select input_values from public.estimate_approved_template_baseline
      where id=$1`, [manifest.approved_template_baseline_id]);
    const searchResult = await client.query(`select primary_uom,canonical_name_ru,aliases,short_scope_ru,
        key_distinguishing_parameters,clarification_fields,included_boundaries,
        excluded_boundaries,source_provenance
      from public.estimate_search_document
      where search_release_id=$1 and catalog_id=$2`, [input.searchReleaseId, CATALOG_ID]);
    const identityResult = await client.query(`select work_key,title_ru from public.estimate_work_identity
      where catalog_id=$1`, [CATALOG_ID]);

    invariant(parameters.rows.length === 127, `STOP_S2721_ASPHALT_FULL_CYCLE_PARAMETERS:${parameters.rows.length}`);
    invariant(formulas.rows.length === 147, `STOP_S2721_ASPHALT_FULL_CYCLE_FORMULAS:${formulas.rows.length}`);
    invariant(resources.rows.length === 147, `STOP_S2721_ASPHALT_FULL_CYCLE_RESOURCES:${resources.rows.length}`);
    invariant(baselineResult.rows.length === 1, "STOP_S2721_ASPHALT_FULL_CYCLE_BASELINE");
    invariant(searchResult.rows.length === 1, "STOP_S2721_ASPHALT_FULL_CYCLE_SEARCH");
    invariant(identityResult.rows.length === 1, "STOP_S2721_ASPHALT_FULL_CYCLE_IDENTITY");

    const renamedResources = (resources.rows as Json[]).map((resource) => {
      const sourceRowId = String(resource.resource_graph?.sourceRowId ?? "");
      const title = sourceRowId.endsWith(":asphalt_layer_1_material")
        ? "Горячая асфальтобетонная смесь для нижнего слоя"
        : sourceRowId.endsWith(":asphalt_layer_2_material")
          ? "Горячая асфальтобетонная смесь для верхнего слоя"
          : String(resource.title_ru);
      return {
        ...resource,
        title_ru: title,
        source_metadata: {
          ...resource.source_metadata,
          ...(title === resource.title_ru ? {} : {
            publicNameRevision: "S27.21_SHORT_MATERIAL_NAME",
            technicalSpecificationPreservedInTrace: true,
          }),
        },
      };
    });
    const shortNames = renamedResources.filter((resource) =>
      String(resource.source_metadata?.publicNameRevision) === "S27.21_SHORT_MATERIAL_NAME"
    );
    invariant(shortNames.length === 2, `STOP_S2721_ASPHALT_FULL_CYCLE_SHORT_NAMES:${shortNames.length}`);

    return {
      definitionId,
      parameters: parameters.rows as Json[],
      formulas: formulas.rows as Json[],
      resources: renamedResources,
      acceptanceInput: {
        ...(baselineResult.rows[0] as Json).input_values,
        area_m2: 900,
        wearing_layer_thickness_mm: 50,
      } as Json,
      passport: manifest.passport as Json,
      applicability: manifest.applicability as Json,
      search: searchResult.rows[0] as Json,
      identity: identityResult.rows[0] as Json,
    };
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
    definitionReleaseId: string;
    searchReleaseId: string;
  };
  const current = await loadS2721AsphaltCurrentDefinition(currentRelease);

  async function verifyCore(): Promise<Json> {
    const cases = [500, 5000].map((areaM2) => {
      const result = buildEstimateFromInlineWorkPrompt({
        rawInput: `Устройство асфальтобетонного покрытия ${areaM2} м²`,
        selectedWorkKey: "asphalt_concrete_pavement",
      });
      invariant(result.canBuildPreliminaryEstimate === true && result.draft != null,
        `STOP_S2721_ASPHALT_FULL_CYCLE_FIRST_ESTIMATE:${areaM2}`);
      const ids = new Set(result.draft.items.map((item) => item.sourceParameters?.rowCode));
      for (const requiredRow of [
        "sand_material",
        "crushed_layer_1_material",
        "crushed_layer_2_material",
        "base_emulsion_material",
        "asphalt_layer_1_material",
        "emulsion_interface_1_2",
        "asphalt_layer_2_material",
        "asphalt_layer_1_preliminary_compaction",
        "asphalt_layer_1_main_compaction",
        "asphalt_layer_1_final_compaction",
        "asphalt_layer_2_preliminary_compaction",
        "asphalt_layer_2_main_compaction",
        "asphalt_layer_2_final_compaction",
      ]) {
        invariant(ids.has(requiredRow), `STOP_S2721_ASPHALT_FULL_CYCLE_REQUIRED_ROW:${areaM2}:${requiredRow}`);
      }
      return {
        areaM2,
        rows: result.draft.items.length,
        lowerMixT: rowQuantity(result, "asphalt_layer_1_material"),
        upperMixT: rowQuantity(result, "asphalt_layer_2_material"),
      };
    });
    invariant(cases[0]?.rows === 104 && cases[1]?.rows === 104,
      `STOP_S2721_ASPHALT_FULL_CYCLE_ROW_COUNT:${JSON.stringify(cases)}`);
    invariant(cases[0]?.lowerMixT === 71.91 && cases[0]?.upperMixT === 47.94,
      `STOP_S2721_ASPHALT_FULL_CYCLE_500_QUANTITY:${JSON.stringify(cases[0])}`);
    invariant(cases[1]?.lowerMixT === 719.1 && cases[1]?.upperMixT === 479.4,
      `STOP_S2721_ASPHALT_FULL_CYCLE_5000_QUANTITY:${JSON.stringify(cases[1])}`);

    const explicitThickness = buildEstimateFromInlineWorkPrompt({
      rawInput: "Устройство асфальтобетонного покрытия 900 м² × 50 мм",
      selectedWorkKey: "asphalt_concrete_pavement",
    });
    invariant(explicitThickness.canBuildPreliminaryEstimate === true,
      "STOP_S2721_ASPHALT_FULL_CYCLE_900X50_BUILD");
    invariant(explicitThickness.parseResult.extractedParams.length_m == null
      && explicitThickness.parseResult.extractedParams.width_m == null,
    "STOP_S2721_ASPHALT_FULL_CYCLE_900X50_FALSE_PLAN_GEOMETRY");
    invariant(rowQuantity(explicitThickness, "asphalt_layer_2_material") === 107.865,
      `STOP_S2721_ASPHALT_FULL_CYCLE_900X50_MASS:${rowQuantity(explicitThickness, "asphalt_layer_2_material")}`);

    const direct = compileAsphaltProfessionalEstimateV4({
      raw_text: "Устройство асфальтобетонного покрытия 900 м² × 50 мм",
      profile_override: "new_full_road_pavement",
    });
    const coverage = validateAsphaltWorkAssemblyCoverageV4(direct);
    invariant(coverage.status === "GREEN_ASPHALT_WORK_ASSEMBLY_COVERAGE_V4",
      `STOP_S2721_ASPHALT_FULL_CYCLE_COVERAGE:${JSON.stringify(coverage.counters)}`);
    invariant(coverage.explicitly_excluded_wbs_ru.some((line) =>
      /стык|кром/iu.test(line) && /геометр/iu.test(line)
    ), "STOP_S2721_ASPHALT_FULL_CYCLE_JOINT_EXCLUSION_TRACE");
    const directTitles = Object.fromEntries(direct.compiled_rows.map((row) => [
      row.definition.row_id,
      row.definition.professional_name_ru,
    ]));
    invariant(directTitles.asphalt_layer_1_material === "Горячая асфальтобетонная смесь для нижнего слоя",
      "STOP_S2721_ASPHALT_FULL_CYCLE_LOWER_PUBLIC_NAME");
    invariant(directTitles.asphalt_layer_2_material === "Горячая асфальтобетонная смесь для верхнего слоя",
      "STOP_S2721_ASPHALT_FULL_CYCLE_UPPER_PUBLIC_NAME");

    const compactOnly = buildEstimateFromInlineWorkPrompt({
      rawInput: "Только уплотнение асфальтобетонного покрытия 500 м²",
      selectedWorkKey: "asphalt_concrete_pavement",
    });
    invariant(compactOnly.canBuildPreliminaryEstimate === false
      && compactOnly.roadScopeResolution?.resolverStatus === "NEEDS_SCOPE_SELECTION",
    "STOP_S2721_ASPHALT_FULL_CYCLE_COMPACTION_SCOPE_MIX");

    const formulaValues = current.formulas.map((formula) => Number(
      evaluateFormulaGraph(formula.ast, current.acceptanceInput),
    ));
    invariant(formulaValues.length === 147
      && formulaValues.every((value) => Number.isFinite(value) && value > 0),
    "STOP_S2721_ASPHALT_FULL_CYCLE_PERSISTED_GRAPH_EVALUATION");

    return {
      status: "GREEN_S2721_ASPHALT_FULL_CYCLE_CORE",
      scenarios: cases,
      explicitThickness: {
        areaM2: 900,
        upperThicknessMm: 50,
        upperMixT: rowQuantity(explicitThickness, "asphalt_layer_2_material"),
        lowerMixT: rowQuantity(explicitThickness, "asphalt_layer_1_material"),
      },
      runtimeRows: direct.compiled_rows.length,
      persistedGraph: {
        parameters: current.parameters.length,
        formulas: current.formulas.length,
        resources: current.resources.length,
        procurementRows: current.resources.filter((row) =>
          (row as Json).procurement_eligible === true).length,
      },
      areaOnlyJointPolicy: "VISIBLE_EXCLUSION_WITHOUT_INVENTED_LENGTH",
      compactOnlySeparated: true,
      shortMaterialNames: [
        directTitles.asphalt_layer_1_material,
        directTitles.asphalt_layer_2_material,
      ],
    };
  }

  const upperMaterial = current.resources.find((resource) =>
    String((resource as Json).resource_graph?.sourceRowId ?? "")
      .endsWith(":asphalt_layer_2_material")
  );
  invariant(upperMaterial, "STOP_S2721_ASPHALT_FULL_CYCLE_UPPER_BINDING_ROW");

  await runMasterSingleDefinitionSuccessorR1({
    contract: "rik-expo-app.s27-21.asphalt-full-cycle-successor.v1",
    stopCode: "S2721_ASPHALT_FULL_CYCLE",
    applicationName: "s27-21-asphalt-full-cycle-successor-v1",
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
      ?? ".release-runtime/r568/s27-21/asphalt-full-cycle-successor-v1"),
    sourcePaths: [
      "data/estimate-benchmarks/source-packs/asphalt-level-small-area-s2716.json",
      "src/lib/ai/extractWorkParamsFromInlinePrompt.ts",
      "src/lib/estimate/v4/asphalt/extractAsphaltUserFactsV4.ts",
      "src/lib/estimate/v4/asphalt/roadScopeTruthV4.ts",
      "src/lib/estimate/v4/asphalt/asphaltProfessionalPresentationV4.ts",
      "src/lib/estimate/v4/asphalt/compileAsphaltProfessionalEstimateV4.ts",
      "src/lib/estimate/v4/asphalt/validateAsphaltWorkAssemblyCoverageV4.ts",
      "tests/estimateRuntime/inlineWorkPromptParamParser.test.ts",
      "tests/aiEstimateV4/roadGeometry40V4.contract.test.ts",
      "tests/aiEstimateV4/asphaltProfessionalCompilerV4.contract.test.ts",
      "tests/aiEstimateV4/asphaltRuntimeVerticalSliceV4.contract.test.ts",
      "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
      "scripts/estimate/r4a13/prepareS2721AsphaltFullCycleSuccessor.ts",
    ],
    catalogId: CATALOG_ID,
    sourceId: SOURCE_ID,
    normId: NORM_ID,
    sourceMetadata: {
      source_title: "Полный цикл асфальтобетонного покрытия: корпус R555 и runtime-контракт S27.21",
      source_authority: "КРЕР Кыргызской Республики и проверенный корпус R555",
      exact_locator: "R555 asphalt corpus aff2b476…; КРЕР 27; S27.21 §20.23; сценарии 500/5000 м² и 900 м² × 50 мм",
      use_restriction: "Проектные типы смесей, длины стыков, цены и локальные условия подтверждаются отдельно; длина стыков из площади не выводится.",
      source_kind: "NORMATIVE_CORPUS_AND_RUNTIME_CONTRACT",
      official_url: null,
      artifact_sha256: "aff2b476f05093f32da5f834afa14b2d7406a7e0b293a7e47a7650d1c19342b5",
    },
    parameterDefinitions: current.parameters,
    formulaDefinitions: current.formulas,
    resourceDefinitions: current.resources,
    shortInput: { area_m2: 900, wearing_layer_thickness_mm: 50 },
    acceptanceInput: current.acceptanceInput,
    verifyCore,
    expectedParentShape: [127, 147, 147],
    benchmarkOrdinal: 0,
    validationScenario: "S2721_ASPHALT_FULL_CYCLE_500_5000_AND_900X50",
    passport: {
      canonicalRuName: String(current.passport.titleRu ?? current.identity.title_ru),
      workKey: String(current.identity.work_key),
      physicalResultRu: "Полная дорожная одежда: подготовка, основание, два слоя горячей асфальтобетонной смеси, межслойная обработка, раздельное уплотнение, логистика и контроль",
      includedScopeRu: [
        "подготовка площадки и земляного полотна",
        "песчаный и два щебёночных слоя основания",
        "подгрунтовка, нижний и верхний слои горячей асфальтобетонной смеси",
        "межслойная эмульсия, три стадии уплотнения каждого слоя, логистика, контроль и документация",
        "полная предварительная смета по площади до последующих уточнений пользователя",
      ],
      excludedScopeRu: [
        "длины продольных и поперечных стыков без подтверждённых длины, ширины и схемы захваток",
        "цены без подтверждённого ценового источника",
        "узкая операция уплотнения без укладки и материалов — отдельный владелец каталога",
      ],
    },
    applicability: {
      ...current.applicability,
      masterEdition: "S27.21",
      firstEstimateBeforeOptionalClarification: true,
      fullPavementStructureByDefaultForCanonicalOwner: true,
      areaTimesMillimetresMeansAreaAndWearingLayerThickness: true,
      jointLengthNeverDerivedFromArea: true,
    },
    binding: {
      rowId: String((upperMaterial as Json).row_id),
      applicability: {
        technology_class: "FULL_HOT_ASPHALT_PAVEMENT_STRUCTURE",
        source_id: SOURCE_ID,
        norm_id: NORM_ID,
        quantity_basis: "AREA_LAYER_THICKNESS_DENSITY_WASTE_AND_FULL_APPLICABLE_ASSEMBLY",
      },
    },
    locator: {
      key: "s2721-asphalt-full-cycle-r555-runtime-v1",
      payload: {
        kind: "NORMATIVE_CORPUS_AND_RUNTIME_ACCEPTANCE",
        corpusSha256: "aff2b476f05093f32da5f834afa14b2d7406a7e0b293a7e47a7650d1c19342b5",
        scenarios: ["500 m2", "5000 m2", "900 m2 x 50 mm"],
        jointPolicy: "confirmed geometry only",
      },
    },
    search: {
      primaryUom: String(current.search.primary_uom),
      canonicalNameRu: String(current.search.canonical_name_ru),
      aliases: current.search.aliases as string[],
      shortScopeRu: "Полный цикл дорожной одежды с основанием, двумя слоями горячей смеси, межслойной обработкой, раздельным уплотнением, логистикой и контролем.",
      keyDistinguishingParameters: ["area_m2", "wearing_layer_thickness_mm"],
      clarificationFields: current.search.clarification_fields as string[],
      includedBoundaries: [
        "подготовка и основание",
        "нижний и верхний слои асфальтобетона",
        "межслойная обработка, уплотнение, логистика и контроль",
      ],
      excludedBoundaries: [
        "только уплотнение",
        "длины стыков без подтверждённой геометрии",
      ],
      extraSearchTermsRu: "полный цикл асфальтобетонного покрытия дорожная одежда основание два слоя горячая смесь 500 5000 900 м² 50 мм",
      sourceProvenance: {
        ...current.search.source_provenance,
        masterEdition: "S27.21",
        fullCycleFirstEstimate: true,
        areaThicknessDisambiguated: true,
        shortPublicMaterialNames: true,
      },
    },
    forbiddenAdjacentMatchers: [],
    owner: "S2721_ASPHALT_FULL_CYCLE_SUCCESSOR",
    receiptFileStem: "S2721_ASPHALT_FULL_CYCLE",
  });
}

if (process.argv[1]?.replace(/\\/gu, "/").endsWith("/prepareS2721AsphaltFullCycleSuccessor.ts")) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
