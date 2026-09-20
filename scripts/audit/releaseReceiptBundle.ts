import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  buildFullJestEvidenceContext,
  validateDeterministicFullJestTerminal,
} from "../release/fullJestEvidence";

export const RELEASE_RECEIPT_BUNDLE_SCHEMA = "release-receipt-bundle/v1" as const;

export const REQUIRED_RELEASE_RECEIPT_KINDS = [
  "typecheck",
  "lint",
  "git_diff",
  "full_jest",
  "release_verify_primary",
  "web",
  "native",
  "pdf",
  "bottom_navigation",
  "rls",
  "storage",
  "performance",
  "scale",
] as const;

export const PRIMARY_RELEASE_RECEIPT_KINDS = [
  "typecheck",
  "lint",
  "git_diff",
  "full_jest",
  "release_verify_primary",
] as const;

export type ReleaseReceiptKind = typeof REQUIRED_RELEASE_RECEIPT_KINDS[number];
export type ReleaseReceiptEvidenceClass = "fixture" | "actual_environment";
export type ReleaseReceiptProofLevel =
  | "LOCAL_PROCESS"
  | "FULL_M2"
  | "WEB_UI"
  | "NATIVE_UI"
  | "PDF_RUNTIME"
  | "USER_UI"
  | "BACKEND_API"
  | "PERFORMANCE_PROFILE"
  | "LIVE_SCALE";

export const REQUIRED_RELEASE_RECEIPT_PROOF_LEVELS: Record<ReleaseReceiptKind, ReleaseReceiptProofLevel> = {
  typecheck: "LOCAL_PROCESS",
  lint: "LOCAL_PROCESS",
  git_diff: "LOCAL_PROCESS",
  full_jest: "FULL_M2",
  release_verify_primary: "LOCAL_PROCESS",
  web: "WEB_UI",
  native: "NATIVE_UI",
  pdf: "PDF_RUNTIME",
  bottom_navigation: "USER_UI",
  rls: "BACKEND_API",
  storage: "BACKEND_API",
  performance: "PERFORMANCE_PROFILE",
  scale: "LIVE_SCALE",
};

export type ReleaseReceipt = {
  receipt_id: string;
  kind: ReleaseReceiptKind;
  release_id: string;
  subject_sha: string;
  workspace_fingerprint: string;
  artifact_scope: string;
  artifact_path: string;
  expected_sha256: string;
  observed_sha256: string;
  exit_code: number;
  passed: boolean;
};

export type ReleaseReceiptBundle = {
  schema: typeof RELEASE_RECEIPT_BUNDLE_SCHEMA;
  bundle_id: string;
  evidence_class: ReleaseReceiptEvidenceClass;
  release_id: string;
  subject_sha: string;
  workspace_fingerprint: string;
  artifact_scope: string;
  receipts: ReleaseReceipt[];
};

export type ReleaseReceiptValidationContext = {
  rootDir: string;
  expectedReleaseId: string;
  expectedSubjectSha: string;
  expectedWorkspaceFingerprint: string;
  requiredKinds?: readonly ReleaseReceiptKind[];
};

export type ReleaseReceiptBundleValidation = {
  contract_valid: boolean;
  actual_environment_passed: boolean;
  evidence_class: ReleaseReceiptEvidenceClass | "invalid";
  errors: string[];
  verified_receipt_kinds: ReleaseReceiptKind[];
  bundle: ReleaseReceiptBundle | null;
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SUBJECT_SHA_PATTERN = /^[a-f0-9]{40}$/;
const RELEASE_RECEIPT_KIND_SET = new Set<string>(REQUIRED_RELEASE_RECEIPT_KINDS);

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizedRelativePath(value: string): string | null {
  if (!value.trim() || path.isAbsolute(value)) return null;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  if (normalized === ".." || normalized.startsWith("../")) return null;
  return normalized;
}

function pathIsInsideScope(artifactPath: string, artifactScope: string): boolean {
  const normalizedPath = normalizedRelativePath(artifactPath);
  const normalizedScope = normalizedRelativePath(artifactScope);
  if (!normalizedPath || !normalizedScope) return false;
  if (normalizedScope === ".") return normalizedPath !== ".";
  return normalizedPath === normalizedScope || normalizedPath.startsWith(`${normalizedScope}/`);
}

function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim())
    ? value as string[]
    : null;
}

function validCompletedInterval(input: Record<string, unknown>): boolean {
  if (typeof input.started_at !== "string" || typeof input.ended_at !== "string") return false;
  const startedAt = Date.parse(input.started_at);
  const endedAt = Date.parse(input.ended_at);
  const durationMs = typeof input.duration_ms === "number" && Number.isFinite(input.duration_ms)
    ? input.duration_ms
    : null;
  return Number.isFinite(startedAt) && Number.isFinite(endedAt) && endedAt >= startedAt &&
    durationMs !== null && durationMs >= 0 && Math.abs((endedAt - startedAt) - durationMs) < 2_000;
}

function validateActualReceiptArtifact(input: {
  rootDir: string;
  bundle: ReleaseReceiptBundle;
  receipt: ReleaseReceipt;
  errors: string[];
}): void {
  const fullPath = path.resolve(input.rootDir, input.receipt.artifact_path);
  let artifact: Record<string, unknown> | null = null;
  try {
    artifact = record(JSON.parse(fs.readFileSync(fullPath, "utf8")) as unknown);
  } catch {
    artifact = null;
  }
  if (!artifact) {
    input.errors.push(`RECEIPT_ARTIFACT_ENVELOPE_INVALID:${input.receipt.receipt_id}`);
    return;
  }
  const commandArgv = stringArray(artifact.command_argv);
  const expectedIds = stringArray(artifact.expected_ids);
  const observedIds = stringArray(artifact.observed_ids);
  const inputHashes = record(artifact.input_hashes);
  const inputHashEntries = inputHashes ? Object.entries(inputHashes) : [];
  const producerPath = normalizedRelativePath(
    typeof artifact.producer === "string" ? artifact.producer : "",
  );
  const producerFullPath = producerPath ? path.resolve(input.rootDir, producerPath) : "";
  const producerBound = Boolean(
    producerPath && producerFullPath && fs.existsSync(producerFullPath) && fs.statSync(producerFullPath).isFile() &&
    inputHashes?.producer_source === sha256(producerFullPath) &&
    inputHashes.workspace === input.bundle.workspace_fingerprint &&
    commandArgv?.some((arg) => arg.replace(/\\/g, "/") === producerPath),
  );
  const identityMatches =
    artifact.schema === "release-receipt-artifact/v1" &&
    artifact.evidence_class === "actual_environment" &&
    artifact.receipt_id === input.receipt.receipt_id &&
    artifact.kind === input.receipt.kind &&
    artifact.release_id === input.bundle.release_id &&
    artifact.subject_sha === input.bundle.subject_sha &&
    artifact.workspace_fingerprint === input.bundle.workspace_fingerprint;
  const executionMatches =
    producerBound &&
    commandArgv !== null && commandArgv.length > 0 &&
    artifact.proof_level === REQUIRED_RELEASE_RECEIPT_PROOF_LEVELS[input.receipt.kind] &&
    validCompletedInterval(artifact) &&
    artifact.status === "passed" && artifact.exit_code === 0 && artifact.signal === null &&
    artifact.timed_out === false && artifact.passed === true;
  const membershipMatches =
    expectedIds !== null && expectedIds.length > 0 && observedIds !== null &&
    JSON.stringify([...expectedIds].sort()) === JSON.stringify([...observedIds].sort());
  const inputsMatch = inputHashEntries.length > 0 && inputHashEntries.every(([key, value]) =>
    key.trim().length > 0 && typeof value === "string" && SHA256_PATTERN.test(value));
  if (!identityMatches) input.errors.push(`RECEIPT_ARTIFACT_IDENTITY_INVALID:${input.receipt.receipt_id}`);
  if (!executionMatches) input.errors.push(`RECEIPT_ARTIFACT_EXECUTION_INVALID:${input.receipt.receipt_id}`);
  if (!membershipMatches) input.errors.push(`RECEIPT_ARTIFACT_MEMBERSHIP_INVALID:${input.receipt.receipt_id}`);
  if (!inputsMatch) input.errors.push(`RECEIPT_ARTIFACT_INPUT_HASHES_INVALID:${input.receipt.receipt_id}`);

  if (input.receipt.kind !== "full_jest") return;
  if (producerPath !== "scripts/release/runFullJestEvidenceGate.ts") {
    input.errors.push("RECEIPT_FULL_JEST_PRODUCER_INVALID");
  }
  const terminalPath = normalizedRelativePath(
    typeof artifact.primary_result_path === "string" ? artifact.primary_result_path : "",
  );
  const terminalHash = typeof artifact.primary_result_sha256 === "string"
    ? artifact.primary_result_sha256
    : "";
  if (!terminalPath || !SHA256_PATTERN.test(terminalHash)) {
    input.errors.push("RECEIPT_FULL_JEST_PRIMARY_RESULT_INVALID");
    return;
  }
  const absoluteTerminalPath = path.resolve(input.rootDir, terminalPath);
  const relative = path.relative(path.resolve(input.rootDir), absoluteTerminalPath);
  if (
    relative.startsWith("..") || path.isAbsolute(relative) || !fs.existsSync(absoluteTerminalPath) ||
    sha256(absoluteTerminalPath) !== terminalHash
  ) {
    input.errors.push("RECEIPT_FULL_JEST_PRIMARY_RESULT_HASH_MISMATCH");
    return;
  }
  const current = buildFullJestEvidenceContext(input.rootDir);
  const validation = validateDeterministicFullJestTerminal(absoluteTerminalPath, current, input.rootDir);
  if (!validation.passed) {
    input.errors.push("RECEIPT_FULL_JEST_TERMINAL_INVALID");
    input.errors.push(...validation.errors.map((error) => `RECEIPT_FULL_JEST:${error}`));
  }
}

function parseReceipt(value: unknown, index: number, errors: string[]): ReleaseReceipt | null {
  const input = record(value);
  if (!input) {
    errors.push(`RECEIPT_INVALID:${index}`);
    return null;
  }
  const receiptId = typeof input.receipt_id === "string" ? input.receipt_id.trim() : "";
  const kind = typeof input.kind === "string" ? input.kind : "";
  const releaseId = typeof input.release_id === "string" ? input.release_id.trim() : "";
  const subjectSha = typeof input.subject_sha === "string" ? input.subject_sha.toLowerCase() : "";
  const workspaceFingerprint = typeof input.workspace_fingerprint === "string"
    ? input.workspace_fingerprint.toLowerCase()
    : "";
  const artifactScope = typeof input.artifact_scope === "string" ? input.artifact_scope : "";
  const artifactPath = typeof input.artifact_path === "string" ? input.artifact_path : "";
  const expectedSha256 = typeof input.expected_sha256 === "string" ? input.expected_sha256.toLowerCase() : "";
  const observedSha256 = typeof input.observed_sha256 === "string" ? input.observed_sha256.toLowerCase() : "";
  const exitCode = typeof input.exit_code === "number" ? input.exit_code : Number.NaN;
  const passed = input.passed === true;

  if (!receiptId) errors.push(`RECEIPT_ID_MISSING:${index}`);
  if (!RELEASE_RECEIPT_KIND_SET.has(kind)) errors.push(`RECEIPT_KIND_INVALID:${receiptId || index}:${kind || "missing"}`);
  if (!releaseId) errors.push(`RECEIPT_RELEASE_ID_MISSING:${receiptId || index}`);
  if (!SUBJECT_SHA_PATTERN.test(subjectSha)) errors.push(`RECEIPT_SUBJECT_SHA_INVALID:${receiptId || index}`);
  if (!SHA256_PATTERN.test(workspaceFingerprint)) errors.push(`RECEIPT_WORKSPACE_FINGERPRINT_INVALID:${receiptId || index}`);
  if (!pathIsInsideScope(artifactPath, artifactScope)) errors.push(`RECEIPT_ARTIFACT_OUT_OF_SCOPE:${receiptId || index}`);
  if (!SHA256_PATTERN.test(expectedSha256) || !SHA256_PATTERN.test(observedSha256)) {
    errors.push(`RECEIPT_HASH_INVALID:${receiptId || index}`);
  } else if (expectedSha256 !== observedSha256) {
    errors.push(`RECEIPT_HASH_MISMATCH:${receiptId || index}`);
  }
  if (!Number.isInteger(exitCode) || exitCode !== 0 || !passed) {
    errors.push(`RECEIPT_NONZERO_OR_FAILED:${receiptId || index}`);
  }

  if (
    !receiptId || !RELEASE_RECEIPT_KIND_SET.has(kind) || !releaseId ||
    !SUBJECT_SHA_PATTERN.test(subjectSha) || !SHA256_PATTERN.test(workspaceFingerprint) ||
    !pathIsInsideScope(artifactPath, artifactScope) ||
    !SHA256_PATTERN.test(expectedSha256) || !SHA256_PATTERN.test(observedSha256) ||
    !Number.isInteger(exitCode)
  ) return null;

  return {
    receipt_id: receiptId,
    kind: kind as ReleaseReceiptKind,
    release_id: releaseId,
    subject_sha: subjectSha,
    workspace_fingerprint: workspaceFingerprint,
    artifact_scope: normalizedRelativePath(artifactScope)!,
    artifact_path: normalizedRelativePath(artifactPath)!,
    expected_sha256: expectedSha256,
    observed_sha256: observedSha256,
    exit_code: exitCode,
    passed,
  };
}

export function validateReleaseReceiptBundle(
  value: unknown,
  context: ReleaseReceiptValidationContext,
): ReleaseReceiptBundleValidation {
  const errors: string[] = [];
  const input = record(value);
  if (!input) {
    return {
      contract_valid: false,
      actual_environment_passed: false,
      evidence_class: "invalid",
      errors: ["RECEIPT_BUNDLE_MISSING_OR_INVALID"],
      verified_receipt_kinds: [],
      bundle: null,
    };
  }

  const schema = input.schema;
  const bundleId = typeof input.bundle_id === "string" ? input.bundle_id.trim() : "";
  const evidenceClass = input.evidence_class;
  const releaseId = typeof input.release_id === "string" ? input.release_id.trim() : "";
  const subjectSha = typeof input.subject_sha === "string" ? input.subject_sha.toLowerCase() : "";
  const workspaceFingerprint = typeof input.workspace_fingerprint === "string"
    ? input.workspace_fingerprint.toLowerCase()
    : "";
  const artifactScope = typeof input.artifact_scope === "string" ? input.artifact_scope : "";
  const receiptInputs = Array.isArray(input.receipts) ? input.receipts : [];

  if (schema !== RELEASE_RECEIPT_BUNDLE_SCHEMA) errors.push("RECEIPT_BUNDLE_SCHEMA_INVALID");
  if (!bundleId) errors.push("RECEIPT_BUNDLE_ID_MISSING");
  if (evidenceClass !== "fixture" && evidenceClass !== "actual_environment") {
    errors.push("RECEIPT_BUNDLE_EVIDENCE_CLASS_INVALID");
  }
  if (releaseId !== context.expectedReleaseId) errors.push("RECEIPT_BUNDLE_FOREIGN_RELEASE");
  if (subjectSha !== context.expectedSubjectSha.toLowerCase()) errors.push("RECEIPT_BUNDLE_STALE_SUBJECT_SHA");
  if (workspaceFingerprint !== context.expectedWorkspaceFingerprint.toLowerCase()) {
    errors.push("RECEIPT_BUNDLE_STALE_WORKSPACE_FINGERPRINT");
  }
  if (!normalizedRelativePath(artifactScope)) errors.push("RECEIPT_BUNDLE_ARTIFACT_SCOPE_INVALID");
  if (!Array.isArray(input.receipts)) errors.push("RECEIPT_BUNDLE_RECEIPTS_INVALID");

  const receipts = receiptInputs
    .map((receipt, index) => parseReceipt(receipt, index, errors))
    .filter((receipt): receipt is ReleaseReceipt => receipt !== null);
  const seenIds = new Set<string>();
  const seenKinds = new Set<ReleaseReceiptKind>();
  for (const receipt of receipts) {
    if (seenIds.has(receipt.receipt_id)) errors.push(`RECEIPT_DUPLICATE_ID:${receipt.receipt_id}`);
    if (seenKinds.has(receipt.kind)) errors.push(`RECEIPT_DUPLICATE_KIND:${receipt.kind}`);
    seenIds.add(receipt.receipt_id);
    seenKinds.add(receipt.kind);
    if (receipt.release_id !== releaseId || receipt.release_id !== context.expectedReleaseId) {
      errors.push(`RECEIPT_FOREIGN_RELEASE:${receipt.receipt_id}`);
    }
    if (receipt.subject_sha !== subjectSha || receipt.subject_sha !== context.expectedSubjectSha.toLowerCase()) {
      errors.push(`RECEIPT_STALE_SUBJECT_SHA:${receipt.receipt_id}`);
    }
    if (
      receipt.workspace_fingerprint !== workspaceFingerprint ||
      receipt.workspace_fingerprint !== context.expectedWorkspaceFingerprint.toLowerCase()
    ) {
      errors.push(`RECEIPT_STALE_WORKSPACE_FINGERPRINT:${receipt.receipt_id}`);
    }
    if (receipt.artifact_scope !== normalizedRelativePath(artifactScope)) {
      errors.push(`RECEIPT_ARTIFACT_SCOPE_MISMATCH:${receipt.receipt_id}`);
    }
  }

  const requiredKinds = context.requiredKinds ?? REQUIRED_RELEASE_RECEIPT_KINDS;
  for (const kind of requiredKinds) {
    if (!seenKinds.has(kind)) errors.push(`RECEIPT_KIND_MISSING:${kind}`);
  }

  if (evidenceClass === "actual_environment") {
    const current = buildFullJestEvidenceContext(context.rootDir);
    if (
      current.headSha === "unknown" || current.headTreeSha === "unknown" ||
      current.headSha !== context.expectedSubjectSha.toLowerCase() ||
      current.workspaceFingerprint !== context.expectedWorkspaceFingerprint.toLowerCase()
    ) errors.push("RECEIPT_ACTUAL_CONTEXT_NOT_CURRENT_WORKSPACE");
  }

  const structurallyValid = errors.length === 0;
  if (structurallyValid && evidenceClass === "actual_environment") {
    for (const receipt of receipts) {
      const fullPath = path.resolve(context.rootDir, receipt.artifact_path);
      const relative = path.relative(path.resolve(context.rootDir), fullPath);
      if (relative.startsWith("..") || path.isAbsolute(relative) || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
        errors.push(`RECEIPT_ARTIFACT_MISSING:${receipt.receipt_id}`);
        continue;
      }
      const actualHash = sha256(fullPath);
      if (actualHash !== receipt.observed_sha256 || actualHash !== receipt.expected_sha256) {
        errors.push(`RECEIPT_ARTIFACT_HASH_MISMATCH:${receipt.receipt_id}`);
        continue;
      }
      validateActualReceiptArtifact({
        rootDir: context.rootDir,
        bundle: {
          schema: RELEASE_RECEIPT_BUNDLE_SCHEMA,
          bundle_id: bundleId,
          evidence_class: "actual_environment",
          release_id: releaseId,
          subject_sha: subjectSha,
          workspace_fingerprint: workspaceFingerprint,
          artifact_scope: normalizedRelativePath(artifactScope)!,
          receipts,
        },
        receipt,
        errors,
      });
    }
  }

  const bundle = schema === RELEASE_RECEIPT_BUNDLE_SCHEMA && bundleId &&
    (evidenceClass === "fixture" || evidenceClass === "actual_environment") &&
    normalizedRelativePath(artifactScope)
    ? {
        schema,
        bundle_id: bundleId,
        evidence_class: evidenceClass,
        release_id: releaseId,
        subject_sha: subjectSha,
        workspace_fingerprint: workspaceFingerprint,
        artifact_scope: normalizedRelativePath(artifactScope)!,
        receipts,
      } satisfies ReleaseReceiptBundle
    : null;
  const uniqueErrors = Array.from(new Set(errors));
  const contractValid = uniqueErrors.length === 0;
  return {
    contract_valid: contractValid,
    actual_environment_passed: contractValid && evidenceClass === "actual_environment",
    evidence_class: evidenceClass === "fixture" || evidenceClass === "actual_environment" ? evidenceClass : "invalid",
    errors: uniqueErrors,
    verified_receipt_kinds: contractValid ? [...seenKinds].sort() : [],
    bundle,
  };
}

export function readReleaseReceiptBundle(bundlePath: string): unknown {
  if (!fs.existsSync(bundlePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(bundlePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}
