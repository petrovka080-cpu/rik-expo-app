import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(__dirname, "..", "..", "supabase", "functions", "foreman-request-pdf", "index.ts"),
  "utf8",
);

describe("PDF-Z4 foreman request artifact cache", () => {
  it("checks a deterministic storage artifact before starting Puppeteer render", () => {
    const artifactBuild = source.indexOf("const artifact = await buildForemanRequestManifestContract");
    const artifactCheck = source.indexOf("const cachedArtifact = await trySignExistingPdfArtifact");
    const renderStart = source.indexOf("const { pdfBytes, renderer } = await renderPdfBytes(html)");

    expect(artifactBuild).toBeGreaterThan(0);
    expect(artifactCheck).toBeGreaterThan(artifactBuild);
    expect(renderStart).toBeGreaterThan(artifactCheck);
    expect(source).toContain("storagePath: artifact.artifactPath");
  });

  it("exposes hit/miss telemetry and the artifact_cache renderer", () => {
    expect(source).toContain('renderer: "artifact_cache"');
    expect(source).toContain('cacheStatus: "artifact_hit"');
    expect(source).toContain('cacheStatus: "artifact_miss"');
    expect(source).toContain("sourceVersion: artifact.sourceVersion");
    expect(source).toContain("artifactVersion: artifact.artifactVersion");
  });

  it("keeps the Z4 server scope to the Foreman request PDF family", () => {
    expect(source).toContain('role: "foreman"');
    expect(source).toContain('documentType: "request"');
    expect(source).not.toContain("warehouse");
    expect(source).not.toContain("subcontract_report");
  });
});
