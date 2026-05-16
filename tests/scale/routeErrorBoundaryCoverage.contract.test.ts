import fs from "node:fs";
import path from "node:path";

import {
  GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY,
  verifyRouteErrorBoundaryCoverage,
} from "../../scripts/scale/verifyRouteErrorBoundaryCoverage";

describe("S_SCALE_02 route error boundary closeout", () => {
  it("produces the Wave 2 green matrix with zero unprotected routes", () => {
    const verification = verifyRouteErrorBoundaryCoverage(process.cwd(), {
      writeArtifacts: false,
    });

    expect(verification.final_status).toBe(GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY);
    expect(verification.metrics.routes_total).toBe(41);
    expect(verification.metrics.routes_with_boundary_or_exception).toBe(41);
    expect(verification.metrics.routes_missing_boundary).toBe(0);
    expect(verification.metrics.real_screen_routes_without_boundary).toBe(0);
    expect(verification.metrics.exception_routes_documented).toBe(true);
    expect(verification.metrics.broad_exception_used).toBe(false);
    expect(verification.metrics.raw_stack_user_visible).toBe(false);
    expect(verification.metrics.secrets_user_visible).toBe(false);
    expect(verification.metrics.retry_or_back_available).toBe(true);
    expect(verification.metrics.web_runtime_checked).toBe(true);
    expect(verification.metrics.android_runtime_checked).toBe(true);
    expect(verification.metrics.new_hooks_added).toBe(false);
    expect(verification.metrics.hidden_testid_shims_added).toBe(false);
    expect(verification.metrics.business_logic_changed).toBe(false);
    expect(verification.metrics.fake_green_claimed).toBe(false);
    expect(verification.metrics.screenRoutesTotal).toBeGreaterThanOrEqual(30);
    expect(verification.metrics.screenRoutesWithBoundary).toBe(
      verification.metrics.screenRoutesTotal,
    );
    expect(verification.metrics.remainingScreenRoutesWithoutBoundary).toBe(0);
    expect(verification.metrics.rootAndAuthRoutesCovered).toBe(true);
    expect(verification.metrics.aliasRoutesResolveToWrappedTargets).toBe(true);
    expect(verification.metrics.hooksAdded).toBe(false);
    expect(verification.metrics.businessLogicChanged).toBe(false);
  });

  it("does not reintroduce auth/root/not-found broad exemptions", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/scale/verifyRouteErrorBoundaryCoverage.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/auth\[\^|auth\.\*|auth\[\\\\\/]/);
    expect(source).not.toContain("EXEMPT_PATTERNS");
    expect(source).toContain("REQUIRED_ROOT_AND_AUTH_ROUTES");
    expect(source).toContain("aliasRoutesResolveToWrappedTargets");
    expect(source).toContain("coveredByBoundaryOrException");
  });
});
