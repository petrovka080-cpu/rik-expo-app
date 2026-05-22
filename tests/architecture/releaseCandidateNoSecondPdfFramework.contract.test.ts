import fs from "node:fs";
import path from "node:path";

describe("release candidate PDF framework boundary", () => {
  it("does not create a second PDF framework for release readiness", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/enterpriseReleaseCandidate.shared.ts"), "utf8");
    expect(source).not.toMatch(/new\s+Pdf|pdfkit|jspdf|second\s+pdf/i);
    expect(source).toContain("pdf_open_ready");
  });
});

