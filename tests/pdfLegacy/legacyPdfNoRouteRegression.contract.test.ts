import { readRepoFile } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("legacy PDF route contract", () => {
  it("keeps /pdf-viewer as the shared viewer route", () => {
    const route = readRepoFile("src/lib/pdf/pdfViewer.route.ts");
    const action = readRepoFile("src/lib/ai/estimatePdf/estimatePdfActionService.ts");
    expect(route).toContain("PdfViewerRouteParams");
    expect(action).toContain('route: "/pdf-viewer"');
  });
});
