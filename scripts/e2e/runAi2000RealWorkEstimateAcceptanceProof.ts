import fs from "node:fs";
import path from "node:path";

import {
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
  type Real10000ConstructionWorkCase,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import { resolveRequestCategoryOverridePolicy } from "../../src/lib/ai/estimatorKernel";
import {
  boolEnv,
  branchPushed,
  evaluateReal10000Cases,
  exactPromptLookupScanReal10000,
  gitOutput,
  slimResult,
  summarizeReal10000,
} from "./real10000AcceptanceCore";

const ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_AI_2000_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK",
);
const WAVE = "S_AI_2000_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK_POINT_OF_NO_RETURN";
const GREEN_STATUS = "GREEN_AI_2000_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK_READY";
const BLOCKED_STATUS = "BLOCKED_AI_2000_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK";
const REQUIRED_DOMAIN_COUNT = 50;
const CASES_PER_DOMAIN = 40;
const REQUIRED_TOTAL_PROMPTS = REQUIRED_DOMAIN_COUNT * CASES_PER_DOMAIN;
const REQUIRED_PDF_SAMPLE_CASES = 100;

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
  | "BLOCKED_QUALITY_SCORE_BELOW_THRESHOLD";

type FailureArtifact = {
  hardFailClass: HardFailClass;
  caseId?: string;
  prompt?: string;
  route?: Real10000ConstructionWorkCase["route"];
  expected?: {
    domain?: string;
    object?: string;
    operation?: string;
    method?: string;
  };
  actual?: {
    domain?: string | null;
    object?: string | null;
    operation?: string | null;
    method?: string | null;
  };
  reason: string;
  sourceFailure?: string;
  artifact?: string;
};

function writeJson(name: string, value: unknown): string {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const filePath = path.join(ARTIFACT_DIR, name);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}

function writeText(name: string, value: string): string {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const filePath = path.join(ARTIFACT_DIR, name);
  fs.writeFileSync(filePath, value, "utf8");
  return filePath;
}

function currentGitShortSha(): string {
  return gitOutput(["rev-parse", "--short=8", "HEAD"], "unknown");
}

function selectCoverageDomains(): string[] {
  const domainsByMacro = new Map<string, Set<string>>();
  for (const item of REAL_DIVERSE_10000_CONSTRUCTION_WORKS) {
    const set = domainsByMacro.get(item.macroDomain) ?? new Set<string>();
    set.add(item.domain);
    domainsByMacro.set(item.macroDomain, set);
  }

  const macroDomains = [...domainsByMacro.keys()].sort();
  const domainQueues = macroDomains.map((macroDomain) => ({
    macroDomain,
    domains: [...(domainsByMacro.get(macroDomain) ?? [])].sort(),
    index: 0,
  }));
  const selected: string[] = [];

  while (selected.length < REQUIRED_DOMAIN_COUNT && domainQueues.some((queue) => queue.index < queue.domains.length)) {
    for (const queue of domainQueues) {
      const domain = queue.domains[queue.index];
      if (domain && selected.length < REQUIRED_DOMAIN_COUNT) {
        selected.push(domain);
        queue.index += 1;
      }
    }
  }

  return selected;
}

function buildPromptPack(): Real10000ConstructionWorkCase[] {
  const selectedDomains = selectCoverageDomains();
  const casesByDomain = new Map<string, Real10000ConstructionWorkCase[]>();
  for (const item of REAL_DIVERSE_10000_CONSTRUCTION_WORKS) {
    if (!selectedDomains.includes(item.domain)) continue;
    const cases = casesByDomain.get(item.domain) ?? [];
    cases.push(item);
    casesByDomain.set(item.domain, cases);
  }

  return selectedDomains.flatMap((domain) => {
    const cases = casesByDomain.get(domain) ?? [];
    return cases.slice(0, CASES_PER_DOMAIN);
  });
}

function hardFailClassFor(sourceFailure: string): HardFailClass {
  if (/MANUAL_FALLBACK_FOR_CONSTRUCTION_LIKE_WORK/.test(sourceFailure)) {
    return "BLOCKED_MANUAL_FALLBACK_FOR_CONSTRUCTION_LIKE_WORK";
  }
  if (/TEMPLATE_GAP|UNKNOWN_NEEDS_TRACE/.test(sourceFailure)) return "BLOCKED_TEMPLATE_GAP_FOR_KNOWN_WORK";
  if (/OBJECT_SCOPE_MISCLASSIFIED/.test(sourceFailure)) return "BLOCKED_OBJECT_CONFUSION_FOUND";
  if (/OPERATION_MISCLASSIFIED/.test(sourceFailure)) return "BLOCKED_OPERATION_CONFUSION_FOUND";
  if (/METHOD_MISCLASSIFIED/.test(sourceFailure)) return "BLOCKED_METHOD_CONFUSION_FOUND";
  if (/WEAK_GENERIC_BOQ_ROWS|WORK_SPECIFIC_ROWS_MISSING|SHORT_COMPLEX_ESTIMATE/.test(sourceFailure)) {
    return "BLOCKED_WEAK_GENERIC_ROWS_FOUND";
  }
  if (/UNIT_SEMANTICS_FAILED/.test(sourceFailure)) return "BLOCKED_UNIT_SEMANTICS_FAILED";
  if (/ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT/.test(sourceFailure)) return "BLOCKED_ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT";
  if (/PDF_MOJIBAKE_FOUND/.test(sourceFailure)) return "BLOCKED_PDF_MOJIBAKE_FOUND";
  if (/PDF_UI_PARITY_FAILED/.test(sourceFailure)) return "BLOCKED_UI_PDF_PARITY_FAILED";
  if (/PDF_NOT_STRUCTURED|PDF_EXTRACTION_FAILED/.test(sourceFailure)) return "BLOCKED_PDF_STRUCTURED_TABLE_PAYLOAD_MISSING";
  return "BLOCKED_QUALITY_SCORE_BELOW_THRESHOLD";
}

function containsFailure(failures: readonly FailureArtifact[], hardFailClass: HardFailClass): boolean {
  return failures.some((failure) => failure.hardFailClass === hardFailClass);
}

function semanticFrameField(result: { semanticFrame: unknown }, field: string): string | null {
  if (typeof result.semanticFrame !== "object" || result.semanticFrame === null) return null;
  if (!(field in result.semanticFrame)) return null;
  const value = (result.semanticFrame as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

function runCategoryOverrideProbe(selectedCases: readonly Real10000ConstructionWorkCase[]): {
  passed: boolean;
  cases: {
    id: string;
    prompt: string;
    domain: string;
    selectedCategory: string;
    typedKnownWorkDetected: boolean;
    typedWorkWins: boolean;
    categoryOverrideAllowed: boolean;
    selectedCategoryIgnored: boolean;
    resolvedWorkKey: string | undefined;
    resolvedCategory: string;
    passed: boolean;
  }[];
} {
  const selectedCategory = "flooring";
  const probeDomains = ["air_conditioning_systems", "concrete_pedestals", "fire_alarm_systems"];
  const cases = probeDomains.map((domain) => {
    const fixture = selectedCases.find((item) => item.domain === domain);
    return {
      id: `typed_${domain}_wins_over_flooring_chip`,
      prompt: fixture?.promptRu ?? "",
      domain,
      selectedCategory,
      expectedResolvedDomain: fixture?.expectedResolvedDomain,
    };
  });

  const results = cases.map((testCase) => {
    const decision = resolveRequestCategoryOverridePolicy({
      text: testCase.prompt,
      selectedCategory: testCase.selectedCategory,
    });
    const passed =
      Boolean(testCase.prompt) &&
      decision.typedKnownWorkDetected &&
      decision.typedWorkWins &&
      !decision.categoryOverrideAllowed &&
      decision.selectedCategoryIgnored &&
      decision.resolvedCategory !== selectedCategory &&
      decision.resolvedCategory !== "other";
    return {
      id: testCase.id,
      prompt: testCase.prompt,
      domain: testCase.domain,
      selectedCategory: testCase.selectedCategory,
      typedKnownWorkDetected: decision.typedKnownWorkDetected,
      typedWorkWins: decision.typedWorkWins,
      categoryOverrideAllowed: decision.categoryOverrideAllowed,
      selectedCategoryIgnored: decision.selectedCategoryIgnored,
      resolvedWorkKey: decision.resolvedWorkKey,
      resolvedCategory: decision.resolvedCategory,
      passed,
    };
  });

  return {
    passed: results.every((item) => item.passed),
    cases: results,
  };
}

function main(): void {
  const selectedCases = buildPromptPack();
  const selectedDomains = [...new Set(selectedCases.map((item) => item.domain))].sort();
  const selectedMacroDomains = [...new Set(selectedCases.map((item) => item.macroDomain))].sort();

  const structuralFailures: FailureArtifact[] = [];
  if (selectedDomains.length !== REQUIRED_DOMAIN_COUNT) {
    structuralFailures.push({
      hardFailClass: "BLOCKED_QUALITY_SCORE_BELOW_THRESHOLD",
      reason: `Expected ${REQUIRED_DOMAIN_COUNT} domains, got ${selectedDomains.length}.`,
      artifact: "domain_coverage.json",
    });
  }
  if (selectedCases.length !== REQUIRED_TOTAL_PROMPTS) {
    structuralFailures.push({
      hardFailClass: "BLOCKED_QUALITY_SCORE_BELOW_THRESHOLD",
      reason: `Expected ${REQUIRED_TOTAL_PROMPTS} prompts, got ${selectedCases.length}.`,
      artifact: "prompts.json",
    });
  }

  writeJson("prompts.json", selectedCases.map((item, index) => ({
    index,
    id: item.caseId,
    prompt: item.promptRu,
    route: item.route,
    macroDomain: item.macroDomain,
    domain: item.domain,
    expectedResolvedDomain: item.expectedResolvedDomain,
    expectedObject: item.expectedObject,
    expectedOperation: item.expectedOperation,
    expectedMethod: item.expectedMethod ?? null,
    expectedMinimumRows: item.expectedMinimumRows,
    pdfRequired: item.pdfRequired,
  })));

  const runtimeEvaluation = evaluateReal10000Cases(selectedCases, { includePdf: false });
  const runtimeSummary = summarizeReal10000(runtimeEvaluation);
  const caseById = new Map(selectedCases.map((item) => [item.caseId, item]));
  const runtimeFailures: FailureArtifact[] = runtimeEvaluation.cases.flatMap((result) =>
    result.failures.map((sourceFailure) => ({
      hardFailClass: hardFailClassFor(sourceFailure),
      caseId: result.caseId,
      prompt: result.prompt,
      route: result.route,
      expected: {
        domain: result.expectedResolvedDomain,
        object: caseById.get(result.caseId)?.expectedObject,
        operation: caseById.get(result.caseId)?.expectedOperation,
        method: caseById.get(result.caseId)?.expectedMethod,
      },
      actual: {
        domain: semanticFrameField(result, "domain"),
        object: result.object,
        operation: result.operation,
        method: result.method,
      },
      reason: `${result.caseId}:${sourceFailure}:${result.blockedBy ?? result.fallbackUsed ?? "no_blockedBy"}`,
      sourceFailure,
      artifact: "runtime_results.json",
    })),
  );

  const categoryOverrideProbe = runCategoryOverrideProbe(selectedCases);
  const categoryOverrideFailures: FailureArtifact[] = categoryOverrideProbe.passed
    ? []
    : categoryOverrideProbe.cases
      .filter((item) => !item.passed)
      .map((item) => ({
        hardFailClass: "BLOCKED_CATEGORY_OVERRIDE_CAUSED_TEMPLATE_GAP" as const,
        reason: `${item.id}:selected_category_override_not_ignored`,
        sourceFailure: "CATEGORY_OVERRIDE_CAUSED_TEMPLATE_GAP",
        artifact: "category_override_results.json",
      }));
  writeJson("category_override_results.json", categoryOverrideProbe);

  writeJson("runtime_results.json", {
    summary: runtimeSummary,
    failures: runtimeFailures,
    cases: runtimeEvaluation.cases.map(slimResult),
  });

  const pdfCases = selectedCases.filter((item) => item.pdfRequired).slice(0, REQUIRED_PDF_SAMPLE_CASES);
  const pdfEvaluation = evaluateReal10000Cases(pdfCases, { includePdf: true });
  const pdfFailures: FailureArtifact[] = [
    ...(pdfCases.length < REQUIRED_PDF_SAMPLE_CASES
      ? [{
        hardFailClass: "BLOCKED_PDF_STRUCTURED_TABLE_PAYLOAD_MISSING" as const,
        reason: `Expected ${REQUIRED_PDF_SAMPLE_CASES} PDF sample cases, got ${pdfCases.length}.`,
        artifact: "pdf_sample_results.json",
      }]
      : []),
    ...pdfEvaluation.cases.flatMap((result) =>
      result.failures
        .filter((sourceFailure) => sourceFailure.startsWith("PDF_"))
        .map((sourceFailure) => ({
          hardFailClass: hardFailClassFor(sourceFailure),
          caseId: result.caseId,
          prompt: result.prompt,
          route: result.route,
          expected: {
            domain: result.expectedResolvedDomain,
          },
          actual: {
            object: result.object,
            operation: result.operation,
            method: result.method,
          },
          reason: `${result.caseId}:${sourceFailure}`,
          sourceFailure,
          artifact: "pdf_sample_results.json",
        })),
    ),
  ];
  const pdfUsesStructuredTablePayload = pdfCases.length >= REQUIRED_PDF_SAMPLE_CASES &&
    pdfEvaluation.cases.every((item) => item.pdfChecked && item.pdfPassed);
  const pdfMojibakeFound = pdfEvaluation.cases.some((item) => item.failures.includes("PDF_MOJIBAKE_FOUND"));
  const uiPdfParityFailed = pdfEvaluation.cases.some((item) => item.failures.includes("PDF_UI_PARITY_FAILED"));

  writeJson("pdf_sample_results.json", {
    required_sample_size: REQUIRED_PDF_SAMPLE_CASES,
    sample_size: pdfCases.length,
    passed: pdfFailures.length === 0,
    pdf_uses_structured_table_payload: pdfUsesStructuredTablePayload,
    pdf_mojibake_found: pdfMojibakeFound,
    ui_pdf_parity_failed: uiPdfParityFailed,
    cases: pdfEvaluation.cases.map((item) => ({
      caseId: item.caseId,
      prompt: item.prompt,
      pdfChecked: item.pdfChecked,
      pdfPassed: item.pdfPassed,
      pdfFile: item.pdfFile,
      failures: item.failures,
      textSample: item.pdfText?.slice(0, 1200) ?? "",
    })),
  });

  const exactPromptLookup = exactPromptLookupScanReal10000();
  const exactPromptFailures: FailureArtifact[] = exactPromptLookup.exact_prompt_lookup_found
    ? exactPromptLookup.findings.map((finding) => ({
      hardFailClass: "BLOCKED_EXACT_PROMPT_LOOKUP_FOUND" as const,
      reason: finding,
      sourceFailure: "EXACT_PROMPT_LOOKUP_FOUND",
      artifact: "exact_prompt_lookup_scan.json",
    }))
    : [];
  writeJson("exact_prompt_lookup_scan.json", exactPromptLookup);

  const failures = [
    ...structuralFailures,
    ...runtimeFailures,
    ...categoryOverrideFailures,
    ...pdfFailures,
    ...exactPromptFailures,
  ];
  writeJson("failures.json", failures);

  const domainCoverage = {
    required_domains_total: REQUIRED_DOMAIN_COUNT,
    domains_total: selectedDomains.length,
    domains: selectedDomains,
    macro_domains_total: selectedMacroDomains.length,
    macro_domains: selectedMacroDomains,
    cases_per_domain: selectedDomains.map((domain) => ({
      domain,
      count: selectedCases.filter((item) => item.domain === domain).length,
      route_split: {
        request: selectedCases.filter((item) => item.domain === domain && item.route === "/request").length,
        ai_foreman: selectedCases.filter((item) => item.domain === domain && item.route === "/ai?context=foreman").length,
        ai_request: selectedCases.filter((item) => item.domain === domain && item.route === "/ai?context=request").length,
      },
    })),
    route_split: runtimeSummary.route_split,
    passed: structuralFailures.length === 0,
  };
  writeJson("domain_coverage.json", domainCoverage);
  const typecheckPassed = boolEnv("AI_2000_REAL_WORK_TYPECHECK_PASSED");
  const lintPassed = boolEnv("AI_2000_REAL_WORK_LINT_PASSED");
  const gitDiffCheckPassed = boolEnv("AI_2000_REAL_WORK_GIT_DIFF_CHECK_PASSED");
  const fullJestPassed = boolEnv("AI_2000_REAL_WORK_FULL_JEST_PASSED");
  const releaseVerifyPassed = boolEnv("AI_2000_REAL_WORK_RELEASE_VERIFY_PASSED");
  const commitCreated = boolEnv("AI_2000_REAL_WORK_COMMIT_CREATED");
  const branchPushedPassed = branchPushed() || boolEnv("AI_2000_REAL_WORK_BRANCH_PUSHED");
  const finalWorktreeClean = gitOutput(["status", "--short"], "") === "" || boolEnv("AI_2000_REAL_WORK_FINAL_WORKTREE_CLEAN");
  const runtimeProofPassed = failures.length === 0;
  const releaseCheckBlockers = [
    ...(!typecheckPassed ? ["BLOCKED_TYPECHECK_NOT_PROVEN"] : []),
    ...(!lintPassed ? ["BLOCKED_LINT_NOT_PROVEN"] : []),
    ...(!gitDiffCheckPassed ? ["BLOCKED_GIT_DIFF_CHECK_NOT_PROVEN"] : []),
    ...(!fullJestPassed ? ["BLOCKED_FULL_JEST_NOT_PROVEN"] : []),
    ...(!releaseVerifyPassed ? ["BLOCKED_RELEASE_VERIFY_NOT_PROVEN"] : []),
    ...(!commitCreated ? ["BLOCKED_COMMIT_NOT_CREATED"] : []),
    ...(!branchPushedPassed ? ["BLOCKED_BRANCH_NOT_PUSHED"] : []),
    ...(!finalWorktreeClean ? ["BLOCKED_FINAL_WORKTREE_NOT_CLEAN"] : []),
  ];
  const finalStatus = runtimeProofPassed && releaseCheckBlockers.length === 0 ? GREEN_STATUS : BLOCKED_STATUS;

  writeJson("full_jest.json", {
    generated_by: "runAi2000RealWorkEstimateAcceptanceProof",
    full_jest_passed: fullJestPassed,
    note: "Full Jest command may overwrite this file with Jest JSON evidence.",
  });

  const matrix = {
    wave: WAVE,
    final_status: finalStatus,
    head_short_sha: currentGitShortSha(),
    total_prompts: selectedCases.length,
    passed_prompts: runtimeEvaluation.cases.filter((item) => item.failures.length === 0).length,
    failed_prompts: runtimeEvaluation.cases.filter((item) => item.failures.length > 0).length,
    domains_total: selectedDomains.length,
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
    release_check_blockers: releaseCheckBlockers,
    fake_green_claimed: false,
    failures_count: failures.length,
    blockers_count: failures.length + releaseCheckBlockers.length,
  };
  writeJson("matrix.json", matrix);
  writeText("proof.md", [
    "# S_AI_2000_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK",
    "",
    `Status: ${matrix.final_status}`,
    `Prompts: ${matrix.passed_prompts}/${matrix.total_prompts}`,
    `Domains covered: ${matrix.domains_total}`,
    `PDF sample passed: ${matrix.pdf_sample_cases_passed}`,
    `Exact prompt lookup found: ${matrix.exact_prompt_lookup_found}`,
    `Manual fallback found: ${matrix.manual_fallback_for_construction_like_work_found}`,
    `Template gap found: ${matrix.template_gap_for_known_work_found}`,
    `Object confusion found: ${matrix.object_confusion_found}`,
    `Operation confusion found: ${matrix.operation_confusion_found}`,
    `Method confusion found: ${matrix.method_confusion_found}`,
    `Weak generic rows found: ${matrix.weak_generic_rows_found}`,
    `Unit semantics failed: ${matrix.unit_semantics_failed}`,
    `PDF mojibake found: ${matrix.pdf_mojibake_found}`,
    `UI/PDF parity failed: ${matrix.ui_pdf_parity_failed}`,
    `Release checklist blockers: ${matrix.release_check_blockers.join(", ") || "none"}`,
    "",
    "Artifacts are generated locally under this ignored proof directory.",
    "",
  ].join("\n"));

  if (failures.length > 0) {
    const first = failures[0];
    throw new Error(`${BLOCKED_STATUS}:${first.hardFailClass}:${first.reason}`);
  }
  if (releaseCheckBlockers.length > 0) {
    throw new Error(`${BLOCKED_STATUS}:${releaseCheckBlockers[0]}`);
  }

  console.log(JSON.stringify({
    ok: true,
    artifactDir: ARTIFACT_DIR,
    finalStatus: matrix.final_status,
    totalPrompts: matrix.total_prompts,
    passedPrompts: matrix.passed_prompts,
    domainsTotal: matrix.domains_total,
    pdfSampleCases: pdfCases.length,
  }, null, 2));
}

main();
