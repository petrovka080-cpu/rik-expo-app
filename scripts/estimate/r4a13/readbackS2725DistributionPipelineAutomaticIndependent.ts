import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { canonicalApprovedBaselineRuntimeParameters } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../../src/lib/estimate/estimateDeterministicHash";
import { validateMasterFormulaGraphConsistency } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:expanded:distribution_pipeline";
const SOURCE_ID = "project_potable_water_distribution_main_geometric_automatic_balance_v2";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-25/distribution-pipeline-automatic-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 распределительной магистрали: трасса 1800 м, труба HDPE PE100-RC SDR17 OD 225 мм PN10, марка PE100-RC-SDR17-OD225-PN10.";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function parseOrdinaryPrompt(prompt: string): Json {
  const main = /(\d+(?:[,.]\d+)?)\s+распределительн\p{L}*\s+(?:водопроводн\p{L}*\s+)?магистрал\p{L}*/iu.exec(prompt);
  const route = /(?:трасс\p{L}*|длин\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu.exec(prompt);
  const grade = /\b(PE\s*100[-\s]?RC)\b/iu.exec(prompt)?.[1];
  const sdr = /\b(SDR\s*\d+)\b/iu.exec(prompt)?.[1];
  const diameter = /\b(?:OD|DN\/OD)\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu.exec(prompt)?.[1];
  const pressure = /\b(PN\s*\d+)\b/iu.exec(prompt)?.[1];
  const designation = /марк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(prompt)?.[1];
  return {
    dpm_main_count: main?.[1],
    dpm_route_length_m: route?.[1]?.replace(",", "."),
    dpm_pipe_material: /\bHDPE\b/iu.test(prompt) ? "HDPE" : undefined,
    dpm_pipe_grade: grade?.replace(/\s+/gu, "").replace("PE100RC", "PE100-RC").toUpperCase(),
    dpm_sdr_class: sdr?.replace(/\s+/gu, "").toUpperCase(),
    dpm_pipe_outside_diameter_mm: diameter?.replace(",", "."),
    dpm_pressure_class: pressure?.replace(/\s+/gu, "").toUpperCase(),
    dpm_pipe_designation: designation?.replace(/[.,;:]+$/u, ""),
  };
}

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.runtime_publication_state,
      m.approved_template_baseline_id::text,d.definition_version,d.content_status,d.content_gate_status,
      p.parameter_count,p.formula_count,p.resource_count,p.payload_sha256
      from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d
      on d.id=m.definition_version_id join public.estimate_content_passport_r3 p
      on p.definition_version_id=d.id where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "90:60:60",
    "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_SHAPE");
    invariant(Number(target.definition_version) === 5,
      "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_VERSION");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_GATE");

    const [parameterResult, formulaResult, resourceResult, baselineResult, searchResult, locatorResult] =
      await Promise.all([
        client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
        client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id]),
        client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
        client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id]),
        client.query(`select d.definition_version_id::text,d.selectable,d.excluded_boundaries,r.status
          from public.estimate_search_document d join public.estimate_search_index_release r
          on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`,
        [current.searchReleaseId, CATALOG_ID]),
        client.query(`select l.locator_key,l.excerpt_sha256 from public.estimate_work_normative_binding b
          join public.estimate_normative_locator l on l.id=b.locator_id where b.definition_version_id=$1`,
        [target.definition_version_id]),
      ]);
    const parameters = parameterResult.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = formulaResult.rows as CanonicalEstimateFormulaDefinition[];
    const resources = resourceResult.rows as CanonicalEstimateResourceDefinition[];
    const baseline = baselineResult.rows[0] as Json;
    const search = searchResult.rows[0] as Json;
    const locator = locatorResult.rows[0] as Json;
    invariant(baseline && search && locator, "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_FORMULA_GRAPH");
    invariant(locator.locator_key === "distribution-pipeline-potable-main-geometric-automatic-s27-25-v1",
      "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_LOCATOR");
    invariant(formulas.every((formula) => !/length_m\s*\*\s*(?:0\.022|0\.55|1\.02)|length_m\s*\/\s*(?:300|400|500)|golden_rate|normFactor|villageWaterSupplyCalculator/iu
      .test(String(formula.expression_source))), "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_LEGACY");
    const forbiddenFinalInputIds = new Set([
      "dpm_trench_excavation_volume_m3", "dpm_bedding_volume_m3", "dpm_surround_volume_m3",
      "dpm_backfill_volume_m3", "dpm_excess_soil_volume_m3", "dpm_earthworks_labor_h",
      "dpm_excavator_machine_h", "dpm_compactor_machine_h", "dpm_removal_trip_count",
    ]);
    invariant(parameters.every((parameter) => !forbiddenFinalInputIds.has(parameter.parameter_id)),
      "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_FINAL_QUANTITY_INPUT");

    const ordinary = parseOrdinaryPrompt(PROMPT);
    invariant(Object.keys(ordinary).length === 8 && Object.values(ordinary).every(Boolean),
      "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_ORDINARY_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Object.keys(confirmedParameters).length === 74,
      "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_PROFILE_INPUTS");
    invariant(Object.keys(confirmedParameters).every(
      (parameterId) => baseline.input_classification[parameterId] === "ASSUMPTION",
    ),
      "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_PROFILE_CLASSIFICATION");
    invariant(Object.keys(confirmedParameters).every((parameterId) => {
      const value = baseline.normative_source_ids[parameterId];
      return Array.isArray(value) && value.length === 1 && value[0] === SOURCE_ID;
    }),
    "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_PROFILE_SOURCES");

    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-25-distribution-pipeline-independent-db-readback-v1",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "dpm_main_count",
      parameterDefinitions: parameters,
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 60,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const changedDepth = await compile({ ...ordinary, dpm_trench_depth_m: 2.4 });
    const sections = await compile({
      ...ordinary,
      dpm_section_2_length_m: 300,
      dpm_section_2_trench_bottom_width_m: 1.5,
      dpm_section_2_trench_depth_m: 2.4,
      dpm_section_2_bedding_thickness_m: 0.2,
      dpm_section_2_surround_width_m: 0.9,
      dpm_section_2_surround_cover_above_pipe_m: 0.4,
    });
    const packageChanged = await compile({ ...ordinary, dpm_pipe_supplier_segment_length_m: 100 });
    const withStock = await compile({ ...ordinary, dpm_pipe_available_stock_m: 60 });
    const q = (result: typeof first, rowId: string): number => {
      const value = result.rows.find((row) => row.row_id === rowId)?.quantity;
      invariant(value != null, `STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_ROW:${rowId}`);
      return Number(value);
    };

    const trench = 1800 * 1.2 * 2;
    const bedding = 1800 * 1.2 * 0.15;
    const surroundGross = 1800 * 0.7 * (0.225 + 0.3);
    const pipeDisplacement = 1800 * Math.PI * 0.225 ** 2 / 4;
    const backfillPlacement = trench - bedding - surroundGross;
    invariant(first.rows.length === 56 && first.preliminaryNeeds.length === 0,
      "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_FIRST_SHAPE");
    invariant(Math.abs(q(first, "rc09:dpm_trench_excavation") - trench) < 0.000_001
      && Math.abs(q(first, "rc09:dpm_bedding") - bedding) < 0.000_001
      && Math.abs(q(first, "rc09:dpm_surround") - (surroundGross - pipeDisplacement)) < 0.000_001
      && Math.abs(q(first, "rc09:dpm_backfill_placement") - backfillPlacement) < 0.000_001
      && q(first, "rc09:dpm_pipe_joint") === 149,
    "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_GEOMETRY");
    invariant(q(changedDepth, "rc09:dpm_trench_excavation") === 1800 * 1.2 * 2.4
      && q(changedDepth, "rc09:dpm_bedding") === q(first, "rc09:dpm_bedding")
      && q(changedDepth, "rc09:dpm_pipe_joint") === q(first, "rc09:dpm_pipe_joint")
      && q(changedDepth, "rc09:dpm_fitting") === q(first, "rc09:dpm_fitting"),
    "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_GEOMETRY_CHANGE");
    const sectionTrench = 1500 * 1.2 * 2 + 300 * 1.5 * 2.4;
    const sectionBedding = 1500 * 1.2 * 0.15 + 300 * 1.5 * 0.2;
    invariant(q(sections, "rc09:dpm_trench_excavation") === sectionTrench
      && q(sections, "rc09:dpm_bedding") === sectionBedding,
    "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_SECTIONS");
    invariant(q(first, "rc09:dpm-pipe-balance:total-need") === 1860
      && q(first, "rc09:dpm_pipe") === 1860
      && q(packageChanged, "rc09:dpm_pipe") === 1900
      && q(packageChanged, "rc09:dpm-pipe-balance:remainder") === 64
      && q(packageChanged, "rc09:dpm_pipe_joint") === 149
      && q(withStock, "rc09:dpm-pipe-balance:net-order-need") === 1800
      && q(withStock, "rc09:dpm_pipe") === 1800,
    "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_PROCUREMENT");

    const requiredTechnologyRows = [
      "rc09:dpm_pipe", "rc09:dpm_pipe_joint", "rc09:dpm_fusion_consumables",
      "rc09:dpm_fitting", "rc09:dpm_valve", "rc09:dpm_flange_connection_kits",
      "rc09:dpm_hydrant", "rc09:dpm_chamber", "rc09:dpm_chamber_cover",
      "rc09:dpm_bedding", "rc09:dpm_surround", "rc09:dpm_backfill",
      "rc09:dpm_compaction_water", "rc09:dpm_chamber_joint_sealant",
      "rc09:dpm_cover_bedding_mortar", "rc09:dpm_thrust_block_concrete",
      "rc09:dpm_thrust_restraint", "rc09:dpm_warning_tape", "rc09:dpm_marker_post",
      "rc09:dpm_flushing_water", "rc09:dpm_disinfection_reagent",
      "rc09:dpm_temporary_test_end_closures", "rc09:dpm_test_water_connection_set",
      "rc09:dpm_pressure_test_measurement_set", "rc09:equipment:dpm-hydrotest-pump",
    ];
    invariant(requiredTechnologyRows.every((rowId) => resources.some((row) => row.row_id === rowId)),
      "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_COMPLETION_CHAIN");
    invariant(first.rows.filter((row) => requiredTechnologyRows.includes(row.row_id))
      .every((row) => row.unit_price == null),
    "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_NULL_PRICE_VISIBILITY");
    invariant(search.definition_version_id === target.definition_version_id && search.selectable === true
      && search.status === "draft", "STOP_S27_25_DISTRIBUTION_PIPELINE_READBACK_SEARCH");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-25.distribution-pipeline-automatic-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_25_DISTRIBUTION_PIPELINE_AUTOMATIC_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID,
        definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "60/60 GREEN",
        normativeLocator: locator,
        payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt: PROMPT,
        submittedParameterCount: Object.keys(ordinary).length,
        submittedParameters: ordinary,
        visibleCalculatedRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length,
      },
      automaticGeometry: {
        trenchM3: q(first, "rc09:dpm_trench_excavation"),
        beddingM3: q(first, "rc09:dpm_bedding"),
        surroundM3: q(first, "rc09:dpm_surround"),
        backfillPlacementM3: q(first, "rc09:dpm_backfill_placement"),
        importedBackfillM3: q(first, "rc09:dpm_backfill"),
        excessSoilM3: q(first, "rc09:dpm_excess_soil_removal"),
        changedDepthTrenchM3: q(changedDepth, "rc09:dpm_trench_excavation"),
        multipleSectionsTrenchM3: q(sections, "rc09:dpm_trench_excavation"),
      },
      procurementBalance: {
        installedM: q(first, "rc09:dpm-pipe-balance:installed-net"),
        lossM: q(first, "rc09:dpm-pipe-balance:expected-loss"),
        retainedSpareM: q(first, "rc09:dpm-pipe-balance:retained-spare"),
        orderedM: q(first, "rc09:dpm_pipe"),
        package100MOrderedM: q(packageChanged, "rc09:dpm_pipe"),
        stock60MOrderedM: q(withStock, "rc09:dpm_pipe"),
        installedJointCountStable: q(packageChanged, "rc09:dpm_pipe_joint"),
      },
      sourceProfile: {
        inputCount: Object.keys(confirmedParameters).length,
        classification: "ASSUMPTION",
        sourceId: SOURCE_ID,
        projectConfirmationRequired: true,
      },
      uiAcceptance: { web: false, android: false, procurementUi: false, pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable" },
      productionAccessed: false,
      activationPerformed: false,
      deployPerformed: false,
      otaPerformed: false,
      storeActionPerformed: false,
    };
    evidence.receiptSha256 = sha256(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({
      status: evidence.status,
      releaseId: release.id,
      definitionVersionId: target.definition_version_id,
      definitionShape: evidence.target.definitionShape,
      ordinaryInputCount: evidence.ordinaryRoute.submittedParameterCount,
      calculatedRows: evidence.ordinaryRoute.visibleCalculatedRowCount,
      receiptSha256: evidence.receiptSha256,
      outputPath: OUTPUT_PATH,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
