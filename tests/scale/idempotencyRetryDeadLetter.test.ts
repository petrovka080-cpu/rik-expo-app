import fs from "node:fs";
import path from "node:path";

import {
  IDEMPOTENCY_CONTRACTS,
  IDEMPOTENCY_MAX_TTL_SECONDS,
  buildSafeIdempotencyFingerprint,
  containsSensitiveIdempotencyValue,
  isIdempotencyBoundaryEnabled,
  validateIdempotencyContract,
} from "../../src/shared/scale/idempotency";
import {
  RETRY_MAX_ATTEMPTS,
  RETRY_MAX_DELAY_MS,
  calculateRetryDelayMs,
  clampRetryAttempts,
  getRetryPolicy,
  isRetryableClass,
  type RetryClass,
} from "../../src/shared/scale/retryPolicy";
import {
  buildDeadLetterRecord,
  isDeadLetterBoundaryEnabled,
  sanitizeDeadLetterContext,
  validateDeadLetterRecord,
} from "../../src/shared/scale/deadLetter";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("S-50K idempotency/retry/dead-letter contracts", () => {
  it("keeps idempotency and dead-letter boundaries disabled unless explicit shadow mode is present", () => {
    expect(isIdempotencyBoundaryEnabled({ enabled: false })).toBe(false);
    expect(isIdempotencyBoundaryEnabled({ enabled: true })).toBe(false);
    expect(isIdempotencyBoundaryEnabled({ enabled: true, shadowMode: false })).toBe(false);
    expect(isIdempotencyBoundaryEnabled({ enabled: true, shadowMode: true })).toBe(true);

    expect(isDeadLetterBoundaryEnabled({ enabled: false })).toBe(false);
    expect(isDeadLetterBoundaryEnabled({ enabled: true })).toBe(false);
    expect(isDeadLetterBoundaryEnabled({ enabled: true, shadowMode: true })).toBe(true);
  });

  it("validates idempotency contracts for required operations", () => {
    const requiredOperations = [
      "proposal.submit",
      "warehouse.receive.apply",
      "accountant.payment.apply",
      "accountant.invoice.update",
      "director.approval.apply",
      "request.item.update",
      "pdf.report.generate",
      "notification.fanout",
      "cache.readModel.refresh",
      "offline.replay.bridge",
    ];

    for (const operation of requiredOperations) {
      expect(IDEMPOTENCY_CONTRACTS).toContainEqual(
        expect.objectContaining({
          operation,
          requiresKey: true,
          storesRawPayload: false,
          piiAllowedInKey: false,
        }),
      );
    }

    expect(IDEMPOTENCY_CONTRACTS.every(validateIdempotencyContract)).toBe(true);
  });

  it("rejects unsafe idempotency contract variants", () => {
    const base = IDEMPOTENCY_CONTRACTS[0];

    expect(validateIdempotencyContract({ ...base, requiresKey: false as true })).toBe(false);
    expect(validateIdempotencyContract({ ...base, storesRawPayload: true as false })).toBe(false);
    expect(validateIdempotencyContract({ ...base, piiAllowedInKey: true as false })).toBe(false);
    expect(validateIdempotencyContract({ ...base, ttlSeconds: 0 })).toBe(false);
    expect(validateIdempotencyContract({ ...base, ttlSeconds: IDEMPOTENCY_MAX_TTL_SECONDS + 1 })).toBe(false);
    expect(validateIdempotencyContract({ ...base, maxReplayWindowSeconds: 0 })).toBe(false);
    expect(validateIdempotencyContract({ ...base, operation: "unknown.operation" as never })).toBe(false);
  });

  it("builds only safe opaque idempotency fingerprints", () => {
    expect(
      buildSafeIdempotencyFingerprint({
        operation: "proposal.submit",
        scope: "request",
        opaqueKey: "opaque-key-v1",
      }),
    ).toEqual({
      version: 1,
      operation: "proposal.submit",
      scope: "request",
      opaqueKey: "opaque-key-v1",
      containsPii: false,
      containsRawPayload: false,
    });

    expect(() =>
      buildSafeIdempotencyFingerprint({
        operation: "proposal.submit",
        scope: "request",
        opaqueKey: { payload: true },
      }),
    ).toThrow("Unsafe idempotency fingerprint");
    expect(() =>
      buildSafeIdempotencyFingerprint({
        operation: "proposal.submit",
        scope: "request",
        opaqueKey: "person@example.test",
      }),
    ).toThrow("Unsafe idempotency fingerprint");
    expect(() =>
      buildSafeIdempotencyFingerprint({
        operation: "proposal.submit",
        scope: "request",
        opaqueKey: "https://files.example.invalid/report.pdf?token=signed-secret",
      }),
    ).toThrow("Unsafe idempotency fingerprint");

    expect(containsSensitiveIdempotencyValue("Bearer abcdefghijklmnop")).toBe(true);
    expect(containsSensitiveIdempotencyValue("+996 555 123 456")).toBe(true);
    expect(containsSensitiveIdempotencyValue("123 Main Street")).toBe(true);
    expect(containsSensitiveIdempotencyValue("safe-opaque-key")).toBe(false);
  });

  it("defines bounded retry policy math for transient and terminal classes", () => {
    const retryable: RetryClass[] = ["network", "rate_limit", "server_error", "external_timeout"];
    for (const retryClass of retryable) {
      const policy = getRetryPolicy(retryClass);
      expect(isRetryableClass(retryClass)).toBe(true);
      expect(policy.maxAttempts).toBeLessThanOrEqual(RETRY_MAX_ATTEMPTS);
      expect(policy.maxDelayMs).toBeLessThanOrEqual(RETRY_MAX_DELAY_MS);
      expect(policy.jitter).toBe(true);
      expect(policy.deadLetterOnExhaustion).toBe(true);
      expect(calculateRetryDelayMs(policy, 99)).toBeLessThanOrEqual(policy.maxDelayMs);
    }

    const terminal: RetryClass[] = ["validation", "permission", "business_rule", "unknown"];
    for (const retryClass of terminal) {
      const policy = getRetryPolicy(retryClass);
      expect(isRetryableClass(retryClass)).toBe(false);
      expect(policy.maxAttempts).toBe(1);
      expect(policy.jitter).toBe(false);
      expect(calculateRetryDelayMs(policy, 3)).toBe(0);
    }

    expect(clampRetryAttempts(undefined)).toBe(1);
    expect(clampRetryAttempts(-10)).toBe(1);
    expect(clampRetryAttempts(999)).toBe(RETRY_MAX_ATTEMPTS);
  });

  it("builds redacted dead-letter records without raw payload or PII", () => {
    const record = buildDeadLetterRecord({
      operation: "pdf.report.generate",
      reason: "retry_exhausted",
      attempts: 7,
      createdAtIso: "2026-04-29T00:00:00.000Z",
      errorClass: "Bearer abcdefghijklmnop",
      context: {
        operation: "pdf.report.generate",
        retry_class: "external_timeout",
        attempts: 5,
        error_class: "token=secretvalue person@example.test",
        raw_payload: "should-not-survive",
        signed_url: "https://files.example.invalid/report.pdf?token=signed-secret",
      },
    });

    expect(validateDeadLetterRecord(record)).toBe(true);
    expect(record).toMatchObject({
      operation: "pdf.report.generate",
      reason: "retry_exhausted",
      attempts: 7,
      createdAtIso: "2026-04-29T00:00:00.000Z",
      errorClass: "Bearer [redacted]",
      rawPayloadStored: false,
      piiStored: false,
    });
    expect(record.redactedContext).toEqual({
      operation: "pdf.report.generate",
      retry_class: "external_timeout",
      attempts: 5,
      error_class: "[redacted] [redacted]",
    });
  });

  it("rejects invalid dead-letter records and strips unsafe context", () => {
    expect(() =>
      buildDeadLetterRecord({
        operation: "unknown.operation" as never,
        reason: "retry_exhausted",
        attempts: 1,
        createdAtIso: "2026-04-29T00:00:00.000Z",
        errorClass: "network",
      }),
    ).toThrow("Unknown dead-letter operation");

    expect(() =>
      buildDeadLetterRecord({
        operation: "proposal.submit",
        reason: "unknown_reason" as never,
        attempts: 1,
        createdAtIso: "2026-04-29T00:00:00.000Z",
        errorClass: "network",
      }),
    ).toThrow("Unknown dead-letter reason");

    expect(
      sanitizeDeadLetterContext({
        flow: "proposal.submit",
        user_id: "user-123",
        company_id: "company-123",
        raw_payload: "secret",
        error_class: "person@example.test +996 555 123 456",
      }),
    ).toEqual({
      flow: "proposal.submit",
      error_class: "[redacted] [redacted]",
    });
  });

  it("does not import idempotency scaffold from active app flows", () => {
    const roots = ["app", "src"];
    const activeImports: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(PROJECT_ROOT, dir), { withFileTypes: true })) {
        const relativePath = path.join(dir, entry.name);
        if (relativePath.replace(/\\/g, "/").startsWith("src/shared/scale")) continue;
        if (entry.isDirectory()) {
          walk(relativePath);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
          continue;
        }
        const source = readProjectFile(relativePath);
        if (
          source.includes("shared/scale/idempotency") ||
          source.includes("shared/scale/retryPolicy") ||
          source.includes("shared/scale/deadLetter")
        ) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports).toEqual([]);
  });

  it("keeps new code, tests, and artifacts free of server admin key markers", () => {
    const markerA = ["service", "role"].join("_");
    const markerB = ["SERVICE", "ROLE"].join("_");
    const files = [
      "src/shared/scale/idempotency.ts",
      "src/shared/scale/retryPolicy.ts",
      "src/shared/scale/deadLetter.ts",
      "tests/scale/idempotencyContracts.test.ts",
      "artifacts/S_50K_IDEMPOTENCY_1_contracts_matrix.json",
      "artifacts/S_50K_IDEMPOTENCY_1_contracts_proof.md",
    ];

    for (const file of files) {
      if (!fs.existsSync(path.join(PROJECT_ROOT, file))) continue;
      const source = readProjectFile(file);
      expect(source).not.toContain(markerA);
      expect(source).not.toContain(markerB);
    }
  });

  it("documents disabled-by-default scope without deployment claims", () => {
    const docs = readProjectFile("docs/architecture/50k_idempotency_retry_dead_letter.md");

    expect(docs).toContain("This wave does not deploy queue infrastructure.");
    expect(docs).toContain("This wave does not create database tables.");
    expect(docs).toContain("This wave does not migrate production traffic.");
    expect(docs).toContain("This wave does not execute background jobs.");
    expect(docs).toContain("This wave defines disabled-by-default contracts only.");
  });
});
