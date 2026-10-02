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
const CATALOG_ID = "canonical-work:expanded:outfall_structure";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(".release-runtime/r568/s27-24/outfall-structure-balanced-current/independent-acceptance.json");
const PROMPT = "Строительство 1 выпускного сооружения: монолитный железобетонный оголовок на берегу реки, выпуск DN 600 мм, расчётный расход 450 л/с, габариты 4,5×3,2×2,4 м, бетон C30/37 W8 F200, марка OF-RC-DN600-Q450-C3037, проектный объём конструкционного бетона 28 м³.";
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
      "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "55:36:36", "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_GATE");
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
    invariant(baseline && search && locator, "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "outfall-structure-project-balance-s27-24-v1",
      "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_LOCATOR");
    invariant(formulas.every((formula) => !/structure_count\s*\*|structure_(?:length|width|height)_m\s*\*|golden_rate|normFactor/iu
      .test(String(formula.expression_source))),
    "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_LEGACY_FORMULA");
    invariant(!/sewer_pipe_lm|inspection_manhole|hydraulic_testing_lm|rc09:pbb_|rc09:hyd_/iu
      .test(JSON.stringify(resources)), "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_NETWORK_TEMPLATE_SCOPE");
    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const token = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(/[.,;:]+$/u, "");
    const dimensions = /габарит\p{L}*\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu.exec(PROMPT);
    const ordinary = {
      out_structure_count: number(/(\d+(?:[,.]\d+)?)\s+выпускн\p{L}*\s+сооружен/iu),
      out_structure_type: /монолитн\p{L}*\s+железобетонн\p{L}*\s+(?:выпускн\p{L}*\s+)?оголов/iu.test(PROMPT)
        ? "CAST_IN_PLACE_RC_HEADWALL" : undefined,
      out_structure_designation: token(/марка\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu),
      out_receiving_environment: /берег\p{L}*\s+рек/iu.test(PROMPT) ? "RIVER_BANK" : undefined,
      out_outlet_pipe_diameter_mm: number(/выпуск\p{L}*\s+DN\s*(\d+(?:[,.]\d+)?)\s*мм/iu),
      out_design_discharge_lps: number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*л\/с/iu),
      out_structure_length_m: dimensions?.[1]?.replace(",", "."),
      out_structure_width_m: dimensions?.[2]?.replace(",", "."),
      out_structure_height_m: dimensions?.[3]?.replace(",", "."),
      out_concrete_class: token(/бетон\p{L}*\s+(C\s*\d+\s*\/\s*\d+)/iu)?.replace(/\s+/gu, "").toUpperCase(),
      out_watertightness_class: token(/\b(W\s*\d+)\b/iu)?.replace(/\s+/gu, "").toUpperCase(),
      out_frost_resistance_class: token(/\b(F\s*\d+)\b/iu)?.replace(/\s+/gu, "").toUpperCase(),
      out_structural_concrete_installed_volume_m3: number(/проектн\p{L}*\s+объ[её]м\p{L}*\s+конструкционн\p{L}*\s+бетон\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]/iu),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({ out_structure_count: "1",
        out_structure_type: "CAST_IN_PLACE_RC_HEADWALL",
        out_structure_designation: "OF-RC-DN600-Q450-C3037",
        out_receiving_environment: "RIVER_BANK", out_outlet_pipe_diameter_mm: "600",
        out_design_discharge_lps: "450", out_structure_length_m: "4.5",
        out_structure_width_m: "3.2", out_structure_height_m: "2.4",
        out_concrete_class: "C30/37", out_watertightness_class: "W8",
        out_frost_resistance_class: "F200", out_structural_concrete_installed_volume_m3: "28" }),
    "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.out_concrete_process_allowance_m3) === 0
      && Number(confirmedParameters.out_concrete_supplier_batch_m3) === 1,
    "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({ operation: "compile",
      compilerVersion: "s27-24-outfall-structure-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "out_structure_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
      submittedParameters, confirmedParameters, currencyCode: "KGS", priceItems: [],
      maximumResourceRows: 40, hashJson: async (value) => estimateDeterministicHash(value) });
    const first = await compile(ordinary); const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      out_concrete_process_allowance_m3: 1.5, out_concrete_supplier_batch_m3: 8 });
    const conditional = await compile({ ...completeInput,
      out_dewatering_mode: "REQUIRED", out_dewatering_designation: "SUMP-PUMP-80",
      out_dewatering_machine_h: 96,
      out_bank_protection_mode: "REQUIRED", out_bank_protection_designation: "GABION-MAT-300",
      out_bank_protection_area_m2: 180,
      out_live_tie_in_mode: "REQUIRED", out_live_tie_in_designation: "LIVE-TIE-IN-DN600",
      out_live_tie_in_count: 1 });
    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 28,
      "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_FIRST");
    invariant(complete.rows.length === 33 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_COMPLETE");
    invariant(conditional.rows.length === 36 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:out_structural_concrete") === "32"
      && quantity(balanced.rows, "rc09:out-concrete-balance:batch-count") === "4"
      && quantity(balanced.rows, "rc09:out-concrete-balance:remainder") === "4"
      && quantity(balanced.rows, "rc09:out-concrete-balance:surplus-beyond-allowance") === "2.5",
    "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id && search.selectable === true
      && search.status === "draft" && /труб|колод|испытан|оборуд|автомат|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_OUTFALL_STRUCTURE_READBACK_SEARCH");
    const evidence: Json = { schemaVersion: "rik-expo-app.s27-24.outfall-structure-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_OUTFALL_STRUCTURE_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: { catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "36/36 GREEN", legacyGenericCoefficientFormulaCount: 0,
        networkTemplateResourceCount: 0, normativeLocator: locator, payloadSha256: target.payload_sha256 },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticMaterialEarthworkLaborMechanismLogisticsOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: { input: { installedM3: 28, processAllowanceM3: 1.5,
        supplierBatchM3: 8 }, orderedM3: quantity(balanced.rows, "rc09:out_structural_concrete"),
        batchCount: quantity(balanced.rows, "rc09:out-concrete-balance:batch-count"),
        remainderM3: quantity(balanced.rows, "rc09:out-concrete-balance:remainder"),
        surplusM3: quantity(balanced.rows, "rc09:out-concrete-balance:surplus-beyond-allowance") },
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
