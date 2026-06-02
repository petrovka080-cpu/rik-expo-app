import { expect, test } from "playwright/test";

import {
  collectPdfChecks,
  findCheck,
} from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

test.describe("PDF open all roles reality", () => {
  test("proves request PDF binary and role-scoped viewer transport", () => {
    expect(findCheck(collectPdfChecks(), "request_estimate_pdf_real_table_binary").passed).toBe(true);
    expect(findCheck(collectPdfChecks(), "request_pdf_transport_uses_signed_viewer_route").passed).toBe(true);
    expect(findCheck(collectPdfChecks(), "pdf_transport_all_roles_have_origin_scope").passed).toBe(true);
  });
});
