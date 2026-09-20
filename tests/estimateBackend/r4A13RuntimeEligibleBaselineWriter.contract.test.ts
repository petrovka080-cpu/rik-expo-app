import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("R4-A13.1 runtime baseline truth", () => {
  it("keeps validation fixtures out of both the worker and the sole revision writer", () => {
    const helper = readFileSync(resolve(
      "src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline.ts",
    ), "utf8");
    const localBackend = readFileSync(resolve(
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    ), "utf8");
    const worker = readFileSync(resolve(
      "supabase/functions/canonical-estimate-worker/index.ts",
    ), "utf8");
    const migration = readFileSync(resolve(
      "supabase/migrations/20260908050000_r4a13_runtime_eligible_baseline_revision_writer.sql",
    ), "utf8");

    for (const classification of ["FIXTURE_ONLY", "VALIDATION_FIXTURE", "TEST_ONLY"]) {
      expect(helper).toContain(`"${classification}"`);
      expect(migration).toContain(`'${classification}'`);
    }
    expect(localBackend).toContain("canonicalApprovedBaselineRuntimeParameters");
    expect(worker).toContain("canonicalApprovedBaselineRuntimeParameters");
    expect(migration).toContain("estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb)");
    expect(migration).toContain("jsonb_each(v_baseline.input_values)");
    expect(migration).toContain("v_baseline.input_classification");
  });
});
