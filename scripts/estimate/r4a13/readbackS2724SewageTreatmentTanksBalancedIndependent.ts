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
const CATALOG_ID = "canonical-work:expanded:sewage_treatment_tanks";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/sewage-treatment-tanks-balanced-current/independent-acceptance.json",
);
const PROMPT = "Строительство 2 резервуаров очистных сооружений STT-RC-2X18X8X5-WT: монолитные железобетонные прямоугольные резервуары, назначение — усреднение и первичное отстаивание, размер каждого 18×8 м, рабочая глубина жидкости 5 м, 260 м гидрошпонки PVC-P-320.";
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
      "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "57:41:41",
    "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_GATE");
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
      "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key
      === "sewage-treatment-tanks-rc-waterstop-project-balance-s27-24-v1",
    "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/tank_(?:length|width)\w*\s*\*|operating_liquid_depth\w*\s*\*|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_LEGACY_FORMULA");
    invariant(!/wtp_membrane|aer_diffuser|sdw_press|septic|sewer_pipe_lm/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_ADJACENT_SCOPE");

    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const dimensions = /размер\p{L}*\s+кажд\p{L}*\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu
      .exec(PROMPT);
    const waterstop = /(\d+(?:[,.]\d+)?)\s*м\s+гидрошпонк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const ordinary = {
      stt_tank_count: number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+резервуар\p{L}*\s+очистн\p{L}*\s+сооружен/iu),
      stt_tank_designation: /резервуар\p{L}*\s+очистн\p{L}*\s+сооружен\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu.exec(PROMPT)?.[1],
      stt_tank_type: /монолитн\p{L}*\s+железобетонн\p{L}*\s+прямоугольн\p{L}*\s+резервуар/iu.test(PROMPT)
        ? "CAST_IN_PLACE_RC_RECTANGULAR" : undefined,
      stt_process_duty: /усреднен\p{L}*\s+и\s+первичн\p{L}*\s+отстаив/iu.test(PROMPT)
        ? "EQUALIZATION_AND_PRIMARY_SETTLEMENT" : undefined,
      stt_tank_length_m: dimensions?.[1]?.replace(",", "."),
      stt_tank_width_m: dimensions?.[2]?.replace(",", "."),
      stt_operating_liquid_depth_m: number(/рабоч\p{L}*\s+глубин\p{L}*\s+жидкост\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м/iu),
      stt_waterstop_installed_m: waterstop?.[1]?.replace(",", "."),
      stt_waterstop_designation: waterstop?.[2]?.replace(/[.,;:]+$/u, ""),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        stt_tank_count: "2", stt_tank_designation: "STT-RC-2X18X8X5-WT",
        stt_tank_type: "CAST_IN_PLACE_RC_RECTANGULAR",
        stt_process_duty: "EQUALIZATION_AND_PRIMARY_SETTLEMENT",
        stt_tank_length_m: "18", stt_tank_width_m: "8",
        stt_operating_liquid_depth_m: "5", stt_waterstop_installed_m: "260",
        stt_waterstop_designation: "PVC-P-320",
      }), "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.stt_waterstop_retained_spare_m) === 0
      && Number(confirmedParameters.stt_waterstop_supplier_coil_length_m) === 1,
    "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-sewage-treatment-tanks-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "stt_tank_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas,
      resourceDefinitions: resources, submittedParameters, confirmedParameters,
      currencyCode: "KGS", priceItems: [], maximumResourceRows: 45,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      stt_waterstop_retained_spare_m: 10, stt_waterstop_supplier_coil_length_m: 25 });
    const conditional = await compile({
      ...completeInput,
      stt_excavation_shoring_mode: "REQUIRED",
      stt_excavation_shoring_designation: "SHEET-PILE-AZ18",
      stt_excavation_shoring_area_m2: 850,
      stt_groundwater_dewatering_mode: "REQUIRED",
      stt_groundwater_dewatering_designation: "WELLPOINT-120M3H",
      stt_groundwater_dewatering_machine_h: 220,
      stt_odor_cover_mode: "INCLUDED", stt_odor_cover_designation: "FRP-ODOR-COVER",
      stt_odor_cover_area_m2: 288,
    });
    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 33,
      "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_FIRST");
    invariant(complete.rows.length === 38 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_COMPLETE");
    invariant(conditional.rows.length === 41 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:stt_waterstop") === "275"
      && quantity(balanced.rows, "rc09:stt-waterstop-balance:package-count") === "11"
      && quantity(balanced.rows, "rc09:stt-waterstop-balance:remainder") === "15"
      && quantity(balanced.rows, "rc09:stt-waterstop-balance:surplus-beyond-spare") === "5",
    "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /КОС|оборудован|септик|сет|автомат|цен/iu.test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_SEWAGE_TREATMENT_TANKS_READBACK_SEARCH");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.sewage-treatment-tanks-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_SEWAGE_TREATMENT_TANKS_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "41/41 GREEN",
        legacyGenericCoefficientFormulaCount: 0, adjacentTemplateResourceCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticMaterialLaborMechanismLogisticsOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: {
        input: { installedM: 260, retainedSpareM: 10, supplierCoilLengthM: 25 },
        orderedM: quantity(balanced.rows, "rc09:stt_waterstop"),
        coilCount: quantity(balanced.rows, "rc09:stt-waterstop-balance:package-count"),
        remainderM: quantity(balanced.rows, "rc09:stt-waterstop-balance:remainder"),
        surplusM: quantity(balanced.rows, "rc09:stt-waterstop-balance:surplus-beyond-spare"),
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
