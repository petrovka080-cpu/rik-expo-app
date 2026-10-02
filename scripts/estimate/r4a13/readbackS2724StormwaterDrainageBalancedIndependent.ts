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
import { validateMasterFormulaGraphConsistency } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:expanded:stormwater_drainage";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(".release-runtime/r568/s27-24/stormwater-drainage-balanced-current/independent-acceptance.json");
const PROMPT = "Строительство 1 ливневой сети: трасса 900 м, труба PVC-U SN8 OD 315 мм, уклон 0,005, расчётный расход 80 л/с, марка PVC-U-SN8-OD315.";
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
const quantity = (rows: readonly Json[], rowId: string) =>
  rows.find((row) => row.row_id === rowId)?.quantity as string | undefined;
const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at,definition_count,
      parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "56:37:37", "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_GATE");
    const pr = await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id]);
    const fr = await client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id]);
    const rr = await client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id]);
    const br = await client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id]);
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
    const baseline = br.rows[0] as Json; const search = sr.rows[0] as Json;
    const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator, "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "stormwater-drainage-project-balance-s27-24-v1",
      "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_LOCATOR");
    invariant(formulas.every((formula) => !/length_m\s*\*\s*(?:0\.0066667|0\.85|1\.02|1\.4)|length_m\s*\/\s*(?:60|200)|ceil\(5\/4\)/iu
      .test(String(formula.expression_source))),
    "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_LEGACY_FORMULA");
    const network = /(\d+)\s+ливнев\p{L}*\s+(?:водоотводн\p{L}*\s+)?сет\p{L}*/iu.exec(PROMPT)?.[1];
    const length = /трасс\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu.exec(PROMPT)?.[1];
    const material = /\bPVC[-\s]?U\b/iu.test(PROMPT) ? "PVC-U" : undefined;
    const stiffness = /\b(SN\s*\d+)\b/iu.exec(PROMPT)?.[1]?.replace(/\s+/gu, "").toUpperCase();
    const diameter = /\b(?:OD|DN\/OD)\s*(\d+(?:[,.]\d+)?)\s*мм(?!\p{L})/iu.exec(PROMPT)?.[1];
    const slope = /уклон\p{L}*\s+(\d+(?:[,.]\d+)?)(?!\s*%)/iu.exec(PROMPT)?.[1];
    const flow = /расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*л\/с(?!\p{L})/iu.exec(PROMPT)?.[1];
    const pipe = /марк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(PROMPT)?.[1];
    invariant(network && length && material && stiffness && diameter && slope && flow && pipe,
      "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_IDENTITY");
    const ordinary = { swd_network_count: network, swd_route_length_m: length.replace(",", "."),
      swd_pipe_material: material, swd_ring_stiffness_class: stiffness,
      swd_pipe_outside_diameter_mm: diameter.replace(",", "."),
      swd_slope_m_per_m: slope.replace(",", "."), swd_design_flow_lps: flow.replace(",", "."),
      swd_pipe_designation: pipe.replace(/[.,;:]+$/u, "") };
    invariant(JSON.stringify(ordinary) === JSON.stringify({ swd_network_count: "1",
      swd_route_length_m: "900", swd_pipe_material: "PVC-U", swd_ring_stiffness_class: "SN8",
      swd_pipe_outside_diameter_mm: "315", swd_slope_m_per_m: "0.005",
      swd_design_flow_lps: "80", swd_pipe_designation: "PVC-U-SN8-OD315" }),
    "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.swd_pipe_retained_spare_m) === 0
      && Number(confirmedParameters.swd_pipe_supplier_segment_length_m) === 1,
    "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({ operation: "compile",
      compilerVersion: "s27-24-stormwater-drainage-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "swd_network_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas,
      resourceDefinitions: resources, submittedParameters, confirmedParameters,
      currencyCode: "KGS", priceItems: [], maximumResourceRows: 40,
      hashJson: async (value) => estimateDeterministicHash(value) });
    const first = await compile(ordinary); const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      swd_pipe_retained_spare_m: 10, swd_pipe_supplier_segment_length_m: 6 });
    const conditional = await compile({ ...completeInput,
      swd_dewatering_mode: "REQUIRED", swd_dewatering_designation: "Иглофильтровая установка по ППР",
      swd_dewatering_machine_h: 280, swd_shoring_mode: "REQUIRED",
      swd_shoring_designation: "Инвентарное крепление траншеи по ППР", swd_shoring_area_m2: 2520,
      swd_road_restoration_mode: "REQUIRED",
      swd_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
      swd_road_restoration_area_m2: 1080 });
    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 29,
      "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_FIRST");
    invariant(complete.rows.length === 34 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_COMPLETE");
    invariant(conditional.rows.length === 37 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:swd_pipe") === "912"
      && quantity(balanced.rows, "rc09:swd-pipe-balance:segment-count") === "152"
      && quantity(balanced.rows, "rc09:swd-pipe-balance:remainder") === "12"
      && quantity(balanced.rows, "rc09:swd-pipe-balance:surplus-beyond-spare") === "2",
    "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 4
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 4
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /санитарн|напорн|очистн|дождеприёмник|колодц|цен/iu.test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_STORMWATER_DRAINAGE_READBACK_SEARCH");
    const evidence: Json = { schemaVersion: "rik-expo-app.s27-24.stormwater-drainage-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_STORMWATER_DRAINAGE_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: { catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "37/37 GREEN", legacyGenericCoefficientFormulaCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256 },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticTrenchStructureOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: { input: { installedM: 900, retainedSpareM: 10, supplierSegmentM: 6 },
        orderedM: quantity(balanced.rows, "rc09:swd_pipe"),
        segmentCount: quantity(balanced.rows, "rc09:swd-pipe-balance:segment-count"),
        remainderM: quantity(balanced.rows, "rc09:swd-pipe-balance:remainder"),
        surplusM: quantity(balanced.rows, "rc09:swd-pipe-balance:surplus-beyond-spare") },
      conditionalProfile: { visibleRowCount: conditional.rows.length, preliminaryNeedCount: 0 },
      uiAcceptance: { web: false, android: false, procurementUi: false, pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable" },
      productionAccessed: false, activationPerformed: false, deployPerformed: false,
      otaPerformed: false, storeActionPerformed: false };
    evidence.receiptSha256 = sha256(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true }); const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8"); renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({ status: evidence.status, releaseId: release.id,
      definitionVersionId: target.definition_version_id, firstRows: first.rows.length,
      completeRows: complete.rows.length, receiptSha256: evidence.receiptSha256,
      outputPath: OUTPUT_PATH }, null, 2)}\n`);
  } finally { await client.end(); }
}
void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
