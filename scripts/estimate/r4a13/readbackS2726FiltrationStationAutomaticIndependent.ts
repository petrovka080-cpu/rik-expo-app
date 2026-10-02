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
const CATALOG_ID = "canonical-work:expanded:filtration_station";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-26/filtration-station-automatic-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 фильтровальной станции FS-RGF-5000-4C производительностью 5000 м3/сут: 4 фильтровальные ячейки внутренним размером 8 x 5 м; загрузка DUAL-MEDIA-ANTHRACITE-SAND-POTABLE глубиной 0.8 м; дренаж HDPE-BLOCK-UNDERDRAIN-AIR-WATER; промывочный пакет BW-2P2B-AIR-WATER-5000.";

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
      "STOP_S27_26_FILTRATION_STATION_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "108:76:76",
    "STOP_S27_26_FILTRATION_STATION_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_26_FILTRATION_STATION_READBACK_GATE");
    const pr = await client.query(
      "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
      [target.definition_version_id],
    );
    const fr = await client.query(
      "select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
      [target.definition_version_id],
    );
    const rr = await client.query(
      "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
      [target.definition_version_id],
    );
    const br = await client.query(
      "select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1",
      [target.approved_template_baseline_id],
    );
    const sr = await client.query(`select d.definition_version_id::text,d.selectable,
      d.excluded_boundaries,r.status from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id
      where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, CATALOG_ID]);
    const lr = await client.query(`select l.locator_key,l.excerpt_sha256
      from public.estimate_work_normative_binding b join public.estimate_normative_locator l
      on l.id=b.locator_id where b.definition_version_id=$1`, [target.definition_version_id]);
    const parameters = pr.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = fr.rows as CanonicalEstimateFormulaDefinition[];
    const resources = rr.rows as CanonicalEstimateResourceDefinition[];
    const baseline = br.rows[0] as Json;
    const search = sr.rows[0] as Json;
    const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator,
      "STOP_S27_26_FILTRATION_STATION_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_26_FILTRATION_STATION_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "filtration-station-geometric-automatic-s27-26-v2",
      "STOP_S27_26_FILTRATION_STATION_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/waterTreatmentPlantCalculator|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_26_FILTRATION_STATION_READBACK_LEGACY_FORMULA");
    invariant(!/water_intake|coagulat|flocculat|sediment|disinfect_block|clean_water_reservoir|distribution_pipeline/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_26_FILTRATION_STATION_READBACK_ADJACENT_SCOPE");
    const ordinaryParameters = parameters.filter((parameter) =>
      parameter.truth_metadata?.value_source_role === "USER_INPUT");
    const profileParameters = parameters.filter((parameter) =>
      parameter.truth_metadata?.value_source_role
        === "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE");
    invariant(ordinaryParameters.length === 10
      && ordinaryParameters.every((parameter) =>
        parameter.required === true
        && parameter.truth_metadata?.preliminary_compilation_allowed === false
        && (parameter.truth_metadata?.guide as Json | undefined)
          ?.guide_validation_policy === "MANDATORY_BLOCK")
      && profileParameters.length === 92
      && profileParameters.every((parameter) =>
        parameter.truth_metadata?.preliminary_compilation_allowed === true
        && (parameter.truth_metadata?.guide as Json | undefined)?.guide_validation_policy
          === "ADVISORY_REASON_REQUIRED"),
    "STOP_S27_26_FILTRATION_STATION_READBACK_PRIMARY_FACT_COLLECTION_POLICY");

    const dimensions = /внутренн\p{L}*\s+размер\p{L}*\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu
      .exec(PROMPT);
    const identifier = "([A-Z0-9](?:[A-Z0-9._/-]*[A-Z0-9])?)";
    const ordinary = {
      flt_station_count: /строительств\p{L}*\s+(\d+)\s+фильтровальн\p{L}*\s+станц/iu
        .exec(PROMPT)?.[1],
      flt_station_designation: new RegExp(
        `станц\\p{L}*\\s+${identifier}\\s+производительн`, "iu",
      ).exec(PROMPT)?.[1],
      flt_design_capacity_m3_day: /производительн\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м3\s*\/\s*сут/iu
        .exec(PROMPT)?.[1]?.replace(",", "."),
      flt_filter_cell_count: /:\s*(\d+)\s+фильтровальн\p{L}*\s+ячейк/iu
        .exec(PROMPT)?.[1],
      flt_filter_internal_length_m: dimensions?.[1]?.replace(",", "."),
      flt_filter_internal_width_m: dimensions?.[2]?.replace(",", "."),
      flt_filter_media_designation: new RegExp(
        `загрузк\\p{L}*\\s+${identifier}\\s+глубин`, "iu",
      ).exec(PROMPT)?.[1],
      flt_filter_media_depth_m: /глубин\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м/iu
        .exec(PROMPT)?.[1]?.replace(",", "."),
      flt_underdrain_designation: new RegExp(
        `дренаж\\p{L}*\\s+${identifier}\\s*;`, "iu",
      ).exec(PROMPT)?.[1],
      flt_backwash_package_designation: new RegExp(
        `промывочн\\p{L}*\\s+пакет\\p{L}*\\s+${identifier}\\s*\\.`, "iu",
      ).exec(PROMPT)?.[1],
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        flt_station_count: "1",
        flt_station_designation: "FS-RGF-5000-4C",
        flt_design_capacity_m3_day: "5000",
        flt_filter_cell_count: "4",
        flt_filter_internal_length_m: "8",
        flt_filter_internal_width_m: "5",
        flt_filter_media_designation: "DUAL-MEDIA-ANTHRACITE-SAND-POTABLE",
        flt_filter_media_depth_m: "0.8",
        flt_underdrain_designation: "HDPE-BLOCK-UNDERDRAIN-AIR-WATER",
        flt_backwash_package_designation: "BW-2P2B-AIR-WATER-5000",
      }),
    "STOP_S27_26_FILTRATION_STATION_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.flt_filter_media_retained_spare_t) === 2
      && Number(confirmedParameters.flt_filter_media_supplier_package_t) === 1,
    "STOP_S27_26_FILTRATION_STATION_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json, confirmed: Json = confirmedParameters) =>
      compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s27-26-filtration-station-independent-db-readback-v1",
        catalogId: CATALOG_ID,
        primaryMeasureParameterId: "flt_station_count",
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters,
        confirmedParameters: confirmed,
        currencyCode: "KGS",
        priceItems: [],
        maximumResourceRows: 76,
        hashJson: async (value) => estimateDeterministicHash(value),
      });
    const first = await compile(ordinary);
    const changedGeometry = await compile({
      ...ordinary,
      flt_filter_internal_length_m: "10",
      flt_filter_internal_width_m: "6",
    });
    const changedProcurement = await compile(ordinary, {
      ...confirmedParameters,
      flt_filter_media_available_stock_t: 20,
      flt_filter_media_supplier_package_t: 25,
    });
    const conditional = await compile(ordinary, {
      ...confirmedParameters,
      flt_excavation_shoring_mode: "REQUIRED",
      flt_excavation_shoring_designation: "SHEET-PILE-FILTER-HALL",
      flt_excavation_shoring_area_m2: 420,
      flt_groundwater_dewatering_mode: "REQUIRED",
      flt_groundwater_dewatering_designation: "WELLPOINT-120M3H",
      flt_groundwater_dewatering_machine_h: 180,
      flt_standby_power_mode: "REQUIRED",
      flt_standby_power_designation: "DIESEL-GENSET-800KVA-AMF",
      flt_standby_power_kva: 800,
    });
    invariant(first.rows.length === 73 && first.preliminaryNeeds.length === 0
      && quantity(first.rows, "rc10:flt_design_capacity") === "5000"
      && quantity(first.rows, "rc10:flt_hydraulic_loading") === "1.302083333"
      && quantity(first.rows, "rc10:flt_excavation") === "569.296"
      && quantity(first.rows, "rc10:flt_structural_concrete") === "197.0802"
      && quantity(first.rows, "rc10:flt_filter_media") === "174"
      && quantity(first.rows, "rc10:flt_underdrain_blocks") === "640",
    "STOP_S27_26_FILTRATION_STATION_READBACK_FIRST");
    invariant(Number(quantity(changedGeometry.rows, "rc10:flt_excavation"))
        > Number(quantity(first.rows, "rc10:flt_excavation"))
      && Number(quantity(changedGeometry.rows, "rc10:flt_structural_concrete"))
        > Number(quantity(first.rows, "rc10:flt_structural_concrete"))
      && Number(quantity(changedGeometry.rows, "rc10:flt_filter_media"))
        > Number(quantity(first.rows, "rc10:flt_filter_media"))
      && Number(quantity(changedGeometry.rows, "rc10:flt_hydraulic_loading"))
        < Number(quantity(first.rows, "rc10:flt_hydraulic_loading")),
    "STOP_S27_26_FILTRATION_STATION_READBACK_GEOMETRY");
    invariant(quantity(changedProcurement.rows, "rc10:flt-media-balance:installed") === "171.392"
      && quantity(changedProcurement.rows, "rc10:flt-media-balance:total-need") === "173.392"
      && quantity(changedProcurement.rows, "rc10:flt-media-balance:net-order-need") === "153.392"
      && quantity(changedProcurement.rows, "rc10:flt-media-balance:package-count") === "7"
      && quantity(changedProcurement.rows, "rc10:flt_filter_media") === "175"
      && quantity(changedProcurement.rows, "rc10:flt-media-balance:remainder") === "23.608"
      && quantity(changedProcurement.rows, "rc10:flt-media-balance:surplus-beyond-spare") === "21.608",
    "STOP_S27_26_FILTRATION_STATION_READBACK_PROCUREMENT");
    invariant(conditional.rows.length === 76 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_26_FILTRATION_STATION_READBACK_CONDITIONAL");
    const requiredRows = [
      "rc10:flt_structural_concrete", "rc10:flt_reinforcement",
      "rc10:flt_structural_steel", "rc10:flt_filter_media",
      "rc10:flt_support_gravel", "rc10:flt_underdrain_blocks",
      "rc10:flt_inlet_pipe", "rc10:flt_process_valves",
      "rc10:flt_backwash_pumps", "rc10:flt_backwash_blowers",
      "rc10:flt_mcc", "rc10:flt_plc", "rc10:flt_power_cable",
      "rc10:labor:flt-civil", "rc10:labor:flt-process",
      "rc10:equipment:flt-excavator", "rc10:equipment:flt-crane",
      "rc10:flt_asbuilt", "rc10:logistics:flt-media",
    ];
    invariant(requiredRows.every((rowId) => resources.some((row) => row.row_id === rowId)),
      "STOP_S27_26_FILTRATION_STATION_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft",
    "STOP_S27_26_FILTRATION_STATION_READBACK_SEARCH");

    const receipt = {
      schemaVersion: "rik-expo-app.s27-26.filtration-station-independent-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_26_FILTRATION_STATION_AUTOMATIC_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: {
        ...release,
        definitionReleaseId: current.definitionReleaseId,
        searchReleaseId: current.searchReleaseId,
      },
      target,
      ordinaryRoute: {
        prompt: PROMPT,
        submittedParameters: ordinary,
        primaryFactCount: Object.keys(ordinary).length,
        mandatoryBeforeCompile: ordinaryParameters.length,
        visibleProfileNotOrdinaryQuestions: profileParameters.length,
      },
      persisted: {
        parameterCount: parameters.length,
        formulaCount: formulas.length,
        resourceCount: resources.length,
        locator,
        search,
      },
      automaticGeometry: {
        baselineExcavationM3: quantity(first.rows, "rc10:flt_excavation"),
        changedExcavationM3: quantity(changedGeometry.rows, "rc10:flt_excavation"),
        baselineConcreteOrderM3: quantity(first.rows, "rc10:flt_structural_concrete"),
        changedConcreteOrderM3: quantity(changedGeometry.rows, "rc10:flt_structural_concrete"),
        baselineMediaOrderT: quantity(first.rows, "rc10:flt_filter_media"),
        changedMediaOrderT: quantity(changedGeometry.rows, "rc10:flt_filter_media"),
        baselineHydraulicLoadingMHour: quantity(first.rows, "rc10:flt_hydraulic_loading"),
        changedHydraulicLoadingMHour: quantity(changedGeometry.rows, "rc10:flt_hydraulic_loading"),
      },
      procurement: {
        installedT: quantity(changedProcurement.rows, "rc10:flt-media-balance:installed"),
        retainedSpareT: quantity(changedProcurement.rows, "rc10:flt-media-balance:retained-spare"),
        availableStockT: quantity(changedProcurement.rows, "rc10:flt-media-balance:available-stock"),
        netOrderNeedT: quantity(changedProcurement.rows, "rc10:flt-media-balance:net-order-need"),
        packageCount: quantity(changedProcurement.rows, "rc10:flt-media-balance:package-count"),
        orderedT: quantity(changedProcurement.rows, "rc10:flt_filter_media"),
        remainderT: quantity(changedProcurement.rows, "rc10:flt-media-balance:remainder"),
        surplusT: quantity(changedProcurement.rows, "rc10:flt-media-balance:surplus-beyond-spare"),
      },
      rows: { first: first.rows.length, conditional: conditional.rows.length },
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
