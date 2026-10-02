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
const CATALOG_ID = "canonical-work:expanded:fiber_optic_connection";
const CURRENT_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/optical-fiber-splicing-balanced-current/independent-acceptance.json",
);
const PROMPT = "Сварка оптических волокон: количество 48 шт, волокно SM G.652D.";
const MINIMUM_REAL_QUANTITY_NEEDS = Object.freeze({
  "rc09:fiber_lint_free_wipe": ["wipe_quantity_piece"],
  "rc09:fiber_isopropyl_cleaner": ["cleaner_volume_l"],
  "rc09:fiber_splice_identification_marker": ["marker_quantity_piece"],
  "rc09:fiber_fusion_splicer": ["fusion_splicer_shift"],
  "rc09:optical_time_domain_reflectometer": ["otdr_shift"],
});

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string"
    ? value
    : JSON.stringify(value)).digest("hex");
}

function quantity(rows: readonly Json[], rowId: string): string | undefined {
  return rows.find((row) => row.row_id === rowId)?.quantity;
}

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at,definition_count,
        parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId]))
      .rows[0] as Json | undefined;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_24_OPTICAL_READBACK_RELEASE");
    const target = (await client.query(`select manifest.definition_version_id::text,
        manifest.source_batch,manifest.runtime_publication_state,
        manifest.approved_template_baseline_id::text,definition.definition_version,
        definition.content_status,definition.content_gate_status,passport.parameter_count,
        passport.formula_count,passport.resource_count,passport.payload_sha256
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [
      current.definitionReleaseId, CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(target != null, "STOP_S27_24_OPTICAL_READBACK_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "26:21:21", "STOP_S27_24_OPTICAL_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN", "STOP_S27_24_OPTICAL_READBACK_GATE");

    const parameters = (await client.query(`select * from public.estimate_parameter_definition
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id]))
      .rows as CanonicalEstimateParameterDefinition[];
    const formulas = (await client.query(`select formula_id,output_unit_id,expression_source,
        ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph
      where definition_version_id=$1 order by formula_id`, [target.definition_version_id]))
      .rows as CanonicalEstimateFormulaDefinition[];
    const resources = (await client.query(`select * from public.estimate_resource_spec
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id]))
      .rows as CanonicalEstimateResourceDefinition[];
    const baseline = (await client.query(`select input_values,input_classification,
        normative_source_ids from public.estimate_approved_template_baseline where id=$1`,
    [target.approved_template_baseline_id])).rows[0] as Json | undefined;
    const search = (await client.query(`select document.definition_version_id::text,
        document.selectable,document.excluded_boundaries,release.status
      from public.estimate_search_document document
      join public.estimate_search_index_release release on release.id=document.search_release_id
      where document.search_release_id=$1 and document.catalog_id=$2`, [
      current.searchReleaseId, CATALOG_ID,
    ])).rows[0] as Json | undefined;
    const locator = (await client.query(`select locator.locator_key,locator.excerpt_sha256
      from public.estimate_work_normative_binding binding
      join public.estimate_normative_locator locator on locator.id=binding.locator_id
      where binding.definition_version_id=$1`, [target.definition_version_id]))
      .rows[0] as Json | undefined;
    invariant(baseline != null && search != null && locator != null,
      "STOP_S27_24_OPTICAL_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_OPTICAL_READBACK_FORMULA_DRIFT");
    invariant(locator.locator_key
      === "optical-fiber-splicing-krerm-project-balance-s27-24-v2",
    "STOP_S27_24_OPTICAL_READBACK_LOCATOR");

    const spliceCount = /количеств\p{L}*\s*([0-9]+)\s*шт/iu.exec(PROMPT)?.[1];
    const ordinaryParameters = {
      splice_count: spliceCount,
      fiber_standard: /SM\s+G\.?652D/iu.test(PROMPT) ? "SM_G652D" : undefined,
    };
    invariant(JSON.stringify(ordinaryParameters) === JSON.stringify({
      splice_count: "48", fiber_standard: "SM_G652D",
    }), "STOP_S27_24_OPTICAL_READBACK_ORDINARY_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.sleeve_expected_waste_piece) === 0
      && Number(confirmedParameters.sleeve_retained_spare_piece) === 0
      && Number(confirmedParameters.sleeve_supplier_pack_size_piece) === 1,
    "STOP_S27_24_OPTICAL_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-optical-independent-current-db-readback-v1",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "splice_count",
      parameterDefinitions: parameters,
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 40,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinaryParameters);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({
      ...completeInput,
      sleeve_expected_waste_piece: 1,
      sleeve_retained_spare_piece: 2,
      sleeve_supplier_pack_size_piece: 50,
    });
    invariant(first.rows.length === 10 && first.preliminaryNeeds.length === 11,
      "STOP_S27_24_OPTICAL_READBACK_FIRST");
    for (const [rowId, missingParameterIds] of Object.entries(MINIMUM_REAL_QUANTITY_NEEDS)) {
      const need = first.preliminaryNeeds.find((item) => item.row_id === rowId);
      invariant(JSON.stringify(need?.missing_parameter_ids)
        === JSON.stringify(missingParameterIds),
      `STOP_S27_24_OPTICAL_READBACK_MINIMUM_REAL_FACTS:${rowId}`);
    }
    invariant(first.rows.filter((row) => row.included_in_procurement).length === 1
      && quantity(first.rows, "rc09:fiber_splice_heat_shrink_sleeve") === "48",
    "STOP_S27_24_OPTICAL_READBACK_FIRST_PROCUREMENT");
    invariant(complete.rows.length === 19 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_OPTICAL_READBACK_COMPLETE");
    invariant(quantity(balanced.rows, "fiber:balance:installed-sleeves") === "48"
      && quantity(balanced.rows, "fiber:balance:expected-waste") === "1"
      && quantity(balanced.rows, "fiber:balance:retained-reserve") === "2"
      && quantity(balanced.rows, "fiber:balance:total-need") === "51"
      && quantity(balanced.rows, "fiber:balance:package-count") === "2"
      && quantity(balanced.rows, "rc09:fiber_splice_heat_shrink_sleeve") === "100"
      && quantity(balanced.rows, "fiber:balance:remainder-after-installation-waste") === "51"
      && quantity(balanced.rows, "fiber:balance:surplus-beyond-reserve") === "49",
    "STOP_S27_24_OPTICAL_READBACK_BALANCE");
    invariant(complete.rows.find((row) => row.row_id === "rc09:optical_fiber_fusion_splice")
      ?.included_in_estimate === false
      && complete.rows.find((row) => row.row_id === "rc09:fiber_otdr_measurement_protocol")
        ?.included_in_estimate === false, "STOP_S27_24_OPTICAL_READBACK_DOUBLE_COST");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /трасс|кросс|серверн.*шкаф/iu.test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_OPTICAL_READBACK_SEARCH");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.optical-fiber-splicing-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_OPTICAL_FIBER_SPLICING_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: {
        id: release.id, status: release.status, activatedAt: release.activated_at,
        definitionCount: Number(release.definition_count),
        sourceManifestSha256: release.source_manifest_sha256,
      },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID,
        definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        approvedTemplateBaselineId: target.approved_template_baseline_id,
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "21/21 GREEN",
        normativeLocator: locator,
        payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinaryParameters,
        inventedConsumableLaborOrEquipmentRates: false },
      firstEstimate: {
        visibleRowCount: first.rows.length,
        procurementRowCount: first.rows.filter((row) => row.included_in_procurement).length,
        preliminaryNeedCount: first.preliminaryNeeds.length,
        missingScalarFactCount: first.preliminaryNeeds
          .flatMap((need) => need.missing_parameter_ids).length,
        sleeveOrderPiece: quantity(first.rows, "rc09:fiber_splice_heat_shrink_sleeve"),
      },
      completedProjectProfile: {
        visibleRowCount: complete.rows.length,
        preliminaryNeedCount: complete.preliminaryNeeds.length,
      },
      sleeveBalance: {
        installed: quantity(balanced.rows, "fiber:balance:installed-sleeves"),
        expectedWaste: quantity(balanced.rows, "fiber:balance:expected-waste"),
        retainedReserve: quantity(balanced.rows, "fiber:balance:retained-reserve"),
        totalNeed: quantity(balanced.rows, "fiber:balance:total-need"),
        packages: quantity(balanced.rows, "fiber:balance:package-count"),
        ordered: quantity(balanced.rows, "rc09:fiber_splice_heat_shrink_sleeve"),
        remainder: quantity(balanced.rows, "fiber:balance:remainder-after-installation-waste"),
        surplusBeyondReserve: quantity(balanced.rows, "fiber:balance:surplus-beyond-reserve"),
      },
      uiAcceptance: false,
      productionAccessed: false,
      activationPerformed: false,
      deployPerformed: false,
      otaPerformed: false,
      storeActionPerformed: false,
    };
    evidence.receiptSha256 = sha256(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({
      status: evidence.status,
      releaseId: release.id,
      definitionVersionId: target.definition_version_id,
      firstRows: first.rows.length,
      completeRows: complete.rows.length,
      receiptSha256: evidence.receiptSha256,
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
