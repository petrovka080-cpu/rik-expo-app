import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type DistributedShardReceipt = {
  schema: string;
  final_status: string;
  subject: {
    base_sha: string;
    head_sha: string;
    input_fingerprint: string;
    terminal_input_fingerprint: string;
    input_drift_detected: boolean;
  };
  membership: {
    full_selected_jest_suites: number;
    full_selected_playwright_suites: number;
    shard_manifest_sha256: string;
    shard_id: number;
    expected_suite_count: number;
    expected_suites_sha256: string;
    observed_suite_count: number;
    observed_suites_sha256: string;
    passed: boolean;
  };
  playwright_evidence: {
    complete: boolean;
    expected_suite_count: number;
    expected_suites_sha256: string;
    compatible_evidence_sha256: string;
  };
  admission: { passed: boolean };
  execution: null | {
    started_at: string;
    ended_at: string;
    duration_ms: number;
    exit_code: number;
    result_success: boolean;
    passed_suites: number;
    failed_suites: number;
    passed_tests: number;
    failed_tests: number;
    pending_tests: number;
    technical_timed_out: boolean;
    orphan_detected: boolean;
    memory_evidence_status: string;
  };
  slo_ms: number;
};

type ShardPlan = {
  manifest: Array<{ test_path: string }>;
  manifest_sha256: string;
  resource_plan: {
    waves: Array<{ shards: Array<{ shard_id: number; test_files: string[] }> }>;
  };
  subject: { base_sha: string; head_sha: string; input_fingerprint: string };
};

function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right, "en"));
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}

function sha256(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashDistributedReceiptStringList(values: readonly string[]): string {
  return crypto.createHash("sha256")
    .update(`${JSON.stringify(sorted(values))}\n`, "utf8")
    .digest("hex");
}

export function mergeDistributedAffectedJestShardReceipts(input: {
  plan: { selected_suites: string[]; input_fingerprint: string };
  shardPlan: ShardPlan;
  receipts: DistributedShardReceipt[];
  budgetMs: number;
}) {
  const expectedShards = input.shardPlan.resource_plan.waves
    .flatMap((wave) => wave.shards)
    .sort((left, right) => left.shard_id - right.shard_id);
  const receipts = [...input.receipts]
    .sort((left, right) => left.membership.shard_id - right.membership.shard_id);
  const duplicateShardIds = receipts
    .map((receipt) => receipt.membership.shard_id)
    .filter((id, index, values) => values.indexOf(id) !== index);
  const expectedShardIds = expectedShards.map((shard) => shard.shard_id);
  const receivedShardIds = receipts.map((receipt) => receipt.membership.shard_id);
  const identitiesMatch = receipts.every((receipt) =>
    receipt.subject.base_sha === input.shardPlan.subject.base_sha
    && receipt.subject.head_sha === input.shardPlan.subject.head_sha
    && receipt.subject.input_fingerprint === input.plan.input_fingerprint
    && receipt.subject.terminal_input_fingerprint === input.plan.input_fingerprint
    && receipt.subject.input_drift_detected === false
    && receipt.membership.shard_manifest_sha256 === input.shardPlan.manifest_sha256
  );
  const perShardMembershipPassed = receipts.every((receipt) => {
    const expected = expectedShards.find((shard) => shard.shard_id === receipt.membership.shard_id);
    return expected != null
      && receipt.membership.expected_suite_count === expected.test_files.length
      && receipt.membership.expected_suites_sha256 === hashDistributedReceiptStringList(expected.test_files)
      && receipt.membership.observed_suite_count === expected.test_files.length
      && receipt.membership.observed_suites_sha256 === hashDistributedReceiptStringList(expected.test_files)
      && receipt.membership.passed;
  });
  const expectedJestSuites = input.shardPlan.manifest.map((entry) => entry.test_path);
  const plannedShardSuites = expectedShards.flatMap((shard) => shard.test_files);
  const fullMembershipPassed = plannedShardSuites.length === new Set(plannedShardSuites).size
    && sameStrings(plannedShardSuites, expectedJestSuites);
  const playwrightSuites = input.plan.selected_suites
    .filter((suite) => /\.web\.spec\.[cm]?[jt]sx?$/i.test(suite));
  const playwrightSuitesSha256 = hashDistributedReceiptStringList(playwrightSuites);
  const compatibleEvidenceSha256 = receipts[0]?.playwright_evidence.compatible_evidence_sha256 ?? "";
  const playwrightEvidencePassed = playwrightSuites.length === 4
    && compatibleEvidenceSha256.length === 64
    && receipts.every((receipt) =>
      receipt.playwright_evidence.complete
      && receipt.playwright_evidence.expected_suite_count === playwrightSuites.length
      && receipt.playwright_evidence.expected_suites_sha256 === playwrightSuitesSha256
      && receipt.playwright_evidence.compatible_evidence_sha256 === compatibleEvidenceSha256
    );
  const executionPassed = receipts.every((receipt) =>
    receipt.final_status === "GREEN_DISTRIBUTED_AFFECTED_JEST_SHARD"
    && receipt.admission.passed
    && receipt.execution != null
    && receipt.execution.exit_code === 0
    && receipt.execution.result_success
    && receipt.execution.passed_suites === receipt.membership.expected_suite_count
    && receipt.execution.failed_suites === 0
    && receipt.execution.failed_tests === 0
    && receipt.execution.pending_tests === 0
    && !receipt.execution.technical_timed_out
    && !receipt.execution.orphan_detected
    && receipt.execution.memory_evidence_status === "COMPLETE"
  );
  const starts = receipts.flatMap((receipt) => receipt.execution ? [Date.parse(receipt.execution.started_at)] : []);
  const ends = receipts.flatMap((receipt) => receipt.execution ? [Date.parse(receipt.execution.ended_at)] : []);
  const gateStartedMs = starts.length === receipts.length ? Math.min(...starts) : Number.NaN;
  const gateEndedMs = ends.length === receipts.length ? Math.max(...ends) : Number.NaN;
  const gateDurationMs = Number.isFinite(gateStartedMs) && Number.isFinite(gateEndedMs)
    ? gateEndedMs - gateStartedMs
    : null;
  const sloPassed = gateDurationMs != null && gateDurationMs <= input.budgetMs;
  const shardSetPassed = duplicateShardIds.length === 0
    && JSON.stringify(receivedShardIds) === JSON.stringify(expectedShardIds);
  const selectedJestSuites = input.shardPlan.manifest.length;
  const passedSuites = receipts.reduce((total, receipt) => total + (receipt.execution?.passed_suites ?? 0), 0);
  const finalPassed = selectedJestSuites > 0
    && selectedJestSuites === input.plan.selected_suites.length - playwrightSuites.length
    && input.plan.input_fingerprint === input.shardPlan.subject.input_fingerprint
    && shardSetPassed
    && identitiesMatch
    && perShardMembershipPassed
    && fullMembershipPassed
    && playwrightEvidencePassed
    && executionPassed
    && passedSuites === selectedJestSuites
    && sloPassed;
  return {
    schema: "verification-distributed-affected-jest-terminal/v1",
    final_status: finalPassed
      ? "GREEN_DISTRIBUTED_AFFECTED_VERIFICATION_GATE"
      : "RED_DISTRIBUTED_AFFECTED_VERIFICATION_GATE",
    subject: input.shardPlan.subject,
    membership: {
      expected_shard_ids: expectedShardIds,
      received_shard_ids: receivedShardIds,
      duplicate_shard_ids: duplicateShardIds,
      selected_jest_suites: selectedJestSuites,
      observed_unique_jest_suites: fullMembershipPassed
        ? receipts.reduce((total, receipt) => total + receipt.membership.observed_suite_count, 0)
        : null,
      passed_jest_suites: passedSuites,
      shard_manifest_sha256: input.shardPlan.manifest_sha256,
      passed: shardSetPassed && perShardMembershipPassed && fullMembershipPassed,
    },
    playwright_evidence: {
      expected_suite_count: playwrightSuites.length,
      expected_suites_sha256: playwrightSuitesSha256,
      compatible_evidence_sha256: compatibleEvidenceSha256,
      semantics: "PREVIOUSLY_OBTAINED_COMPATIBLE_RESULTS",
      passed: playwrightEvidencePassed,
    },
    execution: {
      passed_tests: receipts.reduce((total, receipt) => total + (receipt.execution?.passed_tests ?? 0), 0),
      failed_tests: receipts.reduce((total, receipt) => total + (receipt.execution?.failed_tests ?? 0), 0),
      failed_suites: receipts.reduce((total, receipt) => total + (receipt.execution?.failed_suites ?? 0), 0),
      all_shards_green: executionPassed,
      identities_match: identitiesMatch,
    },
    timing: {
      gate_started_utc: Number.isFinite(gateStartedMs) ? new Date(gateStartedMs).toISOString() : null,
      gate_ended_utc: Number.isFinite(gateEndedMs) ? new Date(gateEndedMs).toISOString() : null,
      gate_duration_ms: gateDurationMs,
      slo_ms: input.budgetMs,
      slo_passed: sloPassed,
    },
    terminal: finalPassed ? "GREEN" : "RED_OR_INCOMPLETE",
  };
}

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function findReceipts(root: string): string[] {
  const found: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile() && entry.name === "distributed-shard-receipt.json") found.push(target);
    }
  };
  visit(root);
  return found.sort((left, right) => left.localeCompare(right, "en"));
}

if (require.main === module) {
  const planPath = path.resolve(arg("plan") ?? "");
  const shardPlanPath = path.resolve(arg("shard-plan") ?? "");
  const receiptRoot = path.resolve(arg("receipt-root") ?? "");
  const outputPath = path.resolve(arg("output") ?? "");
  const planBytes = fs.readFileSync(planPath);
  const shardPlanBytes = fs.readFileSync(shardPlanPath);
  const receiptPaths = findReceipts(receiptRoot);
  const result = mergeDistributedAffectedJestShardReceipts({
    plan: JSON.parse(planBytes.toString("utf8")),
    shardPlan: JSON.parse(shardPlanBytes.toString("utf8")),
    receipts: receiptPaths.map((receiptPath) => JSON.parse(fs.readFileSync(receiptPath, "utf8"))),
    budgetMs: 600_000,
  });
  const terminal = {
    ...result,
    evidence: {
      plan_sha256: sha256(planBytes),
      shard_plan_sha256: sha256(shardPlanBytes),
      receipt_count: receiptPaths.length,
      receipt_sha256: receiptPaths.map((receiptPath) => ({
        path: path.relative(receiptRoot, receiptPath).replace(/\\/g, "/"),
        sha256: sha256(fs.readFileSync(receiptPath)),
      })),
    },
  };
  writeFile(outputPath, terminal);
  process.stdout.write(`${JSON.stringify(terminal, null, 2)}\n`);
  if (terminal.terminal !== "GREEN") process.exitCode = 1;
}

function writeFile(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
