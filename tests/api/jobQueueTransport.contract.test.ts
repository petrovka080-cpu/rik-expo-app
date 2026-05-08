import fs from "fs";
import path from "path";

const projectRoot = path.resolve(__dirname, "../..");

const readProjectFile = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("job queue Supabase transport boundary", () => {
  it("keeps the queue service injected while isolating the default Supabase client", () => {
    const serviceSource = readProjectFile("src/lib/infra/jobQueue.ts");
    const transportSource = readProjectFile(
      "src/lib/infra/jobQueue.transport.ts",
    );

    expect(serviceSource).toContain("./jobQueue.transport");
    expect(serviceSource).toContain("jobQueueSupabaseClient");
    expect(serviceSource).not.toContain("../supabaseClient");
    expect(serviceSource).not.toContain("import { supabase }");
    expect(serviceSource).toContain("export function createJobQueueApi");
    expect(serviceSource).toContain("export type JobQueueSupabaseClient");

    expect(transportSource).toContain("../supabaseClient");
    expect(transportSource).toContain("jobQueueSupabaseClient");
    expect(transportSource).toContain("JobQueueSupabaseClient");
  });

  it("preserves queue RPC runtime-validation and backpressure contract surfaces", () => {
    const serviceSource = readProjectFile("src/lib/infra/jobQueue.ts");

    expect(serviceSource).toContain("validateRpcResponse");
    expect(serviceSource).toContain("isSubmitJobsClaimRpcResponse");
    expect(serviceSource).toContain("submit_jobs_claim");
    expect(serviceSource).toContain("submit_jobs_recover_stuck");
    expect(serviceSource).toContain("submit_jobs_mark_completed");
    expect(serviceSource).toContain("submit_jobs_mark_failed");
    expect(serviceSource).toContain("submit_jobs_metrics");
    expect(serviceSource).toContain(
      "resolveSubmitJobClaimLimit(limit, WORKER_BATCH_SIZE)",
    );
    expect(serviceSource).toContain(
      "buildSubmitJobsClaimArgs(workerId, normalizedLimit)",
    );
    expect(serviceSource).toContain(
      "buildSubmitJobsClaimLegacyArgs(workerId, normalizedLimit, jobType)",
    );
  });
});
