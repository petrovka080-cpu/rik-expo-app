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
  S2721_BULKHEAD_FRAME_CATALOG_ID,
  S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
} from "../estimate/r5/s2721BulkheadFramePreliminaryProfile";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const SOURCE_PACK_PATH =
  "data/estimate-benchmarks/source-packs/drywall-ceiling-bulkhead-frame-50m2-preliminary-profile-r1.json";
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/drywall-bulkhead-frame-50-independent-acceptance/acceptance.json",
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
      [releaseId, S2721_BULKHEAD_FRAME_CATALOG_ID],
    )).rows[0] as Json | undefined;
    invariant(manifest, "STOP_S2723_BULKHEAD_MANIFEST_MISSING");
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
      compilerVersion: "s27-23-bulkhead-frame-50-independent-acceptance",
      catalogId: S2721_BULKHEAD_FRAME_CATALOG_ID,
      primaryMeasureParameterId: "area_m2",
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
    const first = await compile({ area_m2: 50 });
    const changedSpacing = await compile({ area_m2: 50, cross_member_spacing_m: 0.4 });
    const reinforced = await compile({ area_m2: 50, reinforcement_profile_length_m: 6 });
    const quantity = (result: typeof first, suffix: string) =>
      result.rows.find((candidate) => candidate.row_id.endsWith(`:${suffix}`))?.quantity;

    invariant(parameters.rows.length === 29 && formulas.rows.length === 31
      && resources.rows.length === 31, "STOP_S2723_BULKHEAD_SHAPE");
    invariant(first.rows.length === 29 && first.preliminaryNeeds.length === 0,
      "STOP_S2723_BULKHEAD_FIRST_ESTIMATE");
    invariant(first.rows.filter((candidate) => candidate.included_in_procurement).length === 18,
      "STOP_S2723_BULKHEAD_PROCUREMENT");
    invariant(quantity(first, "longitudinal_profile_packages") === "28"
      && quantity(first, "horizontal_profile_packages") === "22"
      && quantity(first, "vertical_profile_packages") === "15"
      && quantity(first, "profile_intersection_connectors") === "164"
      && quantity(first, "suspension_hangers") === "96"
      && quantity(first, "structural_support_anchors") === "96",
    "STOP_S2723_BULKHEAD_CONTROL_QUANTITIES");
    invariant(quantity(changedSpacing, "profile_intersection_connectors") === "204"
      && quantity(changedSpacing, "suspension_hangers") === "96",
    "STOP_S2723_BULKHEAD_SPACING_RECALCULATION");
    invariant(reinforced.rows.length === 31
      && quantity(reinforced, "opening_reinforcement_profile_packages") === "3"
      && quantity(reinforced, "opening_reinforcement_installation") === "6",
    "STOP_S2723_BULKHEAD_REINFORCEMENT_BRANCH");
    invariant(first.rows.every((candidate) => candidate.unit_price == null
      && candidate.amount == null), "STOP_S2723_BULKHEAD_UNKNOWN_PRICE_NOT_NULL");
    invariant(sha256File(SOURCE_PACK_PATH) === S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
      "STOP_S2723_BULKHEAD_SOURCE_PACK_HASH");

    const evidence = {
      schemaVersion: "rik-expo-app.s27-23.drywall-bulkhead-frame-50-independent-acceptance.v1",
      status: "GREEN_S27_23_DRYWALL_BULKHEAD_FRAME_50M2_CORE_NOT_UI_ACCEPTED",
      releaseId,
      searchReleaseId: String(current.searchReleaseId),
      definitionId,
      inheritedSourceBatch: String(manifest.source_batch),
      lifecycle: {
        runtimePublicationState: String(manifest.runtime_publication_state),
        contentStatus: String(manifest.content_status),
        contentGateStatus: String(manifest.content_gate_status),
      },
      definitionShape: [parameters.rows.length, formulas.rows.length, resources.rows.length],
      firstEstimate: {
        input: {
          area_m2: 50,
          bulkhead_length_m: confirmedParameters.bulkhead_length_m,
          bottom_face_width_m: confirmedParameters.bottom_face_width_m,
          side_face_height_m: confirmedParameters.side_face_height_m,
          side_face_count: confirmedParameters.side_face_count,
        },
        rows: first.rows.length,
        preliminaryNeeds: first.preliminaryNeeds.length,
        procurementRows: first.rows.filter((candidate) => candidate.included_in_procurement).length,
        longitudinalProfilePackages: quantity(first, "longitudinal_profile_packages"),
        horizontalProfilePackages: quantity(first, "horizontal_profile_packages"),
        verticalProfilePackages: quantity(first, "vertical_profile_packages"),
        profileIntersectionConnectors: quantity(first, "profile_intersection_connectors"),
        supportPoints: quantity(first, "suspension_hangers"),
        structuralAnchors: quantity(first, "structural_support_anchors"),
      },
      changedSpacing: {
        input: { cross_member_spacing_m: 0.4 },
        profileIntersectionConnectors: quantity(changedSpacing, "profile_intersection_connectors"),
        supportPoints: quantity(changedSpacing, "suspension_hangers"),
      },
      reinforcementBranch: {
        input: { reinforcement_profile_length_m: 6 },
        rows: reinforced.rows.length,
        reinforcementProfilePackages: quantity(reinforced, "opening_reinforcement_profile_packages"),
        reinforcementInstallationM: quantity(reinforced, "opening_reinforcement_installation"),
      },
      sourceHashes: {
        sourcePack: sha256File(SOURCE_PACK_PATH),
        definitionOwner: sha256File("scripts/estimate/r5/s2721BulkheadFramePreliminaryProfile.ts"),
      },
      scopeBoundary: "FRAME_ONLY; sheets, sheet fasteners and finishing are separate technologies",
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
