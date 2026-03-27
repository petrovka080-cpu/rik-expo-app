import fs from "node:fs";
import path from "node:path";

import {
  comparePlatformObservabilityBuckets,
  recommendPlatformHotspot,
  type PlatformObservabilityBucket,
} from "../src/lib/observability/platformObservability";

type SummaryArtifact = {
  summary?: {
    topSlowFetches?: PlatformObservabilityBucket[];
  };
};

type CutoverSummaryArtifact = {
  primary?: {
    durationMs?: number;
    rows?: number;
    pending?: number;
    approved?: number;
    rejected?: number;
    sourceMeta?: {
      sourceKind?: string;
      fallbackUsed?: boolean;
    };
  };
};

type WarehouseWindowingSummaryArtifact = {
  primary?: {
    page1DurationMs?: number;
    sourceKind?: string;
    primaryOwner?: string;
    page1?: {
      returnedRowCount?: number;
      totalRowCount?: number;
      hasMore?: boolean;
      limit?: number;
      offset?: number;
    };
  };
};

const projectRoot = process.cwd();

const readJson = <T>(relativePath: string): T => {
  const full = path.join(projectRoot, relativePath);
  return JSON.parse(fs.readFileSync(full, "utf8")) as T;
};

const readJsonIfExists = <T>(relativePath: string): T | null => {
  const full = path.join(projectRoot, relativePath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, "utf8")) as T;
};

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const overrideBucket = (
  buckets: PlatformObservabilityBucket[],
  key: string,
  override: Partial<PlatformObservabilityBucket>,
): PlatformObservabilityBucket[] =>
  buckets.map((bucket) =>
    `${bucket.screen}|${bucket.surface}|${bucket.event}` === key
      ? {
          ...bucket,
          ...override,
        }
      : bucket,
  );

async function main() {
  const baselineArtifact = readJson<SummaryArtifact>("artifacts/platform-observability-wave1.summary.json");
  const contractorCutover = readJson<CutoverSummaryArtifact>("artifacts/contractor-works-bundle-cutover-v1.summary.json");
  const warehouseCutover = readJson<CutoverSummaryArtifact>("artifacts/warehouse-stock-cutover-v1.summary.json");
  const warehouseWindowing = readJsonIfExists<WarehouseWindowingSummaryArtifact>(
    "artifacts/warehouse-stock-windowing-v2.summary.json",
  );
  const buyerCutover = readJsonIfExists<CutoverSummaryArtifact>("artifacts/buyer-summary-buckets-cutover-v1.summary.json");
  const buyerInboxCutover = readJsonIfExists<CutoverSummaryArtifact>("artifacts/buyer-summary-inbox-cutover-v1.summary.json");

  const baselineBuckets = Array.isArray(baselineArtifact.summary?.topSlowFetches)
    ? baselineArtifact.summary?.topSlowFetches ?? []
    : [];

  let currentBuckets = [...baselineBuckets];
  currentBuckets = overrideBucket(currentBuckets, "contractor|works_bundle|load_works_bundle", {
    count: 1,
    avgDurationMs: Number(contractorCutover.primary?.durationMs ?? 0) || 0,
    maxDurationMs: Number(contractorCutover.primary?.durationMs ?? 0) || 0,
    totalRowCount: Number(contractorCutover.primary?.rows ?? 0) || 0,
    lastSourceKind: contractorCutover.primary?.sourceMeta?.sourceKind ?? "rpc:contractor_works_bundle_scope_v1",
    fallbackCount: contractorCutover.primary?.sourceMeta?.fallbackUsed ? 1 : 0,
  });
  currentBuckets = overrideBucket(currentBuckets, "warehouse|stock_list|fetch_stock", {
    count: 1,
    avgDurationMs:
      Number(warehouseWindowing?.primary?.page1DurationMs ?? warehouseCutover.primary?.durationMs ?? 0) || 0,
    maxDurationMs:
      Number(warehouseWindowing?.primary?.page1DurationMs ?? warehouseCutover.primary?.durationMs ?? 0) || 0,
    totalRowCount:
      Number(
        warehouseWindowing?.primary?.page1?.returnedRowCount ??
          warehouseCutover.primary?.rows ??
          0,
      ) || 0,
    lastSourceKind:
      warehouseWindowing?.primary?.sourceKind ??
      warehouseCutover.primary?.sourceMeta?.sourceKind ??
      "rpc:warehouse_stock_scope_v2",
    fallbackCount: warehouseCutover.primary?.sourceMeta?.fallbackUsed ? 1 : 0,
  });
  if (buyerCutover) {
    currentBuckets = overrideBucket(currentBuckets, "buyer|summary_buckets|load_buckets", {
      count: 1,
      avgDurationMs: Number(buyerCutover.primary?.durationMs ?? 0) || 0,
      maxDurationMs: Number(buyerCutover.primary?.durationMs ?? 0) || 0,
      totalRowCount:
        (Number(buyerCutover.primary?.pending ?? 0) || 0) +
        (Number(buyerCutover.primary?.approved ?? 0) || 0) +
        (Number(buyerCutover.primary?.rejected ?? 0) || 0),
      lastSourceKind: buyerCutover.primary?.sourceMeta?.sourceKind ?? "rpc:buyer_summary_buckets_scope_v1",
      fallbackCount: buyerCutover.primary?.sourceMeta?.fallbackUsed ? 1 : 0,
    });
  }
  if (buyerInboxCutover) {
    currentBuckets = overrideBucket(currentBuckets, "buyer|summary_inbox|load_inbox", {
      count: 1,
      avgDurationMs: Number(buyerInboxCutover.primary?.durationMs ?? 0) || 0,
      maxDurationMs: Number(buyerInboxCutover.primary?.durationMs ?? 0) || 0,
      totalRowCount: Number(buyerInboxCutover.primary?.rows ?? 0) || 0,
      lastSourceKind: buyerInboxCutover.primary?.sourceMeta?.sourceKind ?? "rpc:buyer_summary_inbox_scope_v1",
      fallbackCount: buyerInboxCutover.primary?.sourceMeta?.fallbackUsed ? 1 : 0,
    });
  }

  const comparisons = comparePlatformObservabilityBuckets({
    previous: baselineBuckets,
    current: currentBuckets,
  });
  const recommendation = recommendPlatformHotspot(comparisons);

  const artifact = {
    status: "passed",
    baselineSource: "artifacts/platform-observability-wave1.summary.json",
    targetedCutovers: {
      contractor: {
        beforeMs: 2074,
        afterMs: contractorCutover.primary?.durationMs ?? null,
        owner: contractorCutover.primary?.sourceMeta?.sourceKind ?? null,
      },
      warehouse: {
        beforeMs: 1301,
        afterMs: warehouseWindowing?.primary?.page1DurationMs ?? warehouseCutover.primary?.durationMs ?? null,
        owner:
          warehouseWindowing?.primary?.sourceKind ??
          warehouseCutover.primary?.sourceMeta?.sourceKind ??
          null,
      },
      buyer: buyerCutover
        ? {
            beforeMs: 628,
            afterMs: buyerCutover.primary?.durationMs ?? null,
            owner: buyerCutover.primary?.sourceMeta?.sourceKind ?? null,
          }
        : null,
      buyerInbox: buyerInboxCutover
        ? {
            beforeMs: 435,
            afterMs: buyerInboxCutover.primary?.durationMs ?? null,
            owner: buyerInboxCutover.primary?.sourceMeta?.sourceKind ?? null,
          }
        : null,
    },
    comparisons,
    recommendation,
  };

  writeArtifact("artifacts/platform-observability-wave2.json", artifact);
  writeArtifact("artifacts/platform-observability-wave2.summary.json", {
    status: artifact.status,
    targetedCutovers: artifact.targetedCutovers,
    topComparisons: comparisons.slice(0, 8),
    recommendation,
  });

  console.log(
    JSON.stringify(
      {
        status: artifact.status,
        targetedCutovers: artifact.targetedCutovers,
        nextBestCut: recommendation.nextBestCut,
        recommendationReason: recommendation.reason,
        confidence: recommendation.confidence,
      },
      null,
      2,
    ),
  );
}

void main();
