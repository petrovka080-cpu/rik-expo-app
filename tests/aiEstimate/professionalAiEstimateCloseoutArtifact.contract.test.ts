import { readFileSync } from "node:fs";
import path from "node:path";

const EXPECTED_FINAL_STATUS =
  "GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS";
const LEGACY_FINAL_STATUS = "GREEN_PROFESSIONAL_AI_ESTIMATE_REAL_MATERIAL_QUANTITY_ENGINE_NO_BUILDS";
const EXPECTED_WRITER = "scripts/e2e/runProfessionalAiEstimateSmoke.ts";

type CloseoutSummary = {
  final_status?: unknown;
  source_sha?: unknown;
  branch?: unknown;
  upstream_sync?: unknown;
  worktree_clean_at_start?: unknown;
  worktree_clean_at_finish?: unknown;
  artifact_schema_version?: unknown;
  generated_by?: unknown;
  generated_at?: unknown;
  android_chrome_summary_path?: unknown;
  android_chrome_summary_source_sha_matches_root?: unknown;
  android_chrome_summary_final_status_matches_expected?: unknown;
  web_professional_ai_estimate_smoke_passed?: unknown;
  android_chrome_professional_ai_estimate_smoke_passed?: unknown;
  blockers?: unknown;
  fake_green_claimed?: unknown;
};

function validateCloseoutSummary(summary: CloseoutSummary, expectedHead: string): string[] {
  return [
    summary.artifact_schema_version === 1 ? "" : "ARTIFACT_SCHEMA_VERSION_MISSING",
    summary.generated_by === EXPECTED_WRITER ? "" : "ARTIFACT_GENERATED_BY_NOT_CANONICAL_WRITER",
    typeof summary.generated_at === "string" && summary.generated_at.length > 0 ? "" : "ARTIFACT_GENERATED_AT_MISSING",
    summary.final_status === EXPECTED_FINAL_STATUS ? "" : "CANONICAL_FINAL_STATUS_MISSING",
    summary.final_status === LEGACY_FINAL_STATUS ? "LEGACY_GREEN_STATUS_REJECTED" : "",
    summary.source_sha === expectedHead ? "" : "SOURCE_SHA_NOT_HEAD",
    summary.branch === "release/ios-after-build48-integration" ? "" : "BRANCH_MISSING",
    summary.upstream_sync === "0\t0" || summary.upstream_sync === "0 0" ? "" : "UPSTREAM_SYNC_MISSING",
    summary.worktree_clean_at_start === true ? "" : "WORKTREE_NOT_CLEAN_AT_START",
    summary.worktree_clean_at_finish === true ? "" : "WORKTREE_NOT_CLEAN_AT_FINISH",
    typeof summary.android_chrome_summary_path === "string" && summary.android_chrome_summary_path.length > 0
      ? ""
      : "ANDROID_CHILD_SUMMARY_WITHOUT_ROOT_LINK_REJECTED",
    summary.android_chrome_summary_source_sha_matches_root === true ? "" : "ANDROID_CHILD_SOURCE_SHA_NOT_ROOT",
    summary.android_chrome_summary_final_status_matches_expected === true ? "" : "ANDROID_CHILD_FINAL_STATUS_NOT_CANONICAL",
    summary.web_professional_ai_estimate_smoke_passed === true ? "" : "WEB_SMOKE_NOT_GREEN",
    summary.android_chrome_professional_ai_estimate_smoke_passed === true ? "" : "ANDROID_CHROME_SMOKE_NOT_GREEN",
    Array.isArray(summary.blockers) && summary.blockers.length === 0 ? "" : "BLOCKERS_NOT_EMPTY",
    summary.fake_green_claimed === false ? "" : "FAKE_GREEN_CLAIMED_NOT_FALSE",
  ].filter(Boolean);
}

function validSummary(overrides: CloseoutSummary = {}): CloseoutSummary {
  return {
    final_status: EXPECTED_FINAL_STATUS,
    source_sha: "b4340904c02bb2ced51f514f645041fe1caee356",
    branch: "release/ios-after-build48-integration",
    upstream_sync: "0\t0",
    worktree_clean_at_start: true,
    worktree_clean_at_finish: true,
    artifact_schema_version: 1,
    generated_by: EXPECTED_WRITER,
    generated_at: "2026-07-02T00:00:00.000Z",
    android_chrome_summary_path: ".release-runtime/professional-ai-estimate-real-quantity-engine/android-chrome/run/summary.json",
    android_chrome_summary_source_sha_matches_root: true,
    android_chrome_summary_final_status_matches_expected: true,
    web_professional_ai_estimate_smoke_passed: true,
    android_chrome_professional_ai_estimate_smoke_passed: true,
    blockers: [],
    fake_green_claimed: false,
    ...overrides,
  };
}

describe("professional AI estimate closeout artifact contract", () => {
  it("accepts only the canonical source-bound root closeout schema", () => {
    expect(validateCloseoutSummary(
      validSummary(),
      "b4340904c02bb2ced51f514f645041fe1caee356",
    )).toEqual([]);
  });

  it("rejects missing source sha and legacy green status", () => {
    expect(validateCloseoutSummary(
      validSummary({ source_sha: undefined }),
      "b4340904c02bb2ced51f514f645041fe1caee356",
    )).toContain("SOURCE_SHA_NOT_HEAD");

    const legacyIssues = validateCloseoutSummary(
      validSummary({ final_status: LEGACY_FINAL_STATUS }),
      "b4340904c02bb2ced51f514f645041fe1caee356",
    );
    expect(legacyIssues).toContain("CANONICAL_FINAL_STATUS_MISSING");
    expect(legacyIssues).toContain("LEGACY_GREEN_STATUS_REJECTED");
  });

  it("rejects android-only or manually generated green summaries", () => {
    expect(validateCloseoutSummary(
      validSummary({ android_chrome_summary_path: null }),
      "b4340904c02bb2ced51f514f645041fe1caee356",
    )).toContain("ANDROID_CHILD_SUMMARY_WITHOUT_ROOT_LINK_REJECTED");

    expect(validateCloseoutSummary(
      validSummary({ generated_by: "manual-edit", fake_green_claimed: true }),
      "b4340904c02bb2ced51f514f645041fe1caee356",
    )).toEqual(expect.arrayContaining([
      "ARTIFACT_GENERATED_BY_NOT_CANONICAL_WRITER",
      "FAKE_GREEN_CLAIMED_NOT_FALSE",
    ]));
  });

  it("keeps the canonical writer on the strict artifact schema", () => {
    const source = readFileSync(path.join(process.cwd(), EXPECTED_WRITER), "utf8");

    expect(source).toContain(`GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS`);
    expect(source).not.toContain(LEGACY_FINAL_STATUS);
    expect(source).toContain("artifact_schema_version");
    expect(source).toContain("source_sha");
    expect(source).toContain("worktree_clean_at_start");
    expect(source).toContain("worktree_clean_at_finish");
    expect(source).toContain("android_chrome_summary_path");
    expect(source).toContain("android_chrome_summary_source_sha_matches_root");
    expect(source).toContain("android_chrome_summary_final_status_matches_expected");
    expect(source).toContain("fake_green_claimed");
  });
});
