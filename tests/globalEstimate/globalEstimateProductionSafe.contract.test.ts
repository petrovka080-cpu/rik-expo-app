import fs from "fs";

import {
  assertGlobalEstimateFeatureFlagsDefaultOff,
  assertGlobalEstimateTraceRedacted,
  buildGlobalEstimateRollbackPlan,
  resolveGlobalEstimateFeatureFlags,
  runGlobalEstimateAiChatRuntime,
  validateGlobalEstimateMigrationSafety,
} from "../../src/lib/ai/globalEstimate";

describe("global estimate production-safe contract", () => {
  it("keeps canary flags default-off and validates the migration as non-destructive", async () => {
    const flags = resolveGlobalEstimateFeatureFlags({});
    expect(() => assertGlobalEstimateFeatureFlagsDefaultOff(flags)).not.toThrow();

    const migration = fs.readFileSync(
      "supabase/migrations/20260522220000_global_estimate_localization_professional_boq_engine.sql",
      "utf8",
    );
    expect(validateGlobalEstimateMigrationSafety(migration)).toMatchObject({
      destructiveSqlFound: false,
      dropTableFound: false,
      truncateFound: false,
      deleteBusinessRowsFound: false,
      rlsDisabled: false,
      migrationSafeToApply: true,
    });

    const runtime = await runGlobalEstimateAiChatRuntime({ text: "laminate installation 100 m2", language: "en" });
    expect(() => assertGlobalEstimateTraceRedacted(runtime.trace)).not.toThrow();
    expect(buildGlobalEstimateRollbackPlan()).toMatchObject({ featureFlagsDefaultOff: true });
  });
});
