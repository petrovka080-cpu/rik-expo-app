import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Pool } from "pg";

import { canonicalApprovedBaselineRuntimeParameters } from
  "../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import { compileCanonicalEstimateCore } from
  "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from
  "../../src/lib/estimate/estimateDeterministicHash";
import {
  STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_CATALOG_ID,
  STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SOURCE_PACK_SHA256,
} from "../../src/lib/estimate/v4/stairsConcreteVibrationLargeAreaS2723";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const SOURCE_PACK_PATH =
  "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-large-area-s27-23.json";
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/stairs-concrete-vibration-large-area-successor/independent-acceptance.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(path))).digest("hex");
}

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const releaseId = String(current.definitionReleaseId);
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    const manifest = (await pool.query(
      `select manifest.definition_version_id::text,manifest.source_batch,
          manifest.runtime_publication_state,definition.content_status,
          definition.content_gate_status,manifest.approved_template_baseline_id::text
       from public.estimate_cumulative_manifest_entry manifest
       join public.estimate_definition_version definition
         on definition.id=manifest.definition_version_id
       where manifest.release_id=$1 and manifest.catalog_id=$2`,
      [releaseId, STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_CATALOG_ID],
    )).rows[0] as Json | undefined;
    invariant(manifest, "STOP_S2723_STAIRS_VIBRATION_LARGE_AREA_MANIFEST_MISSING");
    const definitionId = String(manifest.definition_version_id);
    const [parameters, formulas, resources, baselineResult] = await Promise.all([
      pool.query(`select * from public.estimate_parameter_definition
        where definition_version_id=$1 order by ordinal`, [definitionId]),
      pool.query(`select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
        from public.estimate_formula_graph where definition_version_id=$1 order by formula_id`, [definitionId]),
      pool.query(`select * from public.estimate_resource_spec
        where definition_version_id=$1 order by ordinal`, [definitionId]),
      pool.query(`select input_values,input_classification,normative_source_ids
        from public.estimate_approved_template_baseline where id=$1`,
      [manifest.approved_template_baseline_id]),
    ]);
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(
      baselineResult.rows[0] as Json,
    );
    const compile = async (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-23-stairs-vibration-large-area-independent-acceptance",
      catalogId: STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_CATALOG_ID,
      primaryMeasureParameterId: "consolidated_concrete_volume_m3",
      parameterDefinitions: parameters.rows,
      formulaDefinitions: formulas.rows,
      resourceDefinitions: resources.rows,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 100,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile({ consolidated_concrete_volume_m3: 54 });
    const changed = await compile({
      ...STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_ACCEPTANCE_INPUT,
      consolidated_concrete_volume_m3: 72,
    });
    const quantity = (result: typeof first, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId)?.quantity;

    invariant(parameters.rows.length === 22 && formulas.rows.length === 17
      && resources.rows.length === 21, "STOP_S2723_STAIRS_VIBRATION_LARGE_AREA_SHAPE");
    invariant(first.rows.length === 21 && first.preliminaryNeeds.length === 0,
      "STOP_S2723_STAIRS_VIBRATION_LARGE_AREA_FIRST_ESTIMATE");
    invariant(first.rows.every((candidate) =>
      candidate.row_id.startsWith("concrete-stairs-vibration-large-area:")),
    "STOP_S2723_STAIRS_VIBRATION_LARGE_AREA_OWNER_COLLAPSED");
    invariant(first.rows.filter((candidate) => candidate.included_in_procurement).length === 11,
      "STOP_S2723_STAIRS_VIBRATION_LARGE_AREA_PROCUREMENT");
    invariant(quantity(first,
      "concrete-stairs-vibration-large-area:03:labor:vibration-crew") === "67.5"
      && quantity(first,
        "concrete-stairs-vibration-large-area:03:equipment:active-vibrator") === "18"
      && quantity(first,
        "concrete-stairs-vibration-large-area:03:equipment:rental-shifts") === "3"
      && quantity(first,
        "concrete-stairs-vibration-large-area:03:material:electricity") === "15.84"
      && quantity(first,
        "concrete-stairs-vibration-large-area:04:consumable:cleaning-water") === "0.09",
    "STOP_S2723_STAIRS_VIBRATION_LARGE_AREA_QUANTITIES");
    invariant(quantity(changed,
      "concrete-stairs-vibration-large-area:03:labor:vibration-crew") === "90"
      && quantity(changed,
        "concrete-stairs-vibration-large-area:03:equipment:active-vibrator") === "24"
      && quantity(changed,
        "concrete-stairs-vibration-large-area:03:material:electricity") === "21.12"
      && quantity(changed,
        "concrete-stairs-vibration-large-area:04:consumable:cleaning-water") === "0.12",
    "STOP_S2723_STAIRS_VIBRATION_LARGE_AREA_RECALCULATION");
    invariant(first.rows.every((candidate) => candidate.unit_price == null
      && candidate.amount == null),
    "STOP_S2723_STAIRS_VIBRATION_LARGE_AREA_UNKNOWN_PRICE_NOT_NULL");
    invariant(sha256File(SOURCE_PACK_PATH)
      === STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SOURCE_PACK_SHA256,
    "STOP_S2723_STAIRS_VIBRATION_LARGE_AREA_SOURCE_PACK_HASH");

    const evidence = {
      schemaVersion:
        "rik-expo-app.s27-23.stairs-concrete-vibration-large-area-independent-acceptance.v1",
      status: "GREEN_S27_23_STAIRS_CONCRETE_VIBRATION_LARGE_AREA_54M3_CORE_NOT_UI_ACCEPTED",
      releaseId,
      searchReleaseId: String(current.searchReleaseId),
      definitionId,
      sourceBatch: String(manifest.source_batch),
      lifecycle: {
        runtimePublicationState: String(manifest.runtime_publication_state),
        contentStatus: String(manifest.content_status),
        contentGateStatus: String(manifest.content_gate_status),
      },
      definitionShape: [parameters.rows.length, formulas.rows.length, resources.rows.length],
      firstEstimate: {
        input: { consolidated_concrete_volume_m3: 54 },
        rows: first.rows.length,
        preliminaryNeeds: first.preliminaryNeeds.length,
        procurementRows: first.rows.filter((candidate) => candidate.included_in_procurement).length,
        laborManH: quantity(first,
          "concrete-stairs-vibration-large-area:03:labor:vibration-crew"),
        vibratorMachineH: quantity(first,
          "concrete-stairs-vibration-large-area:03:equipment:active-vibrator"),
        rentalShifts: quantity(first,
          "concrete-stairs-vibration-large-area:03:equipment:rental-shifts"),
        electricityKwh: quantity(first,
          "concrete-stairs-vibration-large-area:03:material:electricity"),
        cleaningWaterM3: quantity(first,
          "concrete-stairs-vibration-large-area:04:consumable:cleaning-water"),
      },
      changedEstimate: {
        input: { consolidated_concrete_volume_m3: 72 },
        laborManH: quantity(changed,
          "concrete-stairs-vibration-large-area:03:labor:vibration-crew"),
        vibratorMachineH: quantity(changed,
          "concrete-stairs-vibration-large-area:03:equipment:active-vibrator"),
        electricityKwh: quantity(changed,
          "concrete-stairs-vibration-large-area:03:material:electricity"),
        cleaningWaterM3: quantity(changed,
          "concrete-stairs-vibration-large-area:04:consumable:cleaning-water"),
      },
      sourceHashes: {
        sourcePack: sha256File(SOURCE_PACK_PATH),
        definitionOwner: sha256File(
          "src/lib/estimate/v4/stairsConcreteVibrationLargeAreaS2723.ts",
        ),
        contextAdapter: sha256File(
          "src/lib/estimate/v4/stairsConcreteVibrationContextAdapterS2723.ts",
        ),
      },
      productionAccessed: false,
      activationPerformed: false,
      webAccepted: false,
      androidAccepted: false,
      persistenceAccepted: false,
      historyAccepted: false,
      procurementUiAccepted: false,
      pdfAccepted: false,
      blocker: "ordinary staging consumer authorization is unavailable",
    };
    if (write) {
      mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
      const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
      writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
      renameSync(temporary, OUTPUT_PATH);
    }
    process.stdout.write(`${JSON.stringify({ ...evidence, mutationPerformed: write }, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
