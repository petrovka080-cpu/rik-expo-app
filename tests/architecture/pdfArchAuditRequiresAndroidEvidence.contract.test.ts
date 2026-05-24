import { readAuditJson } from "../pdfAudit/pdfArchAuditTestHelpers";

describe("PDF architecture audit Android evidence", () => {
  it("does not allow green audit without Android viewer evidence", () => {
    const android = readAuditJson<{
      status: string;
      android_visual_audit_completed: boolean;
      pdf_action_clicked?: boolean;
      pdf_viewer_android_opened?: boolean;
      screenshots?: string[];
      uiDumps?: string[];
      fake_green_claimed: boolean;
    }>("S_ESTIMATE_PDF_ARCH_AUDIT_android_screenshots.json");
    const matrix = readAuditJson<Record<string, unknown>>("S_ESTIMATE_PDF_ARCH_AUDIT_matrix.json");

    expect(android.status).toBe("GREEN_ANDROID_PDF_ARCH_AUDIT_READY");
    expect(android.android_visual_audit_completed).toBe(true);
    expect(android.pdf_action_clicked).toBe(true);
    expect(android.pdf_viewer_android_opened).toBe(true);
    expect(android.screenshots?.length).toBeGreaterThan(0);
    expect(android.uiDumps?.length).toBeGreaterThan(0);
    expect(android.fake_green_claimed).toBe(false);
    expect(matrix.android_visual_audit_completed).toBe(true);
  });
});
