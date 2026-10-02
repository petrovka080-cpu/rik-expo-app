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
const CATALOG_ID = "canonical-work:expanded:water_treatment_plant";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/water-treatment-plant-balanced-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 водоочистной станции WTP-RGF-5000-4F: схема COAGULATION_FLOCCULATION_SEDIMENTATION_RAPID_GRAVITY_FILTRATION_CHLORINATION, производительность 5000 м³/сут, 4 скорых гравитационных фильтра, 80 т антрацитовой загрузки ANTHRACITE-0.8-1.6MM-POTABLE, 4 насоса исходной воды HSC-80LPS-28M, 4 насоса очищенной воды HSC-75LPS-42M.";

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
      "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "66:45:45",
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_GATE");
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
      "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key
      === "water-treatment-plant-rapid-gravity-filter-media-project-balance-s27-24-v1",
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/design_capacity\w*\s*\*|capacity_m3_day\s*\*|waterTreatmentPlantCalculator|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_LEGACY_FORMULA");
    invariant(!/water_intake|village_water|reservoir|water_tower|wastewater|sewer/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_ADJACENT_SCOPE");

    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const media = /(\d+(?:[,.]\d+)?)\s*т\s+антрацитов\p{L}*\s+загрузк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const rawPumps = /(\d+(?:[,.]\d+)?)\s+насос\p{L}*\s+исходн\p{L}*\s+вод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const treatedPumps = /(\d+(?:[,.]\d+)?)\s+насос\p{L}*\s+очищенн\p{L}*\s+вод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const ordinary = {
      wtp_facility_count: number(
        /(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+водоочистн\p{L}*\s+станци\p{L}*/iu,
      ),
      wtp_facility_designation: /водоочистн\p{L}*\s+станци\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
        .exec(PROMPT)?.[1],
      wtp_process_type: /схем\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(PROMPT)?.[1],
      wtp_design_capacity_m3_day: number(
        /производительност\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu,
      ),
      wtp_filter_train_count: number(
        /(\d+(?:[,.]\d+)?)\s+скор\p{L}*\s+гравитационн\p{L}*\s+фильтр\p{L}*/iu,
      ),
      wtp_filter_media_installed_t: media?.[1]?.replace(",", "."),
      wtp_filter_media_designation: media?.[2]?.replace(/[.,;:]+$/u, ""),
      wtp_raw_water_pump_installed_piece: rawPumps?.[1]?.replace(",", "."),
      wtp_raw_water_pump_designation: rawPumps?.[2]?.replace(/[.,;:]+$/u, ""),
      wtp_treated_water_pump_installed_piece: treatedPumps?.[1]?.replace(",", "."),
      wtp_treated_water_pump_designation: treatedPumps?.[2]?.replace(/[.,;:]+$/u, ""),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        wtp_facility_count: "1", wtp_facility_designation: "WTP-RGF-5000-4F",
        wtp_process_type:
          "COAGULATION_FLOCCULATION_SEDIMENTATION_RAPID_GRAVITY_FILTRATION_CHLORINATION",
        wtp_design_capacity_m3_day: "5000", wtp_filter_train_count: "4",
        wtp_filter_media_installed_t: "80",
        wtp_filter_media_designation: "ANTHRACITE-0.8-1.6MM-POTABLE",
        wtp_raw_water_pump_installed_piece: "4",
        wtp_raw_water_pump_designation: "HSC-80LPS-28M",
        wtp_treated_water_pump_installed_piece: "4",
        wtp_treated_water_pump_designation: "HSC-75LPS-42M",
      }),
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.wtp_filter_media_retained_spare_t) === 0
      && Number(confirmedParameters.wtp_filter_media_supplier_package_mass_t) === 1,
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-water-treatment-plant-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "wtp_facility_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas,
      resourceDefinitions: resources, submittedParameters, confirmedParameters,
      currencyCode: "KGS", priceItems: [], maximumResourceRows: 45,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({
      ...completeInput,
      wtp_filter_media_retained_spare_t: 4,
      wtp_filter_media_supplier_package_mass_t: 0.5,
    });
    const conditional = await compile({ ...completeInput,
      wtp_excavation_shoring_mode: "REQUIRED",
      wtp_excavation_shoring_designation: "SHEET-PILE-AZ18",
      wtp_excavation_shoring_area_m2: 4000,
      wtp_groundwater_dewatering_mode: "REQUIRED",
      wtp_groundwater_dewatering_designation: "WELLPOINT-240M3H",
      wtp_groundwater_dewatering_machine_h: 1800,
      wtp_road_reinstatement_mode: "REQUIRED",
      wtp_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      wtp_road_reinstatement_area_m2: 1800,
    });
    invariant(first.rows.length === 11 && first.preliminaryNeeds.length === 34
      && quantity(first.rows, "rc09:wtp_acceptance") === "1"
      && quantity(first.rows, "rc09:wtp_filter_media") === "80",
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_FIRST");
    invariant(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
      && quantity(complete.rows, "rc09:wtp_structural_concrete") === "3200"
      && quantity(complete.rows, "rc09:wtp_rebar") === "430000"
      && quantity(complete.rows, "rc09:labor:wtp-civil") === "21000",
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_COMPLETE");
    invariant(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:wtp-media-balance:installed-net") === "80"
      && quantity(balanced.rows, "rc09:wtp-media-balance:retained-spare") === "4"
      && quantity(balanced.rows, "rc09:wtp-media-balance:total-need") === "84"
      && quantity(balanced.rows, "rc09:wtp-media-balance:package-count") === "168"
      && quantity(balanced.rows, "rc09:wtp_filter_media") === "84"
      && quantity(balanced.rows, "rc09:wtp-media-balance:remainder") === "4"
      && quantity(balanced.rows, "rc09:wtp-media-balance:surplus-beyond-spare") === "0",
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 3
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /водозабор|сет|резервуар|башн|канализац|сточн|автомат|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_WATER_TREATMENT_PLANT_READBACK_SEARCH");
    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.water-treatment-plant-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_WATER_TREATMENT_PLANT_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "45/45 GREEN",
        legacyGenericCoefficientFormulaCount: 0, adjacentTemplateResourceCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt: PROMPT, submittedParameters: ordinary,
        automaticProcessCivilLaborMechanismLogisticsOrConditionalSelectionPerformed: false,
      },
      firstEstimate: {
        visibleRowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: {
        input: { installedT: 80, retainedSpareT: 4, supplierPackageMassT: 0.5 },
        totalNeedT: quantity(balanced.rows, "rc09:wtp-media-balance:total-need"),
        orderedT: quantity(balanced.rows, "rc09:wtp_filter_media"),
        packageCount: quantity(balanced.rows, "rc09:wtp-media-balance:package-count"),
        remainderT: quantity(balanced.rows, "rc09:wtp-media-balance:remainder"),
        surplusT: quantity(balanced.rows, "rc09:wtp-media-balance:surplus-beyond-spare"),
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
