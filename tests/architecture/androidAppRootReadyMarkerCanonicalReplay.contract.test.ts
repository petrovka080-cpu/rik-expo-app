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
    expect(runner).toContain("function appRootOrAuthReady");
    expect(runner).toContain("ready: appRootOrAuthReady");
    expect(runner).toContain("if (isAuthLoginCapture(root)) break");
    expect(runner).toContain("const rootMarkerProven = appRootProofReady(root)");
    expect(runner).toContain("appRootMarkerProven = appRootProofReady(root)");
    expect(runner).not.toContain(
      "const rootMarkerProven = appRootReady(root) && root.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY)",
    );
    expect(runner).not.toMatch(/ready:\s*\(screen\)\s*=>\s*screen\.visibleText\.includes\(ROUTE_PROOF_APP_ROOT_READY\)/);
  });

  it("uses the canonical request-route detector after auth recovery", () => {
    const runner = source();

    expect(runner).toContain("function routeReadyXmlForCase");
    expect(runner).toContain("function recoverAuthForCaseRoute");
    expect(runner).toContain("openCaseRoute(testCase, auth)");
    expect(runner).toContain("successPredicate: (xml) => routeReadyXmlForCase(params.testCase, xml)");
    expect(runner).toMatch(/testCase\.route === "\/request"\s*\?\s*isAndroidRequestRouteSurfaceXml\(xml\)/s);
    expect(runner).not.toMatch(
      /testCase\.route === "\/request"\s*\?\s*xml\.includes\(ROUTE_PROOF_REQUEST_ROUTE_READY\)/s,
    );
  });

  it("accepts stable Android AI assistant surface IDs as embedded AI route proof", () => {
    const runner = source();

    expect(runner).toContain("isAndroidEmbeddedAiRouteSurfaceXml");
    expect(runner).toContain("function embeddedAiRouteProofReady");
    expect(runner).toContain("isAndroidEmbeddedAiRouteSurfaceXml(screen.xml)");
    expect(runner).not.toContain(
      "return embeddedAiRouteReady(screen) && screen.visibleText.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY);",
    );
  });

  it("does not report completed Android AI output as an unsubmitted prompt", () => {
    const runner = source();

    expect(runner).toContain("function aiOutputProofSubmitted");
    expect(runner).toContain("function requestOutputProofSubmitted");
    expect(runner).toContain("requestOutputProofSubmitted({");
    expect(runner).toContain("outputEvidenceComplete(params.outputText, params.testCase)");
    expect(runner).toContain("const promptSubmitted");
    expect(runner).toContain("prompt_submitted: promptSubmitted");
    expect(runner).not.toContain("prompt_submitted: routeMarkerProven");
  });

  it("uses only registered canonical route URIs during canonical replay", () => {
    const runner = source();

    expect(runner).toContain("return [buildUri(testCase)]");
    expect(runner).not.toContain('buildUri(testCase, "scheme")');
    expect(runner).not.toContain('buildUri(testCase, "tabs")');
    expect(runner).not.toContain('rik:///%28tabs%29/ai?${query.toString()}');
    expect(runner).not.toContain('rik:///%28tabs%29/request?${query.toString()}');
  });
});
