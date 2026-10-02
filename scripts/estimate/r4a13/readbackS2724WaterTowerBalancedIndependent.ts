import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { canonicalApprovedBaselineRuntimeParameters } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import { compileCanonicalEstimateCore, type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition, type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../../src/lib/estimate/estimateDeterministicHash";
import { validateMasterFormulaGraphConsistency } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:expanded:water_tower";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/water-tower-balanced-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 стальной водонапорной башни Рожновского WT-ROZHNOVSKY-VBR50-18: тип STEEL_ROZHNOVSKY_WATER_TOWER, бак 50 м³, высота опоры 18 м, 620 м² покрытия JOTUN-TANKGUARD-DW-SYSTEM, 38 м стояка STEEL-EPOXY-DN150-PN16, 22 м переливного трубопровода STEEL-GALV-DN100.";
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const quantity = (rows: readonly Json[], rowId: string) =>
  rows.find((row) => row.row_id === rowId)?.quantity as string | undefined;
const sha256 = (value: unknown) => createHash("sha256")
  .update(JSON.stringify(value)).digest("hex");

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at from
      public.estimate_definition_release where id=$1`, [current.definitionReleaseId]))
      .rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_24_WATER_TOWER_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "65:45:45", "STOP_S27_24_WATER_TOWER_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_WATER_TOWER_READBACK_GATE");
    const pr = await client.query(
      "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
      [target.definition_version_id]);
    const fr = await client.query(
      "select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
      [target.definition_version_id]);
    const rr = await client.query(
      "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
      [target.definition_version_id]);
    const br = await client.query(
      "select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1",
      [target.approved_template_baseline_id]);
    const sr = await client.query(`select d.definition_version_id::text,d.selectable,
      d.excluded_boundaries,r.status from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id
      where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, CATALOG_ID]);
    const lr = await client.query(`select l.locator_key,l.excerpt_sha256
      from public.estimate_work_normative_binding b
      join public.estimate_normative_locator l on l.id=b.locator_id
      where b.definition_version_id=$1`, [target.definition_version_id]);
    const parameters = pr.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = fr.rows as CanonicalEstimateFormulaDefinition[];
    const resources = rr.rows as CanonicalEstimateResourceDefinition[];
    const baseline = br.rows[0] as Json;
    const search = sr.rows[0] as Json;
    const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator, "STOP_S27_24_WATER_TOWER_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_WATER_TOWER_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "water-tower-rozhovsky-coating-project-balance-s27-24-v1",
      "STOP_S27_24_WATER_TOWER_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/tank_capacity\w*\s*\*|support_height\w*\s*\*|length_m\s*\*\s*0\.|villageWaterSupply|golden_rate|normFactor/iu
        .test(String(formula.expression_source))), "STOP_S27_24_WATER_TOWER_READBACK_LEGACY");
    invariant(!/trench|hydrant|manhole|village_water|water_intake|treatment_plant|reservoir|sewer/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_24_WATER_TOWER_READBACK_ADJACENT_SCOPE");

    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const coating = /(\d+(?:[,.]\d+)?)\s*м[²2]\s+покрыти\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(PROMPT);
    const riser = /(\d+(?:[,.]\d+)?)\s*м\s+стояк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(PROMPT);
    const overflow = /(\d+(?:[,.]\d+)?)\s*м\s+переливн\p{L}*\s+трубопровод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(PROMPT);
    const ordinary = {
      wt_tower_count: number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+стальн\p{L}*\s+водонапорн\p{L}*\s+башн\p{L}*\s+рожновск\p{L}*/iu),
      wt_tower_designation: /башн\p{L}*\s+рожновск\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu.exec(PROMPT)?.[1],
      wt_tower_type: /тип\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(PROMPT)?.[1],
      wt_tank_capacity_m3: number(/бак\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]/iu),
      wt_support_height_m: number(/высот\p{L}*\s+опор\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?!\p{L})/iu),
      wt_coating_installed_area_m2: coating?.[1]?.replace(",", "."),
      wt_coating_designation: coating?.[2]?.replace(/[.,;:]+$/u, ""),
      wt_riser_pipe_installed_m: riser?.[1]?.replace(",", "."),
      wt_riser_pipe_designation: riser?.[2]?.replace(/[.,;:]+$/u, ""),
      wt_overflow_pipe_installed_m: overflow?.[1]?.replace(",", "."),
      wt_overflow_pipe_designation: overflow?.[2]?.replace(/[.,;:]+$/u, ""),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        wt_tower_count: "1", wt_tower_designation: "WT-ROZHNOVSKY-VBR50-18",
        wt_tower_type: "STEEL_ROZHNOVSKY_WATER_TOWER", wt_tank_capacity_m3: "50",
        wt_support_height_m: "18", wt_coating_installed_area_m2: "620",
        wt_coating_designation: "JOTUN-TANKGUARD-DW-SYSTEM",
        wt_riser_pipe_installed_m: "38", wt_riser_pipe_designation: "STEEL-EPOXY-DN150-PN16",
        wt_overflow_pipe_installed_m: "22", wt_overflow_pipe_designation: "STEEL-GALV-DN100",
      }), "STOP_S27_24_WATER_TOWER_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.wt_coating_retained_spare_area_m2) === 0
      && Number(confirmedParameters.wt_coating_supplier_package_coverage_m2) === 1,
    "STOP_S27_24_WATER_TOWER_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile", compilerVersion: "s27-24-water-tower-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "wt_tower_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas,
      resourceDefinitions: resources, submittedParameters, confirmedParameters,
      currencyCode: "KGS", priceItems: [], maximumResourceRows: 45,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      wt_coating_retained_spare_area_m2: 20,
      wt_coating_supplier_package_coverage_m2: 25 });
    const conditional = await compile({ ...completeInput,
      wt_excavation_shoring_mode: "REQUIRED", wt_excavation_shoring_designation: "SHEET-PILE-LIGHT",
      wt_excavation_shoring_area_m2: 600,
      wt_groundwater_dewatering_mode: "REQUIRED",
      wt_groundwater_dewatering_designation: "WELLPOINT-60M3H",
      wt_groundwater_dewatering_machine_h: 120,
      wt_road_reinstatement_mode: "REQUIRED",
      wt_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      wt_road_reinstatement_area_m2: 300 });
    invariant(first.rows.length === 11 && first.preliminaryNeeds.length === 34
      && quantity(first.rows, "rc09:wt_acceptance") === "1"
      && quantity(first.rows, "rc09:wt_coating") === "620",
    "STOP_S27_24_WATER_TOWER_READBACK_FIRST");
    invariant(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
      && quantity(complete.rows, "rc09:wt_foundation_concrete") === "145"
      && quantity(complete.rows, "rc09:wt_rebar") === "18500"
      && quantity(complete.rows, "rc09:labor:wt-civil") === "2400",
    "STOP_S27_24_WATER_TOWER_READBACK_COMPLETE");
    invariant(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_WATER_TOWER_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:wt-coating-balance:installed-net") === "620"
      && quantity(balanced.rows, "rc09:wt-coating-balance:retained-spare") === "20"
      && quantity(balanced.rows, "rc09:wt-coating-balance:total-need") === "640"
      && quantity(balanced.rows, "rc09:wt-coating-balance:package-count") === "26"
      && quantity(balanced.rows, "rc09:wt_coating") === "650"
      && quantity(balanced.rows, "rc09:wt-coating-balance:remainder") === "30"
      && quantity(balanced.rows, "rc09:wt-coating-balance:surplus-beyond-spare") === "10",
    "STOP_S27_24_WATER_TOWER_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 3
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_WATER_TOWER_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /сеть|транше|колод|гидрант|водозабор|водоподготов|насосн|резервуар|канализац|автомат|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_WATER_TOWER_READBACK_SEARCH");
    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.water-tower-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_WATER_TOWER_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: { catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "45/45 GREEN",
        legacyGenericCoefficientFormulaCount: 0, adjacentTemplateResourceCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256 },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticMaterialLaborMechanismLogisticsOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: { input: { installedAreaM2: 620, retainedSpareAreaM2: 20,
        supplierPackageCoverageM2: 25 },
        totalNeedAreaM2: quantity(balanced.rows, "rc09:wt-coating-balance:total-need"),
        orderedAreaM2: quantity(balanced.rows, "rc09:wt_coating"),
        packageCount: quantity(balanced.rows, "rc09:wt-coating-balance:package-count"),
        remainderAreaM2: quantity(balanced.rows, "rc09:wt-coating-balance:remainder"),
        surplusAreaM2: quantity(balanced.rows, "rc09:wt-coating-balance:surplus-beyond-spare") },
      conditionalProfile: { visibleRowCount: conditional.rows.length, preliminaryNeedCount: 0 },
      uiAcceptance: { web: false, android: false, procurementUi: false, pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable" },
      productionAccessed: false, activationPerformed: false, deployPerformed: false,
      otaPerformed: false, storeActionPerformed: false,
    };
    evidence.receiptSha256 = sha256(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({ status: evidence.status, releaseId: release.id,
      definitionVersionId: target.definition_version_id, firstRows: first.rows.length,
      completeRows: complete.rows.length, receiptSha256: evidence.receiptSha256,
      outputPath: OUTPUT_PATH }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
