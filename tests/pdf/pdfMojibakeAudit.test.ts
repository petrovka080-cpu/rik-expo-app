import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..", "..");

const PDF_PRODUCTION_FILES = [
  "app/pdf-viewer.tsx",
  "src/lib/documents/pdfDocumentActions.ts",
  "src/lib/api/pdf_director.data.ts",
  "src/lib/api/pdf_proposal.ts",
  "src/lib/pdf/directorProductionReport.shared.ts",
  "src/screens/warehouse/warehouse.incomingForm.pdf.service.ts",
  "src/screens/warehouse/warehouse.dayMaterialsReport.pdf.service.ts",
  "src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.service.ts",
  "src/screens/warehouse/warehouse.objectWorkReport.pdf.service.ts",
  "supabase/functions/_shared/foremanRequestPdfHtml.ts",
  "scripts/director_finance_supplier_pdf_web_click_verify.ts",
  "scripts/director_pdf_render_web_click_verify.ts",
] as const;

const KNOWN_BAD_PDF_MOJIBAKE_PATTERNS = [
  /\u0420[\u00a0\u00b0\u00b1\u00bb\u2018\u201c\u201d\u040e\u045b\u045c\u0459\u045f]/u,
  /\u0421[\u2018\u201a\u201c\u201d\u0453\u045c]/u,
  /\u0432[\u0402\u201e]/u,
  /\u0412\u00b7/u,
  /\ufffd/u,
] as const;

describe("PDF mojibake audit", () => {
  for (const relativePath of PDF_PRODUCTION_FILES) {
    it(`${relativePath} does not contain known mojibake markers`, () => {
      const source = readFileSync(join(ROOT, relativePath), "utf8");

      for (const pattern of KNOWN_BAD_PDF_MOJIBAKE_PATTERNS) {
        expect(source).not.toMatch(pattern);
      }
    });
  }
});
