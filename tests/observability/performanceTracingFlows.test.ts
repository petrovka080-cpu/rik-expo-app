import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("performance tracing flow boundaries", () => {
  it("instruments the request/proposal list flow with a safe trace name", () => {
    const source = read("src/screens/director/director.proposals.repo.ts");

    expect(source).toContain('traceAsync(\n    "proposal.list.load"');
    expect(source).toContain('flow: "proposal_list_load"');
    expect(source).toContain('role: "director"');
  });

  it("instruments the proposal submit flow with a safe trace name", () => {
    const source = read("src/lib/catalog/catalog.proposalCreation.service.ts");

    expect(source).toContain('"proposal.submit"');
    expect(source).toContain('flow: "proposal_submit"');
    expect(source).toContain('role: "buyer"');
  });

  it("instruments the warehouse receive flow with a safe trace name", () => {
    const source = read("src/screens/warehouse/hooks/useWarehouseReceiveApply.ts");

    expect(source).toContain('"warehouse.receive.apply"');
    expect(source).toContain('flow: "warehouse_receive_apply"');
    expect(source).toContain('role: "warehouse"');
  });

  it("instruments the accountant payment flow with a safe trace name", () => {
    const source = read("src/lib/api/accountant.ts");

    expect(source).toContain('"accountant.payment.apply"');
    expect(source).toContain('flow: "accountant_payment_apply"');
    expect(source).toContain('role: "accountant"');
  });

  it("instruments the PDF/document flow with a safe trace name", () => {
    const source = read("src/lib/documents/pdfDocumentActions.ts");

    expect(source).toContain('"pdf.viewer.open"');
    expect(source).toContain('flow: "pdf_viewer_open"');
    expect(source).toContain('platform: "unknown"');
  });
});
