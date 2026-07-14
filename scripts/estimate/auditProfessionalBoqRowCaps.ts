import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { detectForbiddenProfessionalBoqRowCapInText } from "../../src/lib/estimate/professionalBoqDepthPolicy";

export const GREEN_PROFESSIONAL_BOQ_ROW_CAP_AUDIT = "GREEN_PROFESSIONAL_BOQ_ROW_CAP_AUDIT" as const;
export const STOP_PROFESSIONAL_BOQ_ROW_CAP_AUDIT_FAILED = "STOP_PROFESSIONAL_BOQ_ROW_CAP_AUDIT_FAILED" as const;

const SCAN_ROOTS = [
  "scripts/estimate",
  "scripts/e2e",
  "src/lib/ai",
  "src/lib/estimate",
  "src/lib/platform",
  "src/features/estimates",
  "src/features/requests",
  "src/features/pdf",
  "src/features/procurement",
  "data/estimate",
  "tests/estimateNorms",
  "tests/estimateCalculator",
  "tests/estimateRuntime",
  "tests/estimateRegression",
  "tests/estimateNPlus",
  "tests/estimateExpandedComplex",
  "tests/estimateInfrastructure",
  "tests/requestEstimate",
  "tests/officeEstimate",
  "package.json",
];

type RowCapFinding = {
  file: string;
  line: number;
  text: string;
  surface: "main_ui_preview" | "forbidden";
};

function sourceFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const stat = statSync(root);
  if (stat.isFile()) return [root];
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const nextStat = statSync(fullPath);
      if (nextStat.isDirectory()) visit(fullPath);
      else if (/\.(?:ts|tsx|js|json)$/.test(entry)) files.push(fullPath);
    }
  };
  visit(root);
  return files;
}

function surfaceFor(file: string, text: string): RowCapFinding["surface"] {
  if (/professionalBoqSectionPolicy|ProfessionalBoqGroupedMainView|MAIN_UI|main_ui/i.test(`${file}\n${text}`)) {
    return "main_ui_preview";
  }
  return "forbidden";
}

export function auditProfessionalBoqRowCaps() {
  const findings: RowCapFinding[] = [];
  for (const file of SCAN_ROOTS.flatMap(sourceFiles)) {
    const content = readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((lineText, index) => {
      if (!detectForbiddenProfessionalBoqRowCapInText(lineText)) return;
      findings.push({
        file: file.replace(/\\/g, "/"),
        line: index + 1,
        text: lineText.trim(),
        surface: surfaceFor(file, lineText),
      });
    });
  }
  const forbidden = findings.filter((item) => item.surface === "forbidden");
  return {
    final_status: forbidden.length === 0
      ? GREEN_PROFESSIONAL_BOQ_ROW_CAP_AUDIT
      : STOP_PROFESSIONAL_BOQ_ROW_CAP_AUDIT_FAILED,
    row_cap_audit_created: true,
    backend_row_cap_45_count: forbidden.filter((item) => /calculator|backend|compile|build/i.test(item.file)).length,
    snapshot_row_cap_count: forbidden.filter((item) => /snapshot/i.test(item.file)).length,
    pdf_row_cap_count: forbidden.filter((item) => /pdf/i.test(item.file)).length,
    buyer_handoff_row_cap_count: forbidden.filter((item) => /buyer|procurement/i.test(item.file)).length,
    detail_drawer_row_cap_count: forbidden.filter((item) => /drawer|detail/i.test(item.file)).length,
    main_ui_preview_cap_allowed: true,
    forbidden_findings_count: forbidden.length,
    findings,
    blockers: forbidden.map((item) => `${item.file}:${item.line}:${item.text}`),
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditProfessionalBoqRowCaps.ts")) {
  const result = auditProfessionalBoqRowCaps();
  console.log(JSON.stringify(result, null, 2));
  if (result.final_status === STOP_PROFESSIONAL_BOQ_ROW_CAP_AUDIT_FAILED) process.exitCode = 1;
}
