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
const CATALOG_ID = "canonical-work:expanded:valves_chambers";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-26/valves-chambers-automatic-current/independent-acceptance.json",
);
const PROMPT = "Строительство 4 монолитных железобетонных камер запорной арматуры VCH-RC-2.4X1.8-H2.2-DN200: внутренние размеры 2.4 x 1.8 x 2.2 м; устанавливается 4 задвижки GATE-VALVE-DN200-PN16-EPDM номинального диаметра 200 мм; внутренние трубные вставки STEEL-SPOOL-DN200-PN16-EPOXY.";

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
      "STOP_S27_26_VALVES_CHAMBERS_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "85:61:61",
    "STOP_S27_26_VALVES_CHAMBERS_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_26_VALVES_CHAMBERS_READBACK_GATE");
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
    invariant(baseline && search && locator, "STOP_S27_26_VALVES_CHAMBERS_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_26_VALVES_CHAMBERS_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "valves-chambers-geometric-automatic-s27-26-v1",
      "STOP_S27_26_VALVES_CHAMBERS_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/villageWaterSupplyCalculator|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_26_VALVES_CHAMBERS_READBACK_LEGACY_FORMULA");
    invariant(!/distribution_pipeline|water_meter|pumping_station|reservoir|treatment_plant/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_26_VALVES_CHAMBERS_READBACK_ADJACENT_SCOPE");

    const dimensions = /внутренн\p{L}*\s+размер\p{L}*\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu
      .exec(PROMPT);
    const ordinary = {
      vch_chamber_count: /строительств\p{L}*\s+(\d+)\s+монолитн\p{L}*\s+железобетонн\p{L}*\s+камер/iu
        .exec(PROMPT)?.[1],
      vch_chamber_designation: /камер\p{L}*\s+запорн\p{L}*\s+арматур\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
        .exec(PROMPT)?.[1],
      vch_internal_length_m: dimensions?.[1]?.replace(",", "."),
      vch_internal_width_m: dimensions?.[2]?.replace(",", "."),
      vch_clear_depth_m: dimensions?.[3]?.replace(",", "."),
      vch_valve_installed_piece: /устанавлива\p{L}*\s+(\d+)\s+задвижк/iu.exec(PROMPT)?.[1],
      vch_valve_designation: /задвижк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s+номинальн/iu
        .exec(PROMPT)?.[1],
      vch_nominal_diameter_mm: /номинальн\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu
        .exec(PROMPT)?.[1]?.replace(",", "."),
      vch_pipeline_spool_designation: /внутренн\p{L}*\s+трубн\p{L}*\s+вставк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
        .exec(PROMPT)?.[1],
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        vch_chamber_count: "4",
        vch_chamber_designation: "VCH-RC-2.4X1.8-H2.2-DN200",
        vch_internal_length_m: "2.4",
        vch_internal_width_m: "1.8",
        vch_clear_depth_m: "2.2",
        vch_valve_installed_piece: "4",
        vch_valve_designation: "GATE-VALVE-DN200-PN16-EPDM",
        vch_nominal_diameter_mm: "200",
        vch_pipeline_spool_designation: "STEEL-SPOOL-DN200-PN16-EPOXY",
      }),
    "STOP_S27_26_VALVES_CHAMBERS_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.vch_valve_retained_spare_piece) === 1
      && Number(confirmedParameters.vch_valve_supplier_package_quantity_piece) === 1,
    "STOP_S27_26_VALVES_CHAMBERS_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json, confirmed: Json = confirmedParameters) =>
      compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s27-26-valves-chambers-independent-db-readback-v1",
        catalogId: CATALOG_ID,
        primaryMeasureParameterId: "vch_chamber_count",
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters,
        confirmedParameters: confirmed,
        currencyCode: "KGS",
        priceItems: [],
        maximumResourceRows: 61,
        hashJson: async (value) => estimateDeterministicHash(value),
      });
    const first = await compile(ordinary);
    const changedGeometry = await compile({
      ...ordinary,
      vch_internal_length_m: "3",
      vch_internal_width_m: "2.4",
    });
    const changedProcurement = await compile(ordinary, {
      ...confirmedParameters,
      vch_valve_available_stock_piece: 2,
      vch_valve_supplier_package_quantity_piece: 4,
    });
    const conditional = await compile(ordinary, {
      ...confirmedParameters,
      vch_excavation_shoring_mode: "REQUIRED",
      vch_excavation_shoring_designation: "SHEET-PILE-LIGHT",
      vch_excavation_shoring_area_m2: 180,
      vch_groundwater_dewatering_mode: "REQUIRED",
      vch_groundwater_dewatering_designation: "WELLPOINT-60M3H",
      vch_groundwater_dewatering_machine_h: 96,
      vch_pavement_reinstatement_mode: "REQUIRED",
      vch_pavement_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      vch_pavement_reinstatement_area_m2: 72,
    });
    invariant(first.rows.length === 58 && first.preliminaryNeeds.length === 0
      && quantity(first.rows, "rc09:vch_excavation") === "146.718"
      && quantity(first.rows, "rc09:vch_structural_concrete") === "34.14862"
      && quantity(first.rows, "rc09:vch_reinforcement") === "4.31002"
      && quantity(first.rows, "rc09:vch_pipeline_spool") === "14"
      && quantity(first.rows, "rc09:vch_valves") === "5",
    "STOP_S27_26_VALVES_CHAMBERS_READBACK_FIRST");
    invariant(Number(quantity(changedGeometry.rows, "rc09:vch_excavation"))
        > Number(quantity(first.rows, "rc09:vch_excavation"))
      && Number(quantity(changedGeometry.rows, "rc09:vch_structural_concrete"))
        > Number(quantity(first.rows, "rc09:vch_structural_concrete"))
      && Number(quantity(changedGeometry.rows, "rc09:vch_pipeline_spool"))
        > Number(quantity(first.rows, "rc09:vch_pipeline_spool"))
      && quantity(changedGeometry.rows, "rc09:vch_valves") === "5",
    "STOP_S27_26_VALVES_CHAMBERS_READBACK_GEOMETRY_RECALCULATION");
    invariant(conditional.rows.length === 61 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_26_VALVES_CHAMBERS_READBACK_CONDITIONAL");
    invariant(quantity(changedProcurement.rows, "rc09:vch-valve-balance:net-order-need") === "3"
      && quantity(changedProcurement.rows, "rc09:vch-valve-balance:package-count") === "1"
      && quantity(changedProcurement.rows, "rc09:vch_valves") === "4"
      && quantity(changedProcurement.rows, "rc09:vch-valve-balance:remainder") === "2"
      && quantity(changedProcurement.rows, "rc09:vch-valve-balance:surplus-beyond-spare") === "1",
    "STOP_S27_26_VALVES_CHAMBERS_READBACK_PROCUREMENT_RECALCULATION");
    invariant(first.rows.some((row) => row.row_id === "rc09:labor:vch-mechanical")
      && first.rows.some((row) => row.row_id === "rc09:equipment:vch-crane")
      && first.rows.some((row) => row.row_id === "rc09:logistics:vch-concrete-delivery")
      && first.rows.some((row) => row.row_id === "rc09:vch_test_water")
      && first.rows.some((row) => row.row_id === "rc09:vch_asbuilt"),
    "STOP_S27_26_VALVES_CHAMBERS_READBACK_COMPLETION_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /трубопровод|водомерн|насосн|резервуар|водоподготов|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_26_VALVES_CHAMBERS_READBACK_SEARCH");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-26.valves-chambers-automatic-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_26_VALVES_CHAMBERS_AUTOMATIC_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID,
        definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "61/61 GREEN",
        legacyGenericCoefficientFormulaCount: 0,
        adjacentTemplateResourceCount: 0,
        normativeLocator: locator,
        payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt: PROMPT,
        submittedParameters: ordinary,
        primaryFactCount: Object.keys(ordinary).length,
        derivedQuantityQuestionCount: 0,
        automaticCivilMechanicalLaborMechanismLogisticsAndProcurement: true,
        automaticConditionalSelectionPerformed: false,
      },
      firstEstimate: {
        visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length,
      },
      automaticGeometryRecalculation: {
        baselineExcavationM3: quantity(first.rows, "rc09:vch_excavation"),
        changedExcavationM3: quantity(changedGeometry.rows, "rc09:vch_excavation"),
        baselineConcreteOrderM3: quantity(first.rows, "rc09:vch_structural_concrete"),
        changedConcreteOrderM3: quantity(changedGeometry.rows, "rc09:vch_structural_concrete"),
        baselineSpoolM: quantity(first.rows, "rc09:vch_pipeline_spool"),
        changedSpoolM: quantity(changedGeometry.rows, "rc09:vch_pipeline_spool"),
      },
      procurementBalance: {
        changedInput: { installedPiece: 4, retainedSparePiece: 1, availableStockPiece: 2, packageQuantityPiece: 4 },
        netOrderNeedPiece: quantity(changedProcurement.rows, "rc09:vch-valve-balance:net-order-need"),
        orderedPiece: quantity(changedProcurement.rows, "rc09:vch_valves"),
        remainderPiece: quantity(changedProcurement.rows, "rc09:vch-valve-balance:remainder"),
        surplusPiece: quantity(changedProcurement.rows, "rc09:vch-valve-balance:surplus-beyond-spare"),
      },
      conditionalProfile: { visibleRowCount: conditional.rows.length, preliminaryNeedCount: 0 },
      uiAcceptance: {
        web: false,
        android: false,
        procurementUi: false,
        pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable",
      },
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
      firstRows: first.rows.length,
      conditionalRows: conditional.rows.length,
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
