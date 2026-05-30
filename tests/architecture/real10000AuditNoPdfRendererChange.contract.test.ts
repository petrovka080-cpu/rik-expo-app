import { expectNoReal10000AuditPattern } from "./real10000AuditArchitectureTestHelpers";

test("Real10000 audit wave does not mutate the PDF renderer", () => {
  expectNoReal10000AuditPattern(/writeFileSync\([^)]*(estimatePdf|pdfRenderer)/i, "PDF renderer mutation");
});
