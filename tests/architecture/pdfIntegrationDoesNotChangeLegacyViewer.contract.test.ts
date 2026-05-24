import { readRepoFile } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("PDF integration viewer guard", () => {
  it("does not replace the shared /pdf-viewer contract", () => {
    const viewer = readRepoFile("app/pdf-viewer.tsx");
    const route = readRepoFile("src/lib/pdf/pdfViewer.route.ts");
    expect(viewer).toContain("PdfViewerScreenContent");
    expect(route).toContain("uri?: string | string[]");
    expect(route).toContain("resolvePdfViewerRouteModel");
  });
});
