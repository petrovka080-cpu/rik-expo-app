import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "../src/lib/database.types";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
  summarizePlatformObservabilityEvents,
} from "../src/lib/observability/platformObservability";
import {
  loadBuyerBucketsData,
  loadBuyerBucketsDataLegacy,
  loadBuyerBucketsDataRpc,
  type BuyerProposalBucketRow,
} from "../src/screens/buyer/buyer.fetchers";
import {
  BUYER_STATUS_APPROVED,
  BUYER_STATUS_PENDING,
  BUYER_STATUS_REWORK,
  fetchBuyerProposalItemIds,
  fetchBuyerProposalSummaryByStatuses,
  fetchBuyerRejectedProposalRows,
} from "../src/screens/buyer/buyer.buckets.repo";
import {
  buildProposalItemCountMap,
  filterProposalBucketsWithItems,
  mapProposalSummaryRows,
  mapRejectedProposalRows,
} from "../src/screens/buyer/buyer.fetchers.data";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
).trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "buyer-summary-buckets-cutover-v1" } },
});

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const measure = async <T>(fn: () => Promise<T>) => {
  const startedAt = Date.now();
  const result = await fn();
  return {
    result,
    durationMs: Date.now() - startedAt,
  };
};

const bucketSignature = (row: BuyerProposalBucketRow) =>
  [
    row.id,
    row.status,
    row.submitted_at ?? "",
    row.total_sum ?? "",
    row.sent_to_accountant_at ?? "",
    row.items_cnt ?? "",
  ].join("|");

const sumBucketTotals = (rows: BuyerProposalBucketRow[]) =>
  rows.reduce((sum, row) => sum + (Number.isFinite(Number(row.total_sum ?? 0)) ? Number(row.total_sum ?? 0) : 0), 0);

const compareBucket = (
  legacyRows: BuyerProposalBucketRow[],
  rpcRows: BuyerProposalBucketRow[],
) => {
  const legacySignatures = legacyRows.map(bucketSignature).sort();
  const rpcSignatures = rpcRows.map(bucketSignature).sort();
  return {
    countParityOk: legacyRows.length === rpcRows.length,
    signatureParityOk:
      legacySignatures.length === rpcSignatures.length &&
      legacySignatures.every((signature, index) => signature === rpcSignatures[index]),
    totalParityOk: sumBucketTotals(legacyRows) === sumBucketTotals(rpcRows),
    legacyCount: legacyRows.length,
    rpcCount: rpcRows.length,
    legacyTotal: sumBucketTotals(legacyRows),
    rpcTotal: sumBucketTotals(rpcRows),
  };
};

async function buildLegacyChainMap() {
  const chain: {
    stageName: string;
    sourceOwner: string;
    durationMs: number;
    rowCount: number;
    requiredForFirstPaint: boolean;
    canBeLazy: boolean;
    fallbackCapable: boolean;
    duplicateOrOverlapping: boolean;
  }[] = [];

  const summaryStage = await measure(() =>
    fetchBuyerProposalSummaryByStatuses(supabase, [BUYER_STATUS_PENDING, BUYER_STATUS_APPROVED]),
  );
  const summaryRows = !summaryStage.result.error ? mapProposalSummaryRows(summaryStage.result.data) : [];
  const pending = summaryRows.filter((row) => row.status === BUYER_STATUS_PENDING);
  const approved = summaryRows.filter((row) => row.status === BUYER_STATUS_APPROVED);
  chain.push({
    stageName: "summary_query",
    sourceOwner: "view:v_proposals_summary",
    durationMs: summaryStage.durationMs,
    rowCount: summaryRows.length,
    requiredForFirstPaint: true,
    canBeLazy: false,
    fallbackCapable: true,
    duplicateOrOverlapping: false,
  });

  const rejectedStage = await measure(() => fetchBuyerRejectedProposalRows(supabase));
  const rejectedRaw = !rejectedStage.result.error
    ? mapRejectedProposalRows(rejectedStage.result.data, BUYER_STATUS_REWORK.toLowerCase())
    : [];
  chain.push({
    stageName: "rejected_query",
    sourceOwner: "table:proposals",
    durationMs: rejectedStage.durationMs,
    rowCount: rejectedRaw.length,
    requiredForFirstPaint: true,
    canBeLazy: false,
    fallbackCapable: true,
    duplicateOrOverlapping: false,
  });

  let rejected = rejectedRaw;
  let overlayDurationMs = 0;
  if (rejectedRaw.length) {
    const overlayStage = await measure(() => fetchBuyerProposalItemIds(supabase, rejectedRaw.map((row) => row.id)));
    overlayDurationMs = overlayStage.durationMs;
    if (!overlayStage.result.error) {
      rejected = filterProposalBucketsWithItems(rejectedRaw, buildProposalItemCountMap(overlayStage.result.data));
    }
    chain.push({
      stageName: "rejected_item_overlay",
      sourceOwner: "table:proposal_items",
      durationMs: overlayDurationMs,
      rowCount: rejected.length,
      requiredForFirstPaint: rejectedRaw.length > 0,
      canBeLazy: rejectedRaw.length === 0,
      fallbackCapable: false,
      duplicateOrOverlapping: false,
    });
  }

  return {
    chain,
    buckets: {
      pending,
      approved,
      rejected,
    },
  };
}

async function main() {
  resetPlatformObservabilityEvents();

  const legacyChain = await buildLegacyChainMap();
  const legacy = await measure(() => loadBuyerBucketsDataLegacy({ supabase }));
  const rpc = await measure(() => loadBuyerBucketsDataRpc({ supabase }));
  const primary = await measure(() => loadBuyerBucketsData({ supabase }));

  const pendingParity = compareBucket(legacy.result.pending, rpc.result.pending);
  const approvedParity = compareBucket(legacy.result.approved, rpc.result.approved);
  const rejectedParity = compareBucket(legacy.result.rejected, rpc.result.rejected);
  const proposalIdsParityOk =
    legacy.result.proposalIds.slice().sort().join("|") === rpc.result.proposalIds.slice().sort().join("|");

  const artifact = {
    status:
      primary.result.sourceMeta.primaryOwner === "rpc_scope_v1" &&
      !primary.result.sourceMeta.fallbackUsed &&
      pendingParity.signatureParityOk &&
      approvedParity.signatureParityOk &&
      rejectedParity.signatureParityOk &&
      proposalIdsParityOk &&
      primary.durationMs <= legacy.durationMs
        ? "passed"
        : "failed",
    chainMap: {
      currentLegacyContour: legacyChain.chain,
      requiredForFirstPaint: ["summary_query", "rejected_query"],
      lazySupportOnly: legacyChain.chain.filter((stage) => stage.canBeLazy).map((stage) => stage.stageName),
    },
    legacy: {
      durationMs: legacy.durationMs,
      pending: legacy.result.pending.length,
      approved: legacy.result.approved.length,
      rejected: legacy.result.rejected.length,
      proposalIds: legacy.result.proposalIds.length,
      sourceMeta: legacy.result.sourceMeta,
    },
    rpc: {
      durationMs: rpc.durationMs,
      pending: rpc.result.pending.length,
      approved: rpc.result.approved.length,
      rejected: rpc.result.rejected.length,
      proposalIds: rpc.result.proposalIds.length,
      sourceMeta: rpc.result.sourceMeta,
      meta: rpc.result.meta ?? null,
    },
    primary: {
      durationMs: primary.durationMs,
      pending: primary.result.pending.length,
      approved: primary.result.approved.length,
      rejected: primary.result.rejected.length,
      proposalIds: primary.result.proposalIds.length,
      sourceMeta: primary.result.sourceMeta,
      meta: primary.result.meta ?? null,
    },
    parity: {
      pending: pendingParity,
      approved: approvedParity,
      rejected: rejectedParity,
      proposalIdsParityOk,
      requiredBucketsPresent: {
        pending: Array.isArray(rpc.result.pending),
        approved: Array.isArray(rpc.result.approved),
        rejected: Array.isArray(rpc.result.rejected),
      },
    },
    events: getPlatformObservabilityEvents(),
    summary: summarizePlatformObservabilityEvents(getPlatformObservabilityEvents()),
  };

  writeArtifact("artifacts/buyer-summary-buckets-cutover-v1.json", artifact);
  writeArtifact("artifacts/buyer-summary-buckets-cutover-v1.summary.json", {
    status: artifact.status,
    chainMap: artifact.chainMap,
    legacy: artifact.legacy,
    rpc: artifact.rpc,
    primary: artifact.primary,
    parity: artifact.parity,
    topSlowFetches: artifact.summary.topSlowFetches.slice(0, 5),
  });

  console.log(
    JSON.stringify(
      {
        status: artifact.status,
        primaryOwner: primary.result.sourceMeta.primaryOwner,
        fallbackUsed: primary.result.sourceMeta.fallbackUsed,
        legacyDurationMs: legacy.durationMs,
        rpcDurationMs: rpc.durationMs,
        primaryDurationMs: primary.durationMs,
        pendingParityOk: pendingParity.signatureParityOk,
        approvedParityOk: approvedParity.signatureParityOk,
        rejectedParityOk: rejectedParity.signatureParityOk,
        proposalIdsParityOk,
      },
      null,
      2,
    ),
  );
}

void main();
