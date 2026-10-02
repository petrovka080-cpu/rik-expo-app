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
const CATALOG_ID = "canonical-work:expanded:flushing_disinfection";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-26/flushing-disinfection-automatic-current/independent-acceptance.json",
);
const PROMPT = "Промывка и дезинфекция трубопровода PE100-RC-SDR17-OD110-ID100 длиной 1000 м, внутренний диаметр 100 мм, 2 изолированных участка, гипохлорит натрия, активный хлор 50 мг/л, раствор концентрацией 12.5%, выдержка 24 ч.";

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
    const release = (await client.query(`select id::text,status,activated_at,
      definition_count,parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId]))
      .rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "63:55:55",
    "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_GATE");
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
      "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "flushing-disinfection-volume-automatic-s27-26-v1",
      "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/villageWaterSupplyCalculator|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_LEGACY_FORMULA");
    invariant(!/trench|backfill|hydrant|pressure_testing|hydro_testing|pipe_supply|chlorination_station/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_ADJACENT_SCOPE");
    const ordinaryParameters = parameters.filter((parameter) =>
      parameter.truth_metadata?.value_source_role === "USER_INPUT");
    const profileParameters = parameters.filter((parameter) =>
      parameter.truth_metadata?.value_source_role
        === "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE");
    invariant(ordinaryParameters.length === 8
      && ordinaryParameters.every((parameter) =>
        parameter.required === true
        && parameter.truth_metadata?.preliminary_compilation_allowed === false
        && (parameter.truth_metadata?.guide as Json | undefined)
          ?.guide_validation_policy === "MANDATORY_BLOCK")
      && profileParameters.length === 51
      && profileParameters.every((parameter) =>
        parameter.truth_metadata?.preliminary_compilation_allowed === true
        && (parameter.truth_metadata?.guide as Json | undefined)?.guide_validation_policy
          === "ADVISORY_REASON_REQUIRED"),
    "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_PRIMARY_FACT_POLICY");

    const identifier = "([A-Z0-9](?:[A-Z0-9._/-]*[A-Z0-9])?)";
    const ordinary = {
      fld_pipeline_length_m: /длин\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м/iu
        .exec(PROMPT)?.[1]?.replace(",", "."),
      fld_pipeline_internal_diameter_mm: /внутренн\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu
        .exec(PROMPT)?.[1]?.replace(",", "."),
      fld_pipeline_designation: new RegExp(
        `трубопровод\\p{L}*\\s+${identifier}\\s+длин`, "iu",
      ).exec(PROMPT)?.[1],
      fld_isolated_section_count: /(\d+)\s+изолированн\p{L}*\s+участ/iu.exec(PROMPT)?.[1],
      fld_disinfectant_technology: /гипохлорит\p{L}*\s+натри\p{L}*/iu.test(PROMPT)
        ? "SODIUM_HYPOCHLORITE" : undefined,
      fld_target_active_chlorine_mg_l: /активн\p{L}*\s+хлор\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu
        .exec(PROMPT)?.[1]?.replace(",", "."),
      fld_solution_concentration_percent: /концентрац\p{L}*\s+(\d+(?:[,.]\d+)?)\s*%/iu
        .exec(PROMPT)?.[1]?.replace(",", "."),
      fld_contact_time_hour: /выдержк\p{L}*\s+(\d+(?:[,.]\d+)?)\s*ч/iu
        .exec(PROMPT)?.[1]?.replace(",", "."),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        fld_pipeline_length_m: "1000",
        fld_pipeline_internal_diameter_mm: "100",
        fld_pipeline_designation: "PE100-RC-SDR17-OD110-ID100",
        fld_isolated_section_count: "2",
        fld_disinfectant_technology: "SODIUM_HYPOCHLORITE",
        fld_target_active_chlorine_mg_l: "50",
        fld_solution_concentration_percent: "12.5",
        fld_contact_time_hour: "24",
      }),
    "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.fld_flushing_turnovers) === 2
      && Number(confirmedParameters.fld_reagent_supplier_package_kg) === 30,
    "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json, confirmed: Json = confirmedParameters) =>
      compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s27-26-flushing-disinfection-independent-db-readback-v1",
        catalogId: CATALOG_ID,
        primaryMeasureParameterId: "fld_pipeline_length_m",
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters,
        confirmedParameters: confirmed,
        currencyCode: "KGS",
        priceItems: [],
        maximumResourceRows: 55,
        hashJson: async (value) => estimateDeterministicHash(value),
      });
    const first = await compile(ordinary);
    const changedGeometry = await compile({
      ...ordinary,
      fld_pipeline_length_m: "2000",
      fld_pipeline_internal_diameter_mm: "150",
    });
    const changedProcurement = await compile(ordinary, {
      ...confirmedParameters,
      fld_reagent_available_stock_kg: 2,
      fld_reagent_supplier_package_kg: 5,
    });
    const conditional = await compile(ordinary, {
      ...confirmedParameters,
      fld_water_source_mode: "TANKER",
      fld_water_tanker_designation: "POTABLE-WATER-TANKER-10M3",
      fld_disposal_mode: "TANKER",
      fld_disposal_tanker_designation: "WASH-WATER-TANKER-10M3",
      fld_dechlorination_mode: "REQUIRED",
      fld_dechlorination_reagent_designation: "SODIUM-THIOSULFATE-TECHNICAL",
      fld_dechlorination_kg_per_active_chlorine_kg: 7,
    });
    invariant(first.rows.length === 52 && first.preliminaryNeeds.length === 0
      && quantity(first.rows, "rc12:fld_pipeline_volume") === "7.853982"
      && quantity(first.rows, "rc12:fld_required_flush_flow") === "28.2743352"
      && quantity(first.rows, "rc12:fld_total_water") === "24.26880438"
      && quantity(first.rows, "rc12:fld_active_chlorine") === "0.404480073"
      && quantity(first.rows, "rc12:fld_flushing_pumps") === "2"
      && quantity(first.rows, "rc12:fld_lab_analyses") === "8"
      && quantity(first.rows, "rc12:fld_reagent_order") === "30",
    "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_FIRST");
    invariant(Number(quantity(changedGeometry.rows, "rc12:fld_pipeline_volume"))
        > Number(quantity(first.rows, "rc12:fld_pipeline_volume"))
      && Number(quantity(changedGeometry.rows, "rc12:fld_required_flush_flow"))
        > Number(quantity(first.rows, "rc12:fld_required_flush_flow"))
      && Number(quantity(changedGeometry.rows, "rc12:fld_total_water"))
        > Number(quantity(first.rows, "rc12:fld_total_water"))
      && Number(quantity(changedGeometry.rows, "rc12:fld_active_chlorine"))
        > Number(quantity(first.rows, "rc12:fld_active_chlorine")),
    "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_GEOMETRY");
    invariant(quantity(changedProcurement.rows, "rc12:fld-reagent-balance:installed") === "3.235840584"
      && quantity(changedProcurement.rows, "rc12:fld-reagent-balance:total-need") === "3.559424642"
      && quantity(changedProcurement.rows, "rc12:fld-reagent-balance:net-order-need") === "1.559424642"
      && quantity(changedProcurement.rows, "rc12:fld-reagent-balance:package-count") === "1"
      && quantity(changedProcurement.rows, "rc12:fld_reagent_order") === "5"
      && quantity(changedProcurement.rows, "rc12:fld-reagent-balance:remainder") === "3.764159416"
      && quantity(changedProcurement.rows, "rc12:fld-reagent-balance:surplus-beyond-spare") === "3.440575358",
    "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_PROCUREMENT");
    invariant(conditional.rows.length === 55 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_CONDITIONAL");
    const requiredRows = [
      "rc12:fld_fill_connections", "rc12:fld_injection_connections",
      "rc12:fld_drain_connections", "rc12:fld_sampling_connections",
      "rc12:fld_supply_hose", "rc12:fld_flushing_pumps", "rc12:fld_dosing_skids",
      "rc12:fld_chlorine_meters", "rc12:fld_lab_analyses", "rc12:fld_ppe",
      "rc12:labor:fld-flushing", "rc12:labor:fld-sampling",
      "rc12:equipment:fld-pumps", "rc12:fld_asbuilt", "rc12:logistics:fld-reagent",
    ];
    invariant(requiredRows.every((rowId) => resources.some((row) => row.row_id === rowId)),
      "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft",
    "STOP_S27_26_FLUSHING_DISINFECTION_READBACK_SEARCH");

    const receipt = {
      schemaVersion: "rik-expo-app.s27-26.flushing-disinfection-independent-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_26_FLUSHING_DISINFECTION_AUTOMATIC_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { ...release, definitionReleaseId: current.definitionReleaseId,
        searchReleaseId: current.searchReleaseId },
      target,
      ordinaryRoute: {
        prompt: PROMPT,
        submittedParameters: ordinary,
        primaryFactCount: Object.keys(ordinary).length,
        mandatoryBeforeCompile: ordinaryParameters.length,
        visibleProfileNotOrdinaryQuestions: profileParameters.length,
      },
      persisted: { parameterCount: parameters.length, formulaCount: formulas.length,
        resourceCount: resources.length, locator, search },
      automaticGeometry: {
        baselineVolumeM3: quantity(first.rows, "rc12:fld_pipeline_volume"),
        changedVolumeM3: quantity(changedGeometry.rows, "rc12:fld_pipeline_volume"),
        baselineTotalWaterM3: quantity(first.rows, "rc12:fld_total_water"),
        changedTotalWaterM3: quantity(changedGeometry.rows, "rc12:fld_total_water"),
        baselineActiveChlorineKg: quantity(first.rows, "rc12:fld_active_chlorine"),
        changedActiveChlorineKg: quantity(changedGeometry.rows, "rc12:fld_active_chlorine"),
      },
      procurement: {
        installedKg: quantity(changedProcurement.rows, "rc12:fld-reagent-balance:installed"),
        retainedSpareKg: quantity(changedProcurement.rows, "rc12:fld-reagent-balance:retained-spare"),
        availableStockKg: quantity(changedProcurement.rows, "rc12:fld-reagent-balance:available-stock"),
        netOrderNeedKg: quantity(changedProcurement.rows, "rc12:fld-reagent-balance:net-order-need"),
        packageCount: quantity(changedProcurement.rows, "rc12:fld-reagent-balance:package-count"),
        orderedKg: quantity(changedProcurement.rows, "rc12:fld_reagent_order"),
        remainderKg: quantity(changedProcurement.rows, "rc12:fld-reagent-balance:remainder"),
        surplusKg: quantity(changedProcurement.rows, "rc12:fld-reagent-balance:surplus-beyond-spare"),
      },
      rows: { first: first.rows.length, conditional: conditional.rows.length },
      boundaries: {
        ordinaryRouteCoreAccepted: true,
        uiAccepted: false,
        reason: "ordinary staging consumer session and prepared-release selection in Web/Android were not exercised by this DB readback",
        activationPerformed: false,
        productionAccessed: false,
      },
    };
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const tempPath = `${OUTPUT_PATH}.tmp`;
    const receiptSha256 = sha256(receipt);
    writeFileSync(tempPath, `${JSON.stringify({ ...receipt, receiptSha256 }, null, 2)}\n`, "utf8");
    renameSync(tempPath, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      releaseId: current.definitionReleaseId,
      definitionVersionId: target.definition_version_id,
      firstRows: first.rows.length,
      conditionalRows: conditional.rows.length,
      receiptSha256,
      outputPath: OUTPUT_PATH,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
