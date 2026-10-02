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
const CATALOG_ID = "canonical-work:expanded:borehole_water_supply";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/borehole-water-supply-balanced-current/independent-acceptance.json",
);
const PROMPT = "Устройство 1 эксплуатационной скважины BH-PW-180-DN250: назначение POTABLE_WATER_PRODUCTION, глубина 180 м, конечный диаметр ствола 311 мм, 180 м обсадной колонны STEEL-CASING-DN250-EN10217, 36 м фильтровой колонны SS316L-VWIRE-DN200-0.75MM, 1 погружной насос SUBMERSIBLE-45M3H-120M, 160 м водоподъёмной колонны SS304-DN80-PN16, 1 санитарный оголовок SANITARY-WELLHEAD-DN250-DN80.";

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
      "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "67:45:45",
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_GATE");
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
      "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key
      === "borehole-water-supply-casing-project-balance-s27-24-v1",
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/80\s*\*|length_m\s*\*|wellConstructionCalculator|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_LEGACY_FORMULA");
    invariant(!/village_water|distribution|reservoir|treatment_plant|sewer/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_ADJACENT_SCOPE");

    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const casing = /(\d+(?:[,.]\d+)?)\s*м\s+обсадн\p{L}*\s+колонн\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const screen = /(\d+(?:[,.]\d+)?)\s*м\s+фильтров\p{L}*\s+колонн\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const pump = /(\d+(?:[,.]\d+)?)\s+погружн\p{L}*\s+насос\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const risingMain = /(\d+(?:[,.]\d+)?)\s*м\s+водоподъ[её]мн\p{L}*\s+колонн\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const wellhead = /(\d+(?:[,.]\d+)?)\s+санитарн\p{L}*\s+оголов\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const ordinary = {
      bh_borehole_count: number(
        /(?:устройств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+эксплуатационн\p{L}*\s+скважин\p{L}*/iu,
      ),
      bh_borehole_designation: /эксплуатационн\p{L}*\s+скважин\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
        .exec(PROMPT)?.[1],
      bh_purpose: /назначени\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(PROMPT)?.[1],
      bh_drilled_depth_m: number(
        /глубин\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![м\p{L}\p{N}])/iu,
      ),
      bh_final_bore_diameter_mm: number(
        /конечн\p{L}*\s+диаметр\p{L}*\s+ствол\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu,
      ),
      bh_casing_installed_m: casing?.[1]?.replace(",", "."),
      bh_casing_designation: casing?.[2]?.replace(/[.,;:]+$/u, ""),
      bh_screen_installed_m: screen?.[1]?.replace(",", "."),
      bh_screen_designation: screen?.[2]?.replace(/[.,;:]+$/u, ""),
      bh_pump_installed_piece: pump?.[1]?.replace(",", "."),
      bh_pump_designation: pump?.[2]?.replace(/[.,;:]+$/u, ""),
      bh_rising_main_installed_m: risingMain?.[1]?.replace(",", "."),
      bh_rising_main_designation: risingMain?.[2]?.replace(/[.,;:]+$/u, ""),
      bh_wellhead_installed_set: wellhead?.[1]?.replace(",", "."),
      bh_wellhead_designation: wellhead?.[2]?.replace(/[.,;:]+$/u, ""),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        bh_borehole_count: "1", bh_borehole_designation: "BH-PW-180-DN250",
        bh_purpose: "POTABLE_WATER_PRODUCTION", bh_drilled_depth_m: "180",
        bh_final_bore_diameter_mm: "311", bh_casing_installed_m: "180",
        bh_casing_designation: "STEEL-CASING-DN250-EN10217",
        bh_screen_installed_m: "36",
        bh_screen_designation: "SS316L-VWIRE-DN200-0.75MM",
        bh_pump_installed_piece: "1", bh_pump_designation: "SUBMERSIBLE-45M3H-120M",
        bh_rising_main_installed_m: "160",
        bh_rising_main_designation: "SS304-DN80-PN16",
        bh_wellhead_installed_set: "1",
        bh_wellhead_designation: "SANITARY-WELLHEAD-DN250-DN80",
      }),
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.bh_casing_retained_spare_m) === 0
      && Number(confirmedParameters.bh_casing_supplier_joint_length_m) === 1,
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-borehole-water-supply-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "bh_borehole_count",
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
      bh_casing_retained_spare_m: 12,
      bh_casing_supplier_joint_length_m: 6,
    });
    const conditional = await compile({
      ...completeInput,
      bh_temporary_access_mode: "REQUIRED",
      bh_temporary_access_designation: "ROAD-MAT-HEAVY-DUTY",
      bh_temporary_access_area_m2: 1200,
      bh_drilling_fluid_disposal_mode: "REQUIRED",
      bh_drilling_fluid_disposal_designation: "LICENSED-DRILLING-SLURRY-DISPOSAL",
      bh_drilling_fluid_disposal_trip_count: 60,
      bh_standby_power_mode: "REQUIRED",
      bh_standby_power_designation: "GENSET-250KVA",
      bh_standby_power_machine_h: 240,
    });
    invariant(first.rows.length === 13 && first.preliminaryNeeds.length === 32
      && quantity(first.rows, "rc09:bh_acceptance") === "1"
      && quantity(first.rows, "rc09:bh_drilling") === "180"
      && quantity(first.rows, "rc09:bh_casing") === "180",
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_FIRST");
    invariant(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
      && quantity(complete.rows, "rc09:bh_gravel_pack") === "28"
      && quantity(complete.rows, "rc09:bh_annular_grout") === "42"
      && quantity(complete.rows, "rc09:labor:bh-drilling") === "1600",
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_COMPLETE");
    invariant(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:bh-casing-balance:installed-net") === "180"
      && quantity(balanced.rows, "rc09:bh-casing-balance:retained-spare") === "12"
      && quantity(balanced.rows, "rc09:bh-casing-balance:total-need") === "192"
      && quantity(balanced.rows, "rc09:bh-casing-balance:joint-count") === "32"
      && quantity(balanced.rows, "rc09:bh_casing") === "192"
      && quantity(balanced.rows, "rc09:bh-casing-balance:remainder") === "12"
      && quantity(balanced.rows, "rc09:bh-casing-balance:surplus-beyond-spare") === "0",
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 3
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /сет|резервуар|водоочистн|канализац|автомат|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_BOREHOLE_WATER_SUPPLY_READBACK_SEARCH");
    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.borehole-water-supply-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_BOREHOLE_WATER_SUPPLY_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
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
        automaticCivilLaborMechanismLogisticsOrConditionalSelectionPerformed: false,
      },
      firstEstimate: {
        visibleRowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: {
        input: { installedM: 180, retainedSpareM: 12, supplierJointLengthM: 6 },
        totalNeedM: quantity(balanced.rows, "rc09:bh-casing-balance:total-need"),
        orderedM: quantity(balanced.rows, "rc09:bh_casing"),
        jointCount: quantity(balanced.rows, "rc09:bh-casing-balance:joint-count"),
        remainderM: quantity(balanced.rows, "rc09:bh-casing-balance:remainder"),
        surplusM: quantity(balanced.rows, "rc09:bh-casing-balance:surplus-beyond-spare"),
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
