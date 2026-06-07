import {
  getEnterpriseVisible1000Artifacts,
  readEnterpriseVisible1000PdfActionCases,
  readEnterpriseVisible1000ProductCases,
} from "./enterpriseVisible1000TestHelpers";

describe("enterprise visible 1000 product and PDF action cases", () => {
  it("keeps product search source-backed and PDF action routed", () => {
    const { matrix } = getEnterpriseVisible1000Artifacts();
    const productCases = readEnterpriseVisible1000ProductCases();
    const pdfActionCases = readEnterpriseVisible1000PdfActionCases();

    expect(productCases).toHaveLength(28);
    expect(productCases.every((testCase) => testCase.sourceBacked === true)).toBe(true);
    expect(productCases.every((testCase) => testCase.hasSourceEvidence === true)).toBe(true);
    expect(productCases.every((testCase) => testCase.noFakeStock === true)).toBe(true);
    expect(productCases.every((testCase) => testCase.noFakeAvailability === true)).toBe(true);
    expect(productCases.every((testCase) => testCase.fakeSupplierFound === false)).toBe(true);
    expect(pdfActionCases).toHaveLength(1);
    expect(pdfActionCases.every((testCase) => testCase.accepted === true)).toBe(true);
    expect(matrix.product_source_evidence_present).toBe(true);
    expect(matrix.fake_stock_found).toBe(false);
    expect(matrix.fake_supplier_found).toBe(false);
    expect(matrix.fake_availability_found).toBe(false);
  });
});
