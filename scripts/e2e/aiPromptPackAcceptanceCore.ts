import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas/validateConstructionUnitSemantics";
import { buildEstimatePresentationViewModel, validateNoMojibakeInEstimateViewModel } from "../../src/lib/ai/estimatePresentation";
import { resolveEstimatorOutcome, resolveRequestCategoryOverridePolicy } from "../../src/lib/ai/estimatorKernel";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { createEstimatePdf, extractEstimatePdfTextForProof, validateNoPdfMojibake } from "../../src/lib/estimatePdf";

export type ExactPromptPackConfig = {
  artifactDirName: string;
  fixtureFileName: string;
  sourceFileName: string;
  wave: string;
  greenStatus: string;
  blockedStatus: string;
  expectedTotalPrompts: number;
  expectedDomainsTotal: number;
  expectedFirstId: string;
  expectedLastId: string;
  pdfSampleCases: number;
  envPrefix: string;
};

type ExactPromptItem = {
  id: string;
  domain: string;
  prompt: string;
};

type SourceMetadata = {
  wave?: string;
  source_attachment?: string;
  source_tz_attachment?: string;
  raw_attachment_sha256?: string;
  repaired_json_sha256?: string;
  repaired_first_missing_array_bracket?: boolean;
  total_prompts?: number;
  unique_ids?: number;
  unique_prompts?: number;
  duplicate_prompt_count?: number;
  duplicate_prompts?: { prompt: string; count: number }[];
  domains_total?: number;
  first_id?: string;
  last_id?: string;
};

type HardFailClass =
  | "BLOCKED_MANUAL_FALLBACK_FOR_CONSTRUCTION_LIKE_WORK"
  | "BLOCKED_TEMPLATE_GAP_FOR_KNOWN_WORK"
  | "BLOCKED_OBJECT_CONFUSION_FOUND"
  | "BLOCKED_OPERATION_CONFUSION_FOUND"
  | "BLOCKED_METHOD_CONFUSION_FOUND"
  | "BLOCKED_WEAK_GENERIC_ROWS_FOUND"
  | "BLOCKED_UNIT_SEMANTICS_FAILED"
  | "BLOCKED_CATEGORY_OVERRIDE_CAUSED_TEMPLATE_GAP"
  | "BLOCKED_ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT"
  | "BLOCKED_EXACT_PROMPT_LOOKUP_FOUND"
  | "BLOCKED_PDF_STRUCTURED_TABLE_PAYLOAD_MISSING"
  | "BLOCKED_PDF_MOJIBAKE_FOUND"
  | "BLOCKED_UI_PDF_PARITY_FAILED"
  | "BLOCKED_QUALITY_SCORE_BELOW_THRESHOLD"
  | "BLOCKED_FIXTURE_FIDELITY_FAILED";

type FailureArtifact = {
  hardFailClass: HardFailClass;
  caseId?: string;
  prompt?: string;
  route?: string;
  reason: string;
  sourceFailure?: string;
  artifact?: string;
};

type RuntimeCaseResult = {
  caseId: string;
  domain: string;
  prompt: string;
  route: string;
  classification: string;
  frameDomain: string | null;
  frameObject: string | null;
  frameOperation: string | null;
  frameMethod: string | null;
  rowCount: number;
  runtimeTraceId: string | null;
  blockedBy?: string;
  fallbackUsed?: string;
  uiMojibakePassed: boolean;
  unitSemanticsPassed: boolean;
  weakGenericRowsFound: boolean;
  failures: string[];
};

type PdfCaseResult = {
  caseId: string;
  prompt: string;
  pdfChecked: boolean;
  pdfPassed: boolean;
  pdfFile?: string;
  failures: string[];
  textSample: string;
};

export const EXACT_PROMPT_PACK_FIXTURE_DIR = path.join(process.cwd(), "tests", "fixtures", "aiPromptPacks");

function routeFor(index: number): "/request" | "/ai?context=foreman" | "/ai?context=request" {
  if (index % 3 === 1) return "/ai?context=foreman";
  if (index % 3 === 2) return "/ai?context=request";
  return "/request";
}

function contextFor(route: string): "request" | "foreman" {
  return route.includes("foreman") ? "foreman" : "request";
}

function writeJson(artifactDir: string, name: string, value: unknown): string {
  fs.mkdirSync(artifactDir, { recursive: true });
  const filePath = path.join(artifactDir, name);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}

function writeText(artifactDir: string, name: string, value: string): string {
  fs.mkdirSync(artifactDir, { recursive: true });
  const filePath = path.join(artifactDir, name);
  fs.writeFileSync(filePath, value, "utf8");
  return filePath;
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fallback;
  }
}

function boolEnv(name: string): boolean {
  return /^(1|true|yes|green)$/i.test(process.env[name] ?? "");
}

function branchPushed(): boolean {
  const branch = gitOutput(["rev-parse", "--abbrev-ref", "HEAD"], "");
  if (!branch) return false;
  const upstream = gitOutput(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], "");
  if (!upstream) return false;
  return gitOutput(["rev-list", "--left-right", "--count", `${upstream}...${branch}`], "").startsWith("0\t0");
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

function readPack(config: ExactPromptPackConfig): {
  fixturePath: string;
  sourcePath: string;
  pack: ExactPromptItem[];
  source: SourceMetadata;
} {
  const fixturePath = path.join(EXACT_PROMPT_PACK_FIXTURE_DIR, config.fixtureFileName);
  const sourcePath = path.join(EXACT_PROMPT_PACK_FIXTURE_DIR, config.sourceFileName);
  const pack = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as ExactPromptItem[];
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as SourceMetadata;
  return { fixturePath, sourcePath, pack, source };
}

function duplicated(values: string[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

function validateFixtureFidelity(config: ExactPromptPackConfig, pack: ExactPromptItem[], source: SourceMetadata, fixturePath: string) {
  const domains = new Set(pack.map((item) => item.domain));
  const ids = pack.map((item) => item.id);
  const prompts = pack.map((item) => item.prompt);
  const duplicateIds = duplicated(ids);
  const duplicatePrompts = duplicated(prompts);
  const fixtureSha256 = sha256File(fixturePath);
  const failures: FailureArtifact[] = [];
  const checks = {
    fixture_file_name: config.fixtureFileName,
    fixture_sha256: fixtureSha256,
    fixture_sha256_matches_source_metadata: fixtureSha256 === source.repaired_json_sha256,
    source_raw_attachment_sha256: source.raw_attachment_sha256,
    source_repaired_json_sha256: source.repaired_json_sha256,
    source_attachment: source.source_attachment,
    source_tz_attachment: source.source_tz_attachment,
    source_repaired_first_missing_array_bracket: Boolean(source.repaired_first_missing_array_bracket),
    total_prompts: pack.length,
    expected_total_prompts: config.expectedTotalPrompts,
    domains_total: domains.size,
    expected_domains_total: config.expectedDomainsTotal,
    first_id: pack[0]?.id ?? null,
    expected_first_id: config.expectedFirstId,
    last_id: pack[pack.length - 1]?.id ?? null,
    expected_last_id: config.expectedLastId,
    unique_ids: new Set(ids).size,
    duplicate_id_count: duplicateIds.length,
    duplicate_ids: duplicateIds.slice(0, 20),
    unique_prompts: new Set(prompts).size,
    duplicate_prompt_count: duplicatePrompts.length,
    duplicate_prompt_text_found: duplicatePrompts.length > 0,
    duplicate_prompts: duplicatePrompts.slice(0, 20),
    source_duplicate_prompt_count: source.duplicate_prompt_count ?? null,
    source_duplicate_prompts: source.duplicate_prompts ?? [],
    exact_fixture_loaded_not_generated_real_diverse: true,
  };

  if (pack.length !== config.expectedTotalPrompts) {
    failures.push({ hardFailClass: "BLOCKED_FIXTURE_FIDELITY_FAILED", reason: `total_prompts:${pack.length}` });
  }
  if (domains.size !== config.expectedDomainsTotal) {
    failures.push({ hardFailClass: "BLOCKED_FIXTURE_FIDELITY_FAILED", reason: `domains_total:${domains.size}` });
  }
  if (pack[0]?.id !== config.expectedFirstId || pack[pack.length - 1]?.id !== config.expectedLastId) {
    failures.push({ hardFailClass: "BLOCKED_FIXTURE_FIDELITY_FAILED", reason: "first_or_last_id_mismatch" });
  }
  if (fixtureSha256 !== source.repaired_json_sha256) {
    failures.push({ hardFailClass: "BLOCKED_FIXTURE_FIDELITY_FAILED", reason: "fixture_sha256_mismatch" });
  }
  if (duplicateIds.length > 0) {
    failures.push({ hardFailClass: "BLOCKED_FIXTURE_FIDELITY_FAILED", reason: "duplicate_prompt_ids_found" });
  }

  return { checks, failures };
}

function weakGenericRowsFound(estimate: GlobalEstimateResult, visibleRows: string[]): boolean {
  const weakExact = new Set(["работы", "материалы", "прочее", "общестроительные работы", "строительные работы"]);
  const title = normalize(estimate.work.title);
  return visibleRows.some((row) => weakExact.has(normalize(row))) || title === "строительные работы";
}

function evaluateRuntimeCase(item: ExactPromptItem, index: number): RuntimeCaseResult {
  const route = routeFor(index);
  const context = contextFor(route);
  const failures: string[] = [];
  const outcome = resolveEstimatorOutcome({ text: item.prompt, currency: "KGS" });
  if (!outcome.plan) failures.push("TEMPLATE_GAP_FOR_KNOWN_WORK");
  for (const failure of outcome.failures) failures.push(failure);

  let estimate: GlobalEstimateResult | undefined;
  let runtimeTraceId: string | null = null;
  let blockedBy: string | undefined;
  let fallbackUsed: string | undefined;
  try {
    const answer = answerBuiltInAi({
      text: item.prompt,
      route,
      screenContext: context,
      role: context,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    runtimeTraceId = answer.runtimeTrace.traceId;
    blockedBy = answer.toolResult.blockedBy;
    fallbackUsed = answer.toolResult.fallbackUsed;
    if (answer.route.intent !== "estimate") failures.push("ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT");
    if (blockedBy || fallbackUsed) failures.push("MANUAL_FALLBACK_FOR_CONSTRUCTION_LIKE_WORK");
    estimate = answer.toolResult.estimate;
    if (!estimate) failures.push("TEMPLATE_GAP_FOR_KNOWN_WORK");
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  let rowCount = 0;
  let uiMojibakePassed = false;
  let unitSemanticsPassed = false;
  let genericRows = false;
  if (estimate) {
    const viewModel = buildEstimatePresentationViewModel(estimate);
    const visibleRows = viewModel.rows.map((row) => row.name);
    rowCount = visibleRows.length;
    uiMojibakePassed = validateNoMojibakeInEstimateViewModel(viewModel).passed;
    unitSemanticsPassed = validateConstructionUnitSemantics(estimate).passed;
    genericRows = weakGenericRowsFound(estimate, visibleRows);
    if (!uiMojibakePassed) failures.push("UI_MOJIBAKE_FOUND");
    if (!unitSemanticsPassed) failures.push("UNIT_SEMANTICS_FAILED");
    if (rowCount < 8 || genericRows) failures.push("WEAK_GENERIC_ROWS_FOUND");
  }

  return {
    caseId: item.id,
    domain: item.domain,
    prompt: item.prompt,
    route,
    classification: outcome.classification,
    frameDomain: outcome.plan?.semanticFrame.domain ?? null,
    frameObject: outcome.plan?.semanticFrame.object ?? null,
    frameOperation: outcome.plan?.semanticFrame.operation ?? null,
    frameMethod: outcome.plan?.semanticFrame.method ?? null,
    rowCount,
    runtimeTraceId,
    blockedBy,
    fallbackUsed,
    uiMojibakePassed,
    unitSemanticsPassed,
    weakGenericRowsFound: genericRows,
    failures: [...new Set(failures)],
  };
}

function hardFailClassFor(sourceFailure: string): HardFailClass {
  if (/MANUAL_FALLBACK/.test(sourceFailure)) return "BLOCKED_MANUAL_FALLBACK_FOR_CONSTRUCTION_LIKE_WORK";
  if (/TEMPLATE_GAP|SEMANTIC_FRAME|reasoning_plan_missing|UNKNOWN_NEEDS_TRACE/.test(sourceFailure)) return "BLOCKED_TEMPLATE_GAP_FOR_KNOWN_WORK";
  if (/OBJECT/.test(sourceFailure)) return "BLOCKED_OBJECT_CONFUSION_FOUND";
  if (/OPERATION/.test(sourceFailure)) return "BLOCKED_OPERATION_CONFUSION_FOUND";
  if (/METHOD/.test(sourceFailure)) return "BLOCKED_METHOD_CONFUSION_FOUND";
  if (/WEAK_GENERIC|SHORT_COMPLEX|ROWS/.test(sourceFailure)) return "BLOCKED_WEAK_GENERIC_ROWS_FOUND";
  if (/UNIT_SEMANTICS|UNIVERSAL_ESTIMATOR_UNIT/.test(sourceFailure)) return "BLOCKED_UNIT_SEMANTICS_FAILED";
  if (/ESTIMATE_INTENT_LOST/.test(sourceFailure)) return "BLOCKED_ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT";
  if (/PDF_MOJIBAKE/.test(sourceFailure)) return "BLOCKED_PDF_MOJIBAKE_FOUND";
  if (/PDF_UI_PARITY/.test(sourceFailure)) return "BLOCKED_UI_PDF_PARITY_FAILED";
  if (/PDF/.test(sourceFailure)) return "BLOCKED_PDF_STRUCTURED_TABLE_PAYLOAD_MISSING";
  return "BLOCKED_QUALITY_SCORE_BELOW_THRESHOLD";
}

function runtimeFailures(results: RuntimeCaseResult[]): FailureArtifact[] {
  return results.flatMap((result) =>
    result.failures.map((failure) => ({
      hardFailClass: hardFailClassFor(failure),
      caseId: result.caseId,
      prompt: result.prompt,
      route: result.route,
      reason: `${result.caseId}:${failure}`,
      sourceFailure: failure,
    })),
  );
}

function runCategoryOverrideProbe(pack: ExactPromptItem[]) {
  const selectedCategory = "flooring";
  const sample = pack
    .filter((item) => !/полы|floor/i.test(item.domain))
    .filter((item) => !/пол|линолеум|ламинат|плитк|стяжк/i.test(item.prompt))
    .slice(0, 50);
  const cases = sample.map((item) => {
    const decision = resolveRequestCategoryOverridePolicy({ text: item.prompt, selectedCategory });
    const passed =
      decision.typedKnownWorkDetected &&
      decision.typedWorkWins &&
      decision.selectedCategoryIgnored &&
      !decision.categoryOverrideAllowed;
    return { id: item.id, prompt: item.prompt, domain: item.domain, selectedCategory, decision, passed };
  });
  return { passed: cases.length > 0 && cases.every((item) => item.passed), cases };
}

function productSourceFiles(): string[] {
  const roots = [path.join(process.cwd(), "src")];
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (
        /\.(ts|tsx|js|jsx)$/.test(entry.name) &&
        !/[\\/]fixtures[\\/]/.test(full) &&
        !/benchmarks/i.test(full)
      ) {
        out.push(full);
      }
    }
  };
  for (const root of roots) if (fs.existsSync(root)) visit(root);
  return out;
}

function exactPromptLookupScan(pack: ExactPromptItem[]) {
  const files = productSourceFiles();
  const findings: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const item of pack) {
      if (text.includes(item.prompt)) {
        findings.push(`${path.relative(process.cwd(), file)}:${item.id}`);
        if (findings.length >= 50) break;
      }
    }
    if (findings.length >= 50) break;
  }
  return {
    scanned_product_source_files: files.length,
    exact_prompt_lookup_found: findings.length > 0,
    findings,
  };
}

function selectPdfCases(pack: ExactPromptItem[], count: number): ExactPromptItem[] {
  const step = Math.max(1, Math.floor(pack.length / count));
  const selected: ExactPromptItem[] = [];
  for (let index = 0; index < pack.length && selected.length < count; index += step) {
    selected.push(pack[index]);
  }
  return selected;
}

function writePdfFile(artifactDirName: string, caseId: string, bytes: Uint8Array): string {
  const relative = path.join("artifacts", "pdf", artifactDirName, `${caseId}.pdf`).replace(/\\/g, "/");
  const full = path.join(process.cwd(), relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, bytes);
  return relative;
}

function evaluatePdfCases(config: ExactPromptPackConfig, pack: ExactPromptItem[]): PdfCaseResult[] {
  return selectPdfCases(pack, config.pdfSampleCases).map((item, index) => {
    const failures: string[] = [];
    try {
      const route = routeFor(index);
      const context = contextFor(route);
      const answer = answerBuiltInAi({
        text: item.prompt,
        route,
        screenContext: context,
        role: context,
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      const estimate = answer.toolResult.estimate;
      if (!estimate) {
        failures.push("PDF_ESTIMATE_MISSING");
        return { caseId: item.id, prompt: item.prompt, pdfChecked: true, pdfPassed: false, failures, textSample: "" };
      }
      const viewModel = buildEstimatePresentationViewModel(estimate);
      const visibleRows = viewModel.rows.map((row) => row.name);
      const pdf = createEstimatePdf({
        estimate,
        runtimeTrace: answer.runtimeTrace,
        generatedAt: "2026-06-02T00:00:00.000Z",
        language: "ru",
      });
      const pdfText = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate.work.workKey }).text;
      const pdfMojibakePassed = validateNoPdfMojibake(pdfText).passed;
      const normalizedPdfText = normalize(pdfText);
      const pdfRowsMatch = visibleRows
        .slice(0, Math.min(visibleRows.length, 20))
        .every((row) => normalizedPdfText.includes(normalize(row)));
      const pdfPassed =
        pdf.validation.valid &&
        pdf.pdfTrace.pdf_uses_structured_global_estimate_result &&
        !pdf.pdfTrace.markdown_parsed_as_pdf_truth &&
        pdfMojibakePassed &&
        pdfRowsMatch;
      if (!pdf.pdfTrace.pdf_uses_structured_global_estimate_result) failures.push("PDF_NOT_STRUCTURED");
      if (!pdfMojibakePassed) failures.push("PDF_MOJIBAKE_FOUND");
      if (!pdfRowsMatch) failures.push("PDF_UI_PARITY_FAILED");
      if (!pdf.validation.valid) failures.push("PDF_VALIDATION_FAILED");
      const pdfFile = writePdfFile(config.artifactDirName, item.id, pdf.bytes);
      return { caseId: item.id, prompt: item.prompt, pdfChecked: true, pdfPassed, pdfFile, failures, textSample: pdfText.slice(0, 1200) };
    } catch (error) {
      failures.push(error instanceof Error ? `PDF_EXTRACTION_FAILED:${error.message}` : "PDF_EXTRACTION_FAILED");
      return { caseId: item.id, prompt: item.prompt, pdfChecked: true, pdfPassed: false, failures, textSample: "" };
    }
  });
}

function containsFailure(failures: readonly FailureArtifact[], hardFailClass: HardFailClass): boolean {
  return failures.some((failure) => failure.hardFailClass === hardFailClass);
}

export function runExactPromptPackAcceptanceProof(config: ExactPromptPackConfig) {
  const artifactDir = path.join(process.cwd(), "artifacts", config.artifactDirName);
  const { fixturePath, sourcePath, pack, source } = readPack(config);
  const fidelity = validateFixtureFidelity(config, pack, source, fixturePath);
  writeJson(artifactDir, "fixture_fidelity.json", { ...fidelity.checks, source_file_name: config.sourceFileName, source_path: sourcePath });

  const runtimeResults = pack.map((item, index) => evaluateRuntimeCase(item, index));
  const runtimeFailureArtifacts = runtimeFailures(runtimeResults);
  writeJson(artifactDir, "runtime_results.json", {
    total: runtimeResults.length,
    passed: runtimeResults.filter((item) => item.failures.length === 0).length,
    failed: runtimeResults.filter((item) => item.failures.length > 0).length,
    route_split: {
      request: runtimeResults.filter((item) => item.route === "/request").length,
      ai_foreman: runtimeResults.filter((item) => item.route === "/ai?context=foreman").length,
      ai_request: runtimeResults.filter((item) => item.route === "/ai?context=request").length,
    },
    cases: runtimeResults,
  });

  const categoryOverride = runCategoryOverrideProbe(pack);
  const categoryFailures: FailureArtifact[] = categoryOverride.passed ? [] : [{
    hardFailClass: "BLOCKED_CATEGORY_OVERRIDE_CAUSED_TEMPLATE_GAP",
    reason: "typed_text_did_not_win_over_selected_category",
    artifact: "category_override_probe.json",
  }];
  writeJson(artifactDir, "category_override_probe.json", categoryOverride);

  const exactPromptLookup = exactPromptLookupScan(pack);
  const exactPromptFailures: FailureArtifact[] = exactPromptLookup.exact_prompt_lookup_found
    ? exactPromptLookup.findings.map((finding) => ({
      hardFailClass: "BLOCKED_EXACT_PROMPT_LOOKUP_FOUND" as const,
      reason: finding,
      artifact: "exact_prompt_lookup_scan.json",
    }))
    : [];
  writeJson(artifactDir, "exact_prompt_lookup_scan.json", exactPromptLookup);

  const pdfResults = evaluatePdfCases(config, pack);
  const pdfFailures = pdfResults.flatMap((item) =>
    item.failures.map((failure) => ({
      hardFailClass: hardFailClassFor(failure),
      caseId: item.caseId,
      prompt: item.prompt,
      reason: `${item.caseId}:${failure}`,
      sourceFailure: failure,
      artifact: "pdf_sample_results.json",
    })),
  );
  const pdfUsesStructuredTablePayload = pdfResults.length >= config.pdfSampleCases && pdfResults.every((item) => item.pdfChecked && item.pdfPassed);
  const pdfMojibakeFound = pdfResults.some((item) => item.failures.includes("PDF_MOJIBAKE_FOUND"));
  const uiPdfParityFailed = pdfResults.some((item) => item.failures.includes("PDF_UI_PARITY_FAILED"));
  writeJson(artifactDir, "pdf_sample_results.json", {
    required_sample_size: config.pdfSampleCases,
    sample_size: pdfResults.length,
    passed: pdfFailures.length === 0,
    pdf_uses_structured_table_payload: pdfUsesStructuredTablePayload,
    pdf_mojibake_found: pdfMojibakeFound,
    ui_pdf_parity_failed: uiPdfParityFailed,
    cases: pdfResults,
  });

  const failures = [
    ...fidelity.failures,
    ...runtimeFailureArtifacts,
    ...categoryFailures,
    ...exactPromptFailures,
    ...pdfFailures,
  ];
  writeJson(artifactDir, "failures.json", failures);

  const domains = [...new Set(pack.map((item) => item.domain))].sort();
  writeJson(artifactDir, "domain_coverage.json", {
    domains_total: domains.length,
    expected_domains_total: config.expectedDomainsTotal,
    domains,
    passed: domains.length === config.expectedDomainsTotal,
  });

  const env = config.envPrefix;
  const typecheckPassed = boolEnv(`${env}_TYPECHECK_PASSED`);
  const lintPassed = boolEnv(`${env}_LINT_PASSED`);
  const gitDiffCheckPassed = boolEnv(`${env}_GIT_DIFF_CHECK_PASSED`);
  const fullJestPassed = boolEnv(`${env}_FULL_JEST_PASSED`);
  const releaseVerifyPassed = boolEnv(`${env}_RELEASE_VERIFY_PASSED`);
  const commitCreated = boolEnv(`${env}_COMMIT_CREATED`);
  const branchPushedPassed = branchPushed() || boolEnv(`${env}_BRANCH_PUSHED`);
  const finalWorktreeClean = gitOutput(["status", "--short"], "") === "" || boolEnv(`${env}_FINAL_WORKTREE_CLEAN`);
  const runtimeProofPassed = failures.length === 0;
  const finalStatus = runtimeProofPassed ? config.greenStatus : config.blockedStatus;

  writeJson(artifactDir, "full_jest.json", {
    generated_by: "aiPromptPackAcceptanceCore",
    full_jest_passed: fullJestPassed,
    note: "Full Jest command may overwrite this file with Jest JSON evidence.",
  });

  const matrix = {
    wave: config.wave,
    final_status: finalStatus,
    head_short_sha: gitOutput(["rev-parse", "--short=8", "HEAD"], "unknown"),
    fixture_file_name: config.fixtureFileName,
    fixture_sha256: fidelity.checks.fixture_sha256,
    raw_attachment_sha256: source.raw_attachment_sha256,
    repaired_json_sha256: source.repaired_json_sha256,
    exact_fixture_loaded_not_generated_real_diverse: true,
    total_prompts: pack.length,
    passed_prompts: runtimeResults.filter((item) => item.failures.length === 0).length,
    failed_prompts: runtimeResults.filter((item) => item.failures.length > 0).length,
    domains_total: domains.length,
    duplicate_prompt_text_found: fidelity.checks.duplicate_prompt_text_found,
    duplicate_prompt_count: fidelity.checks.duplicate_prompt_count,
    duplicate_prompt_ids_found: fidelity.checks.duplicate_id_count > 0,
    manual_fallback_for_construction_like_work_found: containsFailure(failures, "BLOCKED_MANUAL_FALLBACK_FOR_CONSTRUCTION_LIKE_WORK"),
    template_gap_for_known_work_found: containsFailure(failures, "BLOCKED_TEMPLATE_GAP_FOR_KNOWN_WORK"),
    object_confusion_found: containsFailure(failures, "BLOCKED_OBJECT_CONFUSION_FOUND"),
    operation_confusion_found: containsFailure(failures, "BLOCKED_OPERATION_CONFUSION_FOUND"),
    method_confusion_found: containsFailure(failures, "BLOCKED_METHOD_CONFUSION_FOUND"),
    weak_generic_rows_found: containsFailure(failures, "BLOCKED_WEAK_GENERIC_ROWS_FOUND"),
    unit_semantics_failed: containsFailure(failures, "BLOCKED_UNIT_SEMANTICS_FAILED"),
    quality_score_below_threshold_found: containsFailure(failures, "BLOCKED_QUALITY_SCORE_BELOW_THRESHOLD"),
    exact_prompt_lookup_found: exactPromptLookup.exact_prompt_lookup_found,
    category_override_caused_template_gap: containsFailure(failures, "BLOCKED_CATEGORY_OVERRIDE_CAUSED_TEMPLATE_GAP"),
    estimate_intent_lost_to_role_context: containsFailure(failures, "BLOCKED_ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT"),
    pdf_sample_cases_passed: pdfFailures.length === 0,
    pdf_uses_structured_table_payload: pdfUsesStructuredTablePayload,
    pdf_mojibake_found: pdfMojibakeFound,
    ui_pdf_parity_failed: uiPdfParityFailed,
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    git_diff_check_passed: gitDiffCheckPassed,
    runtime_proof_passed: runtimeProofPassed,
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseVerifyPassed,
    commit_created: commitCreated,
    branch_pushed: branchPushedPassed,
    final_worktree_clean: finalWorktreeClean,
    fake_green_claimed: false,
    failures_count: failures.length,
  };
  writeJson(artifactDir, "matrix.json", matrix);
  writeText(artifactDir, "proof.md", [
    `# ${config.wave}`,
    "",
    `Status: ${matrix.final_status}`,
    `Fixture: ${matrix.fixture_file_name}`,
    `Prompts: ${matrix.passed_prompts}/${matrix.total_prompts}`,
    `Domains covered: ${matrix.domains_total}`,
    `Runtime proof passed: ${matrix.runtime_proof_passed}`,
    `PDF sample passed: ${matrix.pdf_sample_cases_passed}`,
    `Exact prompt lookup found: ${matrix.exact_prompt_lookup_found}`,
    `Manual fallback found: ${matrix.manual_fallback_for_construction_like_work_found}`,
    `Template gap found: ${matrix.template_gap_for_known_work_found}`,
    `Weak generic rows found: ${matrix.weak_generic_rows_found}`,
    `Unit semantics failed: ${matrix.unit_semantics_failed}`,
    `Duplicate prompt text found in attached fixture: ${matrix.duplicate_prompt_text_found}`,
    `Fake green claimed: ${matrix.fake_green_claimed}`,
    "",
  ].join("\n"));

  if (failures.length > 0) {
    const first = failures[0];
    throw new Error(`${config.blockedStatus}:${first.hardFailClass}:${first.reason}`);
  }

  console.log(JSON.stringify({
    ok: true,
    artifactDir,
    finalStatus: matrix.final_status,
    totalPrompts: matrix.total_prompts,
    passedPrompts: matrix.passed_prompts,
    domainsTotal: matrix.domains_total,
    duplicatePromptTextFound: matrix.duplicate_prompt_text_found,
    pdfSampleCases: pdfResults.length,
  }, null, 2));
  return matrix;
}
