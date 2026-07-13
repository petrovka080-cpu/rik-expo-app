import {
  GREEN_STAGING_SOAK_LOAD_READY,
  STOP_STAGING_SOAK_LOAD_FAILED_NO_GREEN,
  buildStagingSoakSummary,
  type StagingSoakEvidence,
} from "../../scripts/estimate/runAiEstimateStagingSoak";
import { currentBranch, currentSourceSha } from "../../scripts/e2e/renderStagingAcceptanceCore";
import { readFileSync } from "node:fs";

function validEvidence(): StagingSoakEvidence {
  return {
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    generated_at: "2026-07-10T00:00:00.000Z",
    staging_url: "https://rik-expo-app-staging.onrender.com",
    staging_soak_browser_flow_executed: true,
    staging_soak_executed_against_external_url: true,
    operation_counts: {
      create_draft: 500,
      parameter_override: 200,
      approval: 100,
      pdf_generation: 100,
      buyer_generation: 100,
      history_reload: 100,
    },
    total_operation_attempts: 1100,
    total_operation_errors: 0,
    duplicate_approve_safe: true,
    memory_budget_violations_count: 0,
    browser_console_errors_count: 0,
    browser_page_errors_count: 0,
    first_error: null,
    screenshot_path: ".release-runtime/test/staging-soak-final.png",
  };
}

describe("staging soak load", () => {
  it("does not claim green without explicit external staging soak execution", () => {
    const summary = buildStagingSoakSummary();

    expect(summary.final_status).toBe(STOP_STAGING_SOAK_LOAD_FAILED_NO_GREEN);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blocking_reasons).toContain("STAGING_SOAK_EXECUTION_EVIDENCE_MISSING");
  });

  it("rejects a bare execute flag as soak evidence", () => {
    const summary = buildStagingSoakSummary({ executeStaging: true });

    expect(summary.final_status).toBe(STOP_STAGING_SOAK_LOAD_FAILED_NO_GREEN);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blocking_reasons).toContain("STAGING_SOAK_MANUAL_EXECUTE_FLAG_REJECTED");
  });

  it("records the minimum operation counts when execution evidence is provided", () => {
    const summary = buildStagingSoakSummary({ evidence: validEvidence() });

    expect(summary.final_status).toBe(GREEN_STAGING_SOAK_LOAD_READY);
    expect(summary.staging_create_draft_ops_passed).toBe("500/500");
    expect(summary.staging_parameter_override_ops_passed).toBe("200/200");
    expect(summary.staging_approval_ops_passed).toBe("100/100");
    expect(summary.staging_pdf_generation_ops_passed).toBe("100/100");
    expect(summary.staging_buyer_generation_ops_passed).toBe("100/100");
    expect(summary.staging_history_reload_ops_passed).toBe("100/100");
    expect(summary.staging_duplicate_approve_safe).toBe(true);
    expect(summary.staging_memory_budget_violations_count).toBe(0);
    expect(summary.staging_error_rate_within_slo).toBe(true);
  });

  it("blocks green when a required operation family is below the soak threshold", () => {
    const evidence = validEvidence();
    evidence.operation_counts.pdf_generation = 99;
    const summary = buildStagingSoakSummary({ evidence });

    expect(summary.final_status).toBe(STOP_STAGING_SOAK_LOAD_FAILED_NO_GREEN);
    expect(summary.blocking_reasons).toContain("STAGING_SOAK_PDF_GENERATION_OPS_BELOW_REQUIRED:99/100");
  });

  it("keeps browser and Android RC evidence on real harness paths", () => {
    const webEntrypoint = readFileSync("scripts/e2e/runAiEstimateStagingReleaseCandidateWebSmoke.ts", "utf8");
    const androidEntrypoint = readFileSync("scripts/e2e/runAiEstimateStagingReleaseCandidateAndroidSmoke.ts", "utf8");
    const harness = readFileSync("scripts/e2e/stagingRcRealEvidenceHarness.ts", "utf8");

    expect(webEntrypoint).toContain("MANUAL_BROWSER_EVIDENCE_FLAG_REJECTED");
    expect(androidEntrypoint).toContain("MANUAL_ANDROID_EVIDENCE_FLAG_REJECTED");
    expect(harness).toContain("chromium.launch");
    expect(harness).toContain("page.screenshot");
    expect(harness).toContain("checkAndroidEmulatorHealth");
    expect(harness).toContain("chromium.connectOverCDP");
    expect(harness).toContain("chrome_devtools_remote");
    expect(harness).toContain("consumer-repair-problem-input");
    expect(harness).toContain("consumer-repair-open-pdf");
    expect(harness).toContain("route_equivalent_smoke_passed: false");
  });
});
