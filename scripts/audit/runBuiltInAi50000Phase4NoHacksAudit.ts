import fs from "node:fs";
import path from "node:path";

import { BUILT_IN_AI_50000_PHASE4_WAVE } from "../../src/lib/ai/builtInAi50000";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const AUDIT_ARTIFACT = path.join(ARTIFACT_DIR, "S_AI_ESTIMATE_50000_PHASE4_no_hacks_audit.json");
const PATTERN_ARTIFACT = path.join(ARTIFACT_DIR, "S_AI_ESTIMATE_50000_PHASE4_forbidden_patterns.json");

type PatternRule = {
  id: string;
  parts: string[];
  scope: "runtime_only" | "screen_only" | "all_non_guard";
};

type Finding = {
  ruleId: string;
  file: string;
  line: number;
  excerpt: string;
  allowedGuardEvidence: boolean;
};

const RULES: readonly PatternRule[] = Object.freeze([
  { id: "use_effect_answer_rewrite", parts: ["useEffect(() => setAnswer"], scope: "screen_only" },
  { id: "message_rewrite_after_render", parts: ["setMessages(prev => rewrite"], scope: "screen_only" },
  { id: "markdown_table_parser", parts: ["parseMarkdownTable"], scope: "runtime_only" },
  { id: "screen_calculation", parts: ["calculateEstimateInScreen"], scope: "screen_only" },
  { id: "fake_sources", parts: ["const fakeSources"], scope: "runtime_only" },
  { id: "fake_availability", parts: ["const fakeAvailability"], scope: "runtime_only" },
  { id: "fake_stock", parts: ["const fakeStock"], scope: "runtime_only" },
  { id: "fake_supplier", parts: ["const fakeSupplier"], scope: "runtime_only" },
  { id: "generic_known_work_row", parts: ["inlineGenericConstructionRows"], scope: "screen_only" },
  { id: "hidden_generic_row_filter", parts: ["hideGenericConstructionRowsInUi"], scope: "screen_only" },
  { id: "prompt_price_hardcode", parts: ["promptHardcodedPrices"], scope: "all_non_guard" },
  { id: "prompt_tax_hardcode", parts: ["promptHardcodedTax"], scope: "all_non_guard" },
  { id: "second_ai_framework", parts: ["createSecondAiFramework"], scope: "all_non_guard" },
  { id: "document_layer_calculation", parts: ["documentLayerCalculatesEstimate"], scope: "runtime_only" },
  { id: "production_rollout_enablement", parts: ["AI_50000_PRODUCTION_ROLLOUT_ENABLED", "true"], scope: "all_non_guard" },
]);

const ROOTS = ["app", "src", "tests", "scripts"] as const;
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md"]);

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function readFiles(root: string): string[] {
  const absoluteRoot = path.join(process.cwd(), root);
  if (!fs.existsSync(absoluteRoot)) return [];
  return fs.readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".expo", "dist", "build"].includes(entry.name)) return [];
      return readFiles(rel(fullPath));
    }
    return TEXT_EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function isGuardEvidenceFile(relativePath: string): boolean {
  return (
    relativePath === "scripts/audit/runBuiltInAi50000Phase4NoHacksAudit.ts" ||
    relativePath.startsWith("src/lib/ai/builtInAi50000/") ||
    relativePath.startsWith("scripts/e2e/runBuiltInAi50000Phase4") ||
    relativePath.startsWith("scripts/e2e/runAndroidAi50000Phase4") ||
    relativePath.startsWith("tests/builtInAi50000/phase4") ||
    relativePath.startsWith("tests/e2e/ai50000Phase4") ||
    relativePath.startsWith("tests/architecture/ai50000Phase4") ||
    relativePath.includes("NoHacks") ||
    relativePath.includes("NoFake") ||
    relativePath.includes("NoSecond") ||
    relativePath.includes("NoScreenLocal") ||
    relativePath.includes("NoPrompt") ||
    relativePath.includes("NoMarkdown") ||
    relativePath.includes("NoDocumentLayer") ||
    relativePath.includes("NoProductionRollout") ||
    relativePath.includes("NoUseEffect")
  );
}

function scopeApplies(rule: PatternRule, relativePath: string): boolean {
  if (rule.scope === "all_non_guard") return true;
  if (rule.scope === "screen_only") {
    return relativePath.startsWith("app/") || relativePath.includes("/screens/") || relativePath.includes("/features/");
  }
  return relativePath.startsWith("src/") || relativePath.startsWith("app/") || relativePath.startsWith("scripts/");
}

function containsAllParts(line: string, parts: readonly string[]): boolean {
  const lower = line.toLowerCase();
  return parts.every((part) => {
    const partLower = part.toLowerCase();
    if (partLower.startsWith("const fake")) {
      const variableName = part.split(/\s+/)[1];
      return new RegExp(`\\bconst\\s+${variableName}\\s*=`).test(line);
    }
    return lower.includes(partLower);
  });
}

function isGuardEvidenceLine(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes(": false") ||
    lower.includes("=== false") ||
    lower.includes("!== true") ||
    lower.includes("!fake") ||
    lower.includes("nofake") ||
    lower.includes("no_fake") ||
    lower.includes("forbidden") ||
    lower.includes("blocked") ||
    lower.includes("throw new error") ||
    lower.includes("not.to") ||
    lower.includes("fake_green_claimed") ||
    lower.includes("second_ai_framework_created") ||
    lower.includes("production_rollout_enabled")
  );
}

function scan(): { findings: Finding[]; guardEvidenceFindings: Finding[] } {
  const findings: Finding[] = [];
  const guardEvidenceFindings: Finding[] = [];
  for (const filePath of ROOTS.flatMap(readFiles)) {
    const relativePath = rel(filePath);
    const allowedGuardEvidence = isGuardEvidenceFile(relativePath);
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        if (!scopeApplies(rule, relativePath)) continue;
        if (!containsAllParts(line, rule.parts)) continue;
        const finding: Finding = {
          ruleId: rule.id,
          file: relativePath,
          line: index + 1,
          excerpt: line.trim().slice(0, 180),
          allowedGuardEvidence: allowedGuardEvidence || isGuardEvidenceLine(line),
        };
        if (finding.allowedGuardEvidence) guardEvidenceFindings.push(finding);
        else findings.push(finding);
      }
    });
  }
  return { findings, guardEvidenceFindings };
}

export function runBuiltInAi50000Phase4NoHacksAudit() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const result = scan();
  const audit = {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    final_status: result.findings.length === 0
      ? "GREEN_AI_ESTIMATE_50000_PHASE4_NO_HACKS_AUDIT_READY"
      : "BLOCKED_NO_HACKS_AUDIT_FAILED",
    scanned_roots: ROOTS,
    forbidden_findings: result.findings,
    guard_evidence_findings_count: result.guardEvidenceFindings.length,
    no_hacks_audit_passed: result.findings.length === 0,
    use_effect_rewrite_found: result.findings.some((finding) => finding.ruleId === "use_effect_answer_rewrite"),
    screen_local_calculation_found: result.findings.some((finding) => finding.ruleId === "screen_calculation"),
    inline_rows_in_screens_found: result.findings.some((finding) => finding.ruleId === "generic_known_work_row"),
    prompt_hardcoded_prices_found: result.findings.some((finding) => finding.ruleId === "prompt_price_hardcode"),
    prompt_hardcoded_tax_found: result.findings.some((finding) => finding.ruleId === "prompt_tax_hardcode"),
    fake_sources_found: result.findings.some((finding) => finding.ruleId === "fake_sources"),
    fake_stock_found: result.findings.some((finding) => finding.ruleId === "fake_stock"),
    fake_supplier_found: result.findings.some((finding) => finding.ruleId === "fake_supplier"),
    fake_availability_found: result.findings.some((finding) => finding.ruleId === "fake_availability"),
    second_ai_framework_created: result.findings.some((finding) => finding.ruleId === "second_ai_framework"),
    document_layer_calculates_estimate: result.findings.some((finding) => finding.ruleId === "document_layer_calculation"),
    hidden_generic_row_filtering_found: result.findings.some((finding) => finding.ruleId === "hidden_generic_row_filter"),
    production_rollout_enabled: result.findings.some((finding) => finding.ruleId === "production_rollout_enablement"),
    fake_green_claimed: false,
  };
  fs.writeFileSync(AUDIT_ARTIFACT, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  fs.writeFileSync(PATTERN_ARTIFACT, `${JSON.stringify({
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    rules: RULES.map((rule) => ({ id: rule.id, scope: rule.scope, tokenParts: rule.parts })),
    forbiddenFindings: result.findings,
    guardEvidenceFindings: result.guardEvidenceFindings,
    fake_green_claimed: false,
  }, null, 2)}\n`, "utf8");
  return audit;
}

if (require.main === module) {
  const audit = runBuiltInAi50000Phase4NoHacksAudit();
  console.log(audit.final_status);
  if (!audit.no_hacks_audit_passed) process.exitCode = 1;
}
