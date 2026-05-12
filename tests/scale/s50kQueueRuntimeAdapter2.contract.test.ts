import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

import {
  MAX_QUEUE_WORKER_COMPACTION_DELAY_MS,
  MAX_QUEUE_WORKER_CONCURRENCY,
  MAX_SUBMIT_JOB_CLAIM_LIMIT,
  MIN_QUEUE_WORKER_COMPACTION_DELAY_MS,
  resolveQueueWorkerBatchConcurrency,
  resolveQueueWorkerCompactionDelayMs,
  resolveQueueWorkerConfiguredConcurrency,
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

const isApprovedSLoadFix6WarehouseIssuePatch = (file: string) =>
  [sLoadFix6WarehouseIssueExplainPatch, aiActionLedgerReadinessMigration].includes(
    file.replace(/\\/g, "/"),
  );

describe("S-50K-QUEUE-RUNTIME-ADAPTER-2 runtime guardrails", () => {
  it("caps queue claim, concurrency, and compaction budgets", () => {
    expect(resolveSubmitJobClaimLimit(25)).toBe(25);
    expect(resolveSubmitJobClaimLimit(5_000)).toBe(MAX_SUBMIT_JOB_CLAIM_LIMIT);
    expect(resolveSubmitJobClaimLimit(0)).toBe(10);

    expect(resolveQueueWorkerConfiguredConcurrency(4)).toBe(4);
    expect(resolveQueueWorkerConfiguredConcurrency(500)).toBe(MAX_QUEUE_WORKER_CONCURRENCY);
    expect(resolveQueueWorkerConfiguredConcurrency(Number.NaN)).toBe(4);

    expect(resolveQueueWorkerBatchConcurrency(500, 500)).toBe(MAX_QUEUE_WORKER_CONCURRENCY);
    expect(resolveQueueWorkerBatchConcurrency(500, 3)).toBe(3);
    expect(resolveQueueWorkerBatchConcurrency(500, 0)).toBe(0);

    expect(resolveQueueWorkerCompactionDelayMs(500)).toBe(500);
    expect(resolveQueueWorkerCompactionDelayMs(10)).toBe(MIN_QUEUE_WORKER_COMPACTION_DELAY_MS);
    expect(resolveQueueWorkerCompactionDelayMs(50_000)).toBe(MAX_QUEUE_WORKER_COMPACTION_DELAY_MS);
  });

  it("applies normalized budgets before queue source calls and worker loop sleeps", () => {
    const jobQueueSource = read("src/lib/infra/jobQueue.ts");
    const workerSource = read("src/workers/queueWorker.ts");

    expect(jobQueueSource).toContain("resolveSubmitJobClaimLimit(limit, WORKER_BATCH_SIZE)");
    expect(jobQueueSource).toContain("buildSubmitJobsClaimArgs(workerId, normalizedLimit)");
    expect(jobQueueSource).toContain("buildSubmitJobsClaimLegacyArgs(workerId, normalizedLimit, jobType)");

    expect(workerSource).toContain("resolveSubmitJobClaimLimit(options.batchSize, WORKER_BATCH_SIZE)");
    expect(workerSource).toContain("resolveQueueWorkerConfiguredConcurrency");
    expect(workerSource).toContain("resolveQueueWorkerCompactionDelayMs");
    expect(workerSource).toContain("runCancellableWorkerLoop");
    expect(workerSource).toContain("errorBackoffMs: pollIdleMs");
    expect(workerSource).toContain("workerLoopClock: deps.workerLoopClock ?? defaultWorkerLoopClock");
    expect(workerSource).toContain("await deps.workerLoopClock.sleep(");
    expect(workerSource).toContain("loopAbortController.signal");
  });

  it("keeps proof artifacts valid and does not touch live or native surfaces", () => {
    const matrix = JSON.parse(read("artifacts/S_50K_QUEUE_RUNTIME_ADAPTER_2_matrix.json"));
    expect(matrix.wave).toBe("S-50K-QUEUE-RUNTIME-ADAPTER-2");
    expect(matrix.status).toBe("GREEN_QUEUE_RUNTIME_GUARDRAIL_READY");
    expect(matrix.runtimeGuardrails.maxClaimLimit).toBe(MAX_SUBMIT_JOB_CLAIM_LIMIT);
    expect(matrix.safety.productionTouched).toBe(false);
    expect(matrix.safety.stagingTouched).toBe(false);
    expect(matrix.safety.sqlRpcRlsStorageChanged).toBe(false);

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
});
