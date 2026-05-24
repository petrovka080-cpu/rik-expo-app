import { PDF_ARCH_AUDIT_WAVE, readAuditJson } from "./pdfArchAuditTestHelpers";

type LayoutArtifact = {
  wave: string;
  currentClassification: string;
  enterprise_tabular_layout_currently_present: boolean;
  plain_text_dump_detected: boolean;
  cases: Record<string, { classification: string; enterpriseRequirementsMet: boolean }>;
};

type PdfManifest = {
  items: { id: string; pdfPath: string; byteLength: number; classification: string }[];
};

describe("PDF architecture audit visual classification", () => {
  it("classifies current estimate PDF without claiming enterprise layout", () => {
    const layout = readAuditJson<LayoutArtifact>("S_ESTIMATE_PDF_ARCH_AUDIT_layout_quality.json");
    const manifest = readAuditJson<PdfManifest>("S_ESTIMATE_PDF_ARCH_AUDIT_pdf_manifest.json");
    const text = readAuditJson<{ items: Record<string, unknown> }>(
      "S_ESTIMATE_PDF_ARCH_AUDIT_pdf_text_extract.json",
    );

    expect(layout.wave).toBe(PDF_ARCH_AUDIT_WAVE);
    expect(layout.currentClassification).toBe("PLAIN_TEXT_DUMP");
    expect(layout.enterprise_tabular_layout_currently_present).toBe(false);
    expect(layout.plain_text_dump_detected).toBe(true);
    expect(manifest.items).toHaveLength(6);
    expect(Object.keys(text.items)).toHaveLength(6);
    for (const item of manifest.items) {
      expect(item.pdfPath).toMatch(/^artifacts\/pdf\/estimate-pdf-arch-audit\/.+\.pdf$/);
      expect(item.byteLength).toBeGreaterThan(1000);
      expect(item.classification).toBe("PLAIN_TEXT_DUMP");
      expect(layout.cases[item.id]?.enterpriseRequirementsMet).toBe(false);
    }
  });
});
