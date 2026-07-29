import fs from "node:fs";
import path from "node:path";

function read(filePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

describe("Android harness text input contracts", () => {
  it("types email values as one adb input payload instead of splitting at @", () => {
    const source = read("scripts/_shared/androidHarness.ts");

    expect(source).toContain('adb(["shell", "input", "text", escapeAndroidInputText(text)])');
    expect(source).not.toContain('chunk === "@"');
    expect(source).not.toContain("pressAndroidKey(77)");
    expect(source).not.toContain('.replace(/@/g, "\\\\@")');
  });

  it("opens the canonical login route before field fill when the first surface is not authenticated", () => {
    const source = read("scripts/_shared/androidHarness.ts");
    const initialAuthRouteIndex = source.indexOf('routes: ["rik:///auth/login"]');
    const firstEmailFillIndex = source.indexOf("const confirmedEmail = await setLoginFieldText(");

    expect(source).toContain('artifactBase: `${params.artifactBase}-initial-protected-route`');
    expect(source).toContain('routes: ["rik:///auth/login"]');
    expect(source).toContain("isAuthenticatedSessionReady(xml) || isLoginScreen(xml)");
    expect(initialAuthRouteIndex).toBeGreaterThanOrEqual(0);
    expect(firstEmailFillIndex).toBeGreaterThan(initialAuthRouteIndex);
  });

  it("opens route bootstrap deep links with adb arguments instead of a shell-quoted command string", () => {
    const source = read("scripts/e2e/androidRouteBootstrapHarness.ts");

    expect(source).toContain('"am",');
    expect(source).toContain('"-d",');
    expect(source).toContain("quoteAndroidShellArg(uri),");
    expect(source).toContain("warmAndroidMetroBundle");
    expect(source).toContain("entry.bundle?platform=android");
    expect(source).not.toContain("am start -a android.intent.action.VIEW -d");
  });

  it("quotes Android route URI arguments so query ampersands stay inside the deeplink", () => {
    const routeBootstrapHarness = read("scripts/e2e/androidRouteBootstrapHarness.ts");
    const sharedHarness = read("scripts/_shared/androidHarness.ts");

    expect(routeBootstrapHarness).toContain("export function quoteAndroidShellArg");
    expect(routeBootstrapHarness).toContain("quoteAndroidShellArg(uri),");
    expect(sharedHarness).toContain("function quoteAndroidShellArg");
    expect(sharedHarness).toContain("quoteAndroidShellArg(route)");
  });

  it("allows cold Android dev-client start to wait past the default adb timeout", () => {
    const source = read("scripts/_shared/androidHarness.ts");

    expect(source).toContain('adb(args, "utf8", 120_000)');
  });

  it("opens Android deep links without synchronous am start wait", () => {
    const sharedHarness = read("scripts/_shared/androidHarness.ts");
    const routeBootstrapHarness = read("scripts/e2e/androidRouteBootstrapHarness.ts");

    expect(sharedHarness).not.toContain('"am", "start", "-W", "-a", "android.intent.action.VIEW"');
    expect(routeBootstrapHarness).not.toContain('"am", "start", "-W", "-a", "android.intent.action.VIEW"');
  });

  it("waits through app ANR during cold bundle startup instead of closing the app", () => {
    const source = read("scripts/_shared/androidHarness.ts");

    expect(source).toContain("if (!launcherAnr && waitNode)");
    expect(source.indexOf("if (!launcherAnr && waitNode)")).toBeLessThan(source.indexOf("launcherAnr && closeNode"));
    expect(source).toContain("await sleep(!launcherAnr && waitNode ? 4000 : 1500)");
  });

  it("does not treat blank Android compose surfaces as settled proof screens", () => {
    const sharedHarness = read("scripts/_shared/androidHarness.ts");
    const canonicalReplay = read("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts");

    expect(sharedHarness).not.toContain("if (blankSurfaceStreak >= 3) return cleaned");
    expect(canonicalReplay).not.toContain("if (blankSurfaceStreak >= 3) return last");
  });

  it("bounds Android route bootstrap adb calls without execFileSync hangs", () => {
    const routeBootstrapHarness = read("scripts/e2e/androidRouteBootstrapHarness.ts");

    expect(routeBootstrapHarness).toContain('spawnSync("adb", args');
    expect(routeBootstrapHarness).toContain("timeout: timeoutMs");
    expect(routeBootstrapHarness).not.toContain('execFileSync("adb", args');
  });

  it("keeps canonical API34 replay fail-closed on auth, prompt submission and bounded output scrolling", () => {
    const canonicalReplay = read("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts");

    expect(canonicalReplay).toContain('return `rik://ai?${query.toString()}`');
    expect(canonicalReplay).toContain("? [buildAndroidHostUri(testCase), buildUri(testCase)]");
    expect(canonicalReplay).toContain("ANDROID_AUTHENTICATED_SESSION_READY_MARKER_ID");
    expect(canonicalReplay).toContain("authenticatedAppRootOrAuthReady");
    expect(canonicalReplay).toContain("requiresAuthenticatedSession");
    expect(canonicalReplay).toContain('const REQUEST_SCROLL_RESOURCE_ID = "consumer-repair-screen"');
    expect(canonicalReplay).toContain("const REQUEST_SCROLL_X_RATIO = 0.065");
    expect(canonicalReplay).toContain("const requestStartedAtTop");
    expect(canonicalReplay).toContain('captures.push(await captureReplayScreen(`${captureId}_settle_${index}`))');
    expect(canonicalReplay).toContain("!captures.some(latestAssistantResponseVisible)");
    expect(canonicalReplay).toContain('testCase.route === "/ai?context=foreman" ? "down" : "up"');
    expect(canonicalReplay).toContain("scrollableOutputBounds(captures[captures.length - 1], testCase)");
    expect(canonicalReplay).toContain('if (testCase.route !== "/request") focusAndroidBounds(bounds)');
    expect(canonicalReplay).toContain("источник|уверенн|довер|confidence");
    expect(canonicalReplay).toContain("protectedRoute: buildUriCandidates(testCase)[0]");
    expect(canonicalReplay).toMatch(
      /const promptSubmitted\s*=\s*requestOutputProofSubmitted\(/,
    );
    expect(canonicalReplay).not.toMatch(
      /const promptSubmitted\s*=\s*routeMarkerProven\s*\|\|/,
    );
  });
});
