import { readAuditJson } from "../pdfAudit/pdfArchAuditTestHelpers";

describe("PDF architecture audit web evidence", () => {
  it("does not allow green audit without web viewer evidence", () => {
    const web = readAuditJson<{
      status: string;
      web_visual_audit_completed: boolean;
      screenshotPath?: string;
      pdfPath?: string;
      classification?: string;
      fake_green_claimed: boolean;
    }>("S_ESTIMATE_PDF_ARCH_AUDIT_web_screenshots.json");
    const matrix = readAuditJson<Record<string, unknown>>("S_ESTIMATE_PDF_ARCH_AUDIT_matrix.json");

    expect(web.status).toBe("GREEN_WEB_PDF_ARCH_AUDIT_READY");
    expect(web.web_visual_audit_completed).toBe(true);
    expect(web.screenshotPath).toMatch(/estimate-pdf-arch-audit\/web\/.+\.png$/);
    expect(web.pdfPath).toMatch(/estimate-pdf-arch-audit\/.+\.pdf$/);
    expect(web.classification).not.toBe("ENTERPRISE_TABULAR_DOCUMENT");
    expect(web.fake_green_claimed).toBe(false);
    expect(matrix.web_visual_audit_completed).toBe(true);
  });
});
