import { redirectSystemPath } from "../../app/+native-intent";
import fs from "node:fs";
import path from "node:path";
import { resolvePublicRequestDeepLinkTarget } from "../../src/lib/navigation/coreRoutes";

describe("native intent public request route", () => {
  it("keeps canonical Android request deep links on the public request route", () => {
    const promptQuery = "?prompt=roof";

    expect(
      redirectSystemPath({
        path: `/request${promptQuery}`,
        initial: true,
      }),
    ).toBe(`/(tabs)/request${promptQuery}`);

    expect(
      redirectSystemPath({
        path: `rik:///request${promptQuery}`,
        initial: true,
      }),
    ).toBe(`/(tabs)/request${promptQuery}`);

    expect(
      redirectSystemPath({
        path: `rik://request${promptQuery}`,
        initial: true,
      }),
    ).toBe(`/(tabs)/request${promptQuery}`);

    expect(
      redirectSystemPath({
        path: `rik:///%28tabs%29/request${promptQuery}`,
        initial: true,
      }),
    ).toBe(`/(tabs)/request${promptQuery}`);

    expect(
      redirectSystemPath({
        path: `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(
          `http://127.0.0.1:8099/--/request${promptQuery}`,
        )}`,
        initial: true,
      }),
    ).toBe(`/(tabs)/request${promptQuery}`);
  });

  it("does not remap unrelated custom scheme routes to request", () => {
    expect(
      redirectSystemPath({
        path: "rik://market?product=1",
        initial: true,
      }),
    ).toBe("rik://market?product=1");
  });

  it("passes request deep link query params to router-safe params", () => {
    expect(resolvePublicRequestDeepLinkTarget("rik:///request?prompt=roof+120&autoPdf=1")).toMatchObject({
      pathname: "/(tabs)/request",
      navigationPathname: "/(tabs)/request",
      href: "/(tabs)/request?prompt=roof+120&autoPdf=1",
      params: {
        prompt: "roof 120",
        autoPdf: "1",
      },
    });
  });

  it("handles runtime native url events in the root layout", () => {
    const rootLayoutSource = fs.readFileSync(
      path.join(process.cwd(), "app/_layout.tsx"),
      "utf8",
    );

    expect(rootLayoutSource).toContain("resolvePublicRequestDeepLinkTarget");
    expect(rootLayoutSource).toContain("useRootNavigationState");
    expect(rootLayoutSource).toContain("rootNavigationReady");
    expect(rootLayoutSource).toContain("pendingPublicRequestDeepLinkRef");
    expect(rootLayoutSource).toContain("public_request_deep_link_deferred");
    expect(rootLayoutSource.indexOf("if (!rootNavigationReady)")).toBeLessThan(
      rootLayoutSource.indexOf("router.replace({"),
    );
    expect(rootLayoutSource).toContain("ExpoLinking.useLinkingURL()");
    expect(rootLayoutSource).toContain("addNativeViewUrlListener");
    expect(rootLayoutSource).toContain("getLatestNativeViewUrl");
    expect(rootLayoutSource).toContain("drainLatestNativeViewUrl");
    expect(rootLayoutSource).toContain('AppState.addEventListener("change"');
    expect(rootLayoutSource).toContain('nextState === "active"');
    expect(rootLayoutSource).toContain("setInterval(drainLatestNativeViewUrl, 1_000)");
    expect(rootLayoutSource).toContain("clearInterval(nativeDrainInterval)");
    expect(rootLayoutSource).toContain("native_view_intent");
    expect(rootLayoutSource).toContain('RNLinking.addEventListener("url"');
    expect(rootLayoutSource).toContain("RNLinking.getInitialURL()");
    expect(rootLayoutSource).toContain("expo_linking_url");
    expect(rootLayoutSource).toContain("public_request_native_intent_read_failed");
    expect(rootLayoutSource).toContain("public_request_deep_link_resolved");
    expect(rootLayoutSource).toContain("pathname: target.navigationPathname");
    expect(rootLayoutSource).toContain("params: target.params");
  });

  it("keeps Android singleTask deep links on the Expo activity lifecycle path", () => {
    const mainActivitySource = fs.readFileSync(
      path.join(
        process.cwd(),
        "android/app/src/main/java/com/azisbek_dzhantaev/rikexpoapp/MainActivity.kt",
      ),
      "utf8",
    );
    const mainApplicationSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "android/app/src/main/java/com/azisbek_dzhantaev/rikexpoapp/MainApplication.kt",
      ),
      "utf8",
    );
    const intentModuleSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "android/app/src/main/java/com/azisbek_dzhantaev/rikexpoapp/RikIntentModule.kt",
      ),
      "utf8",
    );

    expect(mainActivitySource).toContain("ReactActivityDelegateWrapper");
    expect(mainActivitySource).toContain("override fun onNewIntent(intent: Intent)");
    expect(mainActivitySource).toContain("RikIntentModule.captureViewIntent(intent, reactContext)");
    expect(mainActivitySource.indexOf("setIntent(intent)")).toBeLessThan(
      mainActivitySource.indexOf("super.onNewIntent(intent)"),
    );
    expect(mainActivitySource.lastIndexOf("setIntent(intent)")).toBeGreaterThan(
      mainActivitySource.indexOf("super.onNewIntent(intent)"),
    );
    expect(mainApplicationSource).toContain("add(RikIntentPackage())");
    expect(intentModuleSource).toContain('const val NAME = "RikIntent"');
    expect(intentModuleSource).toContain('const val VIEW_URL_EVENT = "RikIntentViewUrl"');
    expect(intentModuleSource).toContain("fun getLatestViewUrl(promise: Promise)");
    expect(intentModuleSource).toContain("fun clearLatestViewUrl(url: String?)");
    expect(intentModuleSource).toContain("DeviceEventManagerModule.RCTDeviceEventEmitter::class.java");
    expect(mainActivitySource.indexOf("RikIntentModule.captureViewIntent(intent, null)")).toBeLessThan(
      mainActivitySource.indexOf("super.onCreate(null)"),
    );
    expect(mainActivitySource.lastIndexOf("RikIntentModule.captureViewIntent(intent, null)")).toBeLessThan(
      mainActivitySource.indexOf("super.onNewIntent(intent)"),
    );
    expect(mainActivitySource).not.toContain("dispatchViewIntentToReactNativeLinking");
  });

  it("lets native startup route public request links before auth bootstrap", () => {
    const indexSource = fs.readFileSync(
      path.join(process.cwd(), "app/index.tsx"),
      "utf8",
    );

    expect(indexSource).toContain("resolveInitialPublicRequestTarget");
    expect(indexSource).toContain("getLatestNativeViewUrl()");
    expect(indexSource).toContain("ExpoLinking.getLinkingURL()");
    expect(indexSource).toContain("resolvePublicRequestDeepLinkTarget");
    expect(indexSource).toContain("pathname: publicRequestTarget.navigationPathname");
    expect(indexSource.indexOf("resolveInitialPublicRequestTarget()")).toBeLessThan(
      indexSource.indexOf("if (!supabase)"),
    );
    expect(indexSource).toContain("public_request_initial_url");
    expect(indexSource).toContain("public_request_initial_url_read_failed");
    expect(indexSource).toContain("return null");
  });
});
