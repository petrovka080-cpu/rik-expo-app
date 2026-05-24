import fs from "node:fs";
import path from "node:path";

import { readAuditJson } from "../pdfAudit/pdfArchAuditTestHelpers";

describe("PDF architecture audit no unified engine implementation", () => {
  it("allows a plan but no DocumentEngineV2 renderer code in this wave", () => {
    const matrix = readAuditJson<Record<string, unknown>>("S_ESTIMATE_PDF_ARCH_AUDIT_matrix.json");
    expect(matrix.new_document_engine_implemented).toBe(false);

    const engineDir = path.resolve(process.cwd(), "src/lib/documentEngine");
    if (!fs.existsSync(engineDir)) {
      expect(fs.existsSync(engineDir)).toBe(false);
      return;
    }

    const files = fs.readdirSync(engineDir, { recursive: true }).map(String);
    expect(files.some((file) => /render|template|engine|pdf/i.test(file))).toBe(false);
  });
});
