import fs from "node:fs";
import path from "node:path";

import { readAuditJson } from "../pdfAudit/pdfArchAuditTestHelpers";

describe("PDF architecture audit no second AI framework", () => {
  it("plans only document rendering and does not add AI logic", () => {
    const matrix = readAuditJson<Record<string, unknown>>("S_ESTIMATE_PDF_ARCH_AUDIT_matrix.json");
    const plan = readAuditJson<{ notAnAiFramework: boolean; mustNotDo: string[] }>(
      "S_ESTIMATE_PDF_ARCH_AUDIT_document_engine_v2_integration_plan.json",
    );

    expect(matrix.second_ai_framework_created).toBe(false);
    expect(plan.notAnAiFramework).toBe(true);
    expect(plan.mustNotDo).toContain("do not duplicate AI logic");

    const engineDir = path.resolve(process.cwd(), "src/lib/documentEngine");
    if (!fs.existsSync(engineDir)) return;
    const files = fs.readdirSync(engineDir, { recursive: true })
      .map((file) => path.join(engineDir, String(file)))
      .filter((file) => fs.statSync(file).isFile())
      .map((file) => fs.readFileSync(file, "utf8"));
    expect(files.join("\n")).not.toMatch(/call\s*AI|openai|llm|estimate logic/i);
  });
});
