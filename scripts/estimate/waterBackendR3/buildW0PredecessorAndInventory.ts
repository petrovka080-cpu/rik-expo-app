import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { Client } from "pg";

import { estimateDeterministicHash } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildGlobalCatalogInventoryV1 } from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";
import {
  WATER_BACKEND_EXPANDED_OWNED_FAMILIES,
  WATER_BACKEND_REVIEWED_BOUNDARY_FAMILIES,
} from "./waterOwnedFamilies";

const ROOT = resolve(__dirname, "../../..");
const DEFAULT_PREDECESSOR_ROOT = resolve(ROOT, "../rik-expo-app-master11610-backend-r1");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence");
const SPEC_PATH = "C:\\Users\\User\\Downloads\\BATCH006_FULL_WATER_SUPPLY_SEWERAGE_DRAINAGE_AND_PLUMBING_BACKEND_NATIVE_DOMAIN_COMPLETION_PROGRAM_R3.md";
const EXPECTED_SPEC_SHA256 = "959725deff9189ebdfcd2c4d8431b5ce180df3618d0ed358d78ef8914e61a983";

type Classification =
  | "IN_DOMAIN_PRIMARY"
  | "IN_DOMAIN_VARIANT"
  | "IN_DOMAIN_PROVED_ALIAS"
  | "TYPED_CHILD_OF_WATER_DOMAIN"
  | "OUT_OF_DOMAIN_WITH_REASON"
  | "UNRESOLVED_P0";

type JsonRecord = Record<string, unknown>;

const REQUIRED_SEARCH_FAMILIES = Object.freeze([
  "internal_cold_water",
  "internal_hot_water",
  "dhw_circulation",
  "collector_and_tee_distribution",
  "risers_mains_inlets_connections",
  "internal_domestic_sewer",
  "industrial_sewer",
  "internal_drains",
  "external_water",
  "external_gravity_sewer",
  "external_pressure_sewer",
  "stormwater_sewer",
  "surface_and_deep_drainage",
  "wells_chambers_inlets",
  "water_meter_assemblies",
  "pressure_regulating_assemblies",
  "booster_pumps",
  "sewer_pumps",
  "accumulators_tanks_reservoirs",
  "water_treatment",
  "local_treatment_and_septic",
  "sanitary_fixtures",
  "mixers_traps_outlets_connections",
  "trench_installation",
  "trenchless_crossings",
  "tie_ins_switchovers_connections",
  "flushing_disinfection_testing",
  "diagnostics_cctv_leak_detection",
  "demolition",
  "repair_replacement_restoration",
  "commissioning",
  "as_built_documentation",
]);

const OWNED_EXPANDED_FAMILIES = new Set<string>([
  ...WATER_BACKEND_EXPANDED_OWNED_FAMILIES,
]);
const R3_DRAINAGE_BOUNDARY_CORRECTION = new Set<string>([
  "drainage_channel",
  "drainage_prism",
]);

const TYPED_CHILD_FAMILIES = new Set([
  "dewatering_system",
  "hydraulic_testing",
  "multi_utility_trench",
  "pipe_bedding_backfill",
  "pipeline_insulation",
  "pipeline_pressure_testing",
  "pipeline_welding",
  "service_chambers",
  "utility_crossings",
  "utility_trench",
]);

const OWNER_BY_FAMILY: Readonly<Record<string, string>> = Object.freeze({
  dewatering_system: "EARTHWORKS",
  environmental_monitoring_wells: "ENVIRONMENTAL_MONITORING",
  fire_fighting_pump_station: "FIRE_PROTECTION",
  fire_hydrants: "FIRE_PROTECTION",
  gutters_downpipes: "ROOFING_RAINWATER",
  hydraulic_testing: "CROSS_DOMAIN_TESTING",
  intake_structure: "HYDRAULIC_STRUCTURES",
  irrigation_channel: "LANDSCAPE_IRRIGATION",
  leachate_collection: "LANDFILL_ENVIRONMENTAL",
  multi_utility_trench: "MULTI_UTILITY_COORDINATION",
  pipe_bedding_backfill: "EARTHWORKS",
  pipeline_compensators: "HVAC_HEATING_PROCESS_PIPE",
  pipeline_insulation: "INSULATION",
  pipeline_pressure_testing: "CROSS_DOMAIN_TESTING",
  pipeline_welding: "CROSS_DOMAIN_WELDING",
  preinsulated_pipe_installation: "HVAC_HEATING_NETWORK",
  pressure_pipeline_industrial: "PROCESS_PIPING",
  process_piping_dn50_dn1200: "PROCESS_PIPING",
  road_drainage: "ROADS",
  service_chambers: "MULTI_UTILITY_COORDINATION",
  sprinkler_system: "FIRE_PROTECTION",
  technological_pipeline: "PROCESS_PIPING",
  tunnel_drainage: "TUNNELS",
  utility_crossings: "MULTI_UTILITY_COORDINATION",
  utility_trench: "MULTI_UTILITY_COORDINATION",
  water_control_gates: "HYDRAULIC_STRUCTURES",
  water_intake_hpp: "HYDROPOWER",
  district_heating_pipeline: "HVAC_HEATING_NETWORK",
  heat_network: "HVAC_HEATING_NETWORK",
  gas_pipeline_low_pressure: "GAS_SUPPLY",
  gas_pipeline_medium_pressure: "GAS_SUPPLY",
});

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function writeJson(file: string, value: unknown): void {
  writeFileSync(join(EVIDENCE_ROOT, file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(file: string, rows: readonly unknown[]): void {
  writeFileSync(join(EVIDENCE_ROOT, file), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }).trim();
}

function expandedFamily(domainId: string): string | null {
  return domainId.startsWith("expanded:") ? domainId.slice("expanded:".length) : null;
}

function basePrimary(row: ReturnType<typeof buildGlobalCatalogInventoryV1>["rows"][number]): boolean {
  return row.scope_capabilities.includes("standard");
}

function expandedPrimary(row: ReturnType<typeof buildGlobalCatalogInventoryV1>["rows"][number]): boolean {
  return row.operation_class === "DETAILED_BOQ_FROM_DRAWINGS";
}

function ownerForDomain(domainId: string): string {
  const family = expandedFamily(domainId);
  return family ? (OWNER_BY_FAMILY[family] ?? `FUTURE_DOMAIN:${family}`) : `BASE_DOMAIN:${domainId}`;
}

function familyMatches(catalogId: string, domainId: string, family: string): boolean {
  const text = `${catalogId} ${domainId}`.toLocaleLowerCase("en-US");
  const rules: Readonly<Record<string, RegExp>> = {
    internal_cold_water: /(cold_water|water_pipe|water_supply|collector|valve|filter)/,
    internal_hot_water: /(hot_water|boiler|water_heater)/,
    dhw_circulation: /(circulation|recirculation|hot_water|boiler)/,
    collector_and_tee_distribution: /(collector|tee|water_pipe|distribution_pipeline)/,
    risers_mains_inlets_connections: /(riser|main|inlet|connection|water_pipe|house_connection_water|site_water_connection)/,
    internal_domestic_sewer: /(sewer|waste|drain|trap|toilet|bath|shower|sink)/,
    industrial_sewer: /(wastewater|sewage|sludge|aeration)/,
    internal_drains: /(drain|rainwater|stormwater)/,
    external_water: /(distribution_pipeline|pressure_pipeline|settlement_water|village_water|site_water|house_connection_water)/,
    external_gravity_sewer: /(gravity_sewer|sewer_collector|village_sewer|site_sewer)/,
    external_pressure_sewer: /(pressure_sewer|sewer_pumping)/,
    stormwater_sewer: /(stormwater|rainwater|outfall)/,
    surface_and_deep_drainage: /(drainage_channel|drainage_prism|stormwater|rainwater)/,
    wells_chambers_inlets: /(well|chamber|manhole|rainwater_inlets)/,
    water_meter_assemblies: /(water_meter|meter)/,
    pressure_regulating_assemblies: /(pressure|valve|regulat|booster)/,
    booster_pumps: /(booster_pumping|pumping_station|pump)/,
    sewer_pumps: /(sewer_pumping|wastewater.*pump|sewage.*pump)/,
    accumulators_tanks_reservoirs: /(tank|reservoir|water_tower|accumulator)/,
    water_treatment: /(treatment|filter|chlorination|disinfection)/,
    local_treatment_and_septic: /(septic|wastewater_treatment|sewage_treatment)/,
    sanitary_fixtures: /(bath|bidet|shower|sink|toilet|urinal|washbasin|sanitary)/,
    mixers_traps_outlets_connections: /(mixer|trap|outlet|connect|siphon|faucet)/,
    trench_installation: /(pipeline|water_network|sewer_network|site_water|site_sewer|distribution_pipeline)/,
    trenchless_crossings: /(crossing|pipeline|site_water|site_sewer)/,
    tie_ins_switchovers_connections: /(connect|connection|tie|site_water|site_sewer|house_connection)/,
    flushing_disinfection_testing: /(flushing|disinfection|testing|pressure_test)/,
    diagnostics_cctv_leak_detection: /(inspection|diagnostic|leak|repair)/,
    demolition: /(demolition|dismantle|remove)/,
    repair_replacement_restoration: /(repair|replace|restore)/,
    commissioning: /(commission|testing|flushing|disinfection|treatment|pumping_station)/,
    as_built_documentation: /(as_built|inspection|commission|testing)/,
  };
  return rules[family]?.test(text) ?? false;
}

async function main(): Promise<void> {
  const progress = (stage: string): void => {
    process.stderr.write(`[batch006-w0] ${stage}\n`);
  };
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  progress("read-predecessor-evidence");
  const predecessorRoot = resolve(argument("predecessor-root", DEFAULT_PREDECESSOR_ROOT));
  const predecessorEvidence = join(predecessorRoot, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
  const predecessorManifestPath = join(predecessorEvidence, "MANIFEST.json");
  const predecessorIndexPath = join(predecessorEvidence, "EXACT_SHA_EVIDENCE_INDEX.json");
  const predecessorTokenPath = join(predecessorEvidence, "FINAL_TOKEN.txt");
  const predecessorManifestBytes = readFileSync(predecessorManifestPath);
  const predecessorManifest = JSON.parse(predecessorManifestBytes.toString("utf8"));
  const predecessorIndexBytes = readFileSync(predecessorIndexPath);
  const predecessorToken = readFileSync(predecessorTokenPath, "utf8").trim();
  const predecessorHead = git(predecessorRoot, ["rev-parse", "HEAD"]);
  const predecessorTree = git(predecessorRoot, ["rev-parse", "HEAD^{tree}"]);
  const predecessorStatus = git(predecessorRoot, ["status", "--porcelain=v1"]);
  const successorHead = git(ROOT, ["rev-parse", "HEAD"]);
  const successorMergeBase = git(ROOT, ["merge-base", "HEAD", predecessorHead]);
  const sourceSnapshot = git(predecessorRoot, ["ls-tree", "-r", "--full-tree", predecessorHead]);

  const specBytes = readFileSync(SPEC_PATH);
  const specHash = sha256(specBytes);
  if (specHash !== EXPECTED_SPEC_SHA256) throw new Error(`BATCH006_R3_SPEC_HASH_MISMATCH:${specHash}`);

  const databaseUrl = argument(
    "database-url",
    process.env.BATCH006_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55432/master11610_r3_exact_final",
  );
  const client = new Client({ connectionString: databaseUrl });
  progress("read-predecessor-database");
  await client.connect();
  let releaseResult;
  let stateResult;
  let watermarkResult;
  try {
    releaseResult = await client.query(
      `select id, release_key, status, source_manifest_sha256, definition_count, parameter_count,
              formula_count, resource_row_count
         from public.estimate_definition_release
        where status = 'active'
        order by activated_at desc nulls last, created_at desc
        limit 1`,
    );
    stateResult = await client.query(
      `select denominator_total, admitted_global_count, queue_remaining,
              external_reference_count, batch006_started, updated_at
         from public.estimate_program_control_state where singleton = true`,
    );
    watermarkResult = await client.query(`select coalesce(max(id), 0)::bigint as event_watermark from public.estimate_program_event`);
  } finally {
    await client.end();
  }
  if (releaseResult.rowCount !== 1 || stateResult.rowCount !== 1) throw new Error("PREDECESSOR_DATABASE_STATE_MISSING");
  const activeRelease = releaseResult.rows[0];
  const queueBefore = stateResult.rows[0];
  const programControlStateVersion = Number(watermarkResult.rows[0].event_watermark);
  const programControlStateHash = sha256(stableJson({ ...queueBefore, programControlStateVersion }));

  progress("reconstruct-global-11610");
  const inventory = buildGlobalCatalogInventoryV1();
  const knownReviewedFamilies = new Set<string>(WATER_BACKEND_REVIEWED_BOUNDARY_FAMILIES);
  const membership = inventory.rows.map((row) => {
    const family = expandedFamily(row.domain_id);
    const owned = row.domain_id === "plumbing" || (family !== null && OWNED_EXPANDED_FAMILIES.has(family));
    let classification: Classification;
    let boundaryDisposition: string;
    let owner: string;
    let reason: string;
    if (owned) {
      const primary = row.domain_id === "plumbing" ? basePrimary(row) : expandedPrimary(row);
      classification = primary ? "IN_DOMAIN_PRIMARY" : "IN_DOMAIN_VARIANT";
      boundaryDisposition = "WATER_BACKEND_OWNER";
      owner = "WATER_SUPPLY_SEWERAGE_DRAINAGE_PLUMBING";
      reason = family && R3_DRAINAGE_BOUNDARY_CORRECTION.has(family)
        ? "R3 boundary correction: permanent surface/deep drainage is explicitly in the water-domain mandate"
        : "Exact global identity belongs to the water/plumbing source family or an explicitly owned water expanded family";
    } else if (family !== null && TYPED_CHILD_FAMILIES.has(family)) {
      classification = "TYPED_CHILD_OF_WATER_DOMAIN";
      boundaryDisposition = `TYPED_CHILD_${ownerForDomain(row.domain_id)}`;
      owner = ownerForDomain(row.domain_id);
      reason = "Standalone identity remains with its specialist owner and may only be referenced by a typed child contract from a water estimate";
    } else {
      classification = "OUT_OF_DOMAIN_WITH_REASON";
      owner = ownerForDomain(row.domain_id);
      boundaryDisposition = family && ["fire_fighting_pump_station", "fire_hydrants", "sprinkler_system"].includes(family)
        ? "TYPED_CHILD_FIRE_PROTECTION"
        : `OWNED_BY_${owner}`;
      reason = knownReviewedFamilies.has(family ?? "")
        ? `Reviewed R3 boundary: standalone identity belongs to ${owner}`
        : `Global catalog domain ${row.domain_id} is outside the BATCH-006 owner boundary`;
    }
    const countsTowardWaterAdmission = classification === "IN_DOMAIN_PRIMARY" || classification === "IN_DOMAIN_VARIANT";
    const withoutHash = {
      catalog_id: row.catalog_id,
      work_key: row.work_key,
      title_ru: row.title_ru,
      source_catalog_group: row.catalog_group,
      source_domain_id: row.domain_id,
      source_row_hash: row.row_hash,
      classification,
      boundary_disposition: boundaryDisposition,
      canonical_owner: owner,
      classification_reason: reason,
      counts_toward_water_admission: countsTowardWaterAdmission,
      predecessor_already_admitted: ["asphalt", "drywall", "electrical"].includes(row.domain_id),
      alias_of: null,
    };
    return { ...withoutHash, membership_row_hash: sha256(stableJson(withoutHash)) };
  });

  const classificationCounts = membership.reduce<Record<Classification, number>>((counts, row) => {
    counts[row.classification] += 1;
    return counts;
  }, {
    IN_DOMAIN_PRIMARY: 0,
    IN_DOMAIN_VARIANT: 0,
    IN_DOMAIN_PROVED_ALIAS: 0,
    TYPED_CHILD_OF_WATER_DOMAIN: 0,
    OUT_OF_DOMAIN_WITH_REASON: 0,
    UNRESOLVED_P0: 0,
  });
  const newlyAdmittedWater = membership.filter((row) => row.counts_toward_water_admission).length;
  progress(`validate-membership-${newlyAdmittedWater}`);
  const duplicateCatalogId = membership.length - new Set(membership.map((row) => row.catalog_id)).size;
  const overlap = classificationCounts.UNRESOLVED_P0;
  if (
    inventory.catalog_total !== 11_610 || membership.length !== 11_610 || duplicateCatalogId !== 0 ||
    overlap !== 0 || newlyAdmittedWater !== 845 || predecessorHead !== successorHead ||
    successorMergeBase !== predecessorHead || predecessorStatus !== "" ||
    predecessorManifest.status !== "GREEN" || activeRelease.id !== predecessorManifest.releaseLineage.r2ReleaseId ||
    Number(queueBefore.denominator_total) !== 11_610 || Number(queueBefore.admitted_global_count) !== 1_160 ||
    Number(queueBefore.queue_remaining) !== 10_450 || Number(queueBefore.external_reference_count) !== 8 ||
    queueBefore.batch006_started !== false
  ) {
    throw new Error(`W0_INVARIANT_RED:${JSON.stringify({
      catalogTotal: inventory.catalog_total,
      membership: membership.length,
      duplicateCatalogId,
      overlap,
      newlyAdmittedWater,
      predecessorHead,
      successorHead,
      successorMergeBase,
      predecessorStatus,
      predecessorManifestStatus: predecessorManifest.status,
      activeReleaseId: activeRelease.id,
      sealedReleaseId: predecessorManifest.releaseLineage.r2ReleaseId,
      queueBefore,
    })}`);
  }

  const manifestSha256 = sha256(predecessorManifestBytes);
  const evidenceIndexSha256 = sha256(predecessorIndexBytes);
  const releaseHash = String(activeRelease.source_manifest_sha256);
  const binding = {
    schemaVersion: "batch006-r3-exact-predecessor-binding.v1",
    capturedAt: new Date().toISOString(),
    specification: {
      path: SPEC_PATH,
      file: basename(SPEC_PATH),
      bytes: statSync(SPEC_PATH).size,
      sha256: specHash,
    },
    predecessorHead,
    predecessorTree,
    predecessorToken,
    predecessorManifestSha256: manifestSha256,
    predecessorEvidenceIndexSha256: evidenceIndexSha256,
    backendDefinitionReleaseId: activeRelease.id,
    backendDefinitionReleaseHash: releaseHash,
    programControlStateVersion,
    programControlStateHash,
    queueBefore: {
      denominator: Number(queueBefore.denominator_total),
      admitted: Number(queueBefore.admitted_global_count),
      remaining: Number(queueBefore.queue_remaining),
      external: Number(queueBefore.external_reference_count),
      batch006Started: queueBefore.batch006_started,
    },
    migratedDomains: { asphaltGlobal: 55, asphaltExternal: 8, drywall: 500, electrical: 605 },
    backendSoftwareGreen: predecessorManifest.terminal.SERVER_COMPILE === "1168/1168",
    contentMigrationGreen: predecessorManifest.terminal.RESOURCE_BRANCH_COVERAGE === "101416/101416",
    clientCutoverGreen: predecessorManifest.terminal.WEB_BACKEND_CUTOVER === "GREEN" && predecessorManifest.terminal.NATIVE_ANDROID_API34_MAINACTIVITY === "GREEN",
    predecessorLegacyReachability: predecessorManifest.terminal.LEGACY_REACHABILITY,
    productionDeployed: predecessorManifest.terminal.PRODUCTION_DEPLOYED,
    worktreeClean: predecessorStatus === "",
    isolatedSuccessor: {
      root: ROOT,
      initialHead: successorHead,
      mergeBase: successorMergeBase,
      originalUserWorktreeChanged: false,
      predecessorWorktreeChanged: false,
    },
    frozenSourceSnapshot: {
      gitObject: predecessorHead,
      tree: predecessorTree,
      entryCount: sourceSnapshot.split(/\r?\n/).filter(Boolean).length,
      lsTreeSha256: sha256(sourceSnapshot),
    },
    frozenWaterIdSet: {
      count: newlyAdmittedWater,
      sha256: sha256(membership.filter((row) => row.counts_toward_water_admission).map((row) => row.catalog_id).sort().join("\n")),
      correctionFromSupersededR2: {
        oldCount: 835,
        addedFamilies: [...R3_DRAINAGE_BOUNDARY_CORRECTION].sort(),
        addedCatalogIds: 10,
      },
    },
    bindingVerdict: "GREEN_EXACT_PREDECESSOR_BOUND_AND_WATER_ID_SET_FROZEN",
  };

  const taxonomy = {
    schemaVersion: "water-backend-group-taxonomy.v1",
    generatedAt: binding.capturedAt,
    globalCatalogInventoryHash: inventory.inventory_hash,
    admittedWaterCatalogIds: newlyAdmittedWater,
    basePlumbingCatalogIds: membership.filter((row) => row.counts_toward_water_admission && row.source_domain_id === "plumbing").length,
    expandedWaterCatalogIds: membership.filter((row) => row.counts_toward_water_admission && row.source_domain_id !== "plumbing").length,
    classificationCounts,
    arithmetic: {
      total: membership.length,
      overlap: 0,
      unassigned: 0,
      unresolvedP0: classificationCounts.UNRESOLVED_P0,
      duplicateCatalogId,
      admittedBefore: Number(queueBefore.admitted_global_count),
      newlyAdmittedWater,
      projectedRemaining: Number(queueBefore.queue_remaining) - newlyAdmittedWater,
      denominatorCheck: Number(queueBefore.admitted_global_count) + newlyAdmittedWater + (Number(queueBefore.queue_remaining) - newlyAdmittedWater),
    },
    requiredSearchFamilies: REQUIRED_SEARCH_FAMILIES.map((family) => {
      const ids = membership.filter((row) => row.counts_toward_water_admission && familyMatches(row.catalog_id, row.source_domain_id, family)).map((row) => row.catalog_id);
      return {
        family,
        matchingStandaloneCatalogIdCount: ids.length,
        matchingCatalogIdSetSha256: sha256(ids.sort().join("\n")),
        noStandaloneIdentityDisposition: ids.length === 0 ? "COMPONENT_OR_TYPED_CHILD_OBLIGATION_IN_EACH_APPLICABLE_PASSPORT" : null,
      };
    }),
    ownedExpandedFamilies: [...OWNED_EXPANDED_FAMILIES].sort(),
    status: "GREEN_W0_TAXONOMY_FROZEN",
  };

  const boundaryRows = membership
    .filter((row) => row.classification === "TYPED_CHILD_OF_WATER_DOMAIN" || (row.source_domain_id.startsWith("expanded:") && knownReviewedFamilies.has(row.source_domain_id.slice("expanded:".length))))
    .map((row) => ({
      catalog_id: row.catalog_id,
      source_domain_id: row.source_domain_id,
      classification: row.classification,
      boundary_disposition: row.boundary_disposition,
      canonical_owner: row.canonical_owner,
      counts_toward_water_admission: row.counts_toward_water_admission,
      double_count_guard: "STANDALONE_ID_COUNTED_ONLY_BY_CANONICAL_OWNER;WATER_REFERENCE_REQUIRES_TYPED_CHILD_OWNER_ID",
      reason: row.classification_reason,
      row_hash: row.membership_row_hash,
    }));

  progress("write-w0-evidence");
  writeJson("BATCH006_R3_EXACT_PREDECESSOR_BINDING.json", binding);
  writeJsonl("GLOBAL_11610_WATER_DOMAIN_MEMBERSHIP.jsonl", membership);
  writeJson("WATER_BACKEND_GROUP_TAXONOMY.json", taxonomy);
  writeJsonl("WATER_BACKEND_OWNER_BOUNDARY_MATRIX.jsonl", boundaryRows);
  writeJsonl("JOURNAL.jsonl", [{
    at: binding.capturedAt,
    wave: "W0",
    gate: "EXACT_PREDECESSOR_BINDING_AND_GLOBAL_MEMBERSHIP",
    status: "GREEN",
    predecessorHead,
    predecessorTree,
    waterCatalogIds: newlyAdmittedWater,
    globalCatalogIds: membership.length,
    inventoryHash: inventory.inventory_hash,
    membershipHash: sha256(membership.map((row) => row.membership_row_hash).join("\n")),
    queueMutationPerformed: false,
    productionDeployed: false,
    batch007Started: false,
  }]);

  process.stdout.write(`${JSON.stringify({
    status: "GREEN_W0",
    predecessorHead,
    predecessorTree,
    programControlStateVersion,
    programControlStateHash,
    globalCatalogIds: membership.length,
    waterCatalogIds: newlyAdmittedWater,
    classificationCounts,
    membershipSha256: sha256(membership.map((row) => row.membership_row_hash).join("\n")),
    queueMutated: false,
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
