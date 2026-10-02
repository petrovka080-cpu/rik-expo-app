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
const CATALOG_ID = "canonical-work:expanded:low_voltage_system";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(".release-runtime/r568/s27-24/low-voltage-system-balanced-current/independent-acceptance.json");
const PROMPT = "Монтаж 1 системы СКС: 48 информационных розеток модели JACK-RJ45-CAT6, категория Cat6 LSZH, 2 патч-панели модели PP-24-CAT6.";
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
      "STOP_S27_24_LOW_VOLTAGE_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "47:33:33", "STOP_S27_24_LOW_VOLTAGE_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_LOW_VOLTAGE_READBACK_GATE");
    const [pr, fr, rr, br, sr, lr] = await Promise.all([
      client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
      client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id]),
      client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
      client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id]),
      client.query(`select d.definition_version_id::text,d.selectable,d.excluded_boundaries,r.status
        from public.estimate_search_document d join public.estimate_search_index_release r on r.id=d.search_release_id
        where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, CATALOG_ID]),
      client.query(`select l.locator_key,l.excerpt_sha256 from public.estimate_work_normative_binding b
        join public.estimate_normative_locator l on l.id=b.locator_id where b.definition_version_id=$1`, [target.definition_version_id]),
    ]);
    const parameters = pr.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = fr.rows as CanonicalEstimateFormulaDefinition[];
    const resources = rr.rows as CanonicalEstimateResourceDefinition[];
    const baseline = br.rows[0] as Json; const search = sr.rows[0] as Json; const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator, "STOP_S27_24_LOW_VOLTAGE_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_LOW_VOLTAGE_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "low-voltage-system-project-balance-s27-24-v1",
      "STOP_S27_24_LOW_VOLTAGE_READBACK_LOCATOR");
    invariant(formulas.every((f) => !/area_m2|\b432\b|electricalNetworkCalculator/iu
      .test(String(f.expression_source))), "STOP_S27_24_LOW_VOLTAGE_READBACK_LEGACY_FORMULA");
    const system = /(\d+)\s+систем\p{L}*\s+СКС(?!\p{L})/iu.exec(PROMPT)?.[1];
    const outlet = /(\d+)\s+информационн\p{L}*\s+розет\p{L}*\s+модел\p{L}*\s*([A-Z0-9._/-]+)/iu.exec(PROMPT);
    const category = /категори\p{L}*\s+Cat\.?\s*6\s+LSZH/iu.test(PROMPT) ? "CAT6_LSZH" : undefined;
    const panel = /(\d+)\s+патч[-\s]?панел\p{L}*\s+модел\p{L}*\s*([A-Z0-9._/-]+)/iu.exec(PROMPT);
    invariant(system && outlet && category && panel, "STOP_S27_24_LOW_VOLTAGE_READBACK_IDENTITY");
    const ordinary = { lvs_system_count: system, lvs_information_outlet_count: outlet[1],
      lvs_outlet_designation: outlet[2].replace(/[.,;:]+$/u, ""),
      lvs_copper_cable_category: category, lvs_patch_panel_count: panel[1],
      lvs_patch_panel_designation: panel[2].replace(/[.,;:]+$/u, "") };
    invariant(JSON.stringify(ordinary) === JSON.stringify({ lvs_system_count: "1",
      lvs_information_outlet_count: "48", lvs_outlet_designation: "JACK-RJ45-CAT6",
      lvs_copper_cable_category: "CAT6_LSZH", lvs_patch_panel_count: "2",
      lvs_patch_panel_designation: "PP-24-CAT6" }), "STOP_S27_24_LOW_VOLTAGE_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.lvs_outlet_retained_spare_piece) === 0
      && Number(confirmedParameters.lvs_outlet_supplier_pack_size_piece) === 1,
    "STOP_S27_24_LOW_VOLTAGE_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({ operation: "compile",
      compilerVersion: "s27-24-low-voltage-independent-db-readback-v1", catalogId: CATALOG_ID,
      primaryMeasureParameterId: "lvs_system_count", parameterDefinitions: parameters,
      formulaDefinitions: formulas, resourceDefinitions: resources, submittedParameters,
      confirmedParameters, currencyCode: "KGS", priceItems: [], maximumResourceRows: 40,
      hashJson: async (value) => estimateDeterministicHash(value) });
    const first = await compile(ordinary); const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput, lvs_outlet_retained_spare_piece: 4,
      lvs_outlet_supplier_pack_size_piece: 25 });
    const conditional = await compile({ ...completeInput, lvs_fiber_backbone_mode: "REQUIRED",
      lvs_fiber_cable_designation: "FO SM G.652D по проекту", lvs_fiber_cable_length_m: 300,
      lvs_fiber_termination_designation: "LC/UPC по схеме", lvs_fiber_termination_quantity_piece: 24,
      lvs_active_uplink_mode: "REQUIRED", lvs_active_uplink_designation: "Uplink-коммутатор по архитектуре",
      lvs_active_uplink_quantity_piece: 2 });
    invariant(first.rows.length === 11 && first.preliminaryNeeds.length === 22,
      "STOP_S27_24_LOW_VOLTAGE_READBACK_FIRST");
    invariant(complete.rows.length === 30 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_LOW_VOLTAGE_READBACK_COMPLETE");
    invariant(conditional.rows.length === 33 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_LOW_VOLTAGE_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:lvs_information_outlet") === "75"
      && quantity(balanced.rows, "rc09:lvs-outlet-balance:package-count") === "3"
      && quantity(balanced.rows, "rc09:lvs-outlet-balance:remainder") === "27"
      && quantity(balanced.rows, "rc09:lvs-outlet-balance:surplus-beyond-spare") === "23",
    "STOP_S27_24_LOW_VOLTAGE_READBACK_BALANCE");
    invariant(complete.rows.filter((r) => r.row_id.includes(":labor:")).length === 3
      && complete.rows.filter((r) => r.row_id.includes(":equipment:")).length === 2
      && complete.rows.filter((r) => r.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_LOW_VOLTAGE_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id && search.selectable === true
      && search.status === "draft" && /шкаф|CCTV|СКУД|пожарн|силов|площад|432/iu
        .test(JSON.stringify(search.excluded_boundaries)), "STOP_S27_24_LOW_VOLTAGE_READBACK_SEARCH");
    const evidence: Json = { schemaVersion: "rik-expo-app.s27-24.low-voltage-system-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_LOW_VOLTAGE_SYSTEM_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: { catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version), definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "33/33 GREEN", legacyAreaAndStatic432FormulaCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256 },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticCableContainmentFiberOrActiveSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: { input: { installedPiece: 48, retainedSparePiece: 4, packageSizePiece: 25 },
        orderedPiece: quantity(balanced.rows, "rc09:lvs_information_outlet"),
        packageCount: quantity(balanced.rows, "rc09:lvs-outlet-balance:package-count"),
        remainderPiece: quantity(balanced.rows, "rc09:lvs-outlet-balance:remainder"),
        surplusPiece: quantity(balanced.rows, "rc09:lvs-outlet-balance:surplus-beyond-spare") },
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
