import { redirectSystemPath } from "../../app/+native-intent";
import fs from "node:fs";
import path from "node:path";
import {
  isPublicRequestRoutePathname,
  resolvePublicRequestDeepLinkTarget,
} from "../../src/lib/navigation/coreRoutes";

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
    expect(isPublicRequestRoutePathname("/request")).toBe(true);
    expect(isPublicRequestRoutePathname("/request/index")).toBe(true);
    expect(isPublicRequestRoutePathname("/(tabs)/request")).toBe(true);
    expect(isPublicRequestRoutePathname("/(tabs)/request/index")).toBe(true);
    expect(isPublicRequestRoutePathname("/profile")).toBe(false);
  });

  it("handles runtime native url events in the root layout", () => {
    const rootLayoutSource = fs.readFileSync(
      path.join(process.cwd(), "app/_layout.tsx"),
      "utf8",
    );
    const nativeIntentEventsSource = fs.readFileSync(
      path.join(process.cwd(), "src/lib/navigation/nativeIntentEvents.ts"),
      "utf8",
    );

    expect(rootLayoutSource).toContain("resolvePublicRequestDeepLinkTarget");
    expect(rootLayoutSource).toContain("useRootNavigationState");
    expect(rootLayoutSource).toContain("rootNavigationReady");
    expect(rootLayoutSource).toContain("pendingPublicRequestDeepLinkRef");
    expect(rootLayoutSource).toContain("public_request_deep_link_deferred");
    expect(rootLayoutSource.indexOf("if (!rootNavigationReady)")).toBeLessThan(
      rootLayoutSource.indexOf("const method = routePublicRequestDeepLink"),
    );
    expect(rootLayoutSource).toContain("ExpoLinking.useLinkingURL()");
    expect(rootLayoutSource).toContain("addNativeViewUrlListener");
    expect(rootLayoutSource).toContain("getLatestNativeViewUrl");
    expect(rootLayoutSource).toContain("drainLatestNativeViewUrl");
    expect(rootLayoutSource).toContain("NATIVE_VIEW_URL_DRAIN_STALE_MS");
    expect(rootLayoutSource).not.toContain("PUBLIC_REQUEST_NAVIGATION_RETRY_MS");
    expect(rootLayoutSource).not.toContain("PUBLIC_REQUEST_NAVIGATION_MAX_ATTEMPTS");
    expect(rootLayoutSource).not.toContain("setPublicRequestDeepLinkRetryTick");
    expect(rootLayoutSource).not.toContain("public_request_deep_link_navigation_pending");
    expect(rootLayoutSource).toContain("nativeReadInFlightStartedAt");
    expect(rootLayoutSource).toContain("public_request_native_intent_read_stale");
    expect(rootLayoutSource).toContain("staleAfterMs: NATIVE_VIEW_URL_DRAIN_STALE_MS");
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
    expect(rootLayoutSource).toContain("isPublicRequestRoutePathname(pathname)");
    expect(rootLayoutSource).toContain("function routePublicRequestDeepLink");
    expect(rootLayoutSource).toContain("navigatePublicRequestTab(target)");
    expect(rootLayoutSource).toContain("hasPublicRequestTabNavigationHandler()");
    expect(rootLayoutSource).toContain("logAndroidPublicRequestDeepLink");
    expect(rootLayoutSource).toContain('"open_attempt"');
    expect(rootLayoutSource).toContain('"tab_navigation"');
    expect(rootLayoutSource).toContain("const pendingKey = target.href");
    expect(rootLayoutSource).toContain("routedSources.includes(source)");
    expect(rootLayoutSource).toContain("router.replace(href)");
    expect(rootLayoutSource).toContain("router.replace(routeTarget)");
    expect(rootLayoutSource).toContain("router.navigate(href)");
    expect(rootLayoutSource).toContain("public_request_deep_link_navigation");
    expect(rootLayoutSource).toContain("public_request_deep_link_navigation_observed");
    expect(rootLayoutSource.indexOf("const method = routePublicRequestDeepLink")).toBeLessThan(
      rootLayoutSource.indexOf("clearLatestNativeViewUrl(pending.url)"),
    );
    expect(rootLayoutSource).toContain("method,");
    expect(nativeIntentEventsSource).toContain("NativeEventEmitter");
    expect(nativeIntentEventsSource).not.toContain("DeviceEventEmitter");
  });

  it("switches warm request links through the mounted bottom tab navigator", () => {
    const tabsLayoutSource = fs.readFileSync(
      path.join(process.cwd(), "app/(tabs)/_layout.tsx"),
      "utf8",
    );
    const tabNavigatorSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/lib/navigation/publicRequestTabNavigator.ts",
      ),
      "utf8",
    );

    expect(tabsLayoutSource).toContain("registerPublicRequestTabNavigationHandler");
    expect(tabsLayoutSource).toContain('route.name === "request/index"');
    expect(tabsLayoutSource).toContain("tab_handler_registered");
    expect(tabsLayoutSource).toContain("tab_handler_navigate");
    expect(tabsLayoutSource).toContain("navigation.getState()");
    expect(tabsLayoutSource).toContain("target: requestRoute.key");
    expect(tabsLayoutSource).toContain("canPreventDefault: true");
    expect(tabsLayoutSource).toContain("tab_handler_prevented");
    expect(tabsLayoutSource).toContain("navigation.navigate(requestRoute.name, params)");
    expect(tabNavigatorSource).toContain("registerPublicRequestTabNavigationHandler");
    expect(tabNavigatorSource).toContain("navigatePublicRequestTab");
    expect(tabNavigatorSource).toContain("hasPublicRequestTabNavigationHandler");
    expect(tabNavigatorSource).not.toContain("__TEST__");
    expect(tabsLayoutSource).not.toContain("__TEST__");
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
    expect(mainActivitySource.indexOf("setIntent(intent)")).toBeLessThan(
      mainActivitySource.indexOf("super.onNewIntent(intent)"),
    );
    expect(mainActivitySource.lastIndexOf("setIntent(intent)")).toBeGreaterThan(
      mainActivitySource.indexOf("super.onNewIntent(intent)"),
    );
    expect(mainActivitySource.indexOf("setIntent(intent)")).toBeLessThan(
      mainActivitySource.indexOf("RikIntentModule.captureViewIntent(intent, RikIntentModule.activeReactContext())"),
    );
    expect(mainApplicationSource).toContain("add(RikIntentPackage())");
    expect(intentModuleSource).toContain('const val NAME = "RikIntent"');
    expect(intentModuleSource).toContain('const val VIEW_URL_EVENT = "RikIntentViewUrl"');
    expect(intentModuleSource).toContain("fun getLatestViewUrl(promise: Promise)");
    expect(intentModuleSource).toContain("fun clearLatestViewUrl(url: String?)");
    expect(intentModuleSource).toContain("fun addListener(eventName: String)");
    expect(intentModuleSource).toContain('emitLatestViewUrl(reactContext, "listener_registered")');
    expect(intentModuleSource).toContain("view_intent_captured");
    expect(intentModuleSource).toContain("view_url_emit");
    expect(intentModuleSource).toContain("ActivityEventListener");
    expect(intentModuleSource).toContain("reactContext.addActivityEventListener(this)");
    expect(intentModuleSource).toContain("reactContext.removeActivityEventListener(this)");
    expect(intentModuleSource).toContain("WeakReference<ReactContext>");
    expect(intentModuleSource).toContain("fun activeReactContext(): ReactContext?");
    expect(intentModuleSource).toContain("hasActiveReactInstance()");
    expect(intentModuleSource).toContain("override fun onNewIntent(intent: Intent)");
    expect(intentModuleSource).toContain("captureViewIntent(intent, reactContext)");
    expect(intentModuleSource).toContain("DeviceEventManagerModule.RCTDeviceEventEmitter::class.java");
    expect(mainActivitySource.indexOf("RikIntentModule.captureViewIntent(intent, null)")).toBeLessThan(
      mainActivitySource.indexOf("super.onCreate(null)"),
    );
    expect(mainActivitySource).toContain("RikIntentModule.captureViewIntent(intent, RikIntentModule.activeReactContext())");
    expect(mainActivitySource.indexOf("RikIntentModule.captureViewIntent(intent, RikIntentModule.activeReactContext())")).toBeLessThan(
      mainActivitySource.indexOf("super.onNewIntent(intent)"),
    );
    expect(mainActivitySource.lastIndexOf("RikIntentModule.captureViewIntent(intent, RikIntentModule.activeReactContext())")).toBeGreaterThan(
      mainActivitySource.indexOf("super.onNewIntent(intent)"),
    );
    expect(mainActivitySource).not.toContain("currentReactContext");
    expect(mainActivitySource).not.toContain("reactNativeHost");
    expect(mainActivitySource).not.toContain("ReactApplication");
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

  it("keeps auth public-route decisions on the shared request route matcher", () => {
    const authLifecycleSource = fs.readFileSync(
      path.join(process.cwd(), "src/lib/auth/useAuthLifecycle.ts"),
      "utf8",
    );

    expect(authLifecycleSource).toContain("isPublicRequestRoutePathname");
    expect(authLifecycleSource).toContain("return isPublicRequestRoutePathname(pathname)");
  });
});
