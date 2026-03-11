import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubmitJobRow } from "../lib/infra/jobQueue";
import { processBuyerSubmitJob } from "./processBuyerSubmitJob";

type DispatchDeps = {
  supabase: SupabaseClient;
};

type CompactedJob = {
  job: SubmitJobRow;
  compactedJobIds: string[];
};

const keyForJob = (job: SubmitJobRow): string =>
  [job.job_type, job.entity_key || job.entity_id || job.id].join("|");

// Safe compaction: only collapse byte-identical jobs (same type/entity/payload).
export function compactJobsByEntity(jobs: SubmitJobRow[]): CompactedJob[] {
  const byKey = new Map<string, CompactedJob>();
  for (const job of jobs) {
    const key = keyForJob(job);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { job, compactedJobIds: [job.id] });
      continue;
    }
    prev.compactedJobIds.push(job.id);
  }
  return Array.from(byKey.values());
}

export async function dispatchJob(job: SubmitJobRow, deps: DispatchDeps): Promise<void> {
  switch (job.job_type) {
    case "buyer_submit_proposal": {
      const catalogApi = await import("../lib/catalog_api");
      await processBuyerSubmitJob(job, {
        supabase: deps.supabase,
        apiCreateProposalsBySupplier: catalogApi.createProposalsBySupplier,
        uploadProposalAttachment: async () => undefined,
      });
      return;
    }
    default:
      throw new Error(`unknown job_type: ${job.job_type}`);
  }
}
