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
import { estimateDeterministicHash } from
  "../../../src/lib/estimate/estimateDeterministicHash";
import { validateMasterFormulaGraphConsistency } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:expanded:reservoir_clean_water";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-26/reservoir-clean-water-automatic-current/independent-acceptance.json",
);
const PROMPT = "Строительство 2 подземных монолитных ЖБ резервуаров RC-CWR-2X1000, внутренние размеры каждого 20x10 м, рабочая глубина воды 5 м, по 2 переключаемые секции.";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const quantity = (rows: readonly Json[], rowId: string) =>
  rows.find((row) => row.row_id === rowId)?.quantity as string | undefined;
const sha256 = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at,
      definition_count,parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId]))
      .rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "71:82:82",
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_GATE");
    const [pr, fr, rr, br, sr, lr] = await Promise.all([
      client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
      client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id]),
      client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
      client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id]),
      client.query(`select d.definition_version_id::text,d.selectable,d.excluded_boundaries,r.status
        from public.estimate_search_document d join public.estimate_search_index_release r
        on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`,
      [current.searchReleaseId, CATALOG_ID]),
      client.query(`select l.locator_key,l.excerpt_sha256
        from public.estimate_work_normative_binding b join public.estimate_normative_locator l
        on l.id=b.locator_id where b.definition_version_id=$1`, [target.definition_version_id]),
    ]);
    const parameters = pr.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = fr.rows as CanonicalEstimateFormulaDefinition[];
    const resources = rr.rows as CanonicalEstimateResourceDefinition[];
    const baseline = br.rows[0] as Json;
    const search = sr.rows[0] as Json;
    const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator,
      "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key
      === "reservoir-clean-water-rc-geometric-automatic-s27-26-v1",
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/villageWaterSupplyCalculator|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_LEGACY_FORMULA");
    invariant(!/external[_. -]?pipeline|pump[_. -]?station|treatment[_. -]?station|road[_. -]?restoration|rock[_. -]?excavation|pile/iu
      .test(JSON.stringify(resources.map((row) => `${row.row_id} ${row.title_ru}`))),
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_ADJACENT_SCOPE");
    const ordinaryParameters = parameters.filter((parameter) =>
      parameter.truth_metadata?.value_source_role === "USER_INPUT");
    const profileParameters = parameters.filter((parameter) =>
      parameter.truth_metadata?.value_source_role
        === "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE");
    invariant(ordinaryParameters.length === 7
      && ordinaryParameters.every((parameter) =>
        parameter.required === true
        && parameter.truth_metadata?.preliminary_compilation_allowed === false
        && (parameter.truth_metadata?.guide as Json | undefined)
          ?.guide_validation_policy === "MANDATORY_BLOCK")
      && profileParameters.length === 60
      && profileParameters.every((parameter) =>
        parameter.truth_metadata?.preliminary_compilation_allowed === true
        && (parameter.truth_metadata?.guide as Json | undefined)?.guide_validation_policy
          === "ADVISORY_REASON_REQUIRED"),
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_PRIMARY_FACT_POLICY");

    const dimensions = /внутренн\p{L}*\s+размер\p{L}*\s+кажд\p{L}*\s*(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu.exec(PROMPT);
    const ordinary = {
      rcw_reservoir_count: /(\d+)\s+подземн\p{L}*\s+монолитн\p{L}*\s+ЖБ\s+резервуар/iu.exec(PROMPT)?.[1],
      rcw_reservoir_designation: /\b(RC-CWR-[A-Z0-9-]+)\b/iu.exec(PROMPT)?.[1],
      rcw_internal_length_m: dimensions?.[1]?.replace(",", "."),
      rcw_internal_width_m: dimensions?.[2]?.replace(",", "."),
      rcw_operating_water_depth_m: /рабоч\p{L}*\s+глубин\p{L}*\s+вод\p{L}*\s*(\d+(?:[,.]\d+)?)\s*м/iu.exec(PROMPT)?.[1]?.replace(",", "."),
      rcw_cell_count_per_reservoir: /по\s+(\d+)\s+переключаем\p{L}*\s+секци/iu.exec(PROMPT)?.[1],
      rcw_structural_system: /монолитн\p{L}*\s+ЖБ/iu.test(PROMPT)
        ? "BURIED_CAST_IN_PLACE_RC" : undefined,
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        rcw_reservoir_count: "2",
        rcw_reservoir_designation: "RC-CWR-2X1000",
        rcw_internal_length_m: "20",
        rcw_internal_width_m: "10",
        rcw_operating_water_depth_m: "5",
        rcw_cell_count_per_reservoir: "2",
        rcw_structural_system: "BURIED_CAST_IN_PLACE_RC",
      }),
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.rcw_external_wall_thickness_m) === 0.3
      && Number(confirmedParameters.rcw_rebar_supplier_lot_kg) === 1000
      && Number(confirmedParameters.rcw_waterstop_supplier_roll_m) === 25,
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json, confirmed: Json = confirmedParameters) =>
      compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s27-26-reservoir-clean-water-independent-db-readback-v1",
        catalogId: CATALOG_ID,
        primaryMeasureParameterId: "rcw_reservoir_count",
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters,
        confirmedParameters: confirmed,
        currencyCode: "KGS",
        priceItems: [],
        maximumResourceRows: 82,
        hashJson: async (value) => estimateDeterministicHash(value),
      });
    const first = await compile(ordinary);
    const changedGeometry = await compile({
      ...ordinary,
      rcw_internal_length_m: "25",
      rcw_internal_width_m: "12",
      rcw_operating_water_depth_m: "6",
    });
    const changedProcurement = await compile(ordinary, {
      ...confirmedParameters,
      rcw_rebar_available_stock_kg: 10000,
      rcw_rebar_retained_spare_kg: 1000,
      rcw_rebar_supplier_lot_kg: 2000,
      rcw_waterstop_available_stock_m: 100,
      rcw_waterstop_retained_spare_m: 20,
      rcw_waterstop_supplier_roll_m: 50,
    });
    const conditional = await compile(ordinary, {
      ...confirmedParameters,
      rcw_shoring_mode: "REQUIRED",
      rcw_shoring_designation: "STEEL-SHEET-PILE",
      rcw_dewatering_mode: "REQUIRED",
      rcw_dewatering_pump_designation: "DRAIN-PUMP-20M3H",
      rcw_dewatering_duration_h: 40,
      rcw_dewatering_flow_m3_h: 12,
    });
    invariant(first.rows.length === 77 && first.preliminaryNeeds.length === 0
      && quantity(first.rows, "rc14:rcw_useful_capacity") === "2000"
      && quantity(first.rows, "rc14:rcw_excavation") === "4015.116"
      && quantity(first.rows, "rc14:rcw_structural_concrete_installed") === "518.608"
      && quantity(first.rows, "rc14:rcw_rebar_installed") === "72605.12"
      && quantity(first.rows, "rc14:rcw_waterstop_installed") === "232.8",
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_FIRST");
    invariant(quantity(changedGeometry.rows, "rc14:rcw_useful_capacity") === "3600"
      && quantity(changedGeometry.rows, "rc14:rcw_excavation") === "6487.656"
      && quantity(changedGeometry.rows, "rc14:rcw_structural_concrete_installed") === "768.248"
      && quantity(changedGeometry.rows, "rc14:rcw_rebar_order") === "112000"
      && quantity(changedGeometry.rows, "rc14:rcw_waterstop_order") === "325",
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_GEOMETRY");
    invariant(quantity(changedProcurement.rows, "rc14:rcw_rebar_total_need") === "75783.2736"
      && quantity(changedProcurement.rows, "rc14:rcw_rebar_net_need") === "65783.2736"
      && quantity(changedProcurement.rows, "rc14:rcw_rebar_lot_count") === "33"
      && quantity(changedProcurement.rows, "rc14:rcw_rebar_order") === "66000"
      && quantity(changedProcurement.rows, "rc14:rcw_rebar_surplus") === "216.7264"
      && quantity(changedProcurement.rows, "rc14:rcw_waterstop_net_need") === "164.44"
      && quantity(changedProcurement.rows, "rc14:rcw_waterstop_roll_count") === "4"
      && quantity(changedProcurement.rows, "rc14:rcw_waterstop_order") === "200"
      && quantity(changedProcurement.rows, "rc14:rcw_waterstop_surplus") === "35.56",
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_PROCUREMENT");
    invariant(conditional.rows.length === 82 && conditional.preliminaryNeeds.length === 0
      && quantity(conditional.rows, "rc14:rcw_shoring") === "992.64"
      && quantity(conditional.rows, "rc14:rcw_dewatering_volume") === "480",
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_CONDITIONAL");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft",
    "STOP_S27_26_RESERVOIR_CLEAN_WATER_READBACK_SEARCH");

    const receipt = {
      schemaVersion: "rik-expo-app.s27-26.reservoir-clean-water-independent-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_26_RESERVOIR_CLEAN_WATER_AUTOMATIC_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { ...release, definitionReleaseId: current.definitionReleaseId,
        searchReleaseId: current.searchReleaseId },
      target,
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        primaryFactCount: Object.keys(ordinary).length,
        mandatoryBeforeCompile: ordinaryParameters.length,
        visibleProfileNotOrdinaryQuestions: profileParameters.length },
      persisted: { parameterCount: parameters.length, formulaCount: formulas.length,
        resourceCount: resources.length, locator, search },
      automaticGeometry: {
        baselineCapacityM3: quantity(first.rows, "rc14:rcw_useful_capacity"),
        changedCapacityM3: quantity(changedGeometry.rows, "rc14:rcw_useful_capacity"),
        baselineExcavationM3: quantity(first.rows, "rc14:rcw_excavation"),
        changedExcavationM3: quantity(changedGeometry.rows, "rc14:rcw_excavation"),
        baselineConcreteM3: quantity(first.rows, "rc14:rcw_structural_concrete_installed"),
        changedConcreteM3: quantity(changedGeometry.rows, "rc14:rcw_structural_concrete_installed"),
      },
      procurement: {
        rebarNetNeedKg: quantity(changedProcurement.rows, "rc14:rcw_rebar_net_need"),
        rebarOrderKg: quantity(changedProcurement.rows, "rc14:rcw_rebar_order"),
        rebarSurplusKg: quantity(changedProcurement.rows, "rc14:rcw_rebar_surplus"),
        waterstopNetNeedM: quantity(changedProcurement.rows, "rc14:rcw_waterstop_net_need"),
        waterstopOrderM: quantity(changedProcurement.rows, "rc14:rcw_waterstop_order"),
        waterstopSurplusM: quantity(changedProcurement.rows, "rc14:rcw_waterstop_surplus"),
      },
      rows: { first: first.rows.length, conditional: conditional.rows.length },
      ownership: {
        legacyWaterReservoirMutuallyExclusive: true,
        simultaneousSelectionAccepted: false,
      },
      boundaries: {
        ordinaryRouteCoreAccepted: true,
        uiAccepted: false,
        reason: "ordinary staging consumer session and prepared-release selection in Web/Android were not exercised by this DB readback",
        activationPerformed: false,
        productionAccessed: false,
      },
    };
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const tempPath = `${OUTPUT_PATH}.tmp`;
    const receiptSha256 = sha256(receipt);
    writeFileSync(tempPath, `${JSON.stringify({ ...receipt, receiptSha256 }, null, 2)}\n`, "utf8");
    renameSync(tempPath, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      releaseId: current.definitionReleaseId,
      definitionVersionId: target.definition_version_id,
      firstRows: first.rows.length,
      conditionalRows: conditional.rows.length,
      receiptSha256,
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
