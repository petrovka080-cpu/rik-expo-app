import { readFileSync } from "fs";
import { join } from "path";

describe("accountant screen boundaries", () => {
  it("keeps accountant document preview on descriptor-owned sources and removes silent picker cleanup swallows", () => {
    const pickAnyFileSource = readFileSync(join(__dirname, "pickAnyFile.ts"), "utf8");
    const docsSource = readFileSync(join(__dirname, "accountant.docs.ts"), "utf8");
    const useDocumentsSource = readFileSync(join(__dirname, "useAccountantDocuments.ts"), "utf8");
    const paymentPdfBoundarySource = readFileSync(join(__dirname, "accountant.paymentPdf.boundary.ts"), "utf8");

    expect(pickAnyFileSource).not.toContain("catch {}");
    expect(pickAnyFileSource).toContain("picker_cleanup_failed");

    expect(docsSource).not.toContain("getRemoteUrl: () =>");
    expect(useDocumentsSource).not.toContain("getRemoteUrl: () =>");
    expect(paymentPdfBoundarySource).not.toContain("getRemoteUrl: () =>");

    expect(useDocumentsSource).toContain("prepareAndPreviewPdfDocument");
    expect(paymentPdfBoundarySource).toContain("prepareAndPreviewPdfDocument");
  });
});
