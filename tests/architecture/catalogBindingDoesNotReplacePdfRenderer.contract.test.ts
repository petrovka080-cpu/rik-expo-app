import { readProjectFile } from "./catalogBindingArchitectureTestHelpers";

describe("catalog binding does not replace PDF renderer", () => {
  it("keeps catalog binding as payload metadata, not a PDF renderer replacement", () => {
    expect(readProjectFile("src/lib/consumerRequests/consumerRequestPdfService.ts")).toContain("selectedCatalogItemId");
    expect(readProjectFile("src/lib/consumerRequests/consumerRequestPdfService.ts")).toContain("renderTextPdfDocument");
  });
});
