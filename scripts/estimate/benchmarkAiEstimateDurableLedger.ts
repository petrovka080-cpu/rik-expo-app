import path from "node:path";

import { createInMemoryAiEstimateLedgerStore } from "../../src/lib/estimate/ledger/adapters/InMemoryAiEstimateLedgerStore";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_DURABLE_LEDGER_BENCHMARK =
  "GREEN_AI_ESTIMATE_DURABLE_LEDGER_BENCHMARK" as const;
export const STOP_AI_ESTIMATE_DURABLE_LEDGER_BENCHMARK_FAILED =
  "STOP_AI_ESTIMATE_DURABLE_LEDGER_BENCHMARK_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-durable-ledger-sync-history-scale", "benchmark");

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return Math.round(sorted[index] * 100) / 100;
}

export function benchmarkAiEstimateDurableLedger(input: { writeSummary?: boolean } = {}) {
  const store = createInMemoryAiEstimateLedgerStore();
  const ownerUserId = "benchmark-owner";
  const writeLatencies: number[] = [];
  for (let index = 0; index < 2500; index += 1) {
    const startedAt = performance.now();
    const estimateId = `benchmark-estimate-${index}`;
    const createdAt = new Date(Date.UTC(2026, 6, 9, 12, 0, 0) + index * 1000).toISOString();
    store.upsertDraft({
      estimateId,
      ownerUserId,
      orgId: null,
      kind: "request_estimate",
      sourceRoute: "/request",
      title: `Benchmark ${index}`,
      prompt: "Benchmark prompt",
      selectedTemplateId: "benchmark-template",
      family: "benchmark",
      createdAt,
      updatedAt: createdAt,
      status: "draft",
      sourceDraftId: estimateId,
      currentRevisionId: `revision-${index}`,
      sourceSnapshotId: `snapshot-${index}`,
      rowCount: 5,
      materialRowsCount: 2,
      workRowsCount: 3,
      artifacts: {
        snapshotId: `snapshot-${index}`,
        pdfArtifactId: `pdf-${index}`,
        buyerHandoffId: index % 5 === 0 ? `buyer-${index}` : null,
        artifactsValidForRevisionId: `revision-${index}`,
      },
      actorUserId: ownerUserId,
      sourceLayer: "runtime",
      idempotencyKey: `benchmark-upsert-${index}`,
    });
    store.approveRevision({
      estimateId,
      revisionId: `revision-${index}`,
      approvedAt: createdAt,
      actorUserId: ownerUserId,
      sourceLayer: "runtime",
      idempotencyKey: `benchmark-approve-${index}`,
    });
    writeLatencies.push(performance.now() - startedAt);
  }
  const readLatencies: number[] = [];
  let cursorCreatedAt: string | null = null;
  for (let index = 0; index < 20; index += 1) {
    const startedAt = performance.now();
    const page = store.listApprovedHistory({ ownerUserId, limit: 20, cursorCreatedAt });
    readLatencies.push(performance.now() - startedAt);
    cursorCreatedAt = page.nextCursorCreatedAt;
  }
  const checks = {
    write_p95_under_25ms: percentile(writeLatencies, 0.95) < 25,
    read_p95_under_100ms: percentile(readLatencies, 0.95) < 100,
    approved_count_matches: store.countApprovedHistory({ ownerUserId }) === 2500,
  };
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_DURABLE_LEDGER_BENCHMARK
      : STOP_AI_ESTIMATE_DURABLE_LEDGER_BENCHMARK_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    write_p95_ms: percentile(writeLatencies, 0.95),
    read_p95_ms: percentile(readLatencies, 0.95),
    ...checks,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = benchmarkAiEstimateDurableLedger({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_DURABLE_LEDGER_BENCHMARK) process.exitCode = 1;
}
