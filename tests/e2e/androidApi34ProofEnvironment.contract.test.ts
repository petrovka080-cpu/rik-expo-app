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

  it("binds evidence to the exact Git SHA", () => {
    const liveSmoke = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");

    expect(liveSmoke).toContain('execFileSync("git", ["rev-parse", "HEAD"]');
  });

  it("accepts UI evidence only after semantic anchors and representative BOQ rows are visible", () => {
    const liveSmoke = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");
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
    expect(liveSmoke).toContain(
      'requiredTestIds: ["request-estimate-summary-card", "request-estimate-items-editor", "consumer-estimate-make-pdf"]',
    );
    expect(liveSmoke).toContain('representativeTokens: ["кабель", "розет"]');
    expect(liveSmoke).toContain('representativeTokens: ["кров", "гидроизоля"]');
    expect(liveSmoke).toContain(
      'requiredTestIds: ["ai-estimate-table", "ai-estimate-visible-lines", "ai-estimate-make-pdf"]',
    );
    expect(liveSmoke).toContain('representativeTokens: ["кабель", "щит"]');
    expect(liveSmoke).toContain("if (capture()) return snapshots.join");
    expect(liveSmoke).toContain("CASE_UI_SETTLE_MS = 40_000");
    expect(liveSmoke).toContain("CASE_UI_POLL_MS = 8_000");
    expect(liveSmoke).toContain("CASE_UI_MAX_POLLS = 3");
    expect(liveSmoke).not.toContain("for (let attempt = 0; attempt < 30");
  });

  it("keeps the primary AI route behind a bounded Suspense fallback and readiness marker", () => {
    const aiRoute = read("app/(tabs)/ai.tsx");

    expect(aiRoute).toContain('() => import("../../src/features/ai/AIAssistantScreen")');
    expect(aiRoute).toContain("<React.Suspense fallback={<AiRouteLoadingFallback />}>");
    expect(aiRoute).toContain("<RouteReadyMarker marker={ROUTE_PROOF_MARKERS.embeddedAi} />");
    expect(aiRoute).toContain("<AIAssistantScreen");
    expect(aiRoute).toContain("launchPayload={launchPayload}");
  });

  it("separates exact draft routes and creates a fresh workspace when a warm deep link changes the prompt", () => {
    const requestRoute = read("app/(tabs)/request/index.tsx");

    expect(requestRoute).toContain(
      'key={`${launchId || "direct"}::${draftId || "new"}::${prompt}::${autoPrepare ? "prepare" : "manual"}::${autoPdf ? "pdf" : "screen"}`}',
    );
    expect(requestRoute).toContain("initialDraftId={draftId || undefined}");
    expect(requestRoute).toContain("launchId={launchId}");
  });

  it("bounds editable request rows without truncating the professional BOQ", () => {
    const editor = read("src/features/consumerRepair/RequestEstimateItemsEditor.tsx");

    expect(editor).toContain("ESTIMATE_ROWS_PAGE_SIZE = 6");
    expect(editor).toContain("section.items.slice(0, Math.max(0, remainingRows))");
    expect(editor).toContain("state.visibleLimit + ESTIMATE_ROWS_PAGE_SIZE");
    expect(editor).toContain('testID="request-estimate-items-load-more"');
    expect(editor).not.toContain("viewModel.sections.slice(");
  });

  it("does not block an auto-send estimate on profile and chat-history hydration", () => {
    const assistant = read("src/features/ai/AIAssistantScreen.tsx");

    expect(assistant).toContain('routeAutoSend === "1"');
    expect(assistant).toContain("setBooting(false)");
    expect(assistant).toContain("initialize(hasAutoSendPrompt)");
  });
});
