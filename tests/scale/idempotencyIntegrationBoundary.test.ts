import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import {
  EXTERNAL_IDEMPOTENCY_ADAPTER_CONTRACT,
  DbIdempotencyAdapter,
  createDbIdempotencyAdapterFromEnv,
  type DbIdempotencyQuery,
  type DbIdempotencyQueryInput,
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
import { SCALE_PROVIDER_RUNTIME_ENV_NAMES } from "../../src/shared/scale/providerRuntimeConfig";

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

const createDbIdempotencyMock = (nowMs = 10_000) => {
  const records = new Map<string, Record<string, unknown>>();
  const calls: DbIdempotencyQueryInput[] = [];

  const query = jest.fn(async (input: DbIdempotencyQueryInput) => {
    calls.push(input);
    const key = String(input.values[0] ?? "");
    let row: Record<string, unknown> | null = null;

    if (input.operation === "reserve") {
      const existing = records.get(key);
      if (!existing) {
        row = {
          key,
          operation: input.values[1],
          status: "reserved",
          attempts: 1,
          created_at_ms: input.values[2],
          updated_at_ms: input.values[2],
          expires_at_ms: input.values[3],
          raw_payload_stored: false,
          pii_stored: false,
          result_status: "missing",
          reserve_state: "reserved",
        };
        records.set(key, row);
      } else if (existing.status === "failed_retryable") {
        row = {
          ...existing,
          status: "reserved",
          attempts: Number(existing.attempts) + 1,
          updated_at_ms: input.values[2],
          reserve_state: "reserved",
        };
        records.set(key, row);
      } else {
        row = {
          ...existing,
          reserve_state:
            existing.status === "reserved"
              ? "duplicate_in_flight"
              : existing.status === "committed"
                ? "duplicate_committed"
                : existing.status,
        };
      }
    }

    if (input.operation === "commit") {
      const existing = records.get(key);
      if (existing) {
        row = {
          ...existing,
          status: "committed",
          updated_at_ms: input.values[1],
          result_status: "present_redacted",
        };
        records.set(key, row);
      }
    }

    if (input.operation === "fail") {
      const existing = records.get(key);
      if (existing) {
        row = {
          ...existing,
          status: input.values[1],
          updated_at_ms: input.values[2],
        };
        records.set(key, row);
      }
    }

    if (input.operation === "status") {
      row = records.get(key) ?? null;
    }

    if (input.operation === "releaseExpired") {
      const expiredKeys = [...records.entries()]
        .filter(([, record]) => Number(record.expires_at_ms) <= Number(input.values[0]))
        .map(([recordKey]) => recordKey);
      for (const recordKey of expiredKeys) {
        const record = records.get(recordKey);
        if (record) records.set(recordKey, { ...record, status: "expired" });
      }
      return { rows: expiredKeys.map((recordKey) => ({ key: recordKey })), rowCount: expiredKeys.length };
    }

    return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
  }) as jest.MockedFunction<DbIdempotencyQuery>;

  return { query, calls, nowMs };
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

  it("keeps the DB idempotency provider disabled by default and staging-gated", async () => {
    const db = createDbIdempotencyMock();

    const disabled = createDbIdempotencyAdapterFromEnv(
      {},
      {
        runtimeEnvironment: "staging",
        query: db.query,
      },
    );
    expect(disabled).toBeInstanceOf(NoopIdempotencyAdapter);
    await expect(
      disabled.reserve({
        key: "idem:v1:proposal.submit:1234abcd",
        operation: "proposal.submit",
        ttlMs: 1000,
      }),
    ).resolves.toEqual({
      state: "disabled",
      key: "idem:v1:proposal.submit:1234abcd",
      record: null,
    });
    expect(db.query).not.toHaveBeenCalled();

    const staging = createDbIdempotencyAdapterFromEnv(
      {
        SCALE_IDEMPOTENCY_DB_STAGING_ENABLED: "true",
        SCALE_IDEMPOTENCY_DB_URL: "postgres://db.example.invalid/staging",
        SCALE_IDEMPOTENCY_TABLE: "public.scale_idempotency_records",
      },
      {
        runtimeEnvironment: "staging",
        query: db.query,
      },
    );
    expect(staging).toBeInstanceOf(DbIdempotencyAdapter);
    expect(staging.getHealth()).toEqual(
      expect.objectContaining({
        kind: "db",
        enabled: true,
        externalNetworkEnabled: true,
        persistenceEnabledByDefault: false,
        tableName: '"public"."scale_idempotency_records"',
      }),
    );

    const production = createDbIdempotencyAdapterFromEnv(
      {
        SCALE_IDEMPOTENCY_DB_STAGING_ENABLED: "true",
        SCALE_IDEMPOTENCY_DB_URL: "postgres://db.example.invalid/staging",
        SCALE_IDEMPOTENCY_TABLE: "public.scale_idempotency_records",
      },
      {
        runtimeEnvironment: "production",
        query: db.query,
      },
    );
    expect(production).toBeInstanceOf(NoopIdempotencyAdapter);
    expect(production.getHealth().externalNetworkEnabled).toBe(false);
  });

  it("executes reserve/commit/fail/status/release through a mocked DB provider without raw payload storage", async () => {
    const db = createDbIdempotencyMock();
    const adapter = new DbIdempotencyAdapter({
      tableName: "public.scale_idempotency_records",
      query: db.query,
      nowMs: () => db.nowMs,
    });

    const key = "idem:v1:proposal.submit:1234abcd";
    await expect(
      adapter.reserve({
        key,
        operation: "proposal.submit",
        ttlMs: 1000,
      }),
    ).resolves.toEqual({
      state: "reserved",
      key,
      record: expect.objectContaining({
        key,
        status: "reserved",
        rawPayloadStored: false,
        piiStored: false,
        resultStatus: "missing",
      }),
    });
    await expect(
      adapter.reserve({
        key,
        operation: "proposal.submit",
        ttlMs: 1000,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        state: "duplicate_in_flight",
        key,
      }),
    );
    await expect(adapter.commit(key)).resolves.toEqual({
      state: "duplicate_committed",
      key,
      record: expect.objectContaining({
        status: "committed",
        resultStatus: "present_redacted",
      }),
    });
    await expect(adapter.getStatus(key)).resolves.toEqual(
      expect.objectContaining({ status: "committed" }),
    );

    const retryKey = "idem:v1:proposal.submit:5678abcd";
    await adapter.reserve({
      key: retryKey,
      operation: "proposal.submit",
      ttlMs: 1000,
    });
    await expect(adapter.fail(retryKey, true)).resolves.toEqual(
      expect.objectContaining({
        state: "failed_retryable",
        record: expect.objectContaining({ status: "failed_retryable" }),
      }),
    );
    await expect(
      adapter.reserve({
        key: retryKey,
        operation: "proposal.submit",
        ttlMs: 1000,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        state: "reserved",
        record: expect.objectContaining({ attempts: 2 }),
      }),
    );
    await expect(adapter.releaseExpired(db.nowMs + 2000)).resolves.toBe(2);

    expect(db.calls.map((call) => call.operation)).toEqual([
      "reserve",
      "reserve",
      "commit",
      "status",
      "reserve",
      "fail",
      "reserve",
      "releaseExpired",
    ]);
    const serializedCalls = JSON.stringify(db.calls);
    expect(serializedCalls).toContain("scale_idempotency_records");
    expect(serializedCalls).not.toContain("person@example.test");
    expect(serializedCalls).not.toContain("rawPayload");
  });

  it("rejects unsafe DB idempotency keys and table names before provider calls", async () => {
    const db = createDbIdempotencyMock();
    const unsafeTable = new DbIdempotencyAdapter({
      tableName: "public.scale_idempotency_records;drop table unsafe",
      query: db.query,
    });
    await expect(
      unsafeTable.reserve({
        key: "idem:v1:proposal.submit:1234abcd",
        operation: "proposal.submit",
        ttlMs: 1000,
      }),
    ).resolves.toEqual({
      state: "disabled",
      key: "idem:v1:proposal.submit:1234abcd",
      record: null,
    });

    const safeTable = new DbIdempotencyAdapter({
      tableName: "public.scale_idempotency_records",
      query: db.query,
    });
    await expect(
      safeTable.reserve({
        key: "person@example.test",
        operation: "proposal.submit",
        ttlMs: 1000,
      }),
    ).resolves.toEqual({
      state: "disabled",
      key: "idem:v1:invalid",
      record: null,
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  it("keeps DB idempotency provider env names server-only", () => {
    const idempotencyDbEnvNames = [
      SCALE_PROVIDER_RUNTIME_ENV_NAMES.idempotency_db.enabled,
      ...SCALE_PROVIDER_RUNTIME_ENV_NAMES.idempotency_db.required,
      ...SCALE_PROVIDER_RUNTIME_ENV_NAMES.idempotency_db.optional,
    ];

    expect(idempotencyDbEnvNames).toEqual([
      "SCALE_IDEMPOTENCY_DB_STAGING_ENABLED",
      "SCALE_IDEMPOTENCY_DB_URL",
      "SCALE_IDEMPOTENCY_TABLE",
    ]);
    expect(idempotencyDbEnvNames.every((name) => !name.startsWith("EXPO_PUBLIC_"))).toBe(true);
    expect(idempotencyDbEnvNames).not.toContain("BFF_SERVER_AUTH_SECRET");
    expect(idempotencyDbEnvNames).not.toContain("EXPO_PUBLIC_BFF_SERVER_AUTH_SECRET");
    expect(readProjectFile("src/shared/scale/idempotencyAdapters.ts")).not.toContain(
      "EXPO_PUBLIC_BFF_SERVER_AUTH_SECRET",
    );
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
