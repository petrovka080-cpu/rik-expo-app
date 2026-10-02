import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { buildGlobalCatalogInventoryV1 } from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.remaining-catalog-current-gap-audit.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const BATCH_INVENTORY_PATH = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
);
const OUTPUT_PATH = resolve(process.env.R4A13_OUTPUT_PATH
  ?? ".release-runtime/r568/s27-21/remaining-catalog-current-gap-v1/acceptance.json");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const DEFAULT_BATCH = "rik-expo-app.r568.r4-a6-group50-default-binding-remediation.v2";
const SOURCE_PATHS = [
  "src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1.ts",
  "data/estimate-templates/estimate-10000-readiness-manifest.json",
  "data/estimate-catalog/expanded-complex/templates.json",
  "scripts/estimate/r4a13/auditS2721RemainingCatalogCurrentGap.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)))
    .digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).trim();
}

function targetCatalogId(sourceCatalogId: string): string {
  return sourceCatalogId.startsWith("expanded-template:")
    ? sourceCatalogId
    : `canonical-work:base:${sourceCatalogId}`;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_S2721_REMAINING_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_S2721_REMAINING_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_S2721_REMAINING_BRANCH");
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_S2721_REMAINING_MASTER_HASH");
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft", "STOP_S2721_REMAINING_POINTER_STATE");

  const batchInventory = JSON.parse(readFileSync(BATCH_INVENTORY_PATH, "utf8")) as {
    groups: { batch_id: string; member_catalog_ids: string[] }[];
  };
  const batchIds = [...new Set(batchInventory.groups.flatMap((group) => group.member_catalog_ids))].sort();
  invariant(batchIds.length === 3318, `STOP_S2721_BATCH001008_UNION:${batchIds.length}`);

  const globalInventory = buildGlobalCatalogInventoryV1();
  invariant(globalInventory.catalog_total === 11610 && globalInventory.rows.length === 11610,
    "STOP_S2721_GLOBAL_CATALOG_DENOMINATOR");
  const globalIdSet = new Set(globalInventory.rows.map((row) => row.catalog_id));
  const batchIdsOutsideGlobal = batchIds.filter((catalogId) => !globalIdSet.has(catalogId));
  const batchGlobalIds = batchIds.filter((catalogId) => globalIdSet.has(catalogId));
  const batchGlobalSet = new Set(batchGlobalIds);
  const remainingRows = globalInventory.rows.filter((row) => !batchGlobalSet.has(row.catalog_id));
  invariant(batchGlobalIds.length === 3316 && batchIdsOutsideGlobal.length === 2 && remainingRows.length === 8294,
    `STOP_S2721_REMAINING_BOUNDARY:${JSON.stringify({ batchGlobal: batchGlobalIds.length, outside: batchIdsOutsideGlobal, remaining: remainingRows.length })}`);

  const targetIds = remainingRows.map((row) => targetCatalogId(row.catalog_id));
  const sourceByTarget = new Map(remainingRows.map((row) => [targetCatalogId(row.catalog_id), row]));
  const readinessCounts = Object.fromEntries([...new Set(remainingRows.map((row) => row.current_readiness))]
    .sort().map((readiness) => [readiness, remainingRows.filter((row) => row.current_readiness === readiness).length]));
  const blockerCounts = new Map<string, number>();
  for (const row of remainingRows) {
    for (const blocker of row.current_blockers) blockerCounts.set(blocker, (blockerCounts.get(blocker) ?? 0) + 1);
  }
  const topSourceBlockers = [...blockerCounts.entries()]
    .map(([blocker, count]) => ({ blocker, count }))
    .sort((left, right) => right.count - left.count || left.blocker.localeCompare(right.blocker))
    .slice(0, 40);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const manifestRows = (await client.query(`select target.catalog_id,
        manifest.source_batch,
        (select count(*)::int from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=definition.id) parameters,
        (select count(*)::int from public.estimate_formula_graph formula
          where formula.definition_version_id=definition.id) formulas,
        (select count(*)::int from public.estimate_resource_spec resource
          where resource.definition_version_id=definition.id) resources
      from unnest($2::text[]) target(catalog_id)
      left join public.estimate_cumulative_manifest_entry manifest
        on manifest.release_id=$1 and manifest.catalog_id=target.catalog_id
      left join public.estimate_definition_version definition
        on definition.id=manifest.definition_version_id
      order by target.catalog_id`, [current.definitionReleaseId, targetIds])).rows as Json[];
    invariant(manifestRows.length === 8294, "STOP_S2721_REMAINING_MANIFEST_DENOMINATOR");
    const missing = manifestRows.filter((row) => row.source_batch == null);
    const generic = manifestRows.filter((row) => row.source_batch === DEFAULT_BATCH);
    const specialized = manifestRows.filter((row) => row.source_batch != null && row.source_batch !== DEFAULT_BATCH);

    const domainMap = new Map<string, {
      domainId: string;
      targets: number;
      present: number;
      missing: number;
      default: number;
      specialized: number;
      blockedSourceRequired: number;
      classifiedOnly: number;
    }>();
    for (const manifest of manifestRows) {
      const source = sourceByTarget.get(String(manifest.catalog_id));
      invariant(source, `STOP_S2721_REMAINING_SOURCE_LOOKUP:${manifest.catalog_id}`);
      const domain = domainMap.get(source.domain_id) ?? {
        domainId: source.domain_id,
        targets: 0,
        present: 0,
        missing: 0,
        default: 0,
        specialized: 0,
        blockedSourceRequired: 0,
        classifiedOnly: 0,
      };
      domain.targets += 1;
      if (manifest.source_batch == null) domain.missing += 1;
      else domain.present += 1;
      if (manifest.source_batch === DEFAULT_BATCH) domain.default += 1;
      else if (manifest.source_batch != null) domain.specialized += 1;
      if (source.current_readiness === "BLOCKED_SOURCE_REQUIRED") domain.blockedSourceRequired += 1;
      if (source.current_readiness === "CLASSIFIED") domain.classifiedOnly += 1;
      domainMap.set(source.domain_id, domain);
    }
    const domains = [...domainMap.values()]
      .sort((left, right) => (right.default + right.missing) - (left.default + left.missing)
        || left.domainId.localeCompare(right.domainId));
    const genericShape = [...generic.reduce((groups, row) => {
      const key = `${Number(row.parameters)}/${Number(row.formulas)}/${Number(row.resources)}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
      return groups;
    }, new Map<string, number>()).entries()]
      .map(([shape, count]) => ({ shape, count }))
      .sort((left, right) => right.count - left.count || left.shape.localeCompare(right.shape));
    const specializedBatches = [...specialized.reduce((groups, row) => {
      const key = String(row.source_batch);
      groups.set(key, (groups.get(key) ?? 0) + 1);
      return groups;
    }, new Map<string, number>()).entries()]
      .map(([sourceBatch, count]) => ({ sourceBatch, count }))
      .sort((left, right) => right.count - left.count || left.sourceBatch.localeCompare(right.sourceBatch));
    const currentTotals = (await client.query(`select
        count(*)::int definitions,
        count(*) filter(where source_batch=$2)::int default_definitions,
        count(*) filter(where source_batch<>$2)::int specialized_definitions
      from public.estimate_cumulative_manifest_entry where release_id=$1`,
    [current.definitionReleaseId, DEFAULT_BATCH])).rows[0] as Json;

    const receipt: Json = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      status: "RED_S2721_REMAINING_CATALOG_SOURCE_AND_DOMAIN_REVIEW_REQUIRED",
      mutationPerformed: false,
      boundary: {
        globalCatalogCount: globalInventory.rows.length,
        globalInventoryHash: globalInventory.inventory_hash,
        batch001008UniqueIds: batchIds.length,
        batch001008GlobalIds: batchGlobalIds.length,
        batchIdsOutsideGlobal,
        remainingGlobalCatalogIds: remainingRows.length,
      },
      current: {
        definitionReleaseId: current.definitionReleaseId,
        searchReleaseId: current.searchReleaseId,
        owner: current.owner,
        cumulativeTotals: Object.fromEntries(Object.entries(currentTotals)
          .map(([key, value]) => [key, Number(value)])),
        remainingTargetCount: remainingRows.length,
        presentCount: manifestRows.length - missing.length,
        missingCount: missing.length,
        genericDefaultCount: generic.length,
        specializedCount: specialized.length,
        genericShape,
        specializedSourceBatchCount: specializedBatches.length,
        specializedBatches,
        missingCatalogIds: missing.map((row) => row.catalog_id),
        domains,
      },
      sourceInventory: {
        readinessCounts,
        topSourceBlockers,
        blockedSourceRequired: Number(readinessCounts.BLOCKED_SOURCE_REQUIRED ?? 0),
        classifiedOnly: Number(readinessCounts.CLASSIFIED ?? 0),
        automaticallyPublishableWithoutNewSourceOrReview: 0,
      },
      blockers: [
        {
          code: "REMAINING_CURRENT_MANIFEST_GENERIC_OR_MISSING",
          count: generic.length + missing.length,
          nextAction: "Replace only after family-specific source-backed norms and first-estimate inputs are available; preserve accepted successors.",
        },
        {
          code: "SOURCE_BACKED_NORM_REQUIRED",
          count: Number(readinessCounts.BLOCKED_SOURCE_REQUIRED ?? 0),
          nextAction: "Provide and verify row-level normative sources; the inventory explicitly forbids treating generic norm labels as proof.",
        },
        {
          code: "DOMAIN_EXPERT_REVIEW_AND_NORMATIVE_PROFILE_REQUIRED",
          count: Number(readinessCounts.CLASSIFIED ?? 0),
          nextAction: "Complete domain review and exact normative profile before formula/resource publication.",
        },
      ],
      checks: {
        currentManifestInspectedReadOnly: true,
        globalCatalogRebuiltFromCurrentWorktree: true,
        sourceAutomaticallyPublishableCount: 0,
        productionAccessed: false,
        deployPerformed: false,
        activationPerformed: false,
      },
      source: {
        branch: git("branch", "--show-current"),
        head: git("rev-parse", "HEAD"),
        tree: git("rev-parse", "HEAD^{tree}"),
        batchInventoryPath: BATCH_INVENTORY_PATH,
        batchInventorySha256: sha256(readFileSync(BATCH_INVENTORY_PATH)),
        sourceHashes: SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) })),
      },
      master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
    };
    receipt.receiptSha256 = sha256(receipt);
    atomicJson(OUTPUT_PATH, receipt);
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      boundary: receipt.boundary,
      current: {
        remainingTargetCount: receipt.current.remainingTargetCount,
        presentCount: receipt.current.presentCount,
        missingCount: receipt.current.missingCount,
        genericDefaultCount: receipt.current.genericDefaultCount,
        specializedCount: receipt.current.specializedCount,
        genericShape: receipt.current.genericShape,
        domainCount: receipt.current.domains.length,
        topDomains: receipt.current.domains.slice(0, 20),
      },
      sourceInventory: receipt.sourceInventory,
      receiptSha256: receipt.receiptSha256,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main();
