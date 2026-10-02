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
const CATALOG_ID = "canonical-work:expanded:wastewater_treatment_plant";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/wastewater-treatment-plant-balanced-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 комплекса очистных сооружений WWTP-MBR-1000-2T: технология SCREEN_GRIT_ANOXIC_AEROBIC_MBR_UV, 2 технологические линии, расчётный расход 1000 м³/сут, пиковый расход 1500 м³/сут, вход: БПК5 250 мг/л, взвешенные вещества 300 мг/л, общий азот 45 мг/л; выход: БПК5 10 мг/л, взвешенные вещества 10 мг/л, общий азот 10 мг/л; 8 мембранных кассет MBR-CASSETTE-50M3H.";

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
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId]))
      .rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "73:46:46",
    "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_GATE");
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
      "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "wastewater-treatment-plant-mbr-project-balance-s27-24-v1",
      "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/(?:design|peak)_flow\w*\s*\*|process_train_count\s*\*|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_LEGACY_FORMULA");
    invariant(!/sewer_pipe_lm|sewer_pumping_station|sludge_dewatering|rc09:sps_/iu
      .test(JSON.stringify(resources)),
    "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_ADJACENT_SCOPE");

    const number = (text: string, pattern: RegExp) =>
      pattern.exec(text)?.[1]?.replace(",", ".");
    const token = (text: string, pattern: RegExp) =>
      pattern.exec(text)?.[1]?.replace(/[.,;:]+$/u, "");
    const influent = /вход\s*:\s*([^;]+)/iu.exec(PROMPT)?.[1] ?? "";
    const effluent = /выход\s*:\s*([^;]+)/iu.exec(PROMPT)?.[1] ?? "";
    const membranes = /(\d+(?:[,.]\d+)?)\s+мембранн\p{L}*\s+кассет\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const ordinary = {
      wtp_plant_count: number(PROMPT,
        /(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+(?:комплекс\p{L}*\s+)?очистн\p{L}*\s+сооружен/iu),
      wtp_plant_designation: token(PROMPT,
        /очистн\p{L}*\s+сооружен\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu),
      wtp_process_technology: token(PROMPT, /технологи\p{L}*\s+([A-Z][A-Z0-9_]*)/iu),
      wtp_design_flow_m3_day: number(PROMPT,
        /расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
      wtp_peak_flow_m3_day: number(PROMPT,
        /пиков\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
      wtp_process_train_count: number(PROMPT,
        /(\d+(?:[,.]\d+)?)\s+технологическ\p{L}*\s+лини/iu),
      wtp_influent_bod5_mg_l: number(influent,
        /БПК\s*5\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu),
      wtp_influent_tss_mg_l: number(influent,
        /взвешенн\p{L}*\s+веществ\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu),
      wtp_influent_tn_mg_l: number(influent,
        /общ\p{L}*\s+азот\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu),
      wtp_effluent_bod5_mg_l: number(effluent,
        /БПК\s*5\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu),
      wtp_effluent_tss_mg_l: number(effluent,
        /взвешенн\p{L}*\s+веществ\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu),
      wtp_effluent_tn_mg_l: number(effluent,
        /общ\p{L}*\s+азот\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu),
      wtp_membrane_cassette_installed_piece: membranes?.[1]?.replace(",", "."),
      wtp_membrane_cassette_designation: membranes?.[2]?.replace(/[.,;:]+$/u, ""),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        wtp_plant_count: "1", wtp_plant_designation: "WWTP-MBR-1000-2T",
        wtp_process_technology: "SCREEN_GRIT_ANOXIC_AEROBIC_MBR_UV",
        wtp_design_flow_m3_day: "1000", wtp_peak_flow_m3_day: "1500",
        wtp_process_train_count: "2", wtp_influent_bod5_mg_l: "250",
        wtp_influent_tss_mg_l: "300", wtp_influent_tn_mg_l: "45",
        wtp_effluent_bod5_mg_l: "10", wtp_effluent_tss_mg_l: "10",
        wtp_effluent_tn_mg_l: "10", wtp_membrane_cassette_installed_piece: "8",
        wtp_membrane_cassette_designation: "MBR-CASSETTE-50M3H",
      }),
    "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.wtp_membrane_cassette_retained_spare_piece) === 0
      && Number(confirmedParameters.wtp_membrane_cassette_supplier_package_quantity_piece) === 1,
    "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-wastewater-treatment-plant-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "wtp_plant_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas,
      resourceDefinitions: resources, submittedParameters, confirmedParameters,
      currencyCode: "KGS", priceItems: [], maximumResourceRows: 50,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({
      ...completeInput,
      wtp_membrane_cassette_retained_spare_piece: 2,
      wtp_membrane_cassette_supplier_package_quantity_piece: 3,
    });
    const conditional = await compile({
      ...completeInput,
      wtp_odor_control_mode: "REQUIRED",
      wtp_odor_control_designation: "BIOFILTER-ODOUR-12000M3H",
      wtp_odor_control_quantity_set: 1,
      wtp_tertiary_polishing_mode: "REQUIRED",
      wtp_tertiary_polishing_designation: "DISC-FILTER-UV-POLISH",
      wtp_tertiary_polishing_capacity_m3_day: 1000,
      wtp_standby_power_mode: "REQUIRED",
      wtp_standby_power_designation: "GENSET-800KVA-AMF",
      wtp_standby_power_quantity_set: 1,
    });
    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 38,
      "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_FIRST");
    invariant(complete.rows.length === 43 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_COMPLETE");
    invariant(conditional.rows.length === 46 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:wtp_membrane_cassettes") === "12"
      && quantity(balanced.rows, "rc09:wtp-membrane-balance:package-count") === "4"
      && quantity(balanced.rows, "rc09:wtp-membrane-balance:remainder") === "4"
      && quantity(balanced.rows, "rc09:wtp-membrane-balance:surplus-beyond-spare") === "2",
    "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /сет|КНС|здани|обезвож|автомат|цен/iu.test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_WASTEWATER_TREATMENT_PLANT_READBACK_SEARCH");
    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.wastewater-treatment-plant-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_WASTEWATER_TREATMENT_PLANT_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "46/46 GREEN",
        legacyGenericCoefficientFormulaCount: 0, adjacentTemplateResourceCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt: PROMPT, submittedParameters: ordinary,
        automaticProcessCivilLaborMechanismLogisticsOrConditionalSelectionPerformed: false,
      },
      firstEstimate: {
        visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length,
      },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: {
        input: { installedPiece: 8, retainedSparePiece: 2, supplierPackageQuantityPiece: 3 },
        orderedPiece: quantity(balanced.rows, "rc09:wtp_membrane_cassettes"),
        packageCount: quantity(balanced.rows, "rc09:wtp-membrane-balance:package-count"),
        remainderPiece: quantity(balanced.rows, "rc09:wtp-membrane-balance:remainder"),
        surplusPiece: quantity(balanced.rows, "rc09:wtp-membrane-balance:surplus-beyond-spare"),
      },
      conditionalProfile: { visibleRowCount: conditional.rows.length, preliminaryNeedCount: 0 },
      uiAcceptance: {
        web: false, android: false, procurementUi: false, pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable",
      },
      productionAccessed: false, activationPerformed: false, deployPerformed: false,
      otaPerformed: false, storeActionPerformed: false,
    };
    evidence.receiptSha256 = sha256(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({
      status: evidence.status, releaseId: release.id,
      definitionVersionId: target.definition_version_id,
      firstRows: first.rows.length, completeRows: complete.rows.length,
      receiptSha256: evidence.receiptSha256, outputPath: OUTPUT_PATH,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
