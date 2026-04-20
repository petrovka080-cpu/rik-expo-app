import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(__dirname, "..", "..", "supabase", "functions", "warehouse-pdf", "index.ts"),
  "utf8",
);

describe("PDF-Z3 warehouse incoming register artifact cache", () => {
  it("checks a deterministic storage artifact before starting Puppeteer render", () => {
    const selectedPath = source.indexOf("async function renderIncomingRegisterWithArtifactCache");
    const artifactCheck = source.indexOf(
      "const cachedArtifact = await trySignExistingPdfArtifact",
      selectedPath,
    );
    const renderStart = source.indexOf(
      "const { pdfBytes, renderer } = await renderPdfBytes(html)",
      selectedPath,
    );

    expect(selectedPath).toBeGreaterThan(0);
    expect(artifactCheck).toBeGreaterThan(selectedPath);
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

  it("keeps the Z3 scope to one warehouse document kind", () => {
    expect(source).toContain('payload.documentKind === "incoming_register"');
    expect(source).not.toContain('payload.documentKind === "issue_materials"');
    expect(source).not.toContain('payload.documentKind === "object_work" &&');
  });
});
