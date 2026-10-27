import { readFileSync } from "fs";
import { join } from "path";

describe("PDF runtime wiring", () => {
  it("keeps request/proposal/payment PDF paths out of lazy web chunk loading", () => {
    const generatorsSource = readFileSync(
      join(__dirname, "..", "documents", "pdfDocumentGenerators.ts"),
      "utf8",
    );
    const catalogApiSource = readFileSync(
      join(__dirname, "..", "catalog_api.ts"),
      "utf8",
    );

    expect(generatorsSource).not.toContain('import("../api/pdf_request")');
    expect(generatorsSource).not.toContain('import("../api/pdf_proposal")');
    expect(generatorsSource).not.toContain('import("../api/pdf_payment")');
    expect(generatorsSource).not.toContain('import("../api/paymentPdf.service")');
    expect(generatorsSource).toContain('import { exportRequestPdf } from "../api/pdf_request";');
    expect(generatorsSource).toContain('import { exportProposalPdf } from "../api/pdf_proposal";');
    expect(generatorsSource).toContain('import { exportPaymentOrderPdfContract } from "../api/pdf_payment";');
    expect(generatorsSource).toContain('import { preparePaymentOrderPdf } from "../api/paymentPdf.service";');
    expect(generatorsSource).toContain("getUri: () => exportRequestPdf(requestId)");
    expect(generatorsSource).toContain('getUri: () => exportProposalPdf(proposalId, "preview")');
    expect(generatorsSource).toContain("getUri: () => exportPaymentOrderPdfContract(prepared.contract)");

    expect(catalogApiSource).not.toContain('import("./api/pdf_request")');
    expect(catalogApiSource).not.toContain('import("./api/pdf_proposal")');
    expect(catalogApiSource).not.toContain('import("./api/pdf_payment")');
    expect(catalogApiSource).not.toContain('import("./documents/pdfDocumentGenerators")');
    expect(catalogApiSource).not.toContain("const mod = await import(\"./api/pdf_request\")");
    expect(catalogApiSource).not.toContain("const mod = await import(\"./api/pdf_proposal\")");
    expect(catalogApiSource).not.toContain("const mod = await import(\"./api/pdf_payment\")");
    expect(catalogApiSource).not.toContain("const mod = await import(\"./documents/pdfDocumentGenerators\")");
    expect(catalogApiSource).toContain("batchResolveRequestLabelsFromPdfRequest(ids)");
    expect(catalogApiSource).toContain("exportRequestPdfFromApi(requestId)");
    expect(catalogApiSource).toContain("generateRequestPdfDocumentDescriptor({");
    expect(catalogApiSource).toContain("buildProposalPdfHtmlFromApi(proposalId)");
    expect(catalogApiSource).toContain("exportProposalPdfFromApi(proposalId, mode)");
    expect(catalogApiSource).toContain("generateProposalPdfDocumentDescriptor({ proposalId, originModule })");
    expect(catalogApiSource).toContain("exportPaymentOrderPdfFromApi(Number(paymentId), draft)");
    expect(catalogApiSource).toContain("generatePaymentOrderPdfDocumentDescriptor({ paymentId, originModule })");
  });
});
