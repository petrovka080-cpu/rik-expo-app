import fs from "node:fs";
import path from "node:path";

describe("Android API34 canonical replay app-root evidence", () => {
  const source = () =>
    fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts"),
      "utf8",
    );

  it("does not let a transient first dev-client load error override later proven root-marker evidence", () => {
    const runner = source();

    expect(runner).toContain("type OpenCaseRouteResult");
    expect(runner).toContain("appRootMarkerProven: rootMarkerProven");
    expect(runner).toContain("let initialRootFailure");
    expect(runner).toContain("appRootMarkerProven = appRootMarkerProven || opened.appRootMarkerProven");
    expect(runner).toMatch(/if \(!appRootMarkerProven && initialRootFailure\)\s*{\s*failures\.push\(initialRootFailure\);/s);
  });

  it("accepts stable Android resource IDs as app-root and request-route proof", () => {
    const runner = source();

    expect(runner).toContain("isAndroidAppRootSurfaceXml");
    expect(runner).toContain("isAndroidRequestRouteSurfaceXml");
    expect(runner).toContain("function appRootProofReady");
    expect(runner).toContain("function requestRouteProofReady");
    expect(runner).toContain("const rootMarkerProven = appRootProofReady(root)");
    expect(runner).toContain("appRootMarkerProven = appRootProofReady(root)");
    expect(runner).not.toContain(
      "const rootMarkerProven = appRootReady(root) && root.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY)",
    );
    expect(runner).not.toMatch(/ready:\s*\(screen\)\s*=>\s*screen\.visibleText\.includes\(ROUTE_PROOF_APP_ROOT_READY\)/);
  });
});
