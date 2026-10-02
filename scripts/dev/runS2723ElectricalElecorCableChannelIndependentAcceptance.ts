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
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_CATALOG_ID,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
} from "../../src/lib/estimate/v4/electricalElecorCableChannelStandardS2723";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const SOURCE_PACK_PATH =
  "data/estimate-benchmarks/source-packs/electrical-elecor-cable-channel-standard-s27-23.json";
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/electrical-elecor-cable-channel-standard-successor/independent-acceptance.json",
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
      [releaseId, ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_CATALOG_ID],
    )).rows[0] as Json | undefined;
    invariant(manifest, "STOP_S2723_ELECTRICAL_ELECOR_MANIFEST_MISSING");
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
      compilerVersion: "s27-23-electrical-elecor-cable-channel-independent-acceptance",
      catalogId: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_CATALOG_ID,
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
    const complete = await compile({
      ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
    });
    const changed = await compile({
      ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
      route_length_m: 130,
    });
    const quantity = (result: typeof complete, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId)?.quantity;
    const expectedNeeds = [
      "electrical-elecor:05:component:inner-corner-sets",
      "electrical-elecor:05:component:outer-corner-sets",
      "electrical-elecor:05:component:flat-angle-sets",
      "electrical-elecor:05:component:tee-sets",
      "electrical-elecor:05:component:end-cap-sets",
      "electrical-elecor:05:operation:inner-corners",
      "electrical-elecor:05:operation:outer-corners",
      "electrical-elecor:05:operation:flat-angles",
      "electrical-elecor:05:operation:tees",
      "electrical-elecor:05:operation:end-caps",
    ].sort();

    invariant(parameters.rows.length === 22 && formulas.rows.length === 33
      && resources.rows.length === 41, "STOP_S2723_ELECTRICAL_ELECOR_SHAPE");
    invariant(first.rows.length === 31 && first.preliminaryNeeds.length === 10,
      "STOP_S2723_ELECTRICAL_ELECOR_FIRST_ESTIMATE");
    invariant(JSON.stringify(first.preliminaryNeeds.map((need) => need.row_id).sort())
      === JSON.stringify(expectedNeeds), "STOP_S2723_ELECTRICAL_ELECOR_VISIBLE_NEEDS");
    invariant(complete.rows.length === 41 && complete.preliminaryNeeds.length === 0,
      "STOP_S2723_ELECTRICAL_ELECOR_COMPLETE_ESTIMATE");
    invariant(complete.rows.filter((candidate) => candidate.included_in_procurement).length === 15,
      "STOP_S2723_ELECTRICAL_ELECOR_PROCUREMENT");
    invariant(quantity(complete, "electrical-elecor:02:material:channel-packs") === "5"
      && quantity(complete, "electrical-elecor:02:control:channel-order") === "120"
      && quantity(complete, "electrical-elecor:02:control:channel-remainder") === "15"
      && quantity(complete, "electrical-elecor:03:fastener:points") === "201"
      && quantity(complete, "electrical-elecor:03:fastener:packages") === "3"
      && quantity(complete, "electrical-elecor:04:component:straight-connector-sets") === "15"
      && quantity(complete, "electrical-elecor:04:control:straight-connector-remainder") === "1",
    "STOP_S2723_ELECTRICAL_ELECOR_QUANTITIES");
    invariant(quantity(changed, "electrical-elecor:02:material:channel-packs") === "6"
      && quantity(changed, "electrical-elecor:02:control:channel-order") === "144"
      && quantity(changed, "electrical-elecor:03:fastener:points") === "261"
      && quantity(changed, "electrical-elecor:04:component:straight-connector-sets") === "18"
      && quantity(changed, "electrical-elecor:06:labor:installer-hours") === "32.5",
    "STOP_S2723_ELECTRICAL_ELECOR_RECALCULATION");
    invariant(complete.rows.every((candidate) => candidate.unit_price == null
      && candidate.amount == null), "STOP_S2723_ELECTRICAL_ELECOR_UNKNOWN_PRICE_NOT_NULL");
    invariant(!complete.rows.some((candidate) =>
      /cable-pull|termination|socket|breaker|firestop/iu.test(candidate.row_id)),
    "STOP_S2723_ELECTRICAL_ELECOR_ADJACENT_SCOPE_LEAK");
    invariant(sha256File(SOURCE_PACK_PATH)
      === ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
    "STOP_S2723_ELECTRICAL_ELECOR_SOURCE_PACK_HASH");

    const evidence = {
      schemaVersion: "rik-expo-app.s27-23.electrical-elecor-cable-channel-independent-acceptance.v1",
      status: "GREEN_S27_23_ELECTRICAL_ELECOR_CABLE_CHANNEL_100M_CORE_NOT_UI_ACCEPTED",
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
        channelPacks: quantity(first, "electrical-elecor:02:material:channel-packs"),
        fastenerPackages: quantity(first, "electrical-elecor:03:fastener:packages"),
        straightConnectorSets:
          quantity(first, "electrical-elecor:04:component:straight-connector-sets"),
      },
      completedLayout: {
        input: {
          route_length_m: 100,
          inner_corner_count: 2,
          outer_corner_count: 2,
          flat_angle_count: 1,
          tee_count: 1,
          open_end_count: 2,
        },
        rows: complete.rows.length,
        preliminaryNeeds: complete.preliminaryNeeds.length,
        procurementRows: complete.rows.filter((candidate) => candidate.included_in_procurement).length,
        channelPacks: quantity(complete, "electrical-elecor:02:material:channel-packs"),
        channelOrderM: quantity(complete, "electrical-elecor:02:control:channel-order"),
        channelRemainderM: quantity(complete, "electrical-elecor:02:control:channel-remainder"),
        fastenerPoints: quantity(complete, "electrical-elecor:03:fastener:points"),
        fastenerPackages: quantity(complete, "electrical-elecor:03:fastener:packages"),
        straightConnectorSets:
          quantity(complete, "electrical-elecor:04:component:straight-connector-sets"),
        straightConnectorRemainder:
          quantity(complete, "electrical-elecor:04:control:straight-connector-remainder"),
      },
      changedRoute: {
        input: { route_length_m: 130 },
        channelPacks: quantity(changed, "electrical-elecor:02:material:channel-packs"),
        channelOrderM: quantity(changed, "electrical-elecor:02:control:channel-order"),
        fastenerPoints: quantity(changed, "electrical-elecor:03:fastener:points"),
        straightConnectorSets:
          quantity(changed, "electrical-elecor:04:component:straight-connector-sets"),
        installerManH: quantity(changed, "electrical-elecor:06:labor:installer-hours"),
      },
      restoredOfficialSources: {
        kgManifestSha256: sha256File(
          ".release-runtime/r568/s27-23/q4-electrical-official-sources/OFFICIAL_SOURCE_SNAPSHOT_MANIFEST.json",
        ),
        iekManifestSha256: sha256File(
          ".release-runtime/r568/s27-23/q4-electrical-cable-channel-official-sources/manifest.json",
        ),
      },
      sourceHashes: {
        sourcePack: sha256File(SOURCE_PACK_PATH),
        definitionOwner:
          sha256File("src/lib/estimate/v4/electricalElecorCableChannelStandardS2723.ts"),
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
