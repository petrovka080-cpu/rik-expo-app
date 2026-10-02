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
const CATALOG_ID = "canonical-work:expanded:septic_treatment_facility";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/septic-treatment-facility-balanced-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 септического очистного сооружения STF-RC-3C-30M3-KS20: технология THREE_CHAMBER_ANAEROBIC_SETTLING, расчётный расход 12 м³/сут, рабочий объём 30 м³, 3 камеры, 18 сборных железобетонных колец KS20.9.";
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
    const release = (await client.query(`select id::text,status,activated_at,definition_count,
      parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`,
    [current.definitionReleaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "58:42:42",
    "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_GATE");
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
      "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key
      === "septic-treatment-facility-precast-ring-project-balance-s27-24-v1",
    "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/design_flow\w*\s*\*|working_volume\w*\s*\*|chamber_count\s*\*|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_LEGACY_FORMULA");
    invariant(!/wtp_membrane|aer_diffuser|sdw_press|sewer_pipe_lm|stt_waterstop/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_ADJACENT_SCOPE");

    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const rings = /(\d+(?:[,.]\d+)?)\s+сборн\p{L}*\s+железобетонн\p{L}*\s+колец\s+([A-ZА-Я0-9][A-ZА-Я0-9._/-]*)/iu
      .exec(PROMPT);
    const ordinary = {
      stf_facility_count: number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+септическ\p{L}*\s+очистн\p{L}*\s+сооружен/iu),
      stf_facility_designation: /септическ\p{L}*\s+очистн\p{L}*\s+сооружен\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu.exec(PROMPT)?.[1],
      stf_treatment_technology: /технологи\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(PROMPT)?.[1],
      stf_design_flow_m3_day: number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
      stf_working_volume_m3: number(/рабоч\p{L}*\s+объ[её]м\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]/iu),
      stf_chamber_count: number(/(\d+(?:[,.]\d+)?)\s+камер/iu),
      stf_ring_installed_piece: rings?.[1]?.replace(",", "."),
      stf_ring_designation: rings?.[2]?.replace(/[.,;:]+$/u, ""),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        stf_facility_count: "1", stf_facility_designation: "STF-RC-3C-30M3-KS20",
        stf_treatment_technology: "THREE_CHAMBER_ANAEROBIC_SETTLING",
        stf_design_flow_m3_day: "12", stf_working_volume_m3: "30",
        stf_chamber_count: "3", stf_ring_installed_piece: "18",
        stf_ring_designation: "KS20.9",
      }), "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.stf_ring_retained_spare_piece) === 0
      && Number(confirmedParameters.stf_ring_supplier_package_quantity_piece) === 1,
    "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-septic-treatment-facility-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "stf_facility_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas,
      resourceDefinitions: resources, submittedParameters, confirmedParameters,
      currencyCode: "KGS", priceItems: [], maximumResourceRows: 45,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      stf_ring_retained_spare_piece: 1, stf_ring_supplier_package_quantity_piece: 4 });
    const conditional = await compile({
      ...completeInput,
      stf_excavation_shoring_mode: "REQUIRED",
      stf_excavation_shoring_designation: "SHEET-PILE-LIGHT",
      stf_excavation_shoring_area_m2: 320,
      stf_groundwater_dewatering_mode: "REQUIRED",
      stf_groundwater_dewatering_designation: "WELLPOINT-60M3H",
      stf_groundwater_dewatering_machine_h: 120,
      stf_effluent_dispersal_mode: "INCLUDED",
      stf_effluent_dispersal_designation: "INFILTRATION-MODULE-240",
      stf_effluent_dispersal_area_m2: 240,
    });
    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 34,
      "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_FIRST");
    invariant(complete.rows.length === 39 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_COMPLETE");
    invariant(conditional.rows.length === 42 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:stf_rings") === "20"
      && quantity(balanced.rows, "rc09:stf-ring-balance:package-count") === "5"
      && quantity(balanced.rows, "rc09:stf-ring-balance:remainder") === "2"
      && quantity(balanced.rows, "rc09:stf-ring-balance:surplus-beyond-spare") === "1",
    "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /КОС|аэротенк|осад|сет|автомат|цен/iu.test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_SEPTIC_TREATMENT_FACILITY_READBACK_SEARCH");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.septic-treatment-facility-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_SEPTIC_TREATMENT_FACILITY_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "42/42 GREEN",
        legacyGenericCoefficientFormulaCount: 0, adjacentTemplateResourceCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticMaterialLaborMechanismLogisticsOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: {
        input: { installedPiece: 18, retainedSparePiece: 1, supplierPackageQuantityPiece: 4 },
        orderedPiece: quantity(balanced.rows, "rc09:stf_rings"),
        packageCount: quantity(balanced.rows, "rc09:stf-ring-balance:package-count"),
        remainderPiece: quantity(balanced.rows, "rc09:stf-ring-balance:remainder"),
        surplusPiece: quantity(balanced.rows, "rc09:stf-ring-balance:surplus-beyond-spare"),
      },
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
