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
const CATALOG_ID = "canonical-work:expanded:house_connection_water";
const SOURCE_ID = "project_house_water_connection_geometric_automatic_balance_v1";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-25/house-water-connection-automatic-current/independent-acceptance.json",
);
const PROMPT = "Устройство 1 ввода воды в дом: трасса 28 м, сервисная труба HDPE PE100-RC SDR11 OD 32 мм PN16, марка PE100-RC-SDR11-OD32-PN16; существующая магистраль HDPE-PE100-RC OD 225 мм.";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const sha256 = (value: unknown) => createHash("sha256")
  .update(JSON.stringify(value)).digest("hex");

function parseOrdinaryPrompt(prompt: string): Json {
  const connection = /(\d+(?:[,.]\d+)?)\s+(?:водопроводн\p{L}*\s+)?ввод\p{L}*/iu
    .exec(prompt)?.[1];
  const route = /(?:трасс\p{L}*|длин\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu
    .exec(prompt)?.[1];
  const service = /сервисн\p{L}*\s+труб\p{L}*([^;.]*)/iu.exec(prompt)?.[1] ?? "";
  const grade = /\b(PE\s*100[-\s]?RC)\b/iu.exec(service)?.[1];
  const sdr = /\b(SDR\s*\d+)\b/iu.exec(service)?.[1];
  const diameter = /\b(?:OD|DN\/OD)\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu
    .exec(service)?.[1];
  const pressure = /\b(PN\s*\d+)\b/iu.exec(service)?.[1];
  const designation = /марк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(prompt)?.[1];
  const mainMaterial = /существующ\p{L}*\s+магистрал\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s+(?:OD|DN\/OD)/iu
    .exec(prompt)?.[1];
  const mainDiameter = /существующ\p{L}*\s+магистрал\p{L}*[^.]*?\b(?:OD|DN\/OD)\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu
    .exec(prompt)?.[1];
  return {
    hcw_connection_count: connection,
    hcw_service_route_length_m: route?.replace(",", "."),
    hcw_pipe_material: /\bHDPE\b/iu.test(service) ? "HDPE" : undefined,
    hcw_pipe_grade: grade?.replace(/\s+/gu, "").replace("PE100RC", "PE100-RC").toUpperCase(),
    hcw_sdr_class: sdr?.replace(/\s+/gu, "").toUpperCase(),
    hcw_pipe_outside_diameter_mm: diameter?.replace(",", "."),
    hcw_pressure_class: pressure?.replace(/\s+/gu, "").toUpperCase(),
    hcw_pipe_designation: designation?.replace(/[.,;:]+$/u, ""),
    hcw_existing_main_material: mainMaterial?.replace(/[.,;:]+$/u, ""),
    hcw_existing_main_outside_diameter_mm: mainDiameter?.replace(",", "."),
  };
}

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId]))
      .rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,
      m.runtime_publication_state,m.approved_template_baseline_id::text,
      d.definition_version,d.content_status,d.content_gate_status,
      p.parameter_count,p.formula_count,p.resource_count,p.payload_sha256
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "100:66:66",
    "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_SHAPE");
    invariant(Number(target.definition_version) === 4,
      "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_VERSION");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_GATE");

    const parameterResult = await client.query(
      "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
      [target.definition_version_id],
    );
    const formulaResult = await client.query(
      "select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
      [target.definition_version_id],
    );
    const resourceResult = await client.query(
      "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
      [target.definition_version_id],
    );
    const baselineResult = await client.query(
      "select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1",
      [target.approved_template_baseline_id],
    );
    const searchResult = await client.query(`select d.definition_version_id::text,
      d.selectable,d.excluded_boundaries,r.status from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id
      where d.search_release_id=$1 and d.catalog_id=$2`,
    [current.searchReleaseId, CATALOG_ID]);
    const locatorResult = await client.query(`select l.locator_key,l.excerpt_sha256
      from public.estimate_work_normative_binding b
      join public.estimate_normative_locator l on l.id=b.locator_id
      where b.definition_version_id=$1`, [target.definition_version_id]);

    const parameters = parameterResult.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = formulaResult.rows as CanonicalEstimateFormulaDefinition[];
    const resources = resourceResult.rows as CanonicalEstimateResourceDefinition[];
    const baseline = baselineResult.rows[0] as Json;
    const search = searchResult.rows[0] as Json;
    const locator = locatorResult.rows[0] as Json;
    invariant(baseline && search && locator,
      "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_FORMULA_GRAPH");
    invariant(locator.locator_key === "house-water-connection-geometric-automatic-s27-25-v1",
      "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_LOCATOR");
    invariant(formulas.every((formula) => !/villageWaterSupplyCalculator|length_m\s*\*\s*(?:0\.022|0\.55|1\.02)|length_m\s*\/\s*(?:300|400|500)/iu
      .test(String(formula.expression_source))),
    "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_LEGACY");

    const ordinary = parseOrdinaryPrompt(PROMPT);
    invariant(Object.keys(ordinary).length === 10 && Object.values(ordinary).every(Boolean),
      "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_ORDINARY_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Object.keys(confirmedParameters).length === 82,
      "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_PROFILE_INPUTS");
    invariant(Object.keys(confirmedParameters).every(
      (parameterId) => baseline.input_classification[parameterId] === "ASSUMPTION",
    ), "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_PROFILE_CLASSIFICATION");
    invariant(Object.keys(confirmedParameters).every((parameterId) => {
      const value = baseline.normative_source_ids[parameterId];
      return Array.isArray(value) && value.length === 1 && value[0] === SOURCE_ID;
    }), "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_PROFILE_SOURCES");

    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-25-house-water-connection-independent-db-readback-v1",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "hcw_connection_count",
      parameterDefinitions: parameters,
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 66,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const changedDepth = await compile({ ...ordinary, hcw_trench_depth_m: 1.8 });
    const packageChanged = await compile({
      ...ordinary,
      hcw_installed_pipe_piece_length_m: 12,
      hcw_pipe_supplier_package_length_m: 10,
    });
    const withStock = await compile({
      ...ordinary,
      hcw_installed_pipe_piece_length_m: 12,
      hcw_pipe_supplier_package_length_m: 10,
      hcw_pipe_available_stock_m: 15,
    });
    const q = (result: typeof first, rowId: string): number => {
      const value = result.rows.find((row) => row.row_id === rowId)?.quantity;
      invariant(value != null, `STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_ROW:${rowId}`);
      return Number(value);
    };

    const trench = 28 * 0.6 * 1.5;
    const bedding = 28 * 0.6 * 0.1;
    const surroundGross = 28 * 0.45 * (0.032 + 0.2);
    const pipeDisplacement = 28 * Math.PI * 0.032 ** 2 / 4;
    invariant(first.rows.length === 62 && first.preliminaryNeeds.length === 0,
      "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_FIRST_SHAPE");
    invariant(Math.abs(q(first, "rc09:hcw_trench_excavation") - trench) < 0.000_001
      && Math.abs(q(first, "rc09:hcw_bedding") - bedding) < 0.000_001
      && Math.abs(q(first, "rc09:hcw_surround")
        - (surroundGross - pipeDisplacement)) < 0.000_001
      && q(first, "rc09:hcw_tapping_saddle") === 1
      && q(first, "rc09:hcw_water_meter") === 1
      && q(first, "rc09:hcw_wall_sleeve") === 1,
    "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_GEOMETRY_AND_ASSEMBLY");
    invariant(Math.abs(q(changedDepth, "rc09:hcw_trench_excavation") - 30.24) < 0.000_001
      && q(changedDepth, "rc09:hcw_pipe") === q(first, "rc09:hcw_pipe")
      && q(changedDepth, "rc09:hcw_water_meter") === q(first, "rc09:hcw_water_meter"),
    "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_GEOMETRY_CHANGE");
    invariant(q(first, "rc09:hcw-pipe-balance:installed-net") === 28
      && Math.abs(q(first, "rc09:hcw-pipe-balance:expected-loss") - 0.84) < 0.000_001
      && q(first, "rc09:hcw-pipe-balance:retained-spare") === 2
      && q(first, "rc09:hcw_pipe") === 100
      && q(packageChanged, "rc09:hcw_pipe") === 40
      && q(packageChanged, "rc09:hcw_pipe_joint") === 2
      && Math.abs(q(withStock, "rc09:hcw-pipe-balance:net-order-need") - 15.84) < 0.000_001
      && q(withStock, "rc09:hcw_pipe") === 20
      && q(withStock, "rc09:hcw_pipe_joint") === 2,
    "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_PROCUREMENT");

    const requiredRows = [
      "rc09:hcw_pipe", "rc09:hcw_tapping_saddle", "rc09:hcw_corporation_stop",
      "rc09:hcw_curb_stop", "rc09:hcw_water_meter", "rc09:hcw_strainer",
      "rc09:hcw_check_valve", "rc09:hcw_wall_sleeve", "rc09:hcw_penetration_seal",
      "rc09:hcw_bedding", "rc09:hcw_surround", "rc09:hcw_imported_backfill",
      "rc09:hcw_flushing_water", "rc09:hcw_disinfection_reagent",
      "rc09:hcw_pressure_measurement_set", "rc09:equipment:hcw-test-pump",
    ];
    invariant(requiredRows.every((rowId) => resources.some((row) => row.row_id === rowId)),
      "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_COMPLETION_CHAIN");
    invariant(first.rows.filter((row) => requiredRows.includes(row.row_id))
      .every((row) => row.unit_price == null),
    "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_NULL_PRICE_VISIBILITY");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft",
    "STOP_S27_25_HOUSE_WATER_CONNECTION_READBACK_SEARCH");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-25.house-water-connection-automatic-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_25_HOUSE_WATER_CONNECTION_AUTOMATIC_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID,
        definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "66/66 GREEN",
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
        trenchM3: q(first, "rc09:hcw_trench_excavation"),
        beddingM3: q(first, "rc09:hcw_bedding"),
        surroundM3: q(first, "rc09:hcw_surround"),
        importedBackfillM3: q(first, "rc09:hcw_imported_backfill"),
        excessSoilM3: q(first, "rc09:hcw_excess_soil_removal"),
        changedDepthTrenchM3: q(changedDepth, "rc09:hcw_trench_excavation"),
      },
      procurementBalance: {
        installedM: q(first, "rc09:hcw-pipe-balance:installed-net"),
        lossM: q(first, "rc09:hcw-pipe-balance:expected-loss"),
        retainedSpareM: q(first, "rc09:hcw-pipe-balance:retained-spare"),
        defaultOrderedM: q(first, "rc09:hcw_pipe"),
        package10MOrderedM: q(packageChanged, "rc09:hcw_pipe"),
        stock15MOrderedM: q(withStock, "rc09:hcw_pipe"),
        installedJointCountStable: q(withStock, "rc09:hcw_pipe_joint"),
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
