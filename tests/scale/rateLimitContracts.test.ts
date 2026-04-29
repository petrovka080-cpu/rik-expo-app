import fs from "node:fs";
import path from "node:path";

import {
  RATE_LIMIT_BUCKET_WINDOWS,
  RATE_LIMIT_POLICIES,
  RATE_LIMITED_OPERATIONS,
  compareStrictness,
  containsUnsafeRateLimitKeyPart,
  getRateLimitPolicy,
  isLiveRateLimitEnforcementEnabled,
  validateRateLimitKeyParts,
  validateRateLimitPolicy,
  validateRateLimitWindow,
  type RateLimitedOperation,
} from "../../src/shared/scale/rateLimits";
import {
  buildDisabledAbuseGuardDecision,
  validateAbuseGuardDecision,
} from "../../src/shared/scale/abuseGuards";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("S-50K rate limiting and abuse guard contracts", () => {
  it("defines valid disabled-scaffold policies for every mapped operation", () => {
    expect(RATE_LIMIT_POLICIES).toHaveLength(RATE_LIMITED_OPERATIONS.length);

    for (const operation of RATE_LIMITED_OPERATIONS) {
      const policy = getRateLimitPolicy(operation);
      expect(policy).toEqual(
        expect.objectContaining({
          operation,
          enforcement: "disabled_scaffold",
          failMode: "allow_with_observation",
          piiAllowedInKey: false,
          rawPayloadAllowedInKey: false,
        }),
      );
      expect(policy && validateRateLimitPolicy(policy)).toBe(true);
    }
  });

  it("keeps live rate limit enforcement disabled", () => {
    expect(isLiveRateLimitEnforcementEnabled({ enabled: false })).toBe(false);
    expect(isLiveRateLimitEnforcementEnabled({ enabled: true })).toBe(false);
    expect(isLiveRateLimitEnforcementEnabled({ enabled: true, shadowMode: true })).toBe(false);
    expect(RATE_LIMIT_POLICIES.every((policy) => policy.enforcement === "disabled_scaffold")).toBe(true);
  });

  it("validates bounded positive windows", () => {
    for (const windows of Object.values(RATE_LIMIT_BUCKET_WINDOWS)) {
      for (const window of windows) {
        expect(validateRateLimitWindow(window)).toBe(true);
        expect(window.burst).toBeLessThanOrEqual(window.maxRequests);
      }
    }

    expect(validateRateLimitWindow({ windowSeconds: 0, maxRequests: 1, burst: 1 })).toBe(false);
    expect(validateRateLimitWindow({ windowSeconds: 60, maxRequests: 0, burst: 1 })).toBe(false);
    expect(validateRateLimitWindow({ windowSeconds: 60, maxRequests: 10, burst: 0 })).toBe(false);
    expect(validateRateLimitWindow({ windowSeconds: 60, maxRequests: 10, burst: 11 })).toBe(false);
  });

  it("keeps expensive and external policies stricter than read/write baselines", () => {
    const readHeavy = RATE_LIMIT_BUCKET_WINDOWS.read_heavy[0];
    const writeSensitive = RATE_LIMIT_BUCKET_WINDOWS.write_sensitive[0];
    const expensiveJob = RATE_LIMIT_BUCKET_WINDOWS.expensive_job[0];
    const externalSideEffect = RATE_LIMIT_BUCKET_WINDOWS.external_side_effect[0];

    expect(compareStrictness(expensiveJob, readHeavy)).toBeLessThan(0);
    expect(compareStrictness(externalSideEffect, writeSensitive)).toBeLessThan(0);
  });

  it("maps realtime reconnect/setup to a dedicated realtime policy", () => {
    expect(getRateLimitPolicy("realtime.channel.setup")).toEqual(
      expect.objectContaining({
        bucket: "realtime",
        subjects: expect.arrayContaining(["user", "company", "device"]),
        windows: [{ windowSeconds: 60, maxRequests: 30, burst: 5 }],
      }),
    );
  });

  it("rejects unsafe rate limit key parts", () => {
    expect(
      validateRateLimitKeyParts({
        operation: "proposal.submit",
        subject: "user",
        opaqueSubjectKey: "opaque-subject-key",
        containsPii: false,
        containsRawPayload: false,
      }),
    ).toBe(true);

    expect(
      validateRateLimitKeyParts({
        operation: "unknown.operation" as RateLimitedOperation,
        subject: "user",
        opaqueSubjectKey: "opaque-subject-key",
        containsPii: false,
        containsRawPayload: false,
      }),
    ).toBe(false);
    expect(
      validateRateLimitKeyParts({
        operation: "proposal.submit",
        subject: "user",
        opaqueSubjectKey: "opaque-subject-key",
        containsPii: true as false,
        containsRawPayload: false,
      }),
    ).toBe(false);
    expect(
      validateRateLimitKeyParts({
        operation: "proposal.submit",
        subject: "user",
        opaqueSubjectKey: "opaque-subject-key",
        containsPii: false,
        containsRawPayload: true as false,
      }),
    ).toBe(false);

    expect(containsUnsafeRateLimitKeyPart({ payload: true })).toBe(true);
    expect(containsUnsafeRateLimitKeyPart('{"requestId":"req-1"}')).toBe(true);
    expect(containsUnsafeRateLimitKeyPart("token=secretvalue")).toBe(true);
    expect(containsUnsafeRateLimitKeyPart("Bearer abcdefghijklmnop")).toBe(true);
    expect(containsUnsafeRateLimitKeyPart("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature")).toBe(true);
    expect(containsUnsafeRateLimitKeyPart("https://files.example.invalid/doc.pdf?token=signed-secret")).toBe(true);
    expect(containsUnsafeRateLimitKeyPart("person@example.test")).toBe(true);
    expect(containsUnsafeRateLimitKeyPart("+996 555 123 456")).toBe(true);
    expect(containsUnsafeRateLimitKeyPart("123 Main Street")).toBe(true);
    expect(containsUnsafeRateLimitKeyPart("user_123456")).toBe(true);
    expect(containsUnsafeRateLimitKeyPart("safe-opaque-key")).toBe(false);
  });

  it("builds safe disabled abuse guard decisions without blocking users", () => {
    const tooMany = buildDisabledAbuseGuardDecision("too_many_requests");
    expect(tooMany).toEqual({
      action: "observe",
      reason: "too_many_requests",
      safeMessage: "Request volume pattern recorded for future rate limit review",
      rawPayloadLogged: false,
      piiLogged: false,
    });
    expect(validateAbuseGuardDecision(tooMany)).toBe(true);

    const unknown = buildDisabledAbuseGuardDecision("raw internals user@example.test token=secretvalue");
    expect(unknown.reason).toBe("unknown");
    expect(unknown.action).toBe("observe");
    expect(unknown.safeMessage).not.toContain("user@example.test");
    expect(unknown.safeMessage).not.toContain("secretvalue");
    expect(validateAbuseGuardDecision(unknown)).toBe(true);
  });

  it("does not import rate limit scaffold from active app flows", () => {
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
        if (source.includes("shared/scale/rateLimits") || source.includes("shared/scale/abuseGuards")) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports).toEqual([]);
  });

  it("keeps new code, tests, docs, and artifacts free of server admin key markers", () => {
    const markerA = ["service", "role"].join("_");
    const markerB = ["SERVICE", "ROLE"].join("_");
    const files = [
      "src/shared/scale/rateLimits.ts",
      "src/shared/scale/abuseGuards.ts",
      "tests/scale/rateLimitContracts.test.ts",
      "docs/architecture/50k_rate_limiting_abuse_guards.md",
      "artifacts/S_50K_RATE_1_rate_limit_matrix.json",
      "artifacts/S_50K_RATE_1_rate_limit_proof.md",
    ];

    for (const file of files) {
      const fullPath = path.join(PROJECT_ROOT, file);
      if (!fs.existsSync(fullPath)) continue;
      const source = readProjectFile(file);
      expect(source).not.toContain(markerA);
      expect(source).not.toContain(markerB);
    }
  });

  it("documents disabled-by-default scope without live enforcement claims", () => {
    const docs = readProjectFile("docs/architecture/50k_rate_limiting_abuse_guards.md");

    expect(docs).toContain("This wave does not enable live rate limiting.");
    expect(docs).toContain("This wave does not block users.");
    expect(docs).toContain("This wave does not deploy server infrastructure.");
    expect(docs).toContain("This wave does not create database tables.");
    expect(docs).toContain("This wave does not migrate production traffic.");
    expect(docs).toContain("This wave defines disabled-by-default contracts only.");
  });
});
