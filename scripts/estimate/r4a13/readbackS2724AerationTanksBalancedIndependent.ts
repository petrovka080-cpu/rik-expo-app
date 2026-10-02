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
const CATALOG_ID = "canonical-work:expanded:aeration_tanks";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(".release-runtime/r568/s27-24/aeration-tanks-balanced-current/independent-acceptance.json");
const PROMPT = "Строительство 2 аэротенков AT-RC-2X30X8X5-FB: монолитные железобетонные прямоугольные бассейны, 2 технологические линии, размер каждого 30×8 м, рабочая глубина воды 5 м, мелкопузырчатая аэрация активного ила, расчётный расход воздуха 9000 Нм³/ч, 240 аэрационных диффузоров EPDM-FB-9IN.";
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
      "STOP_S27_24_AERATION_TANKS_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "61:39:39", "STOP_S27_24_AERATION_TANKS_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_AERATION_TANKS_READBACK_GATE");
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
    invariant(baseline && search && locator, "STOP_S27_24_AERATION_TANKS_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_AERATION_TANKS_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "aeration-tanks-fine-bubble-project-balance-s27-24-v1",
      "STOP_S27_24_AERATION_TANKS_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/tank_(?:length|width)\w*\s*\*|process_train_count\s*\*|design_air_flow\w*\s*\*|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_24_AERATION_TANKS_READBACK_LEGACY_FORMULA");
    invariant(!/wtp_membrane|wtp_uv|sludge_dewatering|sewer_pipe_lm|rc09:wtp_/iu
      .test(JSON.stringify(resources)), "STOP_S27_24_AERATION_TANKS_READBACK_ADJACENT_SCOPE");
    const number = (text: string, pattern: RegExp) => pattern.exec(text)?.[1]?.replace(",", ".");
    const dimensions = /размер\p{L}*\s+кажд\p{L}*\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu.exec(PROMPT);
    const diffusers = /(\d+(?:[,.]\d+)?)\s+аэрационн\p{L}*\s+диффузор\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(PROMPT);
    const ordinary = {
      aer_tank_count: number(PROMPT, /(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+аэротенк/iu),
      aer_tank_designation: /аэротенк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu.exec(PROMPT)?.[1],
      aer_tank_type: /монолитн\p{L}*\s+железобетонн\p{L}*\s+прямоугольн\p{L}*\s+бассейн/iu.test(PROMPT)
        ? "CAST_IN_PLACE_RC_RECTANGULAR" : undefined,
      aer_process_duty: /мелкопузырчат\p{L}*\s+аэраци\p{L}*\s+активн\p{L}*\s+ил/iu.test(PROMPT)
        ? "ACTIVATED_SLUDGE_FINE_BUBBLE_AERATION" : undefined,
      aer_process_train_count: number(PROMPT, /(\d+(?:[,.]\d+)?)\s+технологическ\p{L}*\s+лини/iu),
      aer_tank_length_m: dimensions?.[1]?.replace(",", "."),
      aer_tank_width_m: dimensions?.[2]?.replace(",", "."),
      aer_operating_water_depth_m: number(PROMPT,
        /рабоч\p{L}*\s+глубин\p{L}*\s+вод\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
      aer_design_air_flow_nm3_h: number(PROMPT,
        /расч[её]тн\p{L}*\s+расход\p{L}*\s+воздух\p{L}*\s+(\d+(?:[,.]\d+)?)\s*Нм[³3]\s*\/\s*ч/iu),
      aer_diffuser_installed_piece: diffusers?.[1]?.replace(",", "."),
      aer_diffuser_designation: diffusers?.[2]?.replace(/[.,;:]+$/u, ""),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({ aer_tank_count: "2",
        aer_tank_designation: "AT-RC-2X30X8X5-FB", aer_tank_type: "CAST_IN_PLACE_RC_RECTANGULAR",
        aer_process_duty: "ACTIVATED_SLUDGE_FINE_BUBBLE_AERATION",
        aer_process_train_count: "2", aer_tank_length_m: "30", aer_tank_width_m: "8",
        aer_operating_water_depth_m: "5", aer_design_air_flow_nm3_h: "9000",
        aer_diffuser_installed_piece: "240", aer_diffuser_designation: "EPDM-FB-9IN" }),
    "STOP_S27_24_AERATION_TANKS_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.aer_diffuser_retained_spare_piece) === 0
      && Number(confirmedParameters.aer_diffuser_supplier_package_quantity_piece) === 1,
    "STOP_S27_24_AERATION_TANKS_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({ operation: "compile",
      compilerVersion: "s27-24-aeration-tanks-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "aer_tank_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
      submittedParameters, confirmedParameters, currencyCode: "KGS", priceItems: [],
      maximumResourceRows: 45, hashJson: async (value) => estimateDeterministicHash(value) });
    const first = await compile(ordinary); const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      aer_diffuser_retained_spare_piece: 10, aer_diffuser_supplier_package_quantity_piece: 20 });
    const conditional = await compile({ ...completeInput,
      aer_blower_mode: "INCLUDED", aer_blower_designation: "BLOWER-75KW-VFD",
      aer_blower_quantity_piece: 3,
      aer_mixer_mode: "INCLUDED", aer_mixer_designation: "MIXER-7.5KW",
      aer_mixer_quantity_piece: 4,
      aer_recycle_pump_mode: "INCLUDED", aer_recycle_pump_designation: "RECYCLE-Q80-H8",
      aer_recycle_pump_quantity_piece: 3,
      aer_draining_bypass_mode: "REQUIRED", aer_draining_bypass_designation: "BYPASS-Q100",
      aer_draining_bypass_machine_h: 96,
      aer_odor_control_mode: "REQUIRED", aer_odor_control_designation: "BIOFILTER-8000M3H",
      aer_odor_control_quantity_set: 1 });
    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 31,
      "STOP_S27_24_AERATION_TANKS_READBACK_FIRST");
    invariant(complete.rows.length === 34 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_AERATION_TANKS_READBACK_COMPLETE");
    invariant(conditional.rows.length === 39 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_AERATION_TANKS_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:aer_diffusers") === "260"
      && quantity(balanced.rows, "rc09:aer-diffuser-balance:package-count") === "13"
      && quantity(balanced.rows, "rc09:aer-diffuser-balance:remainder") === "20"
      && quantity(balanced.rows, "rc09:aer-diffuser-balance:surplus-beyond-spare") === "10",
    "STOP_S27_24_AERATION_TANKS_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_AERATION_TANKS_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id && search.selectable === true
      && search.status === "draft" && /очист|MBR|осад|сет|автомат|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_AERATION_TANKS_READBACK_SEARCH");
    const evidence: Json = { schemaVersion: "rik-expo-app.s27-24.aeration-tanks-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_AERATION_TANKS_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: { catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "39/39 GREEN", legacyGenericCoefficientFormulaCount: 0,
        adjacentTemplateResourceCount: 0, normativeLocator: locator,
        payloadSha256: target.payload_sha256 },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticCivilEquipmentLaborMechanismLogisticsOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: { input: { installedPiece: 240, retainedSparePiece: 10,
        supplierPackageQuantityPiece: 20 }, orderedPiece: quantity(balanced.rows, "rc09:aer_diffusers"),
        packageCount: quantity(balanced.rows, "rc09:aer-diffuser-balance:package-count"),
        remainderPiece: quantity(balanced.rows, "rc09:aer-diffuser-balance:remainder"),
        surplusPiece: quantity(balanced.rows, "rc09:aer-diffuser-balance:surplus-beyond-spare") },
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
