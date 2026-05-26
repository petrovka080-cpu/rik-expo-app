import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

const api34AcceptanceSources = [
  "scripts/e2e/ensureAndroidApi34DeviceReady.ts",
  "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts",
  "scripts/e2e/runAndroidB2cRequestEmbeddedAiExpandedEstimateFixSmoke.ts",
].map(readRepoFile).join("\n");

describe("Android API34 acceptance wave: no PDF change", () => {
  it("checks PDF action visibility without importing or replacing PDF renderers", () => {
    expect(api34AcceptanceSources).not.toMatch(/src\/lib\/pdf|src\/lib\/estimatePdf|generateAiEstimatePdf/);
    expect(api34AcceptanceSources).not.toMatch(/pdfMake|jspdf|PDFDocument/);
  });
});
