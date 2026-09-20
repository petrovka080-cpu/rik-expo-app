import { classifyAiEnterpriseReleaseCloseoutFile } from "../../scripts/release/runAiEnterpriseReleaseCloseoutChangeControl";

it("keeps the historical closeout classifier fail closed for files outside its owned wave", () => {
  const owned = classifyAiEnterpriseReleaseCloseoutFile(
    "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
  );
  const unrelatedLaterCore = classifyAiEnterpriseReleaseCloseoutFile(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  );
  const unknown = classifyAiEnterpriseReleaseCloseoutFile(
    "src/unreviewed-product-mutation.ts",
  );

  expect(owned.include_in_commit).toBe(true);
  expect(owned.wave).not.toBe("UNKNOWN");
  expect(unrelatedLaterCore).toMatchObject({
    include_in_commit: false,
    wave: "UNKNOWN",
    reason: "BLOCKED_UNKNOWN_DIRTY_FILE_NEEDS_REVIEW",
  });
  expect(unknown).toMatchObject({
    include_in_commit: false,
    wave: "UNKNOWN",
    reason: "BLOCKED_UNKNOWN_DIRTY_FILE_NEEDS_REVIEW",
  });
});
