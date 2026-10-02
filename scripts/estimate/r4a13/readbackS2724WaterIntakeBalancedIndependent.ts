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
const CATALOG_ID = "canonical-work:expanded:water_intake";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/water-intake-balanced-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 берегового водозабора WI-RIVERBANK-RC-2B-8000-4P: тип RIVERBANK_SCREENED_PUMP_INTAKE, производительность 8000 м³/сут, 2 водоприёмные камеры, 4 грубые решётки SS316-25MM-2000X3000, 4 насоса исходной воды VTP-250LPS-32M.";
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const quantity = (rows: readonly Json[], rowId: string) =>
  rows.find((row) => row.row_id === rowId)?.quantity as string | undefined;
const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at from
      public.estimate_definition_release where id=$1`, [current.definitionReleaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_24_WATER_INTAKE_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "65:45:45", "STOP_S27_24_WATER_INTAKE_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_WATER_INTAKE_READBACK_GATE");
    const [pr, fr, rr, br, sr, lr] = await Promise.all([
      client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
      client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id]),
      client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
      client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id]),
      client.query(`select d.definition_version_id::text,d.selectable,d.excluded_boundaries,r.status
        from public.estimate_search_document d join public.estimate_search_index_release r
        on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`,
      [current.searchReleaseId, CATALOG_ID]),
      client.query(`select l.locator_key,l.excerpt_sha256 from public.estimate_work_normative_binding b
        join public.estimate_normative_locator l on l.id=b.locator_id
        where b.definition_version_id=$1`, [target.definition_version_id]),
    ]);
    const parameters = pr.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = fr.rows as CanonicalEstimateFormulaDefinition[];
    const resources = rr.rows as CanonicalEstimateResourceDefinition[];
    const baseline = br.rows[0] as Json;
    const search = sr.rows[0] as Json;
    const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator, "STOP_S27_24_WATER_INTAKE_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_WATER_INTAKE_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key
      === "water-intake-riverbank-raw-water-pump-project-balance-s27-24-v1",
    "STOP_S27_24_WATER_INTAKE_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/design_capacity\w*\s*\*|bay_count\s*\*|pump_installed\w*\s*\*\s*0\.|length_m\s*\*|golden_rate|normFactor/iu
        .test(String(formula.expression_source))), "STOP_S27_24_WATER_INTAKE_READBACK_LEGACY");
    invariant(!/village_water|borehole|treatment_plant|reservoir|water_tower|sewer/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_24_WATER_INTAKE_READBACK_ADJACENT_SCOPE");

    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const screens = /(\d+(?:[,.]\d+)?)\s+груб\p{L}*\s+реш[её]тк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(PROMPT);
    const pumps = /(\d+(?:[,.]\d+)?)\s+насос\p{L}*\s+исходн\p{L}*\s+вод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(PROMPT);
    const ordinary = {
      wi_facility_count: number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+берегов\p{L}*\s+водозабор/iu),
      wi_facility_designation: /берегов\p{L}*\s+водозабор\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu.exec(PROMPT)?.[1],
      wi_intake_type: /тип\p{L}*\s+([A-Z][A-Z0-9_]*)/iu.exec(PROMPT)?.[1],
      wi_design_capacity_m3_day: number(/производительност\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
      wi_intake_bay_count: number(/(\d+(?:[,.]\d+)?)\s+водопри[её]мн\p{L}*\s+камер/iu),
      wi_coarse_screen_installed_piece: screens?.[1]?.replace(",", "."),
      wi_coarse_screen_designation: screens?.[2]?.replace(/[.,;:]+$/u, ""),
      wi_raw_water_pump_installed_piece: pumps?.[1]?.replace(",", "."),
      wi_raw_water_pump_designation: pumps?.[2]?.replace(/[.,;:]+$/u, ""),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        wi_facility_count: "1", wi_facility_designation: "WI-RIVERBANK-RC-2B-8000-4P",
        wi_intake_type: "RIVERBANK_SCREENED_PUMP_INTAKE", wi_design_capacity_m3_day: "8000",
        wi_intake_bay_count: "2", wi_coarse_screen_installed_piece: "4",
        wi_coarse_screen_designation: "SS316-25MM-2000X3000",
        wi_raw_water_pump_installed_piece: "4", wi_raw_water_pump_designation: "VTP-250LPS-32M",
      }), "STOP_S27_24_WATER_INTAKE_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.wi_raw_water_pump_retained_spare_piece) === 0
      && Number(confirmedParameters.wi_raw_water_pump_supplier_package_quantity_piece) === 1,
    "STOP_S27_24_WATER_INTAKE_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile", compilerVersion: "s27-24-water-intake-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "wi_facility_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
      submittedParameters, confirmedParameters, currencyCode: "KGS", priceItems: [],
      maximumResourceRows: 45, hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      wi_raw_water_pump_retained_spare_piece: 1,
      wi_raw_water_pump_supplier_package_quantity_piece: 2 });
    const conditional = await compile({ ...completeInput,
      wi_cofferdam_mode: "REQUIRED", wi_cofferdam_designation: "SHEET-PILE-AZ18",
      wi_cofferdam_area_m2: 1800, wi_river_diversion_mode: "REQUIRED",
      wi_river_diversion_designation: "DIVERSION-CHANNEL-1", wi_river_diversion_quantity_set: 1,
      wi_construction_dewatering_mode: "REQUIRED",
      wi_construction_dewatering_designation: "WELLPOINT-240M3H",
      wi_construction_dewatering_machine_h: 1000, wi_fish_protection_mode: "REQUIRED",
      wi_fish_protection_designation: "FISH-SCREEN-2B", wi_fish_protection_quantity_set: 2 });
    invariant(first.rows.length === 9 && first.preliminaryNeeds.length === 36,
      "STOP_S27_24_WATER_INTAKE_READBACK_FIRST");
    invariant(complete.rows.length === 41 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_WATER_INTAKE_READBACK_COMPLETE");
    invariant(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_WATER_INTAKE_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:wi_raw_water_pumps") === "6"
      && quantity(balanced.rows, "rc09:wi-pump-balance:package-count") === "3"
      && quantity(balanced.rows, "rc09:wi-pump-balance:remainder") === "2"
      && quantity(balanced.rows, "rc09:wi-pump-balance:surplus-beyond-spare") === "1",
    "STOP_S27_24_WATER_INTAKE_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_WATER_INTAKE_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /сет|скважин|водоподготов|резервуар|башн|канализац|автомат|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_WATER_INTAKE_READBACK_SEARCH");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.water-intake-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_WATER_INTAKE_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: { catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "45/45 GREEN",
        legacyGenericCoefficientFormulaCount: 0, adjacentTemplateResourceCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256 },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticMaterialLaborMechanismLogisticsOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: { input: { installedPiece: 4, retainedSparePiece: 1,
        supplierPackageQuantityPiece: 2 },
        orderedPiece: quantity(balanced.rows, "rc09:wi_raw_water_pumps"),
        packageCount: quantity(balanced.rows, "rc09:wi-pump-balance:package-count"),
        remainderPiece: quantity(balanced.rows, "rc09:wi-pump-balance:remainder"),
        surplusPiece: quantity(balanced.rows, "rc09:wi-pump-balance:surplus-beyond-spare") },
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
