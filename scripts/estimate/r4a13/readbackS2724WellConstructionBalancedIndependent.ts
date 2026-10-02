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
const CATALOG_ID = "canonical-work:expanded:well_construction";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/well-construction-balanced-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 шахтного водозаборного колодца WIW-RC-DN2000-18M: тип SHALLOW_RC_SHAFT_INFILTRATION_WELL, назначение POTABLE_WATER_INTAKE, глубина шахты 18 м, внутренний диаметр 2000 мм, 20 железобетонных колец RC-WELL-RING-KS20.9, 65 м уплотнения стыков BENTONITE-JOINT-SEAL-20X25, 2 погружных насоса SUBMERSIBLE-15M3H-35M, 30 м напорной трубы HDPE-PE100-SDR17-OD63, 1 плита покрытия RC-WELL-COVER-PP20-2.";

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
      "STOP_S27_24_WELL_CONSTRUCTION_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "68:45:45",
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_GATE");
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
    invariant(baseline && search && locator, "STOP_S27_24_WELL_CONSTRUCTION_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_WELL_CONSTRUCTION_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key
      === "well-construction-shaft-well-joint-seal-project-balance-s27-24-v1",
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/80\s*\*|length_m\s*\*|wellConstructionCalculator|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_LEGACY_FORMULA");
    invariant(!/borehole|distribution|reservoir|treatment_plant|sewer/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_ADJACENT_SCOPE");

    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const rings = /(\d+(?:[,.]\d+)?)\s+железобетонн\p{L}*\s+колец\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const seal = /(\d+(?:[,.]\d+)?)\s*м\s+уплотнени\p{L}*\s+стык\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const pumps = /(\d+(?:[,.]\d+)?)\s+погружн\p{L}*\s+насос\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const pipe = /(\d+(?:[,.]\d+)?)\s*м\s+напорн\p{L}*\s+труб\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const cover = /(\d+(?:[,.]\d+)?)\s+плит\p{L}*\s+покрыти\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const ordinary = {
      wiw_well_count: number(
        /(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+шахтн\p{L}*\s+водозаборн\p{L}*\s+колодц\p{L}*/iu,
      ),
      wiw_well_designation: /шахтн\p{L}*\s+водозаборн\p{L}*\s+колодц\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
        .exec(PROMPT)?.[1],
      wiw_well_type: /тип\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(PROMPT)?.[1],
      wiw_purpose: /назначени\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(PROMPT)?.[1],
      wiw_shaft_depth_m: number(
        /глубин\p{L}*\s+шахт\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![м\p{L}\p{N}])/iu,
      ),
      wiw_internal_diameter_mm: number(
        /внутренн\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu,
      ),
      wiw_lining_ring_installed_piece: rings?.[1]?.replace(",", "."),
      wiw_lining_ring_designation: rings?.[2]?.replace(/[.,;:]+$/u, ""),
      wiw_joint_seal_installed_m: seal?.[1]?.replace(",", "."),
      wiw_joint_seal_designation: seal?.[2]?.replace(/[.,;:]+$/u, ""),
      wiw_pump_installed_piece: pumps?.[1]?.replace(",", "."),
      wiw_pump_designation: pumps?.[2]?.replace(/[.,;:]+$/u, ""),
      wiw_discharge_pipe_installed_m: pipe?.[1]?.replace(",", "."),
      wiw_discharge_pipe_designation: pipe?.[2]?.replace(/[.,;:]+$/u, ""),
      wiw_cover_slab_installed_piece: cover?.[1]?.replace(",", "."),
      wiw_cover_slab_designation: cover?.[2]?.replace(/[.,;:]+$/u, ""),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        wiw_well_count: "1", wiw_well_designation: "WIW-RC-DN2000-18M",
        wiw_well_type: "SHALLOW_RC_SHAFT_INFILTRATION_WELL",
        wiw_purpose: "POTABLE_WATER_INTAKE", wiw_shaft_depth_m: "18",
        wiw_internal_diameter_mm: "2000", wiw_lining_ring_installed_piece: "20",
        wiw_lining_ring_designation: "RC-WELL-RING-KS20.9",
        wiw_joint_seal_installed_m: "65",
        wiw_joint_seal_designation: "BENTONITE-JOINT-SEAL-20X25",
        wiw_pump_installed_piece: "2", wiw_pump_designation: "SUBMERSIBLE-15M3H-35M",
        wiw_discharge_pipe_installed_m: "30",
        wiw_discharge_pipe_designation: "HDPE-PE100-SDR17-OD63",
        wiw_cover_slab_installed_piece: "1",
        wiw_cover_slab_designation: "RC-WELL-COVER-PP20-2",
      }),
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.wiw_joint_seal_retained_spare_m) === 0
      && Number(confirmedParameters.wiw_joint_seal_supplier_roll_length_m) === 1,
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile", compilerVersion: "s27-24-well-construction-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "wiw_well_count",
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
      wiw_joint_seal_retained_spare_m: 5,
      wiw_joint_seal_supplier_roll_length_m: 20,
    });
    const conditional = await compile({
      ...completeInput,
      wiw_excavation_shoring_mode: "REQUIRED",
      wiw_excavation_shoring_designation: "HYDRAULIC-SHAFT-SHORING",
      wiw_excavation_shoring_area_m2: 140,
      wiw_groundwater_dewatering_mode: "REQUIRED",
      wiw_groundwater_dewatering_designation: "WELLPOINT-80M3H",
      wiw_groundwater_dewatering_machine_h: 240,
      wiw_temporary_access_mode: "REQUIRED",
      wiw_temporary_access_designation: "ROAD-MAT-HEAVY-DUTY",
      wiw_temporary_access_area_m2: 600,
    });
    invariant(first.rows.length === 13 && first.preliminaryNeeds.length === 32
      && quantity(first.rows, "rc09:wiw_acceptance") === "1"
      && quantity(first.rows, "rc09:wiw_lining_rings") === "20"
      && quantity(first.rows, "rc09:wiw_joint_seal") === "65",
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_FIRST");
    invariant(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
      && quantity(complete.rows, "rc09:wiw_base_filter_gravel") === "12"
      && quantity(complete.rows, "rc09:wiw_sanitary_clay_seal") === "22"
      && quantity(complete.rows, "rc09:labor:wiw-excavation-lining") === "960",
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_COMPLETE");
    invariant(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_WELL_CONSTRUCTION_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:wiw-seal-balance:installed-net") === "65"
      && quantity(balanced.rows, "rc09:wiw-seal-balance:retained-spare") === "5"
      && quantity(balanced.rows, "rc09:wiw-seal-balance:total-need") === "70"
      && quantity(balanced.rows, "rc09:wiw-seal-balance:roll-count") === "4"
      && quantity(balanced.rows, "rc09:wiw_joint_seal") === "80"
      && quantity(balanced.rows, "rc09:wiw-seal-balance:remainder") === "15"
      && quantity(balanced.rows, "rc09:wiw-seal-balance:surplus-beyond-spare") === "10",
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 3
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /буров|сет|резервуар|водоочистн|канализац|автомат|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_WELL_CONSTRUCTION_READBACK_SEARCH");
    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.well-construction-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_WELL_CONSTRUCTION_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
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
        input: { installedM: 65, retainedSpareM: 5, supplierRollLengthM: 20 },
        totalNeedM: quantity(balanced.rows, "rc09:wiw-seal-balance:total-need"),
        orderedM: quantity(balanced.rows, "rc09:wiw_joint_seal"),
        rollCount: quantity(balanced.rows, "rc09:wiw-seal-balance:roll-count"),
        remainderM: quantity(balanced.rows, "rc09:wiw-seal-balance:remainder"),
        surplusM: quantity(balanced.rows, "rc09:wiw-seal-balance:surplus-beyond-spare"),
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
