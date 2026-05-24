import { PDF_ARCH_AUDIT_WAVE, readAuditJson } from "./pdfArchAuditTestHelpers";

type Entry = {
  route: string;
  sourceObject: string;
  rendererModule: string;
  viewerRoute: string;
  usesMarkdownAsTruth: boolean;
  status: string;
};

describe("PDF architecture audit entrypoints", () => {
  it("maps every required PDF entrypoint without unknown sources", () => {
    const artifact = readAuditJson<{ wave: string; entrypoints: Entry[] }>(
      "S_ESTIMATE_PDF_ARCH_AUDIT_entrypoints.json",
    );
    expect(artifact.wave).toBe(PDF_ARCH_AUDIT_WAVE);
    const routes = artifact.entrypoints.map((entry) => entry.route);
    expect(routes).toEqual(expect.arrayContaining([
      "/chat",
      "/ai?context=foreman",
      "/request",
      "/pdf-viewer",
      "procurement/proposal PDF path",
      "Android PDF handoff/native viewer",
    ]));
    for (const entry of artifact.entrypoints) {
      expect(entry.sourceObject).toBeTruthy();
      expect(entry.sourceObject).not.toBe("unknown");
      expect(entry.rendererModule).toBeTruthy();
      expect(entry.viewerRoute).toBeTruthy();
      expect(entry.usesMarkdownAsTruth).toBe(false);
      expect(["ok", "weak", "broken", "unknown"]).toContain(entry.status);
    }
  });
});
