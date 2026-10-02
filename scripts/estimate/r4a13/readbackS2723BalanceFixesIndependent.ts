import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/balance-fixes-independent-acceptance.json",
);

const targets = [
  {
    key: "electricalCableChannel",
    catalogId: "canonical-work:base:electrical_interior_cable_channel_install_standard",
    shape: [22, 33, 41],
    locatorKey: "electrical-elecor-cable-channel-standard-s27-23-balance-r2",
    formulas: {
      electrical_elecor_channel_pieces_s2723:
        "ceil(route_length_m/channel_section_length_m)",
      electrical_elecor_straight_connectors_s2723:
        "max(0,ceil(route_length_m/channel_section_length_m)-continuous_route_count)",
    },
    rows: [
      "electrical-elecor:02:operation:cutting",
      "electrical-elecor:04:component:straight-connectors-net",
      "electrical-elecor:04:component:straight-connector-sets",
      "electrical-elecor:04:control:straight-connector-order",
      "electrical-elecor:04:control:straight-connector-remainder",
    ],
  },
  {
    key: "waterPpr20",
    catalogId: "canonical-work:base:plumbing_interior_ppr_pipe_install_standard",
    shape: [35, 38, 52],
    locatorKey: "water-valtec-ppr20-standard-s27-23-balance-r2",
    formulas: {
      water_valtec_ppr20_all_sockets_s2723:
        "(straight_coupling_count*2)+(elbow_count*2+tee_count*3+threaded_transition_count+terminal_cap_count)",
    },
    rows: [
      "water-ppr20:04:operation:socket-fusion",
      "water-ppr20:04:equipment:fusion-machine",
      "water-ppr20:05:control:total-fusion-sockets",
      "water-ppr20:05:labor:node-installation",
      "water-ppr20:06:labor:straight-fusion",
    ],
  },
  {
    key: "heatingHep2o22",
    catalogId: "canonical-work:base:heating_hvac_interior_heating_pipe_install_standard",
    shape: [43, 48, 68],
    locatorKey: "hvac-wavin-hep2o22-heating-standard-s27-23-balance-r2",
    formulas: {
      hvac_wavin_hep2o22_pipe_expected_waste_s2723:
        "route_length_m*pipe_expected_waste_percent/100",
      hvac_wavin_hep2o22_low_test_pressure_s2723: "low_pressure_test_bar",
      hvac_wavin_hep2o22_reduced_test_pressure_s2723: "working_pressure_bar*1.5/3",
      hvac_wavin_hep2o22_high_pressure_initial_pump_s2723:
        "high_pressure_initial_pump_min",
    },
    rows: [
      "hvac-hep2o22:02:material:pipe-net",
      "hvac-hep2o22:02:material:pipe-expected-waste",
      "hvac-hep2o22:02:material:pipe-reserve",
      "hvac-hep2o22:02:control:ordered-length",
      "hvac-hep2o22:02:control:available-before-losses",
      "hvac-hep2o22:02:control:pipe-remainder",
      "hvac-hep2o22:07:control:low-test-pressure",
      "hvac-hep2o22:07:control:low-test-hold",
      "hvac-hep2o22:07:control:test-pressure",
      "hvac-hep2o22:07:control:high-pressure-pump",
      "hvac-hep2o22:07:control:reduced-test-pressure",
      "hvac-hep2o22:07:control:test-record",
    ],
  },
  ...[
    ["stairsVibrationStandard", "concrete_foundation_interior_stairs_concrete_vibrate_standard", "stairs-concrete-vibration-standard-s27-23-balance-r2", "concrete-stairs-vibration", [23, 18, 22]],
    ["stairsVibrationSmallArea", "concrete_foundation_interior_stairs_concrete_vibrate_small_area", "stairs-concrete-vibration-small-area-s27-23-balance-r2", "concrete-stairs-vibration-small-area", [23, 18, 22]],
    ["stairsVibrationLargeArea", "concrete_foundation_interior_stairs_concrete_vibrate_large_area", "stairs-concrete-vibration-large-area-s27-23-balance-r2", "concrete-stairs-vibration-large-area", [23, 18, 22]],
    ["stairsVibrationWetZone", "concrete_foundation_interior_stairs_concrete_vibrate_wet_zone", "stairs-concrete-vibration-wet-zone-s27-23-balance-r2", "concrete-stairs-vibration-wet-zone", [24, 18, 26]],
  ].map(([key, workKey, locatorKey, rowPrefix, shape]) => ({
    key: String(key),
    catalogId: `canonical-work:base:${workKey}`,
    shape: shape as number[],
    locatorKey: String(locatorKey),
    formulas: {
      stairs_concrete_vibration_cleaning_labor_s2723:
        "active_vibrator_count*cleaning_labor_h_per_used_vibrator",
      stairs_concrete_vibration_cleaning_water_s2723:
        "active_vibrator_count*cleaning_water_m3_per_used_vibrator",
    },
    rows: [
      `${rowPrefix}:03:equipment:active-vibrator`,
      `${rowPrefix}:03:equipment:rental-shifts`,
      `${rowPrefix}:04:operation:cleaning`,
      `${rowPrefix}:04:labor:cleaning`,
      `${rowPrefix}:04:consumable:cleaning-water`,
    ],
  })),
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string"
    ? value
    : JSON.stringify(value)).digest("hex");
}

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at,definition_count,
        parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId]))
      .rows[0] as Json | undefined;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_23_BALANCE_READBACK_RELEASE_LIFECYCLE");

    const readbacks: Json[] = [];
    for (const target of targets) {
      const persisted = (await client.query(`select manifest.catalog_id,
          manifest.definition_version_id::text,manifest.source_batch,
          manifest.runtime_publication_state,definition.definition_version,
          definition.content_status,definition.content_gate_status,
          passport.parameter_count,passport.formula_count,passport.resource_count,
          passport.payload_sha256
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version definition
          on definition.id=manifest.definition_version_id
        join public.estimate_content_passport_r3 passport
          on passport.definition_version_id=definition.id
        where manifest.release_id=$1 and manifest.catalog_id=$2`, [
        current.definitionReleaseId,
        target.catalogId,
      ])).rows[0] as Json | undefined;
      invariant(persisted != null, `STOP_S27_23_BALANCE_READBACK_TARGET:${target.key}`);

      const formulas = (await client.query(`select formula_id,expression_source
        from public.estimate_formula_graph where definition_version_id=$1`, [
        persisted.definition_version_id,
      ])).rows as Json[];
      const resources = (await client.query(`select row_id,formula_id,resource_graph,
          procurement_eligible from public.estimate_resource_spec
        where definition_version_id=$1 order by ordinal`, [persisted.definition_version_id])).rows as Json[];
      const bindings = (await client.query(`select locator.locator_key,locator.excerpt_sha256
        from public.estimate_work_normative_binding binding
        join public.estimate_normative_locator locator on locator.id=binding.locator_id
        where binding.definition_version_id=$1`, [persisted.definition_version_id])).rows as Json[];
      const search = (await client.query(`select document.definition_version_id::text,
          document.selectable,document.adjudication_class,release.status
        from public.estimate_search_document document
        join public.estimate_search_index_release release on release.id=document.search_release_id
        where document.search_release_id=$1 and document.catalog_id=$2`, [
        current.searchReleaseId,
        target.catalogId,
      ])).rows[0] as Json | undefined;

      const formulaMap = new Map(formulas.map((row) => [String(row.formula_id), String(row.expression_source)]));
      const resourceIds = new Set(resources.map((row) => String(row.row_id)));
      const expectedShape = target.shape.join(":");
      const actualShape = [persisted.parameter_count, persisted.formula_count,
        persisted.resource_count].map(Number).join(":");
      invariant(actualShape === expectedShape,
        `STOP_S27_23_BALANCE_READBACK_SHAPE:${target.key}:${actualShape}`);
      invariant(persisted.runtime_publication_state === "CANDIDATE"
        && persisted.content_status === "CANDIDATE_READY"
        && persisted.content_gate_status === "GREEN",
      `STOP_S27_23_BALANCE_READBACK_GATE:${target.key}`);
      for (const [formulaId, expression] of Object.entries(target.formulas)) {
        invariant(formulaMap.get(formulaId) === expression,
          `STOP_S27_23_BALANCE_READBACK_FORMULA:${target.key}:${formulaId}`);
      }
      for (const rowId of target.rows) {
        invariant(resourceIds.has(rowId),
          `STOP_S27_23_BALANCE_READBACK_ROW:${target.key}:${rowId}`);
      }
      invariant(bindings.length === 1 && bindings[0]?.locator_key === target.locatorKey,
        `STOP_S27_23_BALANCE_READBACK_LOCATOR:${target.key}`);
      invariant(search != null, `STOP_S27_23_BALANCE_READBACK_SEARCH_MISSING:${target.key}`);
      invariant(search.definition_version_id === persisted.definition_version_id
        && search.selectable === true && search.status === "draft",
      `STOP_S27_23_BALANCE_READBACK_SEARCH:${target.key}`);
      const persistedSearch = search;

      readbacks.push({
        key: target.key,
        catalogId: target.catalogId,
        definitionVersionId: persisted.definition_version_id,
        definitionVersion: persisted.definition_version,
        sourceBatch: persisted.source_batch,
        lifecycle: {
          runtimePublicationState: persisted.runtime_publication_state,
          contentStatus: persisted.content_status,
          contentGateStatus: persisted.content_gate_status,
        },
        definitionShape: target.shape,
        criticalFormulas: Object.fromEntries(
          Object.keys(target.formulas).map((id) => [id, formulaMap.get(id)]),
        ),
        criticalRows: target.rows,
        normativeLocator: bindings[0],
        search: {
          status: persistedSearch.status,
          selectable: persistedSearch.selectable,
          adjudicationClass: persistedSearch.adjudication_class,
        },
        payloadSha256: persisted.payload_sha256,
      });
    }

    const receipt: Json = {
      schemaVersion: "rik-expo-app.s27-23.balance-fixes-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_23_BALANCE_FIXES_CORE_NOT_UI_ACCEPTED",
      release: {
        id: release.id,
        status: release.status,
        activatedAt: release.activated_at,
        definitionCount: Number(release.definition_count),
        parameterCount: Number(release.parameter_count),
        formulaCount: Number(release.formula_count),
        resourceRowCount: Number(release.resource_row_count),
        sourceManifestSha256: release.source_manifest_sha256,
      },
      searchRelease: { id: current.searchReleaseId, status: "draft" },
      readbacks,
      scopeClassification: {
        electricalCableChannel: "ATOMIC_INSTALLATION_PROFILE",
        waterPpr20: "ROUTE_PROFILE_WITH_VISIBLE_LAYOUT_CLARIFICATIONS",
        heatingHep2o22: "ROUTE_PROFILE_WITH_VISIBLE_LAYOUT_CLARIFICATIONS",
        stairsVibrationProfiles: "ATOMIC_OPERATION_NOT_COMPLETE_STAIR_CONSTRUCTION",
      },
      uiAcceptance: {
        web: false,
        android: false,
        editPersistenceHistory: false,
        procurementUi: false,
        pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable",
      },
      productionAccessed: false,
      activationPerformed: false,
      deployPerformed: false,
      otaPerformed: false,
      storeActionPerformed: false,
    };
    receipt.receiptSha256 = sha256(receipt);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporaryPath = `${OUTPUT_PATH}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    renameSync(temporaryPath, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      releaseId: release.id,
      targetCount: readbacks.length,
      receiptSha256: receipt.receiptSha256,
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
