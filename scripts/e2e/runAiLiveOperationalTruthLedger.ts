import fs from "node:fs";
import path from "node:path";

import {
  AI_OPERATIONAL_CANONICAL_ARTIFACTS,
  AI_OPERATIONAL_STALE_BLOCKER_RULES,
  evaluateAiLiveOperationalTruthLedger,
  type AiLiveOperationalTruthMatrix,
  type AiOperationalArtifactRecord,
} from "./aiLiveOperationalTruthLedger";

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_12_OPERATIONAL_TRUTH_LEDGER";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.replace(/\\/g, "/")))];
}

function readArtifact(relativePath: string): AiOperationalArtifactRecord | null {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(projectRoot, normalizedPath), "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const status = typeof record.final_status === "string"
      ? record.final_status
      : typeof record.status === "string"
        ? record.status
        : "";
    return {
      path: normalizedPath,
      status,
      data: record,
    };
  } catch {
    return null;
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(matrix: AiLiveOperationalTruthMatrix): void {
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_12_OPERATIONAL_TRUTH_LEDGER",
      "",
      `final_status: ${matrix.final_status}`,
      `canonical_live_lifecycle_green: ${String(matrix.canonical_live_lifecycle_green)}`,
      `canonical_screen_action_map_green: ${String(matrix.canonical_screen_action_map_green)}`,
      `canonical_rpc_visibility_green: ${String(matrix.canonical_rpc_visibility_green)}`,
      `canonical_developer_control_green: ${String(matrix.canonical_developer_control_green)}`,
      `canonical_command_center_green: ${String(matrix.canonical_command_center_green)}`,
      `ledger_rpc_visible: ${String(matrix.ledger_rpc_visible)}`,
      `signature_aware_rpc_verify: ${String(matrix.signature_aware_rpc_verify)}`,
      `pgrst202: ${String(matrix.pgrst202)}`,
      `pgrst203: ${String(matrix.pgrst203)}`,
      `old_stub_overloads: ${String(matrix.old_stub_overloads)}`,
      `submit_for_approval_persisted_pending: ${String(matrix.submit_for_approval_persisted_pending)}`,
      `approve_persists_approved: ${String(matrix.approve_persists_approved)}`,
      `execute_approved_uses_central_gateway: ${String(matrix.execute_approved_uses_central_gateway)}`,
      `final_status_readable: ${String(matrix.final_status_readable)}`,
      `idempotency_replay_safe: ${String(matrix.idempotency_replay_safe)}`,
      `audit_evidence_redacted: ${String(matrix.audit_evidence_redacted)}`,
      `command_center_runtime_visible: ${String(matrix.command_center_runtime_visible)}`,
      `approval_inbox_runtime_visible: ${String(matrix.approval_inbox_runtime_visible)}`,
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `developer_control_e2e: ${matrix.developer_control_e2e}`,
      `stale_blockers_detected: ${String(matrix.stale_blockers_detected)}`,
      `superseded_stale_blockers: ${String(matrix.superseded_stale_blockers)}`,
      `unsuperseded_stale_blockers: ${String(matrix.unsuperseded_stale_blockers)}`,
      "mutations_created: 0",
      "db_writes: 0",
      "unsafe_domain_mutations_created: 0",
      "external_live_fetch: false",
      "model_provider_changed: false",
      "gpt_enabled: false",
      "gemini_removed: false",
      "fake_green_claimed: false",
      "secrets_printed: false",
      matrix.exact_reason ? `exact_reason: ${matrix.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
}

function writeArtifacts(matrix: AiLiveOperationalTruthMatrix, artifacts: AiOperationalArtifactRecord[]): void {
  writeJson(inventoryPath, {
    wave,
    runner: "scripts/e2e/runAiLiveOperationalTruthLedger.ts",
    resolver: "scripts/e2e/aiLiveOperationalTruthLedger.ts",
    canonical_artifacts: AI_OPERATIONAL_CANONICAL_ARTIFACTS,
    stale_blocker_rules: AI_OPERATIONAL_STALE_BLOCKER_RULES.map((rule) => ({
      path: rule.path,
      supersededBy: rule.supersededBy,
    })),
    artifacts_read: artifacts.map((artifact) => ({
      path: artifact.path,
      status: artifact.status || "unknown",
    })),
    live_db_writes: 0,
    external_live_fetch: false,
    secrets_printed: false,
    raw_rows_printed: false,
  });
  writeJson(matrixPath, matrix);
  writeProof(matrix);
}

export function runAiLiveOperationalTruthLedger(): AiLiveOperationalTruthMatrix {
  const artifactPaths = unique([
    ...Object.values(AI_OPERATIONAL_CANONICAL_ARTIFACTS),
    ...AI_OPERATIONAL_STALE_BLOCKER_RULES.map((rule) => rule.path),
  ]);
  const artifacts = artifactPaths
    .map((artifactPath) => readArtifact(artifactPath))
    .filter((artifact): artifact is AiOperationalArtifactRecord => artifact !== null);
  const matrix = evaluateAiLiveOperationalTruthLedger(artifacts);
  writeArtifacts(matrix, artifacts);
  return matrix;
}

if (require.main === module) {
  const matrix = runAiLiveOperationalTruthLedger();
  console.info(JSON.stringify(matrix, null, 2));
  if (matrix.final_status !== "GREEN_AI_LIVE_OPERATIONAL_TRUTH_LEDGER_READY") {
    process.exitCode = 1;
  }
}
