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
const CATALOG_ID = "canonical-work:expanded:hydraulic_testing";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(".release-runtime/r568/s27-24/hydraulic-testing-balanced-current/independent-acceptance.json");
const PROMPT = "Гидравлическое испытание 1200 м напорного канализационного трубопровода: PE100 SDR17, наружный диаметр 250 мм, PN10, 4 изолированных испытательных участка, 8 временных заглушек PE250-PN10-TEST-CAP, испытательное давление 1,0 МПа, выдержка 120 мин, процедура HT-PE250-PN10-4S-1.0MPA-120MIN.";
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
      "STOP_S27_24_HYDRAULIC_TESTING_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "45:31:31", "STOP_S27_24_HYDRAULIC_TESTING_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_HYDRAULIC_TESTING_READBACK_GATE");
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
    invariant(baseline && search && locator, "STOP_S27_24_HYDRAULIC_TESTING_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_HYDRAULIC_TESTING_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "hydraulic-testing-project-balance-s27-24-v1",
      "STOP_S27_24_HYDRAULIC_TESTING_READBACK_LOCATOR");
    invariant(formulas.every((formula) => !/tested_length_m\s*\*|route_length_m\s*\*|ceil\(route_length|golden_rate|normFactor/iu
      .test(String(formula.expression_source))),
    "STOP_S27_24_HYDRAULIC_TESTING_READBACK_LEGACY_FORMULA");
    invariant(!/sewer_pipe_lm|inspection_manhole|rc09:pbb_|rc09:mnh_/iu.test(JSON.stringify(resources)),
      "STOP_S27_24_HYDRAULIC_TESTING_READBACK_NETWORK_TEMPLATE_SCOPE");
    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const token = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(/[.,;:]+$/u, "");
    const closures = /(\d+(?:[,.]\d+)?)\s+временн\p{L}*\s+заглуш\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(PROMPT);
    const ordinary = {
      hyd_tested_length_m: number(/гидравлическ\p{L}*\s+испытан\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м\s+напорн\p{L}*\s+канализационн\p{L}*\s+трубопровод/iu),
      hyd_pipe_material: token(/\b(PE\s*100)\b/iu)?.replace(/\s+/gu, "").toUpperCase(),
      hyd_pipe_sdr: token(/\b(SDR\s*\d+(?:[,.]\d+)?)\b/iu)?.replace(/\s+/gu, "").replace(",", ".").toUpperCase(),
      hyd_pipe_outside_diameter_mm: number(/наружн\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
      hyd_pressure_class: token(/\b(PN\s*\d+(?:[,.]\d+)?)\b/iu)?.replace(/\s+/gu, "").replace(",", ".").toUpperCase(),
      hyd_test_section_count: number(/(\d+(?:[,.]\d+)?)\s+изолированн\p{L}*\s+испытательн\p{L}*\s+участ/iu),
      hyd_temporary_closure_installed_piece: closures?.[1]?.replace(",", "."),
      hyd_closure_designation: closures?.[2]?.replace(/[.,;:]+$/u, ""),
      hyd_test_pressure_mpa: number(/испытательн\p{L}*\s+давлен\p{L}*\s+(\d+(?:[,.]\d+)?)\s*МПа/iu),
      hyd_hold_duration_min: number(/выдержк\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мин/iu),
      hyd_procedure_designation: token(/процедур\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({ hyd_tested_length_m: "1200",
        hyd_pipe_material: "PE100", hyd_pipe_sdr: "SDR17", hyd_pipe_outside_diameter_mm: "250",
        hyd_pressure_class: "PN10", hyd_test_section_count: "4",
        hyd_temporary_closure_installed_piece: "8", hyd_closure_designation: "PE250-PN10-TEST-CAP",
        hyd_test_pressure_mpa: "1.0", hyd_hold_duration_min: "120",
        hyd_procedure_designation: "HT-PE250-PN10-4S-1.0MPA-120MIN" }),
    "STOP_S27_24_HYDRAULIC_TESTING_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.hyd_closure_retained_spare_piece) === 0
      && Number(confirmedParameters.hyd_closure_supplier_package_quantity_piece) === 1,
    "STOP_S27_24_HYDRAULIC_TESTING_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({ operation: "compile",
      compilerVersion: "s27-24-hydraulic-testing-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "hyd_tested_length_m",
      parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
      submittedParameters, confirmedParameters, currencyCode: "KGS", priceItems: [],
      maximumResourceRows: 40, hashJson: async (value) => estimateDeterministicHash(value) });
    const first = await compile(ordinary); const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      hyd_closure_retained_spare_piece: 2, hyd_closure_supplier_package_quantity_piece: 4 });
    const conditional = await compile({ ...completeInput,
      hyd_imported_water_mode: "REQUIRED", hyd_imported_water_designation: "TANKER-POTABLE",
      hyd_imported_water_volume_m3: 75,
      hyd_water_treatment_mode: "REQUIRED", hyd_water_treatment_designation: "NEUTRALIZATION-PACK",
      hyd_water_treatment_volume_m3: 75,
      hyd_offsite_disposal_mode: "REQUIRED", hyd_offsite_disposal_designation: "LICENSED-WATER-FACILITY",
      hyd_offsite_disposal_volume_m3: 75 });
    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 23,
      "STOP_S27_24_HYDRAULIC_TESTING_READBACK_FIRST");
    invariant(complete.rows.length === 28 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_HYDRAULIC_TESTING_READBACK_COMPLETE");
    invariant(conditional.rows.length === 31 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_HYDRAULIC_TESTING_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:hyd_closures") === "12"
      && quantity(balanced.rows, "rc09:hyd-closure-balance:package-count") === "3"
      && quantity(balanced.rows, "rc09:hyd-closure-balance:remainder") === "4"
      && quantity(balanced.rows, "rc09:hyd-closure-balance:surplus-beyond-spare") === "2",
    "STOP_S27_24_HYDRAULIC_TESTING_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_HYDRAULIC_TESTING_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id && search.selectable === true
      && search.status === "draft" && /труб|пусконалад|автомат|цен/iu.test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_HYDRAULIC_TESTING_READBACK_SEARCH");
    const evidence: Json = { schemaVersion: "rik-expo-app.s27-24.hydraulic-testing-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_HYDRAULIC_TESTING_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: { catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "31/31 GREEN", legacyGenericCoefficientFormulaCount: 0,
        networkTemplateResourceCount: 0, normativeLocator: locator, payloadSha256: target.payload_sha256 },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticWaterLaborMechanismLogisticsOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: { input: { installedPiece: 8, retainedSparePiece: 2,
        supplierPackageQuantityPiece: 4 },
        orderedPiece: quantity(balanced.rows, "rc09:hyd_closures"),
        packageCount: quantity(balanced.rows, "rc09:hyd-closure-balance:package-count"),
        remainderPiece: quantity(balanced.rows, "rc09:hyd-closure-balance:remainder"),
        surplusPiece: quantity(balanced.rows, "rc09:hyd-closure-balance:surplus-beyond-spare") },
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
