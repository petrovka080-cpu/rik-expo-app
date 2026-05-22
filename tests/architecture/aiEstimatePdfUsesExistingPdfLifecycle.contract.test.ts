import * as fs from "fs";
import * as path from "path";

describe("AI estimate PDF existing lifecycle contract", () => {
  it("uses existing consumer PDF service and /pdf-viewer open boundary", () => {
    const service = fs.readFileSync(path.resolve(process.cwd(), "src/lib/ai/estimatePdf/estimatePdfActionService.ts"), "utf8");

    expect(service).toContain("generateConsumerRepairRequestPdf");
    expect(service).toContain("openConsumerRepairRequestPdf");
    expect(service).toContain('route: "/pdf-viewer"');
  });
});
