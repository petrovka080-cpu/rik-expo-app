import { collectPdfChecks, expectCheckPassed } from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("PDF request transport across roles", () => {
  it("keeps request, foreman, and director PDF viewer transport scoped by document type and origin", () => {
    expectCheckPassed(collectPdfChecks(), "request_pdf_transport_uses_signed_viewer_route");
    expectCheckPassed(collectPdfChecks(), "pdf_transport_all_roles_have_origin_scope");
  });
});
