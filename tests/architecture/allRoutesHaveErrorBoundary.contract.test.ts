import {
  GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY,
  verifyRouteErrorBoundaryCoverage,
} from "../../scripts/scale/verifyRouteErrorBoundaryCoverage";

describe("architecture: all app routes have error boundary coverage", () => {
  it("requires each real screen route to use withScreenErrorBoundary", () => {
    const verification = verifyRouteErrorBoundaryCoverage(process.cwd(), {
      writeArtifacts: false,
    });

    expect(verification.final_status).toBe(GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY);
    expect(verification.metrics.routes_total).toBe(41);
    expect(verification.metrics.screenRoutesWithBoundary).toBe(
      verification.metrics.screenRoutesTotal,
    );
    expect(verification.metrics.real_screen_routes_without_boundary).toBe(0);
    expect(verification.findings).toEqual([]);
  });

  it("keeps route exceptions exact and per-route", () => {
    const verification = verifyRouteErrorBoundaryCoverage(process.cwd(), {
      writeArtifacts: false,
    });
    const exceptions = verification.inventory.filter(
      (entry) => entry.kind !== "screen_route",
    );

    expect(exceptions.length).toBeGreaterThan(0);
    expect(verification.metrics.exception_routes_documented).toBe(true);
    expect(verification.metrics.broad_exception_used).toBe(false);
    for (const exception of exceptions) {
      expect(exception.coveredByBoundaryOrException).toBe(true);
      expect(exception.reason).toMatch(/route|screen|layout|alias|utility/i);
      expect(exception.reason.length).toBeGreaterThan(20);
    }
  });
});
