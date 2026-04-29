import type { JobPayloadEnvelope } from "./jobPayloadSafety";
import { validateJobPayloadEnvelope } from "./jobPayloadSafety";
import type { JobType } from "./jobPolicies";

export type JobAdapterStatus = {
  kind: "noop" | "in_memory" | "external_contract";
  enabled: boolean;
  externalNetworkEnabled: boolean;
  executionEnabledByDefault: false;
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

const disabledResult = (): JobAdapterEnqueueResult => ({
  ok: false,
  code: "JOB_ADAPTER_DISABLED",
  message: "Background job execution is disabled",
});

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
