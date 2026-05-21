import * as fs from "fs";
import * as path from "path";

describe("consumer repair no fake PDF status architecture", () => {
  it("uploads and verifies PDF storage before exposing generated status", () => {
    const pdfService = fs.readFileSync(path.join(process.cwd(), "src/lib/consumerRequests/consumerRequestPdfService.ts"), "utf8");
    const storageService = fs.readFileSync(path.join(process.cwd(), "src/lib/consumerRequests/consumerRequestPdfStorage.ts"), "utf8");
    const screen = fs.readFileSync(path.join(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"), "utf8");

    expect(pdfService.indexOf("uploadConsumerRepairPdfObject")).toBeGreaterThanOrEqual(0);
    expect(pdfService.indexOf("uploadConsumerRepairPdfObject")).toBeLessThan(pdfService.indexOf("pdfStatus: \"generated\""));
    expect(pdfService).toContain("consumerRepairPdfStorageObjectExists");
    expect(pdfService).toContain("contentType: \"application/pdf\"");
    expect(storageService).toContain("invalid PDF bytes");
    expect(screen).not.toMatch(/pdfStatus\s*:\s*["']generated["']/);
  });
});
