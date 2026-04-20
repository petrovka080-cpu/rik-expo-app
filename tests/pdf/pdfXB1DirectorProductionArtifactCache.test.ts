import fs from "fs";
import path from "path";

describe("PDF-X.B1 director production artifact cache", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "supabase/functions/director-production-report-pdf/index.ts"),
    "utf8",
  );

  it("checks a deterministic storage artifact before starting Puppeteer render", () => {
    const artifactCheck = source.indexOf("const cachedArtifact = await trySignExistingPdfArtifact");
    const renderStart = source.indexOf("const { pdfBytes, renderer } = await renderPdfBytes(html);");

    expect(artifactCheck).toBeGreaterThan(0);
    expect(renderStart).toBeGreaterThan(artifactCheck);
    expect(source).toContain("buildProductionArtifactContract");
    expect(source).toContain("director/production_report/artifacts/v1/");
  });

  it("exposes hit/miss telemetry and a cache renderer without changing the viewer boundary", () => {
    expect(source).toContain('renderer: "artifact_cache"');
    expect(source).toContain('cacheStatus: "artifact_hit"');
    expect(source).toContain('cacheStatus: "artifact_miss"');
    expect(source).not.toContain("pdf-viewer");
  });
});
