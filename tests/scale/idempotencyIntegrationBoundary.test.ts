import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import {
  EXTERNAL_IDEMPOTENCY_ADAPTER_CONTRACT,
  IN_MEMORY_IDEMPOTENCY_DEFAULT_MAX_RECORDS,
  IN_MEMORY_IDEMPOTENCY_MAX_RECORDS,
  IN_MEMORY_IDEMPOTENCY_MAX_TTL_MS,
  InMemoryIdempotencyAdapter,
  NoopIdempotencyAdapter,
  resolveInMemoryIdempotencyMaxRecords,
  resolveInMemoryIdempotencyTtlMs,
} from "../../src/shared/scale/idempotencyAdapters";
import {
  buildIdempotencyPayloadHash,
  buildSafeIdempotencyKey,
  canonicalizeIdempotencyPayload,
} from "../../src/shared/scale/idempotencyKeySafety";
import {
  BFF_MUTATION_IDEMPOTENCY_POLICY_MAP,
  IDEMPOTENCY_POLICY_REGISTRY,
  JOB_IDEMPOTENCY_POLICY_MAP,
  getIdempotencyPolicy,
  getIdempotencyPolicyForBffMutationOperation,
  getIdempotencyPolicyForJobType,
  validateIdempotencyPolicy,
} from "../../src/shared/scale/idempotencyPolicies";
import { executeWithIdempotencyGuard } from "../../src/shared/scale/idempotencyExecutionGuard";
import {
  OFFLINE_REPLAY_IDEMPOTENCY_CONTRACT,
  buildOfflineReplayIdempotencyKey,
  buildOfflineReplayIdempotencyKeyInput,
} from "../../src/shared/scale/offlineReplayIdempotency";
import { BFF_STAGING_MUTATION_ROUTES } from "../../scripts/server/stagingBffServerBoundary";
import { JOB_POLICY_REGISTRY } from "../../src/shared/scale/jobPolicies";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const changedFiles = () =>
  execFileSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const safeKeyInput = {
  actorId: "actor-opaque",
  requestId: "request-opaque",
  payload: { amountBucket: "small", itemCount: 2 },
};

describe("S-50K-IDEMPOTENCY-INTEGRATION-1 disabled idempotency boundary", () => {
  it("keeps noop and external adapters disabled without external storage calls", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    try {
      const noop = new NoopIdempotencyAdapter();
      await expect(
        noop.reserve({
          key: "idem:v1:test",
          operation: "proposal.submit",
          ttlMs: 1000,
        }),
      ).resolves.toEqual({
        state: "disabled",
        key: "idem:v1:test",
        record: null,
      });
      await expect(noop.commit("idem:v1:test")).resolves.toEqual({
        state: "disabled",
        key: "idem:v1:test",
        record: null,
      });
      expect(noop.getHealth()).toEqual({
        kind: "noop",
        enabled: false,
        externalNetworkEnabled: false,
        persistenceEnabledByDefault: false,
        reserved: 0,
        committed: 0,
        failed: 0,
      });
      expect(EXTERNAL_IDEMPOTENCY_ADAPTER_CONTRACT).toEqual(
        expect.objectContaining({
          kind: "external_contract",
          reserve: "contract_only",
          externalStorageCallsInTests: false,
          persistenceEnabledByDefault: false,
        }),
      );
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (originalFetch) {
        Object.defineProperty(globalThis, "fetch", {
          configurable: true,
          writable: true,
          value: originalFetch,
        });
      } else {
        delete (globalThis as { fetch?: typeof fetch }).fetch;
      }
    }
  });

  it("reserves, commits, and detects duplicates deterministically in memory only", async () => {
    let now = 1_000;
    const adapter = new InMemoryIdempotencyAdapter(() => now);
    const policy = getIdempotencyPolicy("proposal.submit");
    expect(policy).toBeTruthy();
    if (!policy) return;

    const safeKey = buildSafeIdempotencyKey(policy, safeKeyInput);
    expect(safeKey.ok).toBe(true);
    if (!safeKey.ok) return;

    await expect(
      adapter.reserve({
        key: safeKey.key,
        operation: policy.operation,
        ttlMs: policy.ttlMs,
      }),
    ).resolves.toEqual({
      state: "reserved",
      key: safeKey.key,
      record: expect.objectContaining({
        status: "reserved",
        rawPayloadStored: false,
        piiStored: false,
      }),
    });
    await expect(
      adapter.reserve({
        key: safeKey.key,
        operation: policy.operation,
        ttlMs: policy.ttlMs,
      }),
    ).resolves.toEqual({
      state: "duplicate_in_flight",
      key: safeKey.key,
      record: expect.objectContaining({ status: "reserved" }),
    });
    await expect(adapter.commit(safeKey.key)).resolves.toEqual({
      state: "duplicate_committed",
      key: safeKey.key,
      record: expect.objectContaining({
        status: "committed",
        resultStatus: "present_redacted",
      }),
    });
    await expect(
      adapter.reserve({
        key: safeKey.key,
        operation: policy.operation,
        ttlMs: policy.ttlMs,
      }),
    ).resolves.toEqual({
      state: "duplicate_committed",
      key: safeKey.key,
      record: expect.objectContaining({ status: "committed" }),
    });

    now += policy.ttlMs + 1;
    await expect(adapter.getStatus(safeKey.key)).resolves.toEqual(
      expect.objectContaining({ status: "expired" }),
    );
    await expect(adapter.releaseExpired(now)).resolves.toBe(1);
  });

  it("keeps the in-memory adapter bounded for future runtime use", async () => {
    let now = 5_000;
    const policy = getIdempotencyPolicy("warehouse.receive.apply");
    expect(policy).toBeTruthy();
    if (!policy) return;

    expect(resolveInMemoryIdempotencyMaxRecords(2)).toBe(2);
    expect(resolveInMemoryIdempotencyMaxRecords(500_000)).toBe(
      IN_MEMORY_IDEMPOTENCY_MAX_RECORDS,
    );
    expect(resolveInMemoryIdempotencyMaxRecords(0)).toBe(
      IN_MEMORY_IDEMPOTENCY_DEFAULT_MAX_RECORDS,
    );
    expect(resolveInMemoryIdempotencyTtlMs(500_000_000_000)).toBe(
      IN_MEMORY_IDEMPOTENCY_MAX_TTL_MS,
    );
    expect(resolveInMemoryIdempotencyTtlMs(0)).toBe(86_400_000);

    const keyFor = (requestId: string) => {
      const built = buildSafeIdempotencyKey(policy, {
        ...safeKeyInput,
        requestId,
      });
      expect(built.ok).toBe(true);
      if (!built.ok) throw new Error("safe idempotency key build failed");
      return built.key;
    };

    const firstKey = keyFor("bounded-first");
    const secondKey = keyFor("bounded-second");
    const thirdKey = keyFor("bounded-third");
    const fourthKey = keyFor("bounded-fourth");

    const adapter = new InMemoryIdempotencyAdapter({
      nowMs: () => now,
      maxRecords: 2,
    });
    await expect(
      adapter.reserve({
        key: firstKey,
        operation: policy.operation,
        ttlMs: policy.ttlMs,
      }),
    ).resolves.toEqual(expect.objectContaining({ state: "reserved" }));
    await expect(
      adapter.reserve({
        key: secondKey,
        operation: policy.operation,
        ttlMs: policy.ttlMs,
      }),
    ).resolves.toEqual(expect.objectContaining({ state: "reserved" }));
    expect(adapter.getHealth()).toEqual(
      expect.objectContaining({
        totalRecords: 2,
        maxRecords: 2,
        evictedRecords: 0,
      }),
    );

    await expect(
      adapter.reserve({
        key: thirdKey,
        operation: policy.operation,
        ttlMs: policy.ttlMs,
      }),
    ).resolves.toEqual(expect.objectContaining({ state: "reserved" }));
    expect(adapter.getHealth()).toEqual(
      expect.objectContaining({
        totalRecords: 2,
        maxRecords: 2,
        evictedRecords: 1,
      }),
    );
    await expect(adapter.getStatus(firstKey)).resolves.toBeNull();
    await expect(adapter.getStatus(secondKey)).resolves.toEqual(
      expect.objectContaining({ key: secondKey }),
    );
    await expect(adapter.getStatus(thirdKey)).resolves.toEqual(
      expect.objectContaining({ key: thirdKey }),
    );

    await expect(
      adapter.reserve({
        key: "",
        operation: policy.operation,
        ttlMs: policy.ttlMs,
      }),
    ).resolves.toEqual({
      state: "disabled",
      key: "idem:v1:invalid",
      record: null,
    });
    await expect(adapter.commit("person@example.test")).resolves.toEqual({
      state: "disabled",
      key: "idem:v1:invalid",
      record: null,
    });
    expect(adapter.getHealth()).toEqual(
      expect.objectContaining({
        totalRecords: 2,
        invalidKeyDecisions: 2,
      }),
    );

    now += policy.ttlMs + 1;
    await expect(
      adapter.reserve({
        key: fourthKey,
        operation: policy.operation,
        ttlMs: policy.ttlMs,
      }),
    ).resolves.toEqual(expect.objectContaining({ state: "reserved" }));
    expect(adapter.getHealth()).toEqual(
      expect.objectContaining({
        totalRecords: 1,
        expiredRecordsReleased: 2,
      }),
    );

    const ttlAdapter = new InMemoryIdempotencyAdapter({
      nowMs: () => now,
      maxRecords: 2,
    });
    const cappedKey = keyFor("bounded-capped-ttl");
    const capped = await ttlAdapter.reserve({
      key: cappedKey,
      operation: policy.operation,
      ttlMs: Number.MAX_SAFE_INTEGER,
    });
    expect(capped.record?.expiresAtMs).toBe(
      now + IN_MEMORY_IDEMPOTENCY_MAX_TTL_MS,
    );
  });

  it("defines ten disabled strict policies for high-risk mutation, job, and replay operations", () => {
    expect(
      IDEMPOTENCY_POLICY_REGISTRY.map((policy) => policy.operation),
    ).toEqual([
      "proposal.submit",
      "warehouse.receive.apply",
      "accountant.payment.apply",
      "director.approval.apply",
      "request.item.update",
      "offline.replay.bridge",
      "proposal.submit.followup",
      "warehouse.receive.postprocess",
      "accountant.payment.postprocess",
      "director.approval.postprocess",
    ]);

    for (const policy of IDEMPOTENCY_POLICY_REGISTRY) {
      expect(validateIdempotencyPolicy(policy)).toBe(true);
      expect(policy.defaultEnabled).toBe(false);
      expect(policy.requiresActorId).toBe(true);
      expect(policy.requiresRequestId).toBe(true);
      expect(policy.requiresPayloadHash).toBe(true);
      expect(policy.commitOnSuccess).toBe(true);
      expect(policy.failOnError).toBe(true);
    }

    expect(getIdempotencyPolicy("accountant.payment.apply")).toEqual(
      expect.objectContaining({ strict: true, defaultEnabled: false }),
    );
    expect(getIdempotencyPolicy("warehouse.receive.apply")).toEqual(
      expect.objectContaining({ strict: true, defaultEnabled: false }),
    );
    expect(getIdempotencyPolicy("director.approval.apply")).toEqual(
      expect.objectContaining({ strict: true, defaultEnabled: false }),
    );
    expect(getIdempotencyPolicy("offline.replay.bridge")).toEqual(
      expect.objectContaining({
        requiresReplayMutationId: true,
        keyParts: expect.arrayContaining(["replayMutationId", "operationType"]),
      }),
    );
  });

  it("builds deterministic bounded keys with payload hashes and rejects unsafe key material", () => {
    const policy = getIdempotencyPolicy("warehouse.receive.apply");
    expect(policy).toBeTruthy();
    if (!policy) return;

    const first = buildSafeIdempotencyKey(policy, safeKeyInput);
    const second = buildSafeIdempotencyKey(policy, {
      actorId: "actor-opaque",
      requestId: "request-opaque",
      payload: { itemCount: 2, amountBucket: "small" },
    });
    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    if (first.ok) {
      expect(first.key).toContain("warehouse.receive.apply");
      expect(first.key).not.toContain("actor-opaque");
      expect(first.key).not.toContain("request-opaque");
      expect(first.key.length).toBeLessThanOrEqual(180);
      expect(first.payloadHash).toMatch(/^payload:/);
    }

    expect(canonicalizeIdempotencyPayload({ b: 2, a: 1 })).toBe(
      '{"a":1,"b":2}',
    );
    expect(buildIdempotencyPayloadHash({ b: 2, a: 1 })).toEqual(
      buildIdempotencyPayloadHash({ a: 1, b: 2 }),
    );
    expect(
      buildSafeIdempotencyKey(policy, {
        actorId: "actor-opaque",
        requestId: "request-opaque",
        payload: { email: "person@example.test" },
      }),
    ).toEqual({ ok: false, reason: "forbidden_field" });
    expect(
      buildSafeIdempotencyKey(policy, {
        actorId: "person@example.test",
        requestId: "request-opaque",
        payload: { ok: true },
      }),
    ).toEqual({ ok: false, reason: "missing_actor_id" });
    expect(
      buildSafeIdempotencyKey(policy, {
        actorId: "actor-opaque",
        requestId: "request-opaque",
        payload: {
          signed: "https://files.example.invalid/doc.pdf?token=signed-secret",
        },
      }),
    ).toEqual({ ok: false, reason: "sensitive_value" });
  });

  it("guards duplicate execution when explicitly enabled and passes through when disabled", async () => {
    const policy = getIdempotencyPolicy("proposal.submit");
    expect(policy).toBeTruthy();
    if (!policy) return;

    let calls = 0;
    const disabled = await executeWithIdempotencyGuard({
      enabled: false,
      policy,
      keyInput: safeKeyInput,
      handler: () => {
        calls += 1;
        return "runtime-flow-unchanged";
      },
    });
    expect(disabled).toEqual({
      state: "executed",
      executed: true,
      duplicate: false,
      keyStatus: "missing",
      value: "runtime-flow-unchanged",
    });
    expect(calls).toBe(1);

    const adapter = new InMemoryIdempotencyAdapter(() => 2_000);
    const first = await executeWithIdempotencyGuard({
      enabled: true,
      adapter,
      policy,
      keyInput: safeKeyInput,
      handler: () => {
        calls += 1;
        return "committed";
      },
    });
    expect(first).toEqual({
      state: "reserved",
      executed: true,
      duplicate: false,
      keyStatus: "present_redacted",
      value: "committed",
    });

    const duplicate = await executeWithIdempotencyGuard({
      enabled: true,
      adapter,
      policy,
      keyInput: safeKeyInput,
      handler: () => {
        calls += 1;
        return "should-not-run";
      },
    });
    expect(duplicate).toEqual({
      state: "duplicate_committed",
      executed: false,
      duplicate: true,
      keyStatus: "present_redacted",
    });
    expect(calls).toBe(2);
  });

  it("allows retryable failures according to policy and blocks final failures", async () => {
    const retryablePolicy = getIdempotencyPolicy("proposal.submit.followup");
    const finalPolicy = getIdempotencyPolicy("director.approval.apply");
    expect(retryablePolicy).toBeTruthy();
    expect(finalPolicy).toBeTruthy();
    if (!retryablePolicy || !finalPolicy) return;

    const retryAdapter = new InMemoryIdempotencyAdapter(() => 3_000);
    const retryKeyInput = { ...safeKeyInput, requestId: "retry-request" };
    const retryFailure = await executeWithIdempotencyGuard({
      enabled: true,
      adapter: retryAdapter,
      policy: retryablePolicy,
      keyInput: retryKeyInput,
      failureMode: "retryable",
      handler: () => {
        throw new Error("network failure");
      },
    });
    expect(retryFailure.state).toBe("failed_retryable");
    const retrySuccess = await executeWithIdempotencyGuard({
      enabled: true,
      adapter: retryAdapter,
      policy: retryablePolicy,
      keyInput: retryKeyInput,
      handler: () => "retry-ok",
    });
    expect(retrySuccess).toEqual(
      expect.objectContaining({
        state: "reserved",
        executed: true,
        value: "retry-ok",
      }),
    );

    const finalAdapter = new InMemoryIdempotencyAdapter(() => 4_000);
    const finalKeyInput = { ...safeKeyInput, requestId: "final-request" };
    const finalFailure = await executeWithIdempotencyGuard({
      enabled: true,
      adapter: finalAdapter,
      policy: finalPolicy,
      keyInput: finalKeyInput,
      failureMode: "final",
      handler: () => {
        throw new Error("validation failure");
      },
    });
    expect(finalFailure.state).toBe("failed_final");
    const blocked = await executeWithIdempotencyGuard({
      enabled: true,
      adapter: finalAdapter,
      policy: finalPolicy,
      keyInput: finalKeyInput,
      handler: () => "should-not-run",
    });
    expect(blocked).toEqual({
      state: "failed_final",
      executed: false,
      duplicate: false,
      keyStatus: "present_redacted",
    });
  });

  it("maps offline replay idempotency without changing live replay behavior", () => {
    expect(OFFLINE_REPLAY_IDEMPOTENCY_CONTRACT).toEqual({
      operation: "offline.replay.bridge",
      replayMutationIdRequired: true,
      actorIdRequired: true,
      operationTypeRequired: true,
      payloadHashRequired: true,
      duplicateReplayPolicy: "dedupe_by_replay_mutation_id_and_payload_hash",
      liveReplayBehaviorChanged: false,
      defaultEnabled: false,
    });

    const input = buildOfflineReplayIdempotencyKeyInput({
      actorId: "actor-opaque",
      requestId: "offline-request",
      replayMutationId: "replay-mutation-opaque",
      operationType: "proposal.submit",
      payload: { mutation: "submitted" },
    });
    expect(input).toEqual(
      expect.objectContaining({
        actorId: "actor-opaque",
        requestId: "offline-request",
        replayMutationId: "replay-mutation-opaque",
        operationType: "proposal.submit",
      }),
    );

    const key = buildOfflineReplayIdempotencyKey({
      actorId: "actor-opaque",
      requestId: "offline-request",
      replayMutationId: "replay-mutation-opaque",
      operationType: "proposal.submit",
      payload: { mutation: "submitted" },
    });
    expect(key).toEqual(
      expect.objectContaining({
        ok: true,
        key: expect.stringContaining("offline.replay.bridge"),
      }),
    );
  });

  it("attaches idempotency metadata to BFF mutation routes and job policies", () => {
    expect(Object.keys(BFF_MUTATION_IDEMPOTENCY_POLICY_MAP)).toEqual([
      "proposal.submit",
      "warehouse.receive.apply",
      "accountant.payment.apply",
      "director.approval.apply",
      "request.item.update",
    ]);

    for (const route of BFF_STAGING_MUTATION_ROUTES) {
      const operation =
        route.operation as keyof typeof BFF_MUTATION_IDEMPOTENCY_POLICY_MAP;
      expect(route.idempotencyPolicyOperation).toBe(
        BFF_MUTATION_IDEMPOTENCY_POLICY_MAP[operation],
      );
      expect(route.idempotencyPolicyDefaultEnabled).toBe(false);
      expect(route.idempotencyPersistenceEnabledByDefault).toBe(false);
      expect(
        getIdempotencyPolicyForBffMutationOperation(operation)?.defaultEnabled,
      ).toBe(false);
    }

    expect(JOB_IDEMPOTENCY_POLICY_MAP).toEqual({
      "proposal.submit.followup": "proposal.submit.followup",
      "warehouse.receive.postprocess": "warehouse.receive.postprocess",
      "accountant.payment.postprocess": "accountant.payment.postprocess",
      "director.approval.postprocess": "director.approval.postprocess",
      "offline.replay.bridge": "offline.replay.bridge",
    });

    for (const policy of JOB_POLICY_REGISTRY) {
      if (policy.jobType in JOB_IDEMPOTENCY_POLICY_MAP) {
        expect(policy.idempotencyPolicyOperation).toBe(
          getIdempotencyPolicyForJobType(policy.jobType)?.operation,
        );
        expect(policy.idempotencyPolicyDefaultEnabled).toBe(false);
        expect(policy.idempotencyPersistenceEnabledByDefault).toBe(false);
      }
    }
  });

  it("does not replace app flows, log raw payloads, or touch forbidden platform files", () => {
    const roots = [
      "app",
      "src/screens",
      "src/components",
      "src/features",
      "src/lib/api",
    ];
    const activeImports: string[] = [];

    const walk = (relativeDir: string) => {
      const fullDir = path.join(PROJECT_ROOT, relativeDir);
      if (!fs.existsSync(fullDir)) return;
      for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
        const relativePath = path.join(relativeDir, entry.name);
        if (entry.isDirectory()) {
          walk(relativePath);
          continue;
        }
        if (
          !/\.(ts|tsx)$/.test(entry.name) ||
          entry.name.endsWith(".test.ts") ||
          entry.name.endsWith(".test.tsx")
        ) {
          continue;
        }
        const source = readProjectFile(relativePath);
        if (
          source.includes("shared/scale/idempotencyAdapters") ||
          source.includes("shared/scale/idempotencyPolicies") ||
          source.includes("shared/scale/idempotencyKeySafety") ||
          source.includes("shared/scale/idempotencyExecutionGuard") ||
          source.includes("shared/scale/offlineReplayIdempotency")
        ) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports).toEqual([]);

    const changed = changedFiles();
    expect(changed).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^(package\.json|package-lock\.json|app\.json|eas\.json)$/,
        ),
        expect.stringMatching(/^(android\/|ios\/|supabase\/migrations\/)/),
      ]),
    );

    const changedSource = [
      "src/shared/scale/idempotencyAdapters.ts",
      "src/shared/scale/idempotencyPolicies.ts",
      "src/shared/scale/idempotencyKeySafety.ts",
      "src/shared/scale/idempotencyExecutionGuard.ts",
      "src/shared/scale/offlineReplayIdempotency.ts",
    ]
      .map(readProjectFile)
      .join("\n");
    expect(changedSource).not.toMatch(/console\.(log|warn|error|info)/);
    expect(changedSource).not.toMatch(
      /rawPayloadLogged:\s*true|piiLogged:\s*true/,
    );
  });

  it("keeps artifacts valid JSON", () => {
    const matrix = JSON.parse(
      readProjectFile("artifacts/S_50K_IDEMPOTENCY_INTEGRATION_1_matrix.json"),
    );
    expect(matrix.wave).toBe("S-50K-IDEMPOTENCY-INTEGRATION-1");
    expect(matrix.idempotencyBoundary.enabledByDefault).toBe(false);
    expect(matrix.policies.total).toBe(10);
    expect(matrix.integration.bffMutationRoutesWithIdempotencyMetadata).toBe(5);
    expect(matrix.integration.jobPoliciesWithIdempotencyMetadata).toBe(5);
    expect(matrix.safety.sqlRpcChanged).toBe(false);
    expect(matrix.safety.rawPayloadLogged).toBe(false);

    const runtimeMatrix = JSON.parse(
      readProjectFile(
        "artifacts/S_50K_IDEMPOTENCY_RUNTIME_ADAPTER_2_matrix.json",
      ),
    );
    expect(runtimeMatrix.wave).toBe("S-50K-IDEMPOTENCY-RUNTIME-ADAPTER-2");
    expect(runtimeMatrix.status).toBe(
      "GREEN_IDEMPOTENCY_RUNTIME_GUARDRAIL_READY",
    );
    expect(runtimeMatrix.runtimeGuardrails.maxRecordsDefault).toBe(
      IN_MEMORY_IDEMPOTENCY_DEFAULT_MAX_RECORDS,
    );
    expect(runtimeMatrix.runtimeGuardrails.maxTtlMs).toBe(
      IN_MEMORY_IDEMPOTENCY_MAX_TTL_MS,
    );
    expect(runtimeMatrix.safety.productionTouched).toBe(false);
    expect(runtimeMatrix.safety.stagingTouched).toBe(false);
    expect(runtimeMatrix.safety.appRuntimeIdempotencyEnabled).toBe(false);
  });
});
