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
const CATALOG_ID = "canonical-work:expanded:pipe_bedding_backfill";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(".release-runtime/r568/s27-24/pipe-bedding-backfill-balanced-current/independent-acceptance.json");
const PROMPT = "Устройство основания и обратной засыпки 850 м трубопроводной траншеи: наружный диаметр трубы 315 мм, конструкция BDF-315-GTX300-SAND-PGS-K095, геотекстиль GEOTEXTILE-300-GSM, материал постели WASHED_SAND, толщина постели 150 мм, обсыпка 300 мм над трубой, материал обратной засыпки SAND_GRAVEL_MIX, коэффициент уплотнения 0,95, проектный объём постели и обсыпки 180 м³.";
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
const quantity = (rows: readonly Json[], rowId: string) =>
  rows.find((row) => row.row_id === rowId)?.quantity as string | undefined;
const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL }); await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at,definition_count,
      parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "42:30:30", "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_GATE");
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
    const baseline = br.rows[0] as Json; const search = sr.rows[0] as Json; const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator, "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "pipe-bedding-backfill-project-balance-s27-24-v1",
      "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_LOCATOR");
    invariant(formulas.every((formula) => !/route_length_m\s*\*|ceil\(route_length|golden_rate|normFactor/iu
      .test(String(formula.expression_source))),
    "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_LEGACY_FORMULA");
    invariant(!/sewer_pipe_lm|inspection_manhole|hydraulic_testing_lm/iu.test(JSON.stringify(resources)),
      "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_NETWORK_TEMPLATE_SCOPE");
    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const token = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(/[.,;:]+$/u, "");
    const ordinary = {
      pbb_route_length_m: number(/засыпк\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м\s+трубопроводн/iu),
      pbb_pipe_outside_diameter_mm: number(/наружн\p{L}*\s+диаметр\p{L}*\s+труб\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
      pbb_assembly_designation: token(/конструкц\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu),
      pbb_geotextile_designation: token(/геотекстил\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu),
      pbb_bedding_material: token(/материал\p{L}*\s+постел\p{L}*\s+([A-Z][A-Z0-9._/-]*)/iu),
      pbb_bedding_thickness_mm: number(/толщин\p{L}*\s+постел\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
      pbb_surround_cover_above_pipe_mm: number(/обсыпк\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм\s+над\s+труб/iu),
      pbb_backfill_material: token(/материал\p{L}*\s+обратн\p{L}*\s+засыпк\p{L}*\s+([A-Z][A-Z0-9._/-]*)/iu),
      pbb_compaction_coefficient: number(/коэффициент\p{L}*\s+уплотнен\p{L}*\s+(\d+(?:[,.]\d+)?)/iu),
      pbb_bedding_surround_installed_volume_m3: number(/проектн\p{L}*\s+объ[её]м\p{L}*\s+постел\p{L}*\s+и\s+обсыпк\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]/iu),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({ pbb_route_length_m: "850",
        pbb_pipe_outside_diameter_mm: "315", pbb_assembly_designation: "BDF-315-GTX300-SAND-PGS-K095",
        pbb_geotextile_designation: "GEOTEXTILE-300-GSM", pbb_bedding_material: "WASHED_SAND",
        pbb_bedding_thickness_mm: "150", pbb_surround_cover_above_pipe_mm: "300",
        pbb_backfill_material: "SAND_GRAVEL_MIX", pbb_compaction_coefficient: "0.95",
        pbb_bedding_surround_installed_volume_m3: "180" }),
    "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.pbb_bedding_retained_reserve_m3) === 0
      && Number(confirmedParameters.pbb_bedding_supplier_load_m3) === 1,
    "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({ operation: "compile",
      compilerVersion: "s27-24-pipe-bedding-backfill-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "pbb_route_length_m",
      parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
      submittedParameters, confirmedParameters, currencyCode: "KGS", priceItems: [],
      maximumResourceRows: 40, hashJson: async (value) => estimateDeterministicHash(value) });
    const first = await compile(ordinary); const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      pbb_bedding_retained_reserve_m3: 12, pbb_bedding_supplier_load_m3: 25 });
    const conditional = await compile({ ...completeInput,
      pbb_unsuitable_soil_replacement_mode: "REQUIRED",
      pbb_unsuitable_soil_replacement_designation: "Щебень 20-40 по геологии",
      pbb_unsuitable_soil_replacement_volume_m3: 140,
      pbb_dewatering_mode: "REQUIRED", pbb_dewatering_designation: "Дренажный насос по ППР",
      pbb_dewatering_machine_h: 96, pbb_shoring_mode: "REQUIRED",
      pbb_shoring_designation: "Инвентарное крепление траншеи", pbb_shoring_area_m2: 2100 });
    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 22,
      "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_FIRST");
    invariant(complete.rows.length === 27 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_COMPLETE");
    invariant(conditional.rows.length === 30 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:pbb_bedding_surround") === "200"
      && quantity(balanced.rows, "rc09:pbb-bedding-balance:load-count") === "8"
      && quantity(balanced.rows, "rc09:pbb-bedding-balance:remainder") === "20"
      && quantity(balanced.rows, "rc09:pbb-bedding-balance:surplus-beyond-reserve") === "8",
    "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 4
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id && search.selectable === true
      && search.status === "draft" && /труб|колод|испытан|цен/iu.test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_PIPE_BEDDING_BACKFILL_READBACK_SEARCH");
    const evidence: Json = { schemaVersion: "rik-expo-app.s27-24.pipe-bedding-backfill-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_PIPE_BEDDING_BACKFILL_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: { catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "30/30 GREEN", legacyGenericCoefficientFormulaCount: 0,
        networkTemplateResourceCount: 0, normativeLocator: locator, payloadSha256: target.payload_sha256 },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticMaterialEarthworkLaborMechanismOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: { input: { installedM3: 180, retainedReserveM3: 12, supplierLoadM3: 25 },
        orderedM3: quantity(balanced.rows, "rc09:pbb_bedding_surround"),
        loadCount: quantity(balanced.rows, "rc09:pbb-bedding-balance:load-count"),
        remainderM3: quantity(balanced.rows, "rc09:pbb-bedding-balance:remainder"),
        surplusM3: quantity(balanced.rows, "rc09:pbb-bedding-balance:surplus-beyond-reserve") },
      conditionalProfile: { visibleRowCount: conditional.rows.length, preliminaryNeedCount: 0 },
      uiAcceptance: { web: false, android: false, procurementUi: false, pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable" },
      productionAccessed: false, activationPerformed: false, deployPerformed: false,
      otaPerformed: false, storeActionPerformed: false };
    evidence.receiptSha256 = sha256(evidence); mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
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
