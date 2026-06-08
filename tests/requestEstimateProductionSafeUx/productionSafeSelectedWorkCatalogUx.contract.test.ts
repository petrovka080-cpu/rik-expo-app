import fs from "node:fs";
import path from "node:path";

import {
  isPublicRequestEstimatePath,
  isProtectedAppRoute,
  resolveRouteFromAuth,
  type AuthSessionState,
} from "../../src/lib/auth/useAuthLifecycle";
import { searchGlobalWorkSmartSuggestions } from "../../src/lib/ai/globalEstimate";
import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "../../scripts/e2e/selectedWorkEnterprise1000Cases";

const unauthenticatedState: AuthSessionState = {
  status: "unauthenticated",
  reason: "bootstrap_no_session",
};

function read(filePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

describe("production-safe selected work catalog UX closeout contracts", () => {
  it("keeps only the request estimate entrypoint public for Android API34 route proof", () => {
    const guard = read("src/lib/auth/useAuthGuard.ts");
    const lifecycle = read("src/lib/auth/useAuthLifecycle.ts");
    const androidSmoke = read("scripts/e2e/runAndroidApi34RequestEstimateSelectedWorkActiveInputCatalogScrollSmoke.ts");
    const androidHarness = read("scripts/_shared/androidHarness.ts");

    expect(guard).toContain("isPublicAppRoute: isPublicRequestEstimatePath(pathname)");
    expect(lifecycle).toContain("isPublicAppRoute?: boolean");
    expect(androidSmoke).not.toContain("expo-development-client/?url=${encodeURIComponent(devClientRequestUrl)}");
    expect(androidSmoke).not.toContain("const devClientRequestUrl");
    expect(androidSmoke.indexOf("`rik:///request?${query.toString()}`")).toBeGreaterThanOrEqual(0);
    expect(androidSmoke.indexOf("`rik:///request?${query.toString()}`")).toBeLessThan(
      androidSmoke.indexOf("`rik://request?${query.toString()}`"),
    );
    expect(androidSmoke.indexOf("`rik://request?${query.toString()}`")).toBeLessThan(
      androidSmoke.indexOf("`rik:///%28tabs%29/request?${query.toString()}`"),
    );
    expect(androidSmoke).not.toContain('query.set("autoPrepare"');
    expect(androidHarness).toContain("const isLastRouteCandidate = index === params.routes.length - 1");
    expect(androidHarness).toContain("isLastRouteCandidate &&");
    expect(isProtectedAppRoute("/request", [])).toBe(false);
    expect(isProtectedAppRoute("/(tabs)/request", [])).toBe(false);
    expect(isProtectedAppRoute("/request/123", [])).toBe(true);
    expect(isPublicRequestEstimatePath("/request")).toBe(true);
    expect(isPublicRequestEstimatePath("/(tabs)/request")).toBe(true);
    expect(isPublicRequestEstimatePath("/request/123")).toBe(false);

    expect(
      resolveRouteFromAuth({
        sessionLoaded: true,
        sessionState: unauthenticatedState,
        inAuthStack: false,
        isPdfViewerRoute: false,
        hasRecentAuthExit: false,
        isPublicAppRoute: isPublicRequestEstimatePath("/request"),
      }),
    ).toEqual({
      type: "none",
      reason: "session_absent_on_public_app_route",
    });
  });

  it("keeps catalog modal scroll isolated with a verifiable web body lock", () => {
    const picker = read("src/features/catalog/CatalogItemPicker.tsx");

    expect(picker).toContain("previousWebBodyOverflow");
    expect(picker).toContain("syncWebBodyScrollLock(this.props.visible)");
    expect(picker).toContain('body.style.overflow = "hidden"');
    expect(picker).toContain('testID="request-catalog-picker-header"');
    expect(picker).toContain('testID="request-catalog-picker-search-row"');
    expect(picker).toContain('testID="request-catalog-picker-results-scroll"');
  });

  it("opens catalog search from the row visible material title, not a numbered generic fallback", () => {
    const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const actions = read("src/features/consumerRepair/requestEstimateScreenActions.ts");

    expect(actions).toContain("function catalogInitialQueryForRequestItem");
    expect(actions).toContain("item.titleRu.replace(/^\\s*\\d+(?:\\.\\d+)*\\s+/, \"\")");
    expect(screen).toContain("catalogPickerInitialQuery: item ? catalogInitialQueryForRequestItem(item) : undefined");
  });

  it("keeps production-safe smart suggestions deduped by work key", () => {
    const cases = SELECTED_WORK_ENTERPRISE_1000_CASES.slice(0, 100);
    const failures = cases.flatMap((testCase) => {
      const suggestions = searchGlobalWorkSmartSuggestions({ query: testCase.smartSearchInput, limit: 8 });
      const workKeys = suggestions.map((suggestion) => suggestion.workKey);
      const duplicateWorkKeys = workKeys.filter((workKey, index) => workKeys.indexOf(workKey) !== index);
      return [
        ...(workKeys.includes(testCase.selectedWorkKey) ? [] : [`${testCase.id}:missing:${testCase.selectedWorkKey}`]),
        ...duplicateWorkKeys.map((workKey) => `${testCase.id}:duplicate:${workKey}`),
      ];
    });

    expect(failures).toEqual([]);
  });
});
