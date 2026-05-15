import fs from "node:fs";
import path from "node:path";

describe("AI external cited market preview runner contract", () => {
  it("writes Wave05 artifacts and preserves no-fake/no-mutation runtime fields", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAiExternalCitedMarketPreviewMaestro.ts"),
      "utf8",
    );

    expect(source).toContain("GREEN_AI_CITED_EXTERNAL_MARKET_PREVIEW_READY");
    expect(source).toContain("artifacts\", wave");
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("runAiProcurementExternalIntelMaestro");
    expect(source).toContain("resolveAiProcurementRuntimeRequest");
    expect(source).toContain("external_live_fetch: false");
    expect(source).toContain("controlled_external_fetch_required: true");
    expect(source).toContain("uncontrolled_external_fetch: false");
    expect(source).toContain("fake_suppliers_created: false");
    expect(source).toContain("fake_external_results_created: false");
    expect(source).toContain("secrets_printed: false");
  });
});
