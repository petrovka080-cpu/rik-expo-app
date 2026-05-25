import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE";
const WAVE = "S_REQUEST_ESTIMATE_CATALOG_BOQ_LIVE_RELEASE_GATE_WEB_ANDROID_NO_HACKS_POINT_OF_NO_RETURN";

type RuleId =
  | "use_effect_rewrite"
  | "screen_local_calculation"
  | "inline_rows"
  | "hardcoded_foundation_patch"
  | "fake_catalog_item"
  | "fake_stock"
  | "fake_supplier"
  | "fake_availability"
  | "duplicate_catalog_service"
  | "second_ai_framework"
  | "pdf_renderer_global_replacement"
  | "fifty_k_enabled";

type Rule = {
  id: RuleId;
  pattern: RegExp;
  roots: readonly string[];
};

type Finding = {
  ruleId: RuleId;
  file: string;
  line: number;
  excerpt: string;
  allowedGuardEvidence: boolean;
};

const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md"]);
const SCAN_ROOTS = ["app", "src", "tests", "scripts"] as const;

const RULES: readonly Rule[] = Object.freeze([
  { id: "use_effect_rewrite", pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*set(?:Answer|Messages|Estimate|Draft)/, roots: ["app", "src"] },
  { id: "screen_local_calculation", pattern: /\bcalculateEstimateInScreen\b|\bscreenLocal(?:Estimate|Calculation)\b/, roots: ["app", "src"] },
  { id: "inline_rows", pattern: /\binline(?:Estimate|Foundation|Boq|BOQ)?Rows\b|\binlineGenericConstructionRows\b/, roots: ["app", "src"] },
  { id: "hardcoded_foundation_patch", pattern: /\bhardcodedFoundation(?:Only)?Patch\b|\bfoundationOnlyPatch\b/, roots: ["app", "src", "tests", "scripts"] },
  { id: "fake_catalog_item", pattern: /\bconst\s+fakeCatalogItem\s*=|\bfakeCatalogItem\s*:/, roots: ["app", "src"] },
  { id: "fake_stock", pattern: /\bconst\s+fakeStock\s*=|\bfakeStock\s*:/, roots: ["app", "src"] },
  { id: "fake_supplier", pattern: /\bconst\s+fakeSupplier\s*=|\bfakeSupplier\s*:/, roots: ["app", "src"] },
  { id: "fake_availability", pattern: /\bconst\s+fakeAvailability\s*=|\bfakeAvailability\s*:/, roots: ["app", "src"] },
  { id: "duplicate_catalog_service", pattern: /\bclass\s+CatalogItemsService\b|\bcreateCatalogItemsService\b/, roots: ["app", "src"] },
  { id: "second_ai_framework", pattern: /\bcreateSecondAiFramework\b|\bSecondAiFramework\b/, roots: ["app", "src", "tests", "scripts"] },
  { id: "pdf_renderer_global_replacement", pattern: /\breplaceLegacyPdfRendererGlobally\b|\bpdfRendererReplacedGlobally\b/, roots: ["app", "src", "tests", "scripts"] },
  { id: "fifty_k_enabled", pattern: /\bFULL_50K_GREEN_CLAIMED\s*=\s*true\b|\bfiftyKExpansionEnabled\s*[:=]\s*true\b/, roots: ["app", "src", "tests", "scripts"] },
]);

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function readFiles(root: string): string[] {
  const absoluteRoot = path.resolve(process.cwd(), root);
  if (!fs.existsSync(absoluteRoot)) return [];
  return fs.readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".expo", "dist", "build", "coverage"].includes(entry.name)) return [];
      return readFiles(rel(fullPath));
    }
    return TEXT_EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function isGuardEvidenceFile(relativePath: string): boolean {
  return (
    relativePath === "scripts/audit/runRequestEstimateCatalogBoqNoHacksAudit.ts" ||
    relativePath === "scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate.ts" ||
    relativePath.startsWith("tests/release/requestEstimateRelease") ||
    relativePath.includes("NoHacks") ||
    relativePath.includes("RejectsHacks") ||
    relativePath.includes("NoFake") ||
    relativePath.includes("NoSecond") ||
    relativePath.includes("NoScreenLocal") ||
    relativePath.includes("NoInline") ||
    relativePath.includes("DoesNotReplacePdf") ||
    relativePath.includes("DoesNotEnable50k")
  );
}

function isGuardEvidenceLine(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes(": false") ||
    lower.includes("=== false") ||
    lower.includes("!== true") ||
    lower.includes("not.to") ||
    lower.includes("rejects") ||
    lower.includes("forbidden") ||
    lower.includes("blocked") ||
    lower.includes("throw new error") ||
    lower.includes("fake_green_claimed")
  );
}

function scan(): { findings: Finding[]; guardEvidenceFindings: Finding[] } {
  const findings: Finding[] = [];
  const guardEvidenceFindings: Finding[] = [];
  for (const filePath of SCAN_ROOTS.flatMap(readFiles)) {
    const relativePath = rel(filePath);
    const allowedFile = isGuardEvidenceFile(relativePath);
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        if (!rule.roots.some((root) => relativePath.startsWith(`${root}/`))) continue;
        if (!rule.pattern.test(line)) continue;
        const finding: Finding = {
          ruleId: rule.id,
          file: relativePath,
          line: index + 1,
          excerpt: line.trim().slice(0, 200),
          allowedGuardEvidence: allowedFile || isGuardEvidenceLine(line),
        };
        if (finding.allowedGuardEvidence) guardEvidenceFindings.push(finding);
        else findings.push(finding);
      }
    });
  }
  return { findings, guardEvidenceFindings };
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runRequestEstimateCatalogBoqNoHacksAudit() {
  const result = scan();
  const forbiddenPatterns = RULES.map((rule) => ({
    id: rule.id,
    pattern: String(rule.pattern),
    roots: rule.roots,
  }));
  const audit = {
    wave: WAVE,
    final_status: result.findings.length === 0
      ? "GREEN_REQUEST_ESTIMATE_CATALOG_BOQ_NO_HACKS_AUDIT_READY"
      : "BLOCKED_REQUEST_ESTIMATE_CATALOG_BOQ_NO_HACKS_AUDIT_FAILED",
    scanned_roots: SCAN_ROOTS,
    forbidden_findings: result.findings,
    guard_evidence_findings_count: result.guardEvidenceFindings.length,
    use_effect_rewrite_found: result.findings.some((finding) => finding.ruleId === "use_effect_rewrite"),
    screen_local_calculation_found: result.findings.some((finding) => finding.ruleId === "screen_local_calculation"),
    inline_rows_in_screens_found: result.findings.some((finding) => finding.ruleId === "inline_rows"),
    hardcoded_foundation_patch_found: result.findings.some((finding) => finding.ruleId === "hardcoded_foundation_patch"),
    fake_catalog_items_found: result.findings.some((finding) => finding.ruleId === "fake_catalog_item"),
    fake_stock_found: result.findings.some((finding) => finding.ruleId === "fake_stock"),
    fake_supplier_found: result.findings.some((finding) => finding.ruleId === "fake_supplier"),
    fake_availability_found: result.findings.some((finding) => finding.ruleId === "fake_availability"),
    duplicate_catalog_service_found: result.findings.some((finding) => finding.ruleId === "duplicate_catalog_service"),
    second_ai_framework_created: result.findings.some((finding) => finding.ruleId === "second_ai_framework"),
    pdf_renderer_replaced_globally: result.findings.some((finding) => finding.ruleId === "pdf_renderer_global_replacement"),
    fifty_k_expansion_enabled: result.findings.some((finding) => finding.ruleId === "fifty_k_enabled"),
    no_hacks_audit_passed: result.findings.length === 0,
    fake_green_claimed: false,
  };
  writeJson("no_hacks_audit", audit);
  writeJson("forbidden_patterns", {
    wave: WAVE,
    forbidden_patterns: forbiddenPatterns,
    forbidden_findings: result.findings,
    forbidden_patterns_found: result.findings.length > 0,
    fake_green_claimed: false,
  });
  return audit;
}

if (require.main === module) {
  const audit = runRequestEstimateCatalogBoqNoHacksAudit();
  console.log(audit.final_status);
  if (!audit.no_hacks_audit_passed) {
    console.error(JSON.stringify(audit.forbidden_findings, null, 2));
    process.exitCode = 1;
  }
}
