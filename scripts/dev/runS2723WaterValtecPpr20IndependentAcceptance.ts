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
  WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
  WATER_VALTEC_PPR20_STANDARD_S2723_CATALOG_ID,
  WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
} from "../../src/lib/estimate/v4/waterValtecPpr20StandardS2723";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const SOURCE_PACK_PATH =
  "data/estimate-benchmarks/source-packs/water-valtec-ppr20-standard-s27-23.json";
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/water-valtec-ppr20-standard-successor/independent-acceptance.json",
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
      [releaseId, WATER_VALTEC_PPR20_STANDARD_S2723_CATALOG_ID],
    )).rows[0] as Json | undefined;
    invariant(manifest, "STOP_S2723_WATER_VALTEC_PPR20_MANIFEST_MISSING");
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
      compilerVersion: "s27-23-water-valtec-ppr20-independent-acceptance",
      catalogId: WATER_VALTEC_PPR20_STANDARD_S2723_CATALOG_ID,
      primaryMeasureParameterId: "route_length_m",
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
    const first = await compile({ route_length_m: 100 });
    const complete = await compile({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT });
    const changed = await compile({
      ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
      route_length_m: 130,
    });
    const quantity = (result: typeof complete, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId)?.quantity;

    invariant(parameters.rows.length === 35 && formulas.rows.length === 37
      && resources.rows.length === 51, "STOP_S2723_WATER_VALTEC_PPR20_SHAPE");
    invariant(first.rows.length === 34 && first.preliminaryNeeds.length === 17,
      "STOP_S2723_WATER_VALTEC_PPR20_FIRST_ESTIMATE");
    invariant(first.rows.filter((candidate) => candidate.included_in_procurement).length === 12,
      "STOP_S2723_WATER_VALTEC_PPR20_FIRST_PROCUREMENT");
    invariant(complete.rows.length === 51 && complete.preliminaryNeeds.length === 0,
      "STOP_S2723_WATER_VALTEC_PPR20_COMPLETE_ESTIMATE");
    invariant(complete.rows.filter((candidate) => candidate.included_in_procurement).length === 21,
      "STOP_S2723_WATER_VALTEC_PPR20_COMPLETE_PROCUREMENT");
    invariant(quantity(complete, "water-ppr20:02:material:pipe-sections") === "27"
      && quantity(complete, "water-ppr20:02:control:pipe-order") === "108"
      && quantity(complete, "water-ppr20:02:control:pipe-remainder") === "3"
      && quantity(complete, "water-ppr20:02:control:pipe-mass") === "17.928"
      && quantity(complete, "water-ppr20:03:fastener:support-points") === "201"
      && quantity(complete, "water-ppr20:04:component:straight-couplings") === "24"
      && quantity(complete, "water-ppr20:07:control:test-pressure") === "6"
      && quantity(complete, "water-ppr20:07:material:flushing-water") === "0.0411",
    "STOP_S2723_WATER_VALTEC_PPR20_QUANTITIES");
    invariant(quantity(changed, "water-ppr20:02:material:pipe-sections") === "35"
      && quantity(changed, "water-ppr20:02:control:pipe-order") === "140"
      && quantity(changed, "water-ppr20:03:fastener:support-points") === "261"
      && quantity(changed, "water-ppr20:06:labor:route-installation") === "32.5"
      && quantity(changed, "water-ppr20:07:operation:pressure-test") === "2"
      && quantity(changed, "water-ppr20:07:material:flushing-water") === "0.05343",
    "STOP_S2723_WATER_VALTEC_PPR20_RECALCULATION");
    invariant(complete.rows.every((candidate) => candidate.unit_price == null
      && candidate.amount == null), "STOP_S2723_WATER_VALTEC_PPR20_UNKNOWN_PRICE_NOT_NULL");
    invariant(!complete.rows.some((candidate) =>
      /fixture|water_meter|valve_install|thermal_insulation|firestop/iu.test(candidate.row_id)),
    "STOP_S2723_WATER_VALTEC_PPR20_ADJACENT_SCOPE_LEAK");
    invariant(sha256File(SOURCE_PACK_PATH)
      === WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
    "STOP_S2723_WATER_VALTEC_PPR20_SOURCE_PACK_HASH");

    const evidence = {
      schemaVersion: "rik-expo-app.s27-23.water-valtec-ppr20-independent-acceptance.v1",
      status: "GREEN_S27_23_WATER_VALTEC_PPR20_100M_CORE_NOT_UI_ACCEPTED",
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
        input: { route_length_m: 100 },
        rows: first.rows.length,
        preliminaryNeeds: first.preliminaryNeeds.length,
        preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id),
        procurementRows: first.rows.filter((candidate) => candidate.included_in_procurement).length,
        pipeSections: quantity(first, "water-ppr20:02:material:pipe-sections"),
        supportPackages: quantity(first, "water-ppr20:03:fastener:support-packages"),
        routeLaborManH: quantity(first, "water-ppr20:06:labor:route-installation"),
        testPressureBar: quantity(first, "water-ppr20:07:control:test-pressure"),
      },
      completedRoute: {
        input: {
          route_length_m: 100,
          straight_coupling_count: 24,
          elbow_count: 8,
          tee_count: 2,
          threaded_transition_count: 4,
          terminal_cap_count: 2,
        },
        rows: complete.rows.length,
        preliminaryNeeds: complete.preliminaryNeeds.length,
        procurementRows: complete.rows.filter((candidate) => candidate.included_in_procurement).length,
        pipeSections: quantity(complete, "water-ppr20:02:material:pipe-sections"),
        pipeOrderM: quantity(complete, "water-ppr20:02:control:pipe-order"),
        pipeRemainderM: quantity(complete, "water-ppr20:02:control:pipe-remainder"),
        pipeMassKg: quantity(complete, "water-ppr20:02:control:pipe-mass"),
        supportPoints: quantity(complete, "water-ppr20:03:fastener:support-points"),
        straightCouplings: quantity(complete, "water-ppr20:04:component:straight-couplings"),
        fusionMachineH: quantity(complete, "water-ppr20:04:equipment:fusion-machine"),
        pressureTestBar: quantity(complete, "water-ppr20:07:control:test-pressure"),
        flushingWaterM3: quantity(complete, "water-ppr20:07:material:flushing-water"),
      },
      changedRoute: {
        input: { route_length_m: 130 },
        pipeSections: quantity(changed, "water-ppr20:02:material:pipe-sections"),
        pipeOrderM: quantity(changed, "water-ppr20:02:control:pipe-order"),
        supportPoints: quantity(changed, "water-ppr20:03:fastener:support-points"),
        routeLaborManH: quantity(changed, "water-ppr20:06:labor:route-installation"),
        pressureTestSections: quantity(changed, "water-ppr20:07:operation:pressure-test"),
        flushingWaterM3: quantity(changed, "water-ppr20:07:material:flushing-water"),
      },
      restoredOfficialSources: {
        manifestSha256: sha256File(
          ".release-runtime/r568/s27-23/q5-valtec-ppr-official-sources/manifest.json",
        ),
      },
      sourceHashes: {
        sourcePack: sha256File(SOURCE_PACK_PATH),
        definitionOwner: sha256File("src/lib/estimate/v4/waterValtecPpr20StandardS2723.ts"),
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
