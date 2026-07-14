import { readFileSync } from "node:fs";

describe("staging RC Android CDP evidence recovery", () => {
  const harness = () => readFileSync("scripts/e2e/stagingRcRealEvidenceHarness.ts", "utf8");

  it("requires a strict Chrome DevTools preflight before Android RC smoke can be green", () => {
    const source = harness();

    expect(source).toContain("ANDROID_CHROME_COMMAND_LINE");
    expect(source).toContain("chrome-command-line");
    expect(source).toContain("--remote-debugging-socket-name=chrome_devtools_remote");
    expect(source).toContain("/json/version");
    expect(source).toContain("/json/list");
    expect(source).toContain("findStagingPageTarget");
    expect(source).toContain("android_runner_reads_cdp_json_version");
    expect(source).toContain("android_runner_reads_cdp_json_list");
    expect(source).toContain("android_runner_finds_staging_page_target");
    expect(source).toContain("android_runner_attaches_cdp");
    expect(source).toContain("android_runner_takes_screenshot");
    expect(source).toContain("android_runner_claims_green_without_page_target");
    expect(source).toContain("android_runner_claims_green_without_screenshot");
  });

  it("classifies Android evidence path failures instead of collapsing them into poll timeout", () => {
    const source = harness();

    expect(source).toContain("android_failure_root_cause_classified");
    expect(source).toContain("adb_device_missing");
    expect(source).toContain("emulator_boot_not_completed");
    expect(source).toContain("chrome_devtools_socket_missing");
    expect(source).toContain("adb_forward_failed");
    expect(source).toContain("cdp_json_version_unreachable");
    expect(source).toContain("cdp_page_target_missing");
    expect(source).toContain("cdp_attach_timeout");
    expect(source).toContain("case_runner_hang_after_case");
    expect(source).toContain("android_failure_is_evidence_path_not_web_parser");
  });

  it("bounds Android case execution and flushes evidence incrementally", () => {
    const source = harness();

    expect(source).toContain("STAGING_RC_ANDROID_PER_CASE_TIMEOUT_MS");
    expect(source).toContain("runAndroidCaseWithWatchdog");
    expect(source).toContain("android_case_watchdog_timeout");
    expect(source).toContain("flushSummary");
    expect(source).toContain("android_case_results_flushed_incrementally");
    expect(source).toContain("android_cases_incomplete");
    expect(source).toContain("android_screenshots_flushed_incrementally");
    expect(source).toContain("android_retry_budget_bounded");
    expect(source).toContain("android_failure_summary_written_on_timeout");
    expect(source).toContain("STAGING_RC_ANDROID_CDP_ATTACH_RETRY_BUDGET");
    expect(source).toContain("STAGING_RC_ANDROID_CHROME_SOFT_RESET_EVERY");
    expect(source).toContain("resetAndroidCaseStorage");
    expect(source).toContain("clearAndroidOriginStorage");
    expect(source).toContain("Storage.clearDataForOrigin");
    expect(source).toContain("storageTypes: \"all\"");
    expect(source).toContain("ACTIVE_REQUEST_DRAFT_KEY");
    expect(source).toContain("DURABLE_REQUEST_BUNDLE_KEY_PREFIX");
    expect(source).toContain("about:blank");
    expect(source).toContain("window.sessionStorage");
    expect(source).toContain("target === \"android-chrome\"");
    expect(source).not.toContain("MANUAL_ANDROID_GREEN");
  });
});
