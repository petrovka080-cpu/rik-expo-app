import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core does not bundle a second PDF renderer", () => {
  const source = readDocumentEvidenceSources();
  expect(source).not.toMatch(/pdfjs|react-pdf|PDFRenderer|newPdfFramework/i);
  expect(source).toContain("/pdf-viewer");
});
