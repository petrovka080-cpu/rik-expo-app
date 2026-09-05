import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(filePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, filePath), "utf8");
}

describe("Android API34 proof environment", () => {
  it("requires API34 and rejects API36 as an acceptance substitute", () => {
    const ensureSource = read("scripts/e2e/ensureAndroidApi34DeviceReady.ts");
    const liveSmoke = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");

    expect(ensureSource).toContain('API34_AVD_NAME = "Pixel_7_API_34"');
    expect(ensureSource).toContain("androidSdk === 34");
    expect(ensureSource).toContain("waitForAndroidFrameworkServices");
    expect(ensureSource).toContain("frameworkServicesReady");
    expect(ensureSource).toContain("PIXEL_7_API_34_FRAMEWORK_SERVICES_NOT_READY");
    expect(ensureSource).toContain("BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE");
    expect(liveSmoke).toContain("actual_api: device.android_sdk");
    expect(liveSmoke).toContain("api36_rejected");
  });

  it("uses bounded UI dump and screenshot timeouts and native Metro", () => {
    const liveSmoke = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");
    const harness = read("scripts/e2e/androidRouteBootstrapHarness.ts");

    expect(liveSmoke).toContain("ANDROID_DEV_PORT");
    expect(liveSmoke).toContain("--dev-client");
    expect(liveSmoke).toContain('"--clear"');
    expect(liveSmoke).toContain("entry.bundle?platform=android");
    expect(liveSmoke).toContain("uiautomator");
    expect(liveSmoke).toContain("20_000");
    expect(liveSmoke).toContain("screencap");
    expect(liveSmoke).toContain("15_000");
    expect(liveSmoke).toContain("viewport.height * 0.58");
    expect(harness).toContain("uiautomator");
    expect(harness).toContain("8000");
    expect(harness).toContain("isBlankOrSystemSurface");
  });

  it("requires the exact local canonical backend tuple and reverses its port", () => {
    const liveSmoke = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");
    const replay = read("scripts/e2e/androidApi34Replay.ts");

    expect(liveSmoke).toContain("validateCanonicalAndroidRuntimeEnv");
    expect(liveSmoke).toContain("ANDROID_CANONICAL_RUNTIME_ENV_MISSING");
    expect(liveSmoke).toContain("ANDROID_CANONICAL_RUNTIME_HEAD_MISMATCH");
    expect(liveSmoke).toContain("CANONICAL_BACKEND_PORT = 8765");
    expect(liveSmoke).toContain("LOCAL_PROVIDER_PORT = 54321");
    expect(liveSmoke).toContain("ANDROID_LOCAL_PROVIDER_REVERSE_RED");
    expect(liveSmoke).toContain("ANDROID_CANONICAL_BACKEND_REVERSE_RED");
    expect(liveSmoke).toContain('`tcp:${port}`');
    expect(liveSmoke).toContain("ANDROID_LOCAL_PROVIDER_URL_NOT_EXACT_LOOPBACK");
    expect(liveSmoke).toContain("ANDROID_LOCAL_PROVIDER_PUBLIC_KEY_RED");
    expect(replay).toContain("exactReplayEnvironment");
    expect(replay).toContain("ANDROID_API34_CANONICAL_BACKEND_TUPLE_DRIFT");
    expect(replay).toContain("ANDROID_API34_LOCAL_PROVIDER_CREDENTIALS_MISSING");
    expect(replay).toContain("delete childEnv[secretName]");
    expect(replay).toContain("shell: false");
  });

  it("binds evidence to the exact Git SHA", () => {
    const liveSmoke = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");

    expect(liveSmoke).toContain('execFileSync("git", ["rev-parse", "HEAD"]');
  });

  it("accepts UI evidence only after semantic anchors and representative BOQ rows are visible", () => {
    const liveSmoke = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");
    const routeToScreenAck = read(
      "scripts/release/android/routeToScreenAck.ts",
    );
    const waitForCaseUi = liveSmoke.slice(
      liveSmoke.indexOf("async function waitForCaseUi"),
      liveSmoke.indexOf("async function collectUiTextAcrossScrolls"),
    );
    const runAndroidCase = liveSmoke.slice(
      liveSmoke.indexOf("async function runAndroidCase"),
      liveSmoke.indexOf("async function main"),
    );

    expect(waitForCaseUi).toContain("textContainsAll(lastText, visibleTokens)");
    expect(waitForCaseUi).not.toContain('includes("request-estimate-top-proof")');
    expect(waitForCaseUi).not.toContain('includes("ai-estimate-action-proof")');
    expect(runAndroidCase).toContain(
      "const missingTestIds = testCase.uiContract.requiredTestIds.filter",
    );
    expect(runAndroidCase).toContain(
      "const missingRepresentativeTokens = testCase.uiContract.representativeTokens.filter",
    );
    expect(runAndroidCase).toContain(
      "const uiRowsVisible = missingTestIds.length === 0 && missingRepresentativeTokens.length === 0;",
    );
    expect(routeToScreenAck).toContain("request-estimate-summary-card");
    expect(routeToScreenAck).toContain("request-estimate-items-editor");
    expect(routeToScreenAck).toContain("consumer-estimate-make-pdf");
    expect(routeToScreenAck).toContain(
      'representativeTokens: ["кабель", "розет"]',
    );
    expect(routeToScreenAck).toContain(
      'representativeTokens: ["кров", "гидроизоля"]',
    );
    expect(routeToScreenAck).toContain("ai-estimate-table");
    expect(routeToScreenAck).toContain("ai-estimate-visible-lines");
    expect(routeToScreenAck).toContain("ai-estimate-make-pdf");
    expect(routeToScreenAck).toContain(
      'representativeTokens: ["кабель", "щит"]',
    );
    expect(liveSmoke).toContain("if (capture()) return snapshots.join");
    expect(liveSmoke).not.toContain("CASE_UI_SETTLE_MS");
    expect(liveSmoke).toContain("CASE_UI_POLL_MS = 8_000");
    expect(liveSmoke).toContain("CASE_UI_MAX_POLLS = 3");
    expect(liveSmoke).not.toContain("for (let attempt = 0; attempt < 30");
    expect(
      runAndroidCase.indexOf(
        "const promptLifecycle = await waitForRouteToScreenLifecycle",
      ),
    ).toBeLessThan(
      runAndroidCase.indexOf("const promptProbeDeadline"),
    );
    expect(
      runAndroidCase.indexOf(
        "const estimateLifecycle = await waitForRouteToScreenLifecycle",
      ),
    ).toBeLessThan(runAndroidCase.indexOf("const initialUiText"));
    expect(liveSmoke).not.toContain(
      "REQUEST_PROMPT_PROBE_QUIET_SETTLE_MS",
    );
    expect(liveSmoke).toContain("PROMPT_PROBE_POLL_MS = 4_000");
    expect(liveSmoke).not.toContain(
      'viewportSwipeArgs(adbPath, deviceId, "down", 400)',
    );
    expect(liveSmoke).toContain(
      'viewportSwipeArgs(adbPath, deviceId, "down", 450)',
    );
    const promptProbeLoop = liveSmoke.slice(
      liveSmoke.indexOf("while (Date.now() < promptProbeDeadline"),
      liveSmoke.indexOf("const failedPromptProbeArtifactId"),
    );
    expect(promptProbeLoop).not.toContain("shell\", \"input\", \"swipe");
  });

  it("keeps the primary AI route behind a bounded Suspense fallback and readiness marker", () => {
    const aiRoute = read("app/(tabs)/ai.tsx");

    expect(aiRoute).toContain('() => import("../../src/features/ai/AIAssistantScreen")');
    expect(aiRoute).toContain("<React.Suspense fallback={<AiRouteLoadingFallback />}>");
    expect(aiRoute).toContain("<RouteReadyMarker marker={ROUTE_PROOF_MARKERS.embeddedAi} />");
    expect(aiRoute).toContain("<AIAssistantScreen");
    expect(aiRoute).toContain("launchPayload={launchPayload}");
  });

  it("keeps the mounted request owner responsive while separating exact draft identities", () => {
    const requestRoute = read("app/(tabs)/request/index.tsx");
    const requestOwner = read(
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    );

    expect(requestRoute).not.toContain("key={`${launchId");
    expect(requestRoute).toContain("initialDraftId={canonicalRevisionId ? undefined : draftId || undefined}");
    expect(requestRoute).toContain("launchFingerprint={launchFingerprint}");
    expect(requestRoute).toContain("launchId={launchId}");
    expect(requestOwner).toContain(
      "this.props.initialCanonicalRevisionId?.trim() === revision.revisionId",
    );
    expect(requestOwner).toContain(
      "prevProps.initialDraftId !== this.props.initialDraftId",
    );
    expect(requestOwner).toContain(
      "this.state.bundle?.draft.id === nextDraftId",
    );
    expect(requestOwner).toContain(
      "(launchChanged && isFreshRequestEstimateLaunchWorkspace(this.props))",
    );
    expect(requestOwner).toContain(
      "includeWorkSuggestions: this.workSuggestionsEnabled",
    );
    expect(requestOwner).toContain(
      'testID="request-estimate-runtime-ingress-composer"',
    );
    expect(requestOwner).toContain('testID="consumer-repair-problem-input"');
    expect(requestOwner).toContain("editable={false}");
  });

  it("keeps work-group deep links warm by never clearing the singleTask activity", () => {
    const workGroupRunner = read(
      "scripts/estimate/r4/runR4WorkGroupAndroidSurface.ts",
    );

    expect(workGroupRunner).not.toContain("0x10008000");
    expect(workGroupRunner).toContain(
      'adb(["shell", "am", "start", "-W", "-n", MAIN_ACTIVITY',
    );
    expect(workGroupRunner).toContain("isWarmAndroidActivityDelivery(launch)");
  });

  it("renders every admissible professional BOQ row without a hidden pagination boundary", () => {
    const editor = read("src/features/consumerRepair/RequestEstimateItemsEditor.tsx");

    expect(editor).toContain('testID="request-estimate-flat-row-list"');
    expect(editor).toContain("visibleItems.map");
    expect(editor).not.toContain("ESTIMATE_ROWS_PAGE_SIZE");
    expect(editor).not.toContain("section.items.slice(0");
    expect(editor).not.toContain("visibleLimit");
    expect(editor).not.toContain('testID="request-estimate-items-load-more"');
    expect(editor).not.toContain("viewModel.sections.slice(");
  });

  it("does not block an auto-send estimate on profile and chat-history hydration", () => {
    const assistant = read("src/features/ai/AIAssistantScreen.tsx");

    expect(assistant).toContain('routeAutoSend === "1"');
    expect(assistant).toContain("setBooting(false)");
    expect(assistant).toContain("initialize(hasAutoSendPrompt)");
  });

  it("establishes a real Android UI session before exercising protected routes", () => {
    const liveSmoke = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");

    expect(liveSmoke).toContain("resolveExplicitAiRoleAuthEnv");
    expect(liveSmoke).toContain("createAndroidHarness");
    expect(liveSmoke).toContain("replaceAndroidFieldText");
    expect(liveSmoke).toContain('startAndroidRouteSafe(PACKAGE_NAME, "rik:///request")');
    expect(liveSmoke).toContain('"explicit_foreman_env"');
    expect(liveSmoke).toContain('"local_developer_seeded_consumer"');
    expect(liveSmoke).toContain("loadAndroidProofPrincipal");
    expect(liveSmoke).toContain("ANDROID_API34_PROOF_PRINCIPAL_PROVIDER_DRIFT");
    expect(liveSmoke).toContain("isAndroidAuthenticatedRequestEstimateXml");
    expect(liveSmoke).toContain("ANDROID_REQUEST_ROUTE_SCREEN_MARKER_ID");
    expect(liveSmoke).toContain('!xml.includes("protected-identity-state-")');
    expect(liveSmoke).toContain("persistentSeed: true");
    expect(liveSmoke).toContain("cleanupRequired: false");
    expect(liveSmoke).toContain("serviceRoleExposedToApp: false");
    expect(liveSmoke).toContain("ANDROID_R4_A6_CLEAN_STATE_RED");
    expect(liveSmoke).toContain('node.resourceId === "protected-identity-sign-out"');
    expect(liveSmoke).toContain("isAndroidAuthLoginScreenXml");
    expect(liveSmoke).toContain("redactE2eSecrets");
    expect(liveSmoke).toContain("BLOCKED_ANDROID_API34_AUTH_SESSION_REQUIRED");
    expect(liveSmoke).toContain("without another bootstrap launch");
    expect(liveSmoke).not.toContain("signInWithPassword");
    expect(liveSmoke).not.toContain("createVerifierAdmin");
    expect(liveSmoke).not.toContain("createTempUser");
    expect(liveSmoke).not.toContain("loginAndroidWithProtectedRoute");
  });

  it("replays the exact accepted R4-A6 Android journey instead of substituting legacy catalog cases", () => {
    const liveSmoke = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");
    const journey = read("scripts/e2e/r4A6AndroidAcceptedUiRuntime.ts");

    expect(liveSmoke).toContain("runR4A6AndroidAcceptedUiRuntime");
    expect(liveSmoke).toContain("process.env.R4_A8_ANDROID_ARTIFACT_DIR");
    expect(liveSmoke).toContain("DEFAULT_ARTIFACT_DIR");
    expect(liveSmoke).toContain("exact_catalog_ui_selection_required: true");
    expect(journey).toContain('"canonical-work:expanded:battens_counterbattens"');
    expect(journey).toContain('"Кровля, мансарды и кровельные окна: обрешётка и контробрешётка 200 кв метров"');
    expect(journey).toContain("selectExactSuggestion");
    expect(journey).toContain("activateExactPromptSearch");
    expect(journey).toContain('"KEYCODE_SPACE"');
    expect(journey).toContain('"KEYCODE_DEL"');
    expect(journey).toContain("search/catalog?query=");
    expect(journey).toContain("visibleSuggestionMatched");
    expect(journey).toContain("revisionCatalogMatched");
    expect(journey).toContain("stagnantSnapshots >= 3");
    expect(journey).toContain("expectedSelectedDisplayTitle");
    expect(journey).toContain("selection.expectedTitle ??");
    expect(journey).toContain("R4_A8_ACCEPTED_WEB_REVISION_ID");
    expect(journey).not.toContain("consumer-repair-work-suggestion-catalog-");
    expect(journey).toContain("EXPECTED_CATEGORY_COUNTS");
    expect(journey).toContain('"delivery",\n  "all",');
    expect(journey).toContain("stableRestoredControl");
    expect(journey).toContain("fullyVisible(node)");
    expect(journey).toContain('beforeQuantity !== "216"');
    expect(journey).toContain("FIRST_FORMULA_ROW_TITLE");
    expect(journey).toContain('node.text === "216"');
    expect(journey).toContain("waitForChildRevisionId");
    expect(journey).toContain("waitForPhotoPermissionGate");
    expect(journey).toContain("APP_CONTENT_BOTTOM = 1828");
    expect(journey).toContain("cameraPermissionDialogDismissed");
    expect(journey).toContain("tapNodeIncludingBottomSheet");
    expect(journey).toContain("dismissReactNativeWarningOverlay");
    expect(journey).toContain("tapBottomSheetPrimaryAction");
    expect(journey).toContain('node.contentDesc.startsWith("Прикреплённое фото ")');
    expect(journey).toContain("childRevisionId: changedRevisionId");
    expect(journey).toContain("R4_A6_ANDROID_PHOTO_ATOMIC_AUDIT_RED");
    expect(journey).toContain("approvalTapCount = 1");
    expect(journey).toContain("consumer-repair-history-readonly-snapshot");
    expect(journey).toContain('"consumer-repair-history-pdf"');
    expect(journey).toContain('"pdf-viewer-back"');
    expect(journey).toContain('"consumer-estimate-open-procurement"');
    expect(journey).toContain("historyDismissedForProcurement");
    expect(journey).toContain("procurementSummaryAnchor");
    expect(journey).toContain("procurementLaunchMarker");
    expect(journey).toContain("procurementRouteApplied");
    expect(journey).not.toContain('"consumer-repair-history-open-pdf-expanded"');
    expect(journey).not.toContain('"consumer-repair-history-send-market"');
    expect(journey).not.toContain('"consumer-repair-history-send-market-inline"');
    expect(journey.indexOf("const historyCapture")).toBeLessThan(
      journey.indexOf("const pdfTapped"),
    );
    expect(journey.indexOf("const pdfTapped")).toBeLessThan(
      journey.indexOf("const procurementAuditStart"),
    );
    expect(journey).toContain("R4_A6_ANDROID_BACKGROUND_FOREGROUND_RED");
    expect(journey).toContain("R4_A6_ANDROID_COLD_RESTART_RED");
    expect(journey).toContain("bootstrapFreshDevClient");
    expect(journey).toContain("expo-development-client");
    const coldRestart = journey.slice(
      journey.indexOf("const coldAuditStart"),
      journey.indexOf("const coldCapture"),
    );
    expect(coldRestart.indexOf('"force-stop"')).toBeLessThan(
      coldRestart.indexOf("bootstrapFreshDevClient"),
    );
    expect(coldRestart.indexOf("bootstrapFreshDevClient")).toBeLessThan(
      coldRestart.indexOf("const coldLaunchId"),
    );
    expect(coldRestart).toContain("buildRequestEstimateLaunchReadyMarkerId");
    expect(coldRestart).toContain("coldSummaryReady");
    expect(coldRestart).toContain("await scrollToStart");
    expect(coldRestart).toContain("coldSelectedTitle");
    expect(coldRestart).toContain("coldRowCount");
    expect(coldRestart).not.toContain("await waitForLifecycle");
    expect(journey).toContain("R4_A6_ANDROID_WEB_PARITY_RED");
    expect(journey).not.toContain("answerBuiltInAi");
  });
});
