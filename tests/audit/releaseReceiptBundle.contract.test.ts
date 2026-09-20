import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  REQUIRED_RELEASE_RECEIPT_KINDS,
  REQUIRED_RELEASE_RECEIPT_PROOF_LEVELS,
  validateReleaseReceiptBundle,
  type ReleaseReceiptBundle,
  type ReleaseReceiptKind,
  type ReleaseReceiptValidationContext,
} from "../../scripts/audit/releaseReceiptBundle";
import { buildFullJestEvidenceContext } from "../../scripts/release/fullJestEvidence";

const FIXTURE_ROOT = path.join(process.cwd(), "tests", "fixtures", "audit");
const GOOD_FIXTURE = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, "releaseReceiptBundle.good.fixture.json"), "utf8")) as ReleaseReceiptBundle;
const BAD_FIXTURE = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, "releaseReceiptBundle.bad.fixture.json"), "utf8")) as ReleaseReceiptBundle;

function cloneFixture(): ReleaseReceiptBundle {
  return JSON.parse(JSON.stringify(GOOD_FIXTURE)) as ReleaseReceiptBundle;
}

function fixtureContext(rootDir = process.cwd()): ReleaseReceiptValidationContext {
  return {
    rootDir,
    expectedReleaseId: "fixture-release",
    expectedSubjectSha: "1111111111111111111111111111111111111111",
    expectedWorkspaceFingerprint: "2222222222222222222222222222222222222222222222222222222222222222",
  };
}

function actualBundle(): { bundle: ReleaseReceiptBundle; context: ReleaseReceiptValidationContext; rootDir: string } {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "release-receipt-bundle-"));
  const bundle = cloneFixture();
  bundle.evidence_class = "actual_environment";
  for (const receipt of bundle.receipts) {
    const fullPath = path.join(rootDir, receipt.artifact_path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${receipt.kind}\n`, "utf8");
    const hash = crypto.createHash("sha256").update(fs.readFileSync(fullPath)).digest("hex");
    receipt.expected_sha256 = hash;
    receipt.observed_sha256 = hash;
  }
  return { bundle, context: fixtureContext(rootDir), rootDir };
}

function currentActualSingleReceipt(kind: ReleaseReceiptKind, artifactValue: unknown) {
  const rootDir = process.cwd();
  const current = buildFullJestEvidenceContext(rootDir);
  const releaseId = "release-receipt-contract-current";
  const artifactScope = `.release-runtime/release-receipt-contract-${process.pid}-${Date.now()}-${kind}`;
  const artifactPath = `${artifactScope}/${kind}.json`;
  const fullPath = path.join(rootDir, artifactPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, typeof artifactValue === "string"
    ? artifactValue
    : `${JSON.stringify(artifactValue, null, 2)}\n`, "utf8");
  const hash = crypto.createHash("sha256").update(fs.readFileSync(fullPath)).digest("hex");
  const bundle: ReleaseReceiptBundle = {
    schema: "release-receipt-bundle/v1",
    bundle_id: `bundle-${kind}`,
    evidence_class: "actual_environment",
    release_id: releaseId,
    subject_sha: current.headSha,
    workspace_fingerprint: current.workspaceFingerprint,
    artifact_scope: artifactScope,
    receipts: [{
      receipt_id: `receipt-${kind}`,
      kind,
      release_id: releaseId,
      subject_sha: current.headSha,
      workspace_fingerprint: current.workspaceFingerprint,
      artifact_scope: artifactScope,
      artifact_path: artifactPath,
      expected_sha256: hash,
      observed_sha256: hash,
      exit_code: 0,
      passed: true,
    }],
  };
  const context: ReleaseReceiptValidationContext = {
    rootDir,
    expectedReleaseId: releaseId,
    expectedSubjectSha: current.headSha,
    expectedWorkspaceFingerprint: current.workspaceFingerprint,
    requiredKinds: [kind],
  };
  return {
    rootDir,
    current,
    artifactScope,
    artifactPath,
    fullPath,
    bundle,
    context,
    cleanup: () => fs.rmSync(path.join(rootDir, artifactScope), { recursive: true, force: true }),
  };
}

describe("release receipt bundle", () => {
  it("accepts the immutable good fixture as a contract proof, never as actual environment evidence", () => {
    const result = validateReleaseReceiptBundle(GOOD_FIXTURE, fixtureContext());

    expect(result.contract_valid).toBe(true);
    expect(result.actual_environment_passed).toBe(false);
    expect(result.evidence_class).toBe("fixture");
    expect(result.verified_receipt_kinds).toEqual([...REQUIRED_RELEASE_RECEIPT_KINDS].sort());
  });

  it("rejects the immutable bad fixture", () => {
    const result = validateReleaseReceiptBundle(BAD_FIXTURE, fixtureContext());

    expect(result.contract_valid).toBe(false);
    expect(result.actual_environment_passed).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "RECEIPT_HASH_MISMATCH:fixture-lint",
      "RECEIPT_NONZERO_OR_FAILED:fixture-lint",
      "RECEIPT_DUPLICATE_KIND:native",
      "RECEIPT_KIND_MISSING:full_jest",
      "RECEIPT_KIND_MISSING:scale",
    ]));
  });

  it("rejects an actual-shaped synthetic bundle outside the current trusted worktree", () => {
    const actual = actualBundle();
    try {
      const result = validateReleaseReceiptBundle(actual.bundle, actual.context);
      expect(result.contract_valid).toBe(false);
      expect(result.actual_environment_passed).toBe(false);
      expect(result.errors).toContain("RECEIPT_ACTUAL_CONTEXT_NOT_CURRENT_WORKSPACE");
    } finally {
      fs.rmSync(actual.rootDir, { recursive: true, force: true });
    }
  });

  it.each([
    ["missing full_jest", (bundle: ReleaseReceiptBundle) => {
      bundle.receipts = bundle.receipts.filter((receipt) => receipt.kind !== "full_jest");
    }, "RECEIPT_KIND_MISSING:full_jest"],
    ["stale SHA", (bundle: ReleaseReceiptBundle) => {
      bundle.subject_sha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    }, "RECEIPT_BUNDLE_STALE_SUBJECT_SHA"],
    ["hash mismatch", (bundle: ReleaseReceiptBundle) => {
      bundle.receipts[0].observed_sha256 = "4444444444444444444444444444444444444444444444444444444444444444";
    }, "RECEIPT_HASH_MISMATCH:fixture-typecheck"],
    ["foreign release", (bundle: ReleaseReceiptBundle) => {
      bundle.release_id = "foreign-release";
    }, "RECEIPT_BUNDLE_FOREIGN_RELEASE"],
    ["missing native", (bundle: ReleaseReceiptBundle) => {
      bundle.receipts = bundle.receipts.filter((receipt) => receipt.kind !== "native");
    }, "RECEIPT_KIND_MISSING:native"],
    ["missing scale", (bundle: ReleaseReceiptBundle) => {
      bundle.receipts = bundle.receipts.filter((receipt) => receipt.kind !== "scale");
    }, "RECEIPT_KIND_MISSING:scale"],
    ["duplicate kind", (bundle: ReleaseReceiptBundle) => {
      bundle.receipts.push({ ...bundle.receipts.find((receipt) => receipt.kind === "native")!, receipt_id: "fixture-native-copy" });
    }, "RECEIPT_DUPLICATE_KIND:native"],
    ["nonzero exit", (bundle: ReleaseReceiptBundle) => {
      bundle.receipts.find((receipt) => receipt.kind === "lint")!.exit_code = 2;
    }, "RECEIPT_NONZERO_OR_FAILED:fixture-lint"],
  ])("rejects %s", (_name, mutate, expectedError) => {
    const bundle = cloneFixture();
    mutate(bundle);
    const result = validateReleaseReceiptBundle(bundle, fixtureContext());

    expect(result.contract_valid).toBe(false);
    expect(result.actual_environment_passed).toBe(false);
    expect(result.errors).toContain(expectedError);
  });

  it("does not promote a changed synthetic artifact by trusting its declared hashes", () => {
    const actual = actualBundle();
    try {
      fs.appendFileSync(path.join(actual.rootDir, actual.bundle.receipts[0].artifact_path), "changed\n", "utf8");
      const result = validateReleaseReceiptBundle(actual.bundle, actual.context);
      expect(result.contract_valid).toBe(false);
      expect(result.actual_environment_passed).toBe(false);
      expect(result.errors).toContain("RECEIPT_ACTUAL_CONTEXT_NOT_CURRENT_WORKSPACE");
    } finally {
      fs.rmSync(actual.rootDir, { recursive: true, force: true });
    }
  });

  it("requires a typed producer envelope for an actual current-workspace receipt", () => {
    const actual = currentActualSingleReceipt("typecheck", "typecheck\n");
    try {
      const result = validateReleaseReceiptBundle(actual.bundle, actual.context);
      expect(result.contract_valid).toBe(false);
      expect(result.actual_environment_passed).toBe(false);
      expect(result.errors).toContain("RECEIPT_ARTIFACT_ENVELOPE_INVALID:receipt-typecheck");
    } finally {
      actual.cleanup();
    }
  });

  it("validates the full_jest primary terminal instead of trusting its receipt envelope", () => {
    const initial = currentActualSingleReceipt("full_jest", {});
    try {
      const primaryResultPath = `${initial.artifactScope}/terminal-summary.json`;
      const primaryFullPath = path.join(initial.rootDir, primaryResultPath);
      fs.writeFileSync(primaryFullPath, "{}\n", "utf8");
      const primaryHash = crypto.createHash("sha256").update(fs.readFileSync(primaryFullPath)).digest("hex");
      const envelope = {
        schema: "release-receipt-artifact/v1",
        evidence_class: "actual_environment",
        receipt_id: "receipt-full_jest",
        kind: "full_jest",
        release_id: initial.bundle.release_id,
        subject_sha: initial.current.headSha,
        workspace_fingerprint: initial.current.workspaceFingerprint,
        producer: "scripts/release/runFullJestEvidenceGate.ts",
        command_argv: ["npx", "tsx", "scripts/release/runFullJestEvidenceGate.ts"],
        proof_level: REQUIRED_RELEASE_RECEIPT_PROOF_LEVELS.full_jest,
        started_at: "2026-09-09T00:00:00.000Z",
        ended_at: "2026-09-09T00:00:01.000Z",
        duration_ms: 1_000,
        status: "passed",
        exit_code: 0,
        signal: null,
        timed_out: false,
        passed: true,
        expected_ids: ["full-m2"],
        observed_ids: ["full-m2"],
        input_hashes: {
          workspace: initial.current.workspaceFingerprint,
          producer_source: crypto.createHash("sha256").update(fs.readFileSync(path.join(
            initial.rootDir,
            "scripts/release/runFullJestEvidenceGate.ts",
          ))).digest("hex"),
        },
        primary_result_path: primaryResultPath,
        primary_result_sha256: primaryHash,
      };
      fs.writeFileSync(initial.fullPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
      const envelopeHash = crypto.createHash("sha256").update(fs.readFileSync(initial.fullPath)).digest("hex");
      initial.bundle.receipts[0].expected_sha256 = envelopeHash;
      initial.bundle.receipts[0].observed_sha256 = envelopeHash;

      const result = validateReleaseReceiptBundle(initial.bundle, initial.context);
      expect(result.contract_valid).toBe(false);
      expect(result.actual_environment_passed).toBe(false);
      expect(result.errors).toContain("RECEIPT_FULL_JEST_TERMINAL_INVALID");
    } finally {
      initial.cleanup();
    }
  });
});
