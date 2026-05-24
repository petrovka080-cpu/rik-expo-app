import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate legacy PDF protection", () => {
  it("keeps the existing request PDF service and pdf-viewer route contract", () => {
    const screen = readFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(screen).toContain("generateConsumerRepairRequestPdfForDraft");
    expect(screen).toContain('pathname: "/pdf-viewer"');
    expect(readFile("src/lib/consumerRequests/consumerRequestPdfService.ts")).toContain("renderTextPdfDocument");
  });
});
