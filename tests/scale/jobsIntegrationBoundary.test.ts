import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import {
  BullMqJobAdapter,
  EXTERNAL_JOB_ADAPTER_CONTRACT,
  InMemoryJobAdapter,
  NoopJobAdapter,
  QueueHttpJobAdapter,
  createQueueJobAdapterFromEnv,
  type BullMqJobPort,
  type BullMqQueuePort,
  type QueueHttpFetch,
} from "../../src/shared/scale/jobAdapters";
import {
  BFF_MUTATION_JOB_POLICY_MAP,
  JOB_POLICY_REGISTRY,
  getJobPolicy,
  validateJobPolicy,
  type JobType,
} from "../../src/shared/scale/jobPolicies";
import {
  validateJobPayloadEnvelope,
} from "../../src/shared/scale/jobPayloadSafety";
import {
  JOB_IDEMPOTENCY_REQUIRED_TYPES,
  getJobIdempotencyRequirement,
  jobRequiresIdempotency,
} from "../../src/shared/scale/jobIdempotency";
import {
  buildJobDeadLetterSummary,
  mapJobFailureToDeadLetterReason,
} from "../../src/shared/scale/jobDeadLetterBoundary";
import { calculateRetryDelayMs } from "../../src/shared/scale/retryPolicy";
import {
  BFF_STAGING_MUTATION_ROUTES,
} from "../../scripts/server/stagingBffServerBoundary";
import { SCALE_PROVIDER_RUNTIME_ENV_NAMES } from "../../src/shared/scale/providerRuntimeConfig";
import {
  MAX_QUEUE_WORKER_CONCURRENCY,
  MAX_SUBMIT_JOB_CLAIM_LIMIT,
} from "../../src/workers/queueWorker.limits";

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

const createQueueHttpMock = () => {
  const records = new Map<string, { jobId: string; jobType: JobType; status: "queued" | "cancelled" | "retry_scheduled" | "dead_lettered"; attempts: number; payloadBytes: number }>();
  const requests: unknown[] = [];
  let sequence = 0;

  const fetchMock = jest.fn(async (_input: string, init: Parameters<QueueHttpFetch>[1]) => {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    requests.push(body);
    let result: unknown = null;

    if (body.operation === "enqueue" && typeof body.jobType === "string") {
      sequence += 1;
      const record = {
        jobId: `provider-job-${sequence}`,
        jobType: body.jobType as JobType,
        status: "queued" as const,
        attempts: 0,
        payloadBytes: Number(body.payloadBytes) || 0,
      };
      records.set(record.jobId, record);
      result = record;
    }

    if (body.operation === "status" && typeof body.jobId === "string") {
      result = records.get(body.jobId) ?? null;
    }

    if (body.operation === "cancel" && typeof body.jobId === "string") {
      const current = records.get(body.jobId);
      if (current) records.set(body.jobId, { ...current, status: "cancelled" });
      result = { ok: Boolean(current) };
    }

    if (body.operation === "retry" && typeof body.jobId === "string") {
      const current = records.get(body.jobId);
      if (current) {
        const next = { ...current, status: "retry_scheduled" as const, attempts: current.attempts + 1 };
        records.set(body.jobId, next);
        result = next;
      }
    }

    if (body.operation === "deadLetter" && typeof body.jobId === "string") {
      const current = records.get(body.jobId);
      if (current) records.set(body.jobId, { ...current, status: "dead_lettered" });
      result = { ok: Boolean(current) };
    }

    return {
      ok: true,
      json: async () => ({ result }),
    };
  }) as jest.MockedFunction<QueueHttpFetch>;

  return { fetchMock, requests };
};

type MockBullMqJob = BullMqJobPort & {
  state: string;
  getState: jest.Mock<Promise<string>, []>;
  remove: jest.Mock<Promise<void>, []>;
  retry: jest.Mock<Promise<void>, []>;
  moveToFailed: jest.Mock<Promise<unknown>, [Error, string, boolean?]>;
};

const createBullMqQueueMock = () => {
  const jobs = new Map<string, MockBullMqJob>();
  let sequence = 0;

  const queue: BullMqQueuePort = {
    add: jest.fn(async (name, data, opts) => {
      sequence += 1;
      const job = {
        id: `bullmq-job-${sequence}`,
        name,
        data,
        attemptsMade: 0,
        opts,
        state: "waiting",
      } as unknown as MockBullMqJob;
      job.getState = jest.fn(async () => job.state);
      job.remove = jest.fn(async () => {
        job.state = "cancelled";
      });
      job.retry = jest.fn(async () => {
        job.attemptsMade = (job.attemptsMade ?? 0) + 1;
        job.state = "retry_scheduled";
      });
      job.moveToFailed = jest.fn(async (_error: Error, _token: string, _fetchNext?: boolean) => {
        job.state = "failed";
        return null;
      });
      jobs.set(String(job.id), job);
      return job;
    }),
    getJob: jest.fn(async (jobId) => jobs.get(jobId) ?? null),
  };

  return {
    queue,
    jobs,
    addMock: queue.add as jest.MockedFunction<BullMqQueuePort["add"]>,
    getJobMock: queue.getJob as jest.MockedFunction<BullMqQueuePort["getJob"]>,
  };
};

describe("S-50K-JOBS-INTEGRATION-1 disabled background job boundary", () => {
  it("keeps noop and external adapters contract-only without network calls", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    try {
      const noop = new NoopJobAdapter();
      await expect(
        noop.enqueue({ jobType: "pdf.document.generate", payload: { documentId: "opaque-doc" } }),
      ).resolves.toEqual({
        ok: false,
        code: "JOB_ADAPTER_DISABLED",
        message: "Background job execution is disabled",
      });
      await expect(noop.getStatus("missing")).resolves.toBeNull();
      await expect(noop.cancel("missing")).resolves.toBe(false);
      await expect(noop.deadLetter("missing", "retry_exhausted")).resolves.toBe(false);
      expect(noop.getHealth()).toEqual({
        kind: "noop",
        enabled: false,
        externalNetworkEnabled: false,
        executionEnabledByDefault: false,
        queued: 0,
        deadLettered: 0,
      });
      expect(EXTERNAL_JOB_ADAPTER_CONTRACT).toEqual(
        expect.objectContaining({
          kind: "external_contract",
          enqueue: "contract_only",
          externalNetworkEnabledByDefault: false,
          executionEnabledByDefault: false,
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

  it("uses the in-memory adapter only for deterministic local proof", async () => {
    const adapter = new InMemoryJobAdapter();
    const enqueued = await adapter.enqueue({
      jobType: "cache.readmodel.refresh",
      payload: { model: "director.pending.list", companyKey: "opaque-company" },
    });

    expect(enqueued.ok).toBe(true);
    if (!enqueued.ok) return;
    expect(enqueued.record.status).toBe("queued");
    await expect(adapter.getStatus(enqueued.record.jobId)).resolves.toEqual(enqueued.record);
    await expect(adapter.retry(enqueued.record.jobId)).resolves.toEqual({
      ok: true,
      record: expect.objectContaining({
        attempts: 1,
        status: "retry_scheduled",
      }),
    });
    await expect(adapter.deadLetter(enqueued.record.jobId, "retry_exhausted")).resolves.toBe(true);
    expect(adapter.getHealth()).toEqual({
      kind: "in_memory",
      enabled: true,
      externalNetworkEnabled: false,
      executionEnabledByDefault: false,
      queued: 0,
      deadLettered: 1,
    });
  });

  it("keeps external queue provider disabled by default and staging-gated", async () => {
    const queue = createQueueHttpMock();

    const disabled = createQueueJobAdapterFromEnv({}, {
      runtimeEnvironment: "staging",
      fetchImpl: queue.fetchMock,
    });
    expect(disabled).toBeInstanceOf(NoopJobAdapter);
    await expect(disabled.enqueue({ jobType: "notification.fanout", payload: { message: "safe" } })).resolves.toEqual({
      ok: false,
      code: "JOB_ADAPTER_DISABLED",
      message: "Background job execution is disabled",
    });
    expect(queue.fetchMock).not.toHaveBeenCalled();

    const staging = createQueueJobAdapterFromEnv(
      {
        SCALE_QUEUE_STAGING_ENABLED: "true",
        SCALE_QUEUE_PROVIDER: "queue_provider",
        SCALE_QUEUE_URL: "https://queue.example.invalid",
        SCALE_QUEUE_NAMESPACE: "rik-staging",
      },
      {
        runtimeEnvironment: "staging",
        fetchImpl: queue.fetchMock,
      },
    );
    expect(staging.getHealth()).toEqual(
      expect.objectContaining({
        kind: "queue_http",
        enabled: true,
        externalNetworkEnabled: true,
        executionEnabledByDefault: false,
        namespace: "rik-staging",
        provider: "queue_provider",
      }),
    );

    const production = createQueueJobAdapterFromEnv(
      {
        SCALE_QUEUE_STAGING_ENABLED: "true",
        SCALE_QUEUE_PROVIDER: "queue_provider",
        SCALE_QUEUE_URL: "https://queue.example.invalid",
        SCALE_QUEUE_NAMESPACE: "rik-staging",
      },
      {
        runtimeEnvironment: "production",
        fetchImpl: queue.fetchMock,
      },
    );
    expect(production).toBeInstanceOf(NoopJobAdapter);
    expect(production.getHealth().externalNetworkEnabled).toBe(false);
  });

  it("keeps BullMQ provider disabled by default and requires an explicit staging queue port", async () => {
    const bullMq = createBullMqQueueMock();

    const disabled = createQueueJobAdapterFromEnv(
      {
        SCALE_QUEUE_PROVIDER: "bullmq",
        SCALE_QUEUE_URL: "redis://queue.example.invalid",
        SCALE_QUEUE_NAMESPACE: "rik-staging",
      },
      {
        runtimeEnvironment: "staging",
        bullMqQueue: bullMq.queue,
      },
    );
    expect(disabled).toBeInstanceOf(NoopJobAdapter);

    const missingQueuePort = createQueueJobAdapterFromEnv(
      {
        SCALE_QUEUE_STAGING_ENABLED: "true",
        SCALE_QUEUE_PROVIDER: "bullmq",
        SCALE_QUEUE_URL: "redis://queue.example.invalid",
        SCALE_QUEUE_NAMESPACE: "rik-staging",
      },
      {
        runtimeEnvironment: "staging",
      },
    );
    expect(missingQueuePort).toBeInstanceOf(NoopJobAdapter);

    const production = createQueueJobAdapterFromEnv(
      {
        SCALE_QUEUE_STAGING_ENABLED: "true",
        SCALE_QUEUE_PROVIDER: "bullmq",
        SCALE_QUEUE_URL: "redis://queue.example.invalid",
        SCALE_QUEUE_NAMESPACE: "rik-staging",
      },
      {
        runtimeEnvironment: "production",
        bullMqQueue: bullMq.queue,
      },
    );
    expect(production).toBeInstanceOf(NoopJobAdapter);
    expect(bullMq.addMock).not.toHaveBeenCalled();

    const staging = createQueueJobAdapterFromEnv(
      {
        SCALE_QUEUE_STAGING_ENABLED: "true",
        SCALE_QUEUE_PROVIDER: "bullmq",
        SCALE_QUEUE_URL: "redis://queue.example.invalid",
        SCALE_QUEUE_NAMESPACE: "rik-staging",
      },
      {
        runtimeEnvironment: "staging",
        bullMqQueue: bullMq.queue,
      },
    );
    expect(staging).toBeInstanceOf(BullMqJobAdapter);
    expect(staging.getHealth()).toEqual(
      expect.objectContaining({
        kind: "bullmq",
        enabled: true,
        externalNetworkEnabled: true,
        executionEnabledByDefault: false,
        namespace: "rik-staging",
        provider: "bullmq",
        workerConcurrencyCap: MAX_QUEUE_WORKER_CONCURRENCY,
        claimBatchCap: MAX_SUBMIT_JOB_CLAIM_LIMIT,
      }),
    );
  });

  it("implements enqueue/status/cancel/retry/dead-letter through a mocked queue provider", async () => {
    const queue = createQueueHttpMock();
    const adapter = new QueueHttpJobAdapter({
      baseUrl: "https://queue.example.invalid",
      namespace: "rik-staging",
      provider: "queue_provider",
      fetchImpl: queue.fetchMock,
    });

    const enqueued = await adapter.enqueue({
      jobType: "notification.fanout",
      payload: { message: "safe notification" },
    });
    expect(enqueued.ok).toBe(true);
    if (!enqueued.ok) return;
    expect(enqueued.record.status).toBe("queued");

    await expect(adapter.getStatus(enqueued.record.jobId)).resolves.toEqual(enqueued.record);
    await expect(adapter.cancel(enqueued.record.jobId)).resolves.toBe(true);
    await expect(adapter.getStatus(enqueued.record.jobId)).resolves.toEqual(
      expect.objectContaining({ status: "cancelled" }),
    );
    await expect(adapter.retry(enqueued.record.jobId)).resolves.toEqual({
      ok: true,
      record: expect.objectContaining({ status: "retry_scheduled", attempts: 1 }),
    });
    await expect(adapter.deadLetter(enqueued.record.jobId, "retry_exhausted")).resolves.toBe(true);
    await expect(adapter.getStatus(enqueued.record.jobId)).resolves.toEqual(
      expect.objectContaining({ status: "dead_lettered" }),
    );
  });

  it("implements BullMQ enqueue/dequeue mocked contract with namespace isolation", async () => {
    const bullMq = createBullMqQueueMock();
    const adapter = new BullMqJobAdapter({
      queue: bullMq.queue,
      namespace: "rik-staging",
      provider: "bullmq",
    });

    const enqueued = await adapter.enqueue({
      jobType: "cache.readmodel.refresh",
      payload: { model: "director.pending.list", companyKey: "opaque-company" },
      metadata: { source: "contract-test" },
    });

    expect(enqueued.ok).toBe(true);
    if (!enqueued.ok) return;
    expect(enqueued.record.status).toBe("queued");
    expect(bullMq.addMock).toHaveBeenCalledTimes(1);
    const [name, data, opts] = bullMq.addMock.mock.calls[0];
    expect(name).toBe("rik-staging:cache.readmodel.refresh");
    expect(data).toEqual(
      expect.objectContaining({
        jobType: "cache.readmodel.refresh",
        namespace: "rik-staging",
        metadata: { source: "contract-test" },
      }),
    );
    expect(opts.removeOnComplete).toBe(true);
    expect(opts.removeOnFail).toBe(false);

    const job = bullMq.jobs.get(enqueued.record.jobId);
    expect(job).toBeTruthy();
    if (!job) return;
    job.state = "active";
    await expect(adapter.getStatus(enqueued.record.jobId)).resolves.toEqual(
      expect.objectContaining({
        jobId: enqueued.record.jobId,
        jobType: "cache.readmodel.refresh",
        status: "queued",
      }),
    );

    const invalidNamespace = new BullMqJobAdapter({
      queue: bullMq.queue,
      namespace: "bad namespace",
      provider: "bullmq",
    });
    await expect(
      invalidNamespace.enqueue({
        jobType: "cache.readmodel.refresh",
        payload: { model: "director.pending.list" },
      }),
    ).resolves.toEqual({
      ok: false,
      code: "JOB_PROVIDER_UNAVAILABLE",
      message: "Background job provider is unavailable",
    });
  });

  it("keeps BullMQ retry/dead-letter budget and worker caps bounded", async () => {
    expect(MAX_QUEUE_WORKER_CONCURRENCY).toBeLessThanOrEqual(8);
    expect(MAX_SUBMIT_JOB_CLAIM_LIMIT).toBeLessThanOrEqual(50);

    const bullMq = createBullMqQueueMock();
    const adapter = new BullMqJobAdapter({
      queue: bullMq.queue,
      namespace: "rik-staging",
      provider: "bullmq",
    });
    const policy = getJobPolicy("notification.fanout");
    expect(policy).toBeTruthy();
    if (!policy) return;

    const enqueued = await adapter.enqueue({
      jobType: "notification.fanout",
      payload: { message: "safe notification" },
    });
    expect(enqueued.ok).toBe(true);
    if (!enqueued.ok) return;

    const [, , opts] = bullMq.addMock.mock.calls[0];
    expect(opts.attempts).toBe(policy.maxAttempts);
    expect(opts.attempts).toBeLessThanOrEqual(5);
    expect(opts.backoff).toEqual({
      type: "exponential",
      delay: policy.retryPolicy.initialDelayMs,
    });

    await expect(adapter.retry(enqueued.record.jobId)).resolves.toEqual({
      ok: true,
      record: expect.objectContaining({
        attempts: 1,
        status: "retry_scheduled",
      }),
    });
    const job = bullMq.jobs.get(enqueued.record.jobId);
    expect(job?.retry).toHaveBeenCalledTimes(1);

    await expect(adapter.deadLetter(enqueued.record.jobId, "retry_exhausted raw payload omitted")).resolves.toBe(true);
    expect(job?.moveToFailed).toHaveBeenCalledWith(expect.any(Error), "queue-provider-token", false);
    await expect(adapter.getStatus(enqueued.record.jobId)).resolves.toEqual(
      expect.objectContaining({
        status: "dead_lettered",
      }),
    );
  });

  it("keeps queue provider payloads redacted and namespace-isolated", async () => {
    const queue = createQueueHttpMock();
    const adapter = new QueueHttpJobAdapter({
      baseUrl: "https://queue.example.invalid",
      namespace: "rik-staging",
      provider: "queue_provider",
      fetchImpl: queue.fetchMock,
    });

    await expect(
      adapter.enqueue({
        jobType: "proposal.submit.followup",
        payload: { rawAccessToken: "token=supersecretvalue" },
      }),
    ).resolves.toEqual({
      ok: false,
      code: "JOB_PAYLOAD_FORBIDDEN_FIELD",
      message: "Job payload cannot be accepted safely",
    });
    expect(queue.fetchMock).not.toHaveBeenCalled();

    const enqueued = await adapter.enqueue({
      jobType: "notification.fanout",
      payload: { message: "Call +996 555 123 456 and person@example.test" },
      metadata: { source: "test" },
    });
    expect(enqueued.ok).toBe(true);
    expect(queue.fetchMock).toHaveBeenCalledTimes(1);
    const requestJson = JSON.stringify(queue.requests[0]);
    expect(requestJson).toContain("rik-staging");
    expect(requestJson).not.toContain("+996 555 123 456");
    expect(requestJson).not.toContain("person@example.test");
    expect(requestJson).not.toContain("token=supersecretvalue");
  });

  it("keeps external queue provider secrets out of public mobile env names", () => {
    const queueEnvNames = [
      SCALE_PROVIDER_RUNTIME_ENV_NAMES.queue.enabled,
      ...SCALE_PROVIDER_RUNTIME_ENV_NAMES.queue.required,
      ...SCALE_PROVIDER_RUNTIME_ENV_NAMES.queue.optional,
    ];

    expect(queueEnvNames).toEqual([
      "SCALE_QUEUE_STAGING_ENABLED",
      "SCALE_QUEUE_PROVIDER",
      "SCALE_QUEUE_URL",
      "SCALE_QUEUE_NAMESPACE",
    ]);
    expect(queueEnvNames.every((name) => !name.startsWith("EXPO_PUBLIC_"))).toBe(true);
    expect(queueEnvNames).not.toContain("BFF_SERVER_AUTH_SECRET");
    expect(queueEnvNames).not.toContain("EXPO_PUBLIC_BFF_SERVER_AUTH_SECRET");
    expect(readProjectFile("src/shared/scale/jobAdapters.ts")).not.toContain("EXPO_PUBLIC_BFF_SERVER_AUTH_SECRET");
  });

  it("defines ten disabled job policies with idempotency, rate limits, payload caps, retry, and dead-letter boundaries", () => {
    expect(JOB_POLICY_REGISTRY.map((policy) => policy.jobType)).toEqual([
      "proposal.submit.followup",
      "warehouse.receive.postprocess",
      "accountant.payment.postprocess",
      "director.approval.postprocess",
      "request.item.update.postprocess",
      "pdf.document.generate",
      "director.report.generate",
      "notification.fanout",
      "cache.readmodel.refresh",
      "offline.replay.bridge",
    ]);

    for (const policy of JOB_POLICY_REGISTRY) {
      expect(validateJobPolicy(policy)).toBe(true);
      expect(policy.defaultEnabled).toBe(false);
      expect(policy.idempotencyRequired).toBe(true);
      expect(policy.deadLetterPolicy.rawPayloadStored).toBe(false);
      expect(policy.deadLetterPolicy.piiStored).toBe(false);
    }

    expect(getJobPolicy("notification.fanout")).toEqual(
      expect.objectContaining({
        rateLimitOperation: "notification.fanout",
        piiPolicy: "redact_pii",
        defaultEnabled: false,
      }),
    );
    expect(getJobPolicy("pdf.document.generate")?.payloadMaxBytes).toBeLessThanOrEqual(32_768);
    expect(getJobPolicy("director.report.generate")?.payloadMaxBytes).toBeLessThanOrEqual(32_768);
  });

  it("requires idempotency metadata for mutating and replay bridge jobs", () => {
    expect(JOB_IDEMPOTENCY_REQUIRED_TYPES).toEqual([
      "proposal.submit.followup",
      "warehouse.receive.postprocess",
      "accountant.payment.postprocess",
      "director.approval.postprocess",
      "request.item.update.postprocess",
      "offline.replay.bridge",
    ]);

    for (const jobType of JOB_IDEMPOTENCY_REQUIRED_TYPES) {
      const requirement = getJobIdempotencyRequirement(jobType);
      expect(requirement).toEqual(
        expect.objectContaining({
          jobType,
          required: true,
          persistenceEnabledByDefault: false,
          contract: expect.objectContaining({
            storesRawPayload: false,
            piiAllowedInKey: false,
          }),
        }),
      );
      expect(jobRequiresIdempotency(jobType)).toBe(true);
    }
  });

  it("rejects secrets and PII-like payloads or redacts them for redaction-only jobs", () => {
    expect(
      validateJobPayloadEnvelope({
        jobType: "proposal.submit.followup",
        payload: { rawAccessToken: "token=supersecretvalue" },
      }),
    ).toEqual({
      ok: false,
      code: "JOB_PAYLOAD_FORBIDDEN_FIELD",
      message: "Job payload cannot be accepted safely",
    });

    expect(
      validateJobPayloadEnvelope({
        jobType: "pdf.document.generate",
        payload: { report: "https://files.example.invalid/doc.pdf?token=signed-secret" },
      }),
    ).toEqual({
      ok: false,
      code: "JOB_PAYLOAD_SECRET_VALUE",
      message: "Job payload cannot be accepted safely",
    });

    const notification = validateJobPayloadEnvelope({
      jobType: "notification.fanout",
      payload: { message: "Send update to person@example.test at +996 555 123 456" },
    });
    expect(notification.ok).toBe(true);
    if (notification.ok) {
      expect(JSON.stringify(notification.redactedPayload)).not.toContain("person@example.test");
      expect(JSON.stringify(notification.redactedPayload)).not.toContain("+996 555 123 456");
    }

    const oversized = validateJobPayloadEnvelope({
      jobType: "accountant.payment.postprocess",
      payload: { data: "x".repeat(9_000) },
    });
    expect(oversized).toEqual({
      ok: false,
      code: "JOB_PAYLOAD_TOO_LARGE",
      message: "Job payload exceeds the configured boundary",
    });
  });

  it("keeps retry and dead-letter summaries deterministic without raw payload storage", () => {
    const policy = getJobPolicy("warehouse.receive.postprocess");
    expect(policy).toBeTruthy();
    if (!policy) return;

    expect(calculateRetryDelayMs(policy.retryPolicy, 1)).toBe(1_000);
    expect(calculateRetryDelayMs(policy.retryPolicy, 3)).toBe(4_000);
    expect(mapJobFailureToDeadLetterReason("validation")).toBe("invalid_payload_shape");
    expect(mapJobFailureToDeadLetterReason("external_timeout")).toBe("retry_exhausted");

    const summary = buildJobDeadLetterSummary({
      jobType: "warehouse.receive.postprocess",
      failureClass: "external_timeout",
      attempts: 3,
      payload: {
        request: "opaque-request",
        rawPrompt: "do not store this",
      },
      createdAtIso: "2026-04-30T00:00:00.000Z",
    });

    expect(summary).toEqual({
      jobType: "warehouse.receive.postprocess",
      operation: "warehouse.receive.apply",
      reason: "retry_exhausted",
      retryable: true,
      rawPayloadStored: false,
      piiStored: false,
      payloadSummary: "invalid_payload",
    });
    expect(JSON.stringify(summary)).not.toContain("do not store this");
  });

  it("adds disabled job metadata to five BFF mutation routes and maps cache invalidation jobs", () => {
    expect(Object.keys(BFF_MUTATION_JOB_POLICY_MAP)).toEqual([
      "proposal.submit",
      "warehouse.receive.apply",
      "accountant.payment.apply",
      "director.approval.apply",
      "request.item.update",
    ]);

    for (const route of BFF_STAGING_MUTATION_ROUTES) {
      const operation = route.operation as keyof typeof BFF_MUTATION_JOB_POLICY_MAP;
      expect(route.jobPolicyType).toBe(BFF_MUTATION_JOB_POLICY_MAP[operation]);
      expect(route.jobPolicyDefaultEnabled).toBe(false);
      expect(route.jobExecutionEnabledByDefault).toBe(false);
      expect(route.enabledByDefault).toBe(false);
    }

    expect(getJobPolicy("cache.readmodel.refresh")?.cacheInvalidationTags).toEqual(
      expect.arrayContaining(["cache", "readmodel", "warehouse", "director"]),
    );
    expect(getJobPolicy("notification.fanout")?.cacheInvalidationTags).toEqual(
      expect.arrayContaining(["notification", "inbox"]),
    );
  });

  it("does not replace existing app flows or touch forbidden platform files", () => {
    const roots = ["app", "src/screens", "src/components", "src/features", "src/lib/api"];
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
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
          continue;
        }
        const source = readProjectFile(relativePath);
        if (
          source.includes("shared/scale/jobAdapters") ||
          source.includes("shared/scale/jobPolicies") ||
          source.includes("shared/scale/jobPayloadSafety") ||
          source.includes("shared/scale/jobIdempotency") ||
          source.includes("shared/scale/jobDeadLetterBoundary")
        ) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports).toEqual([]);
    expect(changedFiles()).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(package\.json|package-lock\.json|app\.json|eas\.json)$/),
        expect.stringMatching(/^(android\/|ios\/|supabase\/migrations\/)/),
      ]),
    );
  });

  it("keeps artifacts valid JSON", () => {
    const matrix = JSON.parse(readProjectFile("artifacts/S_50K_JOBS_INTEGRATION_1_matrix.json"));
    expect(matrix.wave).toBe("S-50K-JOBS-INTEGRATION-1");
    expect(matrix.jobBoundary.enabledByDefault).toBe(false);
    expect(matrix.policies.total).toBe(10);
    expect(matrix.integration.bffMutationRoutesWithJobMetadata).toBe(5);
    expect(matrix.integration.cacheInvalidationJobsMapped).toBe(2);
    expect(matrix.safety.packageNativeChanged).toBe(false);
  });
});
