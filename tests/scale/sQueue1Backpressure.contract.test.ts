import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import {
  MAX_QUEUE_WORKER_COMPACTION_DELAY_MS,
  MAX_QUEUE_WORKER_CONCURRENCY,
  MAX_SUBMIT_JOB_CLAIM_LIMIT,
  MIN_QUEUE_WORKER_COMPACTION_DELAY_MS,
  MIN_QUEUE_WORKER_IDLE_BACKOFF_MS,
  resolveQueueWorkerBatchConcurrency,
  resolveQueueWorkerCompactionDelayMs,
  resolveQueueWorkerConfiguredConcurrency,
  resolveQueueWorkerIdleBackoffMs,
  resolveSubmitJobClaimLimit,
} from "../../src/workers/queueWorker.limits";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const changedFiles = () =>
  execFileSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const sLoadFix6WarehouseIssueExplainPatch =
  "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql";
const aiActionLedgerReadinessMigration =
  "supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql";
const aiActionLedgerApplyMigration =
  "supabase/migrations/20260513230000_ai_action_ledger_apply.sql";

const isApprovedSLoadFix6WarehouseIssuePatch = (file: string) =>
  [sLoadFix6WarehouseIssueExplainPatch, aiActionLedgerReadinessMigration, aiActionLedgerApplyMigration].includes(
    file.replace(/\\/g, "/"),
  );

describe("S-QUEUE-1 backpressure hardening contract", () => {
  it("keeps queue worker batch fanout bounded without changing empty-batch semantics", () => {
    expect(resolveQueueWorkerBatchConcurrency(8, 3)).toBe(3);
    expect(resolveQueueWorkerBatchConcurrency(2, 3)).toBe(2);
    expect(resolveQueueWorkerBatchConcurrency(0, 3)).toBe(1);
    expect(resolveQueueWorkerBatchConcurrency(Number.NaN, 3)).toBe(1);
    expect(resolveQueueWorkerBatchConcurrency(4, 0)).toBe(0);
    expect(resolveQueueWorkerBatchConcurrency(500, 500)).toBe(MAX_QUEUE_WORKER_CONCURRENCY);

    const workerSource = read("src/workers/queueWorker.ts");
    expect(workerSource).toContain("mapWithConcurrencyLimit");
    expect(workerSource).toContain('label: "queueWorker.processBatch"');
    expect(workerSource).not.toMatch(/await\s+Promise\.all\(workers\)/);
  });

  it("guards idle and error-loop retry sleeps against tight retry storms", () => {
    expect(resolveQueueWorkerIdleBackoffMs(0)).toBe(1000);
    expect(resolveQueueWorkerIdleBackoffMs(10)).toBe(MIN_QUEUE_WORKER_IDLE_BACKOFF_MS);
    expect(resolveQueueWorkerIdleBackoffMs(500)).toBe(500);
    expect(resolveQueueWorkerIdleBackoffMs(Number.NaN, 25)).toBe(
      MIN_QUEUE_WORKER_IDLE_BACKOFF_MS,
    );

    const workerSource = read("src/workers/queueWorker.ts");
    expect(workerSource).toContain("resolveQueueWorkerIdleBackoffMs");
    expect(workerSource).toContain("errorBackoffMs: pollIdleMs");
    expect(workerSource).toContain("return { backoffMs: pollIdleMs }");
    expect(workerSource).toContain("runCancellableWorkerLoop");
  });

  it("keeps queue runtime claim and worker budgets capped for future 50K providers", () => {
    expect(resolveSubmitJobClaimLimit(25)).toBe(25);
    expect(resolveSubmitJobClaimLimit(5_000)).toBe(MAX_SUBMIT_JOB_CLAIM_LIMIT);
    expect(resolveSubmitJobClaimLimit(Number.NaN)).toBe(10);

    expect(resolveQueueWorkerConfiguredConcurrency(4)).toBe(4);
    expect(resolveQueueWorkerConfiguredConcurrency(500)).toBe(MAX_QUEUE_WORKER_CONCURRENCY);
    expect(resolveQueueWorkerConfiguredConcurrency(0)).toBe(4);

    expect(resolveQueueWorkerCompactionDelayMs(500)).toBe(500);
    expect(resolveQueueWorkerCompactionDelayMs(10)).toBe(MIN_QUEUE_WORKER_COMPACTION_DELAY_MS);
    expect(resolveQueueWorkerCompactionDelayMs(50_000)).toBe(MAX_QUEUE_WORKER_COMPACTION_DELAY_MS);

    const jobQueueSource = read("src/lib/infra/jobQueue.ts");
    expect(jobQueueSource).toContain("resolveSubmitJobClaimLimit(limit, WORKER_BATCH_SIZE)");
    expect(jobQueueSource).toContain("buildSubmitJobsClaimArgs(workerId, normalizedLimit)");
    expect(jobQueueSource).toContain("buildSubmitJobsClaimLegacyArgs(workerId, normalizedLimit, jobType)");
  });

  it("keeps queue RPC responses validated and fail-closed", () => {
    const jobQueueSource = read("src/lib/infra/jobQueue.ts");
    for (const rpcName of [
      "submit_jobs_claim",
      "submit_jobs_recover_stuck",
      "submit_jobs_mark_completed",
      "submit_jobs_mark_failed",
      "submit_jobs_metrics",
    ]) {
      expect(jobQueueSource).toContain(rpcName);
    }
    expect(jobQueueSource).toContain("validateRpcResponse");
    expect(jobQueueSource).toContain("isSubmitJobsClaimRpcResponse");
    expect(jobQueueSource).toContain("isSubmitJobsMarkFailedRpcResponse");
    expect(jobQueueSource).toContain("isSubmitJobsMetricsRpcResponse");
  });

  it("redacts worker observability and removes raw bootstrap console logging", () => {
    const workerSource = read("src/workers/queueWorker.ts");
    expect(workerSource).toContain("redactSensitiveText");
    expect(workerSource).toContain("workerIdScope: redactedPresence(params.workerId)");
    expect(workerSource).toContain("jobIdScope: redactedPresence(params.job?.id)");
    expect(workerSource).not.toContain("workerId: params.workerId");
    expect(workerSource).not.toContain("jobId: params.job?.id");
    expect(workerSource).not.toContain("processingError: message");

    const bootstrapSource = read("src/workers/queueBootstrap.ts");
    expect(bootstrapSource).toContain("logger.info");
    expect(bootstrapSource).not.toContain("console.");
  });

  it("does not log raw queue payloads, PII, or secrets in selected queue paths", () => {
    const selectedSource = [
      "src/workers/queueWorker.ts",
      "src/workers/processBuyerSubmitJob.ts",
      "src/workers/queueBootstrap.ts",
    ]
      .map(read)
      .join("\n");

    expect(selectedSource).not.toMatch(/payload:\s*(job\.payload|payload|data|rpc\.data)/);
    expect(selectedSource).not.toMatch(/console\.(log|warn|error|info)\(/);
    expect(selectedSource).not.toContain("selectedItemIds");
    expect(selectedSource).not.toMatch(/supplierKey:\s*(supplierKey|attachment\.supplierKey)/);
    expect(selectedSource).not.toMatch(/fileName:\s*(fileName|attachment\.fileName)/);
    expect(selectedSource).toContain("supplierKeyScope");
    expect(selectedSource).toContain("fileNameScope");
  });

  it("does not change SQL/RPC/RLS/storage/package/native files", () => {
    const changed = changedFiles().filter((file) => !isApprovedSLoadFix6WarehouseIssuePatch(file));

    expect(changed).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(supabase\/migrations|android\/|ios\/|maestro\/)/),
      ]),
    );
    expect(changed).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(package\.json|package-lock\.json|app\.json|eas\.json)$/),
      ]),
    );
  });

  it("keeps S-QUEUE-1 artifacts valid JSON", () => {
    const matrixPath = "artifacts/S_QUEUE_1_backpressure_matrix.json";
    expect(existsSync(join(root, matrixPath))).toBe(true);
    const matrix = JSON.parse(read(matrixPath));

    expect(matrix.wave).toBe("S-QUEUE-1");
    expect(matrix.result.hardenedCallSites).toBeGreaterThanOrEqual(3);
    expect(matrix.result.boundedParallelismCallSites).toBe(1);
    expect(matrix.safety.queueSemanticsChanged).toBe(false);
    expect(matrix.safety.rawPayloadLogged).toBe(false);
    expect(matrix.safety.playMarketTouched).toBe(false);
  });
});
