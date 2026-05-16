import fs from "node:fs";
import path from "node:path";

import {
  GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY,
  verifyRouteErrorBoundaryCoverage,
} from "../../scripts/scale/verifyRouteErrorBoundaryCoverage";

describe("S_SCALE_02 route error boundary closeout", () => {
  it("produces a green route boundary matrix with zero unprotected leaf routes", () => {
    const verification = verifyRouteErrorBoundaryCoverage(process.cwd(), {
      writeArtifacts: false,
    });

    expect(verification.final_status).toBe(GREEN_SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_READY);
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
  });
});
