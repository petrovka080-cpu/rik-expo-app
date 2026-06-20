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

  it("opens protected route before login fill when the first surface is not the login screen", () => {
    const source = read("scripts/_shared/androidHarness.ts");

    expect(source).toContain('artifactBase: `${params.artifactBase}-initial-protected-route`');
    expect(source).toContain("predicate: (xml) => params.successPredicate(xml) || isLoginScreen(xml)");
    expect(source.indexOf("initial-protected-route")).toBeLessThan(source.indexOf("ensureExactLoginFieldText"));
  });

  it("opens route bootstrap deep links with adb arguments instead of a shell-quoted command string", () => {
    const source = read("scripts/e2e/androidRouteBootstrapHarness.ts");

    expect(source).toContain('"am",');
    expect(source).toContain('"-d",');
    expect(source).toContain("uri,");
    expect(source).toContain("warmAndroidMetroBundle");
    expect(source).toContain("entry.bundle?platform=android");
    expect(source).not.toContain("quoteAndroidShell");
    expect(source).not.toContain("am start -a android.intent.action.VIEW -d");
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
});
