import { collectPdfChecks, expectCheckPassed } from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("request estimate PDF table lock", () => {
  it("generates a real structured PDF table with readable Cyrillic text", () => {
    const check = expectCheckPassed(collectPdfChecks(), "request_estimate_pdf_real_table_binary");

    expect(check.details).toMatchObject({
      binaryHeader: "%PDF-",
      cyrillicReadable: true,
      mojibakeFound: false,
    });
    expect(Number(check.details?.byteLength)).toBeGreaterThan(1000);
  });
});
