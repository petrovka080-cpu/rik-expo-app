import fs from "node:fs";
import path from "node:path";

describe("AI estimate 11610 Android API34 natural-language proof", () => {
  it("defines a real API34 Android Chrome replay gate without exact-id backdoors", () => {
    const script = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/e2e/runAiEstimate11610AndroidApi34NaturalLanguageProof.ts"),
      "utf8",
    );
    const harness = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/e2e/androidChromeCdpHarness.ts"),
      "utf8",
    );

    expect(script).toContain("AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_PROOF_SCHEMA");
    expect(script).toContain("buildAiEstimate11610NaturalLanguagePromptForPassport");
    expect(script).toContain("ensureAndroidApi34DeviceReady");
    expect(script).toContain("checkAndroidEmulatorHealth");
    expect(script).toContain("evidence.selectedTemplateId === input.passport.templateId");
    expect(script).toContain("passportBackedNaturalLanguageIngress");
    expect(script).toContain("full_11610_android_api34_passed");
    expect(script).toContain("ANDROID_LAB_BOOTSTRAP_FAILURE");
    expect(script).toContain("ANDROID_CDP_ATTACH_FAILURE");
    expect(script).toContain("PRODUCTION_UI_INGRESS_FAILURE");
    expect(script).toContain("ESTIMATE_RUNTIME_FAILURE");
    expect(script).toContain("BOQ_TRUTH_FAILURE");
    expect(script).toContain("writeCheckpoint");
    expect(script).toContain("resume_skipped_passed_cases");
    expect(script).toContain("Storage.clearDataForOrigin");
    expect(script).toContain("itemsCompactV1");
    expect(script).toContain("consumer_repair_bundle_compact_items_v1");
    expect(script).toContain("androidSadTabVisible");
    expect(script).toContain("android_chrome_sad_tab_visible");
    expect(script).toContain("first_attempt_passed");
    expect(script).toContain("recovered_cases");
    expect(script).toContain("renderer_crash_count");
    expect(script).toContain("android_case_timeout");
    expect(script).toContain("android_page_create_timeout");
    expect(script).toContain("final_android_case_failure");
    expect(script).toContain("dismissChromeSurfacesNoThrow");
    expect(script).toContain("normalizeAndroidLoopbackBaseUrl");
    expect(script).toContain("probeProductionGradeWebServer");
    expect(script).toContain("WEB_SERVER_READINESS_FAILED");
    expect(script).toContain("requireOwned: true");
    expect(script).toContain("server_crash_count");
    expect(script).toContain("ingress_failure_count");
    expect(script).toContain("orphan_process_count");
    expect(script).toContain("case_duration_ms_p95");
    expect(script).toContain("peak_boq_rows");
    expect(script).toContain("matrix-size");
    expect(script).toContain("matrix-take");
    expect(script).toContain("evenly_spaced_android_matrix");
    expect(script).toContain("fake_green_claimed: false");
    expect(script).not.toContain("explicitTemplateId");
    expect(script).not.toContain("explicitWorkKey");
    expect(harness).toContain("chromium.connectOverCDP");
    expect(harness).toContain("ANDROID_CHROME_CDP_BOOTSTRAP_ATTEMPTS");
    expect(harness).toContain("ANDROID_CHROME_CDP_BOOTSTRAP_ATTEMPTS = 3");
    expect(harness).toContain("forceStopAndroidChromeForCdp");
    expect(harness).toContain("androidChromePid");
    expect(harness).toContain("waitForAndroidChromeCdpEndpointReady");
    expect(harness).toContain("ANDROID_CHROME_CDP_ENDPOINT_UNREACHABLE");
    expect(harness).toContain("waitForAndroidFrameworkServicesReady");
    expect(harness).toContain("ANDROID_FRAMEWORK_SERVICES_NOT_READY");
    expect(harness).toContain("cmd_activity_available");
    expect(harness).toContain("--no-default-browser-check");
    expect(harness).toContain("--disable-notifications");
    expect(harness).toContain("--disable-session-crashed-bubble");
    expect(harness).toContain("dismissAndroidChromeBlockingSurfaces");
    expect(harness).toContain("Chrome notifications make things easier");
    expect(harness).toContain("POST_NOTIFICATION");
    expect(harness).toContain("uiautomator");
    expect(harness).toContain("setDefaultNavigationTimeout");
    expect(harness).toContain("closeStalePage");
    expect(harness).toContain("/json/close/");
    expect(harness).toContain("/json/version");
    expect(harness).toContain("localabstract:chrome_devtools_remote");
    expect(harness).toContain("reverse");
    expect(harness).not.toMatch(/eas\s+build|expo\s+run:android|gradlew|xcodebuild/);
  });
});
