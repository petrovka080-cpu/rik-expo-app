import { safeJsonStringify } from "../../lib/format";
import type { JobPayloadEnvelope } from "./jobPayloadSafety";
import { validateJobPayloadEnvelope } from "./jobPayloadSafety";
import type { JobType } from "./jobPolicies";
import {
  resolveScaleProviderRuntimeConfig,
  type ScaleProviderRuntimeEnvironment,
} from "./providerRuntimeConfig";

export type JobAdapterStatus = {
  kind: "noop" | "in_memory" | "external_contract" | "queue_http";
  enabled: boolean;
  externalNetworkEnabled: boolean;
  executionEnabledByDefault: false;
  namespace?: string;
  provider?: string;
};

export type JobHealth = JobAdapterStatus & {
  queued: number;
  deadLettered: number;
};

export type JobRecord = {
  jobId: string;
  jobType: JobType;
  status: "queued" | "cancelled" | "retry_scheduled" | "dead_lettered";
  attempts: number;
  payloadBytes: number;
};

export type JobAdapterEnqueueResult =
  | {
      ok: true;
      record: JobRecord;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export interface JobAdapter {
  enqueue(envelope: JobPayloadEnvelope): Promise<JobAdapterEnqueueResult>;
  getStatus(jobId: string): Promise<JobRecord | null>;
  cancel(jobId: string): Promise<boolean>;
  retry(jobId: string): Promise<JobAdapterEnqueueResult>;
  deadLetter(jobId: string, reason: string): Promise<boolean>;
  getHealth(): JobHealth;
}

export type QueueHttpFetch = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

export type QueueHttpJobAdapterOptions = {
  baseUrl: string;
  namespace: string;
  provider?: string;
  fetchImpl?: QueueHttpFetch;
};

export type QueueJobAdapterEnv = Record<string, string | undefined>;

export type CreateQueueJobAdapterFromEnvOptions = {
  runtimeEnvironment?: ScaleProviderRuntimeEnvironment;
  fetchImpl?: QueueHttpFetch;
};

const disabledResult = (): JobAdapterEnqueueResult => ({
  ok: false,
  code: "JOB_ADAPTER_DISABLED",
  message: "Background job execution is disabled",
});

const providerUnavailableResult = (): JobAdapterEnqueueResult => ({
  ok: false,
  code: "JOB_PROVIDER_UNAVAILABLE",
  message: "Background job provider is unavailable",
});

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const normalizeQueueBaseUrl = (value: string): string => normalizeText(value).replace(/\/+$/g, "");

const isSafeQueueNamespace = (namespace: string): boolean =>
  namespace.length > 0 && namespace.length <= 64 && /^[A-Za-z0-9][A-Za-z0-9:_-]*$/.test(namespace);

const isSupportedQueueProvider = (provider: string): boolean => provider === "queue_provider";

const defaultQueueFetch = (): QueueHttpFetch | null => {
  if (typeof globalThis.fetch !== "function") return null;
  return globalThis.fetch as QueueHttpFetch;
};

const isJobRecord = (value: unknown): value is JobRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<JobRecord>;
  return (
    typeof record.jobId === "string" &&
    typeof record.jobType === "string" &&
    ["queued", "cancelled", "retry_scheduled", "dead_lettered"].includes(String(record.status)) &&
    typeof record.attempts === "number" &&
    typeof record.payloadBytes === "number"
  );
};

const extractProviderResult = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object") return payload;
  if ("error" in payload) return null;
  if ("record" in payload) return (payload as { record: unknown }).record;
  if ("result" in payload) return (payload as { result: unknown }).result;
  return payload;
};

export class NoopJobAdapter implements JobAdapter {
  async enqueue(_envelope: JobPayloadEnvelope): Promise<JobAdapterEnqueueResult> {
    return disabledResult();
  }

  async getStatus(_jobId: string): Promise<JobRecord | null> {
    return null;
  }

  async cancel(_jobId: string): Promise<boolean> {
    return false;
  }

  async retry(_jobId: string): Promise<JobAdapterEnqueueResult> {
    return disabledResult();
  }

  async deadLetter(_jobId: string, _reason: string): Promise<boolean> {
    return false;
  }

  getHealth(): JobHealth {
    return {
      kind: "noop",
      enabled: false,
      externalNetworkEnabled: false,
      executionEnabledByDefault: false,
      queued: 0,
      deadLettered: 0,
    };
  }
}

export class InMemoryJobAdapter implements JobAdapter {
  private readonly jobs = new Map<string, JobRecord>();
  private sequence = 0;

  async enqueue(envelope: JobPayloadEnvelope): Promise<JobAdapterEnqueueResult> {
    const safePayload = validateJobPayloadEnvelope(envelope);
    if (!safePayload.ok) {
      return {
        ok: false,
        code: safePayload.code,
        message: safePayload.message,
      };
    }

    this.sequence += 1;
    const record: JobRecord = {
      jobId: `local-job-${this.sequence}`,
      jobType: envelope.jobType,
      status: "queued",
      attempts: 0,
      payloadBytes: safePayload.payloadBytes,
    };
    this.jobs.set(record.jobId, record);
    return { ok: true, record };
  }

  async getStatus(jobId: string): Promise<JobRecord | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async cancel(jobId: string): Promise<boolean> {
    const current = this.jobs.get(jobId);
    if (!current) return false;
    this.jobs.set(jobId, { ...current, status: "cancelled" });
    return true;
  }

  async retry(jobId: string): Promise<JobAdapterEnqueueResult> {
    const current = this.jobs.get(jobId);
    if (!current) return disabledResult();
    const next = {
      ...current,
      status: "retry_scheduled" as const,
      attempts: current.attempts + 1,
    };
    this.jobs.set(jobId, next);
    return { ok: true, record: next };
  }

  async deadLetter(jobId: string, _reason: string): Promise<boolean> {
    const current = this.jobs.get(jobId);
    if (!current) return false;
    this.jobs.set(jobId, { ...current, status: "dead_lettered" });
    return true;
  }

  getHealth(): JobHealth {
    const records = Array.from(this.jobs.values());
    return {
      kind: "in_memory",
      enabled: true,
      externalNetworkEnabled: false,
      executionEnabledByDefault: false,
      queued: records.filter((record) => record.status === "queued").length,
      deadLettered: records.filter((record) => record.status === "dead_lettered").length,
    };
  }
}

export class QueueHttpJobAdapter implements JobAdapter {
  private readonly baseUrl: string;
  private readonly namespace: string;
  private readonly provider: string;
  private readonly fetchImpl: QueueHttpFetch | null;

  constructor(options: QueueHttpJobAdapterOptions) {
    this.baseUrl = normalizeQueueBaseUrl(options.baseUrl);
    this.namespace = normalizeText(options.namespace);
    this.provider = normalizeText(options.provider || "queue_provider").toLowerCase();
    this.fetchImpl = options.fetchImpl ?? defaultQueueFetch();
  }

  async enqueue(envelope: JobPayloadEnvelope): Promise<JobAdapterEnqueueResult> {
    const safePayload = validateJobPayloadEnvelope(envelope);
    if (!safePayload.ok) {
      return {
        ok: false,
        code: safePayload.code,
        message: safePayload.message,
      };
    }

    const result = await this.command({
      operation: "enqueue",
      jobType: envelope.jobType,
      payload: safePayload.redactedPayload,
      payloadBytes: safePayload.payloadBytes,
      metadata: envelope.metadata ?? null,
    });
    return isJobRecord(result) ? { ok: true, record: result } : providerUnavailableResult();
  }

  async getStatus(jobId: string): Promise<JobRecord | null> {
    const normalizedJobId = normalizeText(jobId);
    if (!normalizedJobId) return null;
    const result = await this.command({
      operation: "status",
      jobId: normalizedJobId,
    });
    return isJobRecord(result) ? result : null;
  }

  async cancel(jobId: string): Promise<boolean> {
    return this.booleanCommand("cancel", jobId);
  }

  async retry(jobId: string): Promise<JobAdapterEnqueueResult> {
    const normalizedJobId = normalizeText(jobId);
    if (!normalizedJobId) return providerUnavailableResult();
    const result = await this.command({
      operation: "retry",
      jobId: normalizedJobId,
    });
    return isJobRecord(result) ? { ok: true, record: result } : providerUnavailableResult();
  }

  async deadLetter(jobId: string, reason: string): Promise<boolean> {
    return this.booleanCommand("deadLetter", jobId, { reason: normalizeText(reason).slice(0, 80) });
  }

  getHealth(): JobHealth {
    const enabled = this.canUseNetwork();
    return {
      kind: "queue_http",
      enabled,
      externalNetworkEnabled: enabled,
      executionEnabledByDefault: false,
      namespace: enabled ? this.namespace : undefined,
      provider: enabled ? this.provider : undefined,
      queued: 0,
      deadLettered: 0,
    };
  }

  private async booleanCommand(
    operation: "cancel" | "deadLetter",
    jobId: string,
    extra: Record<string, unknown> = {},
  ): Promise<boolean> {
    const normalizedJobId = normalizeText(jobId);
    if (!normalizedJobId) return false;
    const result = await this.command({
      operation,
      jobId: normalizedJobId,
      ...extra,
    });
    if (typeof result === "boolean") return result;
    if (!result || typeof result !== "object") return false;
    return (result as { ok?: unknown }).ok === true;
  }

  private canUseNetwork(): boolean {
    return (
      this.baseUrl.length > 0 &&
      isSafeQueueNamespace(this.namespace) &&
      isSupportedQueueProvider(this.provider) &&
      this.fetchImpl !== null
    );
  }

  private async command(command: Record<string, unknown>): Promise<unknown | null> {
    if (!this.canUseNetwork() || !this.fetchImpl) return null;
    const body = safeJsonStringify({
      ...command,
      namespace: this.namespace,
      provider: this.provider,
    });
    if (!body) return null;
    try {
      const response = await this.fetchImpl(this.baseUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body,
      });
      if (!response.ok) return null;
      return extractProviderResult(await response.json());
    } catch {
      return null;
    }
  }
}

export type ExternalJobAdapterContract = {
  kind: "external_contract";
  provider: "bullmq" | "inngest" | "cloud_tasks" | "queue_provider";
  enqueue: "contract_only";
  getStatus: "contract_only";
  cancel: "contract_only";
  retry: "contract_only";
  deadLetter: "contract_only";
  getHealth: "contract_only";
  externalNetworkEnabledByDefault: false;
  executionEnabledByDefault: false;
};

export const EXTERNAL_JOB_ADAPTER_CONTRACT: ExternalJobAdapterContract = Object.freeze({
  kind: "external_contract",
  provider: "queue_provider",
  enqueue: "contract_only",
  getStatus: "contract_only",
  cancel: "contract_only",
  retry: "contract_only",
  deadLetter: "contract_only",
  getHealth: "contract_only",
  externalNetworkEnabledByDefault: false,
  executionEnabledByDefault: false,
});

export function createDisabledJobAdapter(): JobAdapter {
  return new NoopJobAdapter();
}

export function createQueueJobAdapterFromEnv(
  env: QueueJobAdapterEnv = typeof process !== "undefined" ? process.env : {},
  options: CreateQueueJobAdapterFromEnvOptions = {},
): JobAdapter {
  const runtimeConfig = resolveScaleProviderRuntimeConfig(env, {
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const queueStatus = runtimeConfig.providers.queue;
  const provider = normalizeText(env.SCALE_QUEUE_PROVIDER).toLowerCase();
  if (!queueStatus.liveNetworkAllowed || !isSupportedQueueProvider(provider)) {
    return createDisabledJobAdapter();
  }

  return new QueueHttpJobAdapter({
    baseUrl: normalizeText(env.SCALE_QUEUE_URL),
    namespace: normalizeText(env.SCALE_QUEUE_NAMESPACE),
    provider,
    fetchImpl: options.fetchImpl,
  });
}
