import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

const replayHarnessSource = [
  "scripts/e2e/androidAdbDeviceHealth.ts",
  "scripts/e2e/runAndroidEmulatorAdbUnblockReplayB2cExpandedEstimateFix.ts",
  "scripts/e2e/runAndroidB2cRequestEmbeddedAiExpandedEstimateFixSmoke.ts",
].map(readRepoFile).join("\n");

describe("Android emulator replay wave: no PDF renderer change", () => {
  it("checks PDF action visibility without importing or replacing PDF renderers", () => {
    expect(replayHarnessSource).not.toMatch(/src\/lib\/pdf|src\/lib\/estimatePdf|generateAiEstimatePdf/);
    expect(replayHarnessSource).not.toMatch(/pdfMake|jspdf|PDFDocument/);
  });
});
