import {
  buildAiEstimateEvidenceHygieneManifest,
  containsAiEstimateSecret,
  validateAiEstimateEvidenceHygienePolicy,
} from "../../src/lib/platform/aiEstimateEvidenceHygienePolicy";

describe("AI estimate evidence hygiene policy", () => {
  it("quarantines historical runtime artifacts without deleting them or blocking current-scope scans", () => {
    const manifest = buildAiEstimateEvidenceHygieneManifest({
      sourceSha: "head",
      createdAt: "2026-07-09T00:00:00.000Z",
      currentScopeRoots: [".release-runtime/ai-estimate-controlled-pilot-dry-run"],
      artifactPaths: [
        ".release-runtime/ai-estimate-controlled-pilot-dry-run/web/summary.json",
        ".release-runtime/2026-07-05-old-runtime/summary.json",
      ],
    });
    const validation = validateAiEstimateEvidenceHygienePolicy({
      manifest,
      currentScopeContents: ["current clean summary"],
    });

    expect(validation.evidence_hygiene_policy_created).toBe(true);
    expect(validation.historical_runtime_artifacts_detected).toBe(true);
    expect(validation.current_scope_secret_scan_clean).toBe(true);
    expect(validation.historical_artifacts_not_silently_deleted).toBe(true);
    expect(validation.historical_artifacts_quarantine_manifest_created).toBe(true);
    expect(validation.legacy_secret_scan_hits_do_not_block_current_scope).toBe(true);
    expect(validation.current_scope_secret_scan_still_blocks_on_real_leak).toBe(true);
    expect(validation.passed).toBe(true);
  });

  it("still detects a real leak in current scope", () => {
    expect(containsAiEstimateSecret("token=sk-current-scope-real-leak")).toBe(true);
  });
});
