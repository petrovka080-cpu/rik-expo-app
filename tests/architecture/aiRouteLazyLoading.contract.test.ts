import {
  GREEN_SCALE_AI_ROUTE_LAZY_LOADING_READY,
  verifyAiRouteLazyLoading,
} from "../../scripts/architecture/verifyAiRouteLazyLoading";

describe("architecture: AI route lazy loading", () => {
  it("lazy-loads heavy AI route screens without static route imports", () => {
    const verification = verifyAiRouteLazyLoading(process.cwd());

    expect(verification.final_status).toBe(
      GREEN_SCALE_AI_ROUTE_LAZY_LOADING_READY,
    );
    expect(verification.findings).toEqual([]);
    expect(verification.metrics.targetRoutes).toBe(4);
    expect(verification.metrics.staticHeavyAiRouteImportsRemaining).toBe(0);
    expect(verification.metrics.routesWithStaticHeavyAiImports).toBe(0);
    expect(verification.metrics.dynamicHeavyAiRouteImports).toBe(7);
  });

  it("keeps Suspense fallbacks and route error boundaries on every lazy route", () => {
    const verification = verifyAiRouteLazyLoading(process.cwd());

    expect(verification.metrics.routesWithSuspense).toBe(
      verification.metrics.targetRoutes,
    );
    expect(verification.metrics.routesWithLoadingFallback).toBe(
      verification.metrics.targetRoutes,
    );
    expect(verification.metrics.routesWithErrorBoundary).toBe(
      verification.metrics.targetRoutes,
    );
    for (const entry of verification.inventory) {
      expect(entry.hasSuspenseBoundary).toBe(true);
      expect(entry.hasLoadingFallback).toBe(true);
      expect(entry.hasErrorBoundary).toBe(true);
      expect(entry.staticHeavyImports).toEqual([]);
      expect(entry.dynamicHeavyImports.length).toBeGreaterThan(0);
    }
  });

  it("preserves AI tab branching and deep-link alias semantics", () => {
    const verification = verifyAiRouteLazyLoading(process.cwd());
    const tabRoute = verification.inventory.find(
      (entry) => entry.route === "app/(tabs)/ai.tsx",
    );
    const procurementRoute = verification.inventory.find(
      (entry) => entry.route === "app/ai-procurement-copilot.tsx",
    );

    expect(tabRoute?.preservesRouteParams).toBe(true);
    expect(procurementRoute?.preservesRouteParams).toBe(true);
    expect(verification.metrics.aliasRoutePreserved).toBe(true);
    expect(verification.metrics.businessLogicChanged).toBe(false);
    expect(verification.metrics.hooksAdded).toBe(false);
    expect(verification.metrics.hiddenTestIdShimsAdded).toBe(false);
    expect(verification.metrics.fakeGreenClaimed).toBe(false);
  });
});
