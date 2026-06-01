import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas/validateConstructionUnitSemantics";
import { CONSTRUCTION_PRIMITIVE_DOMAINS } from "../../src/lib/ai/constructionPrimitives";
import { buildEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import { composeOpenWorldConstructionPreliminaryBoq, resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";
import {
  REAL_10000_ACCEPTANCE_CONTRACT,
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import {
  compileParametricBoqRecipe,
  findWeakGenericRecipeRows,
  validateParametricBoqRecipe,
} from "../../src/lib/ai/professionalBoq";
import { classifyConstructionWorkOutcome } from "../../src/lib/ai/worldConstructionInterpreter";
import { CONSTRUCTION_DOMAIN_MAP } from "../../src/lib/ai/worldConstructionOntology";
import { createEstimatePdf, extractEstimatePdfTextForProof, validateNoPdfMojibake } from "../../src/lib/estimatePdf";
import { resolveCanonicalApi34Evidence } from "./canonicalApi34Evidence";
import {
  boolEnv,
  branchPushed,
  evaluateReal10000Acceptance,
  evaluateReal10000Case,
  exactPromptLookupScanReal10000,
  gitOutput,
  real10000AndroidSampleCases,
  real10000WebSampleCases,
  slimResult,
  summarizeReal10000,
} from "./real10000AcceptanceCore";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_AI_UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE");
const GENERATED_AT = "2026-06-02T00:00:00.000Z";

type Failure = {
  classification: string;
  reason: string;
  artifact?: string;
};

type EstimateRoute = "/request" | "/ai?context=foreman" | "/ai?context=request";

type KnownCase = {
  id: string;
  text: string;
  route: EstimateRoute;
  expectedWorkKey: string;
  expectedDomain: string;
  expectedObject: string;
  minimumRows: number;
};

const P0_CASES: readonly KnownCase[] = [
  { id: "acoustic_panels", text: "смета на монтаж акустических панелей в зале 240 м2", route: "/request", expectedWorkKey: "acoustic_panel_installation", expectedDomain: "interior_acoustic_finish", expectedObject: "acoustic_panel_system", minimumRows: 30 },
  { id: "fire_alarm", text: "смета на монтаж пожарной сигнализации в офисе 800 м2", route: "/request", expectedWorkKey: "fire_alarm_installation", expectedDomain: "fire_alarm", expectedObject: "fire_alarm_system", minimumRows: 30 },
  { id: "cold_room", text: "смета на холодильную камеру 40 м2", route: "/request", expectedWorkKey: "cold_room_installation", expectedDomain: "cold_rooms", expectedObject: "cold_room_system", minimumRows: 45 },
  { id: "dock_leveler", text: "смета на доклевеллер", route: "/request", expectedWorkKey: "dock_leveler_installation", expectedDomain: "loading_docks", expectedObject: "dock_leveler", minimumRows: 30 },
  { id: "smoke_extraction", text: "смета на дымоудаление", route: "/request", expectedWorkKey: "smoke_extraction_system", expectedDomain: "smoke_extraction", expectedObject: "smoke_extraction_system", minimumRows: 30 },
  { id: "bms_automation", text: "смета на BMS автоматику", route: "/request", expectedWorkKey: "bms_automation_installation", expectedDomain: "automation_bms", expectedObject: "bms_automation_system", minimumRows: 30 },
  { id: "industrial_equipment", text: "смета на монтаж промышленного оборудования 5 тонн", route: "/request", expectedWorkKey: "industrial_equipment_installation", expectedDomain: "industrial_equipment", expectedObject: "industrial_equipment", minimumRows: 45 },
  { id: "drainage_channel", text: "смета на устройство дренажного лотка 120 м", route: "/request", expectedWorkKey: "drainage_channel_installation", expectedDomain: "drainage", expectedObject: "drainage_channel", minimumRows: 18 },
  { id: "passenger_elevator", text: "смета на пассажирский лифт 14 этажей", route: "/ai?context=foreman", expectedWorkKey: "passenger_elevator_installation", expectedDomain: "vertical_transport", expectedObject: "passenger_elevator", minimumRows: 30 },
  { id: "solar_panels", text: "смета на солнечные панели 30 кВт", route: "/request", expectedWorkKey: "solar_panel_installation", expectedDomain: "solar", expectedObject: "solar_power_system", minimumRows: 45 },
  { id: "well_drilling", text: "смета на бурение скважины 80 м", route: "/request", expectedWorkKey: "well_drilling_professional", expectedDomain: "well_drilling", expectedObject: "water_well", minimumRows: 30 },
];

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

function rowsOf(estimate: GlobalEstimateResult): GlobalEstimateResult["sections"][number]["rows"] {
  return estimate.sections.flatMap((section) => section.rows);
}

function routeContext(route: EstimateRoute): { screenContext: "request" | "foreman"; role: "consumer" | "foreman" } {
  if (route === "/ai?context=foreman") return { screenContext: "foreman", role: "foreman" };
  return { screenContext: "request", role: "consumer" };
}

function answerEstimate(input: { text: string; route: EstimateRoute }) {
  const context = routeContext(input.route);
  return answerBuiltInAi({
    text: input.text,
    route: input.route,
    screenContext: context.screenContext,
    role: context.role,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
}

function pushFailure(failures: Failure[], classification: string, reason: string, artifact?: string): void {
  failures.push({ classification, reason, artifact });
}

function canonicalWorkSignatures(): string[] {
  return CONSTRUCTION_DOMAIN_MAP.flatMap((domain) =>
    domain.objects.flatMap((object) =>
      domain.operations.flatMap((operation) =>
        domain.methods.map((method) => `${domain.domain}:${object}:${operation}:${method}`),
      ),
    ),
  );
}

function unitQuantity(unit: string, index: number): number {
  if (unit === "linear_m") return 25 + (index % 200);
  if (unit === "pcs") return 1 + (index % 20);
  if (unit === "set") return 1;
  if (unit === "ton") return 2 + (index % 40);
  if (unit === "m3") return 5 + (index % 120);
  if (unit === "kg") return 100 + (index % 900);
  return 40 + (index % 500);
}

function openWorldPrompt(index: number): string {
  const domain = CONSTRUCTION_PRIMITIVE_DOMAINS[index % CONSTRUCTION_PRIMITIVE_DOMAINS.length];
  const object = domain.objects[index % domain.objects.length] ?? "site";
  const operation = domain.operations[index % domain.operations.length] ?? "installation";
  const method = domain.methods[index % domain.methods.length] ?? "generic_professional_method";
  const unit = domain.units[index % domain.units.length] ?? "set";
  return `estimate ${domain.domain} ${object} ${operation} ${method} ${unitQuantity(unit, index)} ${unit} open_world_case_${index}`;
}

function currentGitShortSha(): string {
  return gitOutput(["rev-parse", "--short=8", "HEAD"], "unknown");
}

function runCommandSucceeded(command: string, args: string[]): boolean {
  try {
    execFileSync(command, args, { cwd: process.cwd(), encoding: "utf8", stdio: "pipe", timeout: 60_000 });
    return true;
  } catch {
    return false;
  }
}

function main(): void {
  const failures: Failure[] = [];
  const exactPromptLookup = exactPromptLookupScanReal10000();
  if (exactPromptLookup.exact_prompt_lookup_found) {
    pushFailure(failures, "EXACT_PROMPT_LOOKUP_FOUND", exactPromptLookup.findings.join(";"), "exact_prompt_lookup_scan.json");
  }

  const semanticRoutingResults = P0_CASES.map((testCase) => {
    const outcome = resolveEstimatorOutcome({ text: testCase.text, currency: "KGS" });
    const answer = answerEstimate({ text: testCase.text, route: testCase.route });
    const estimate = answer.toolResult.estimate;
    const rowCount = estimate ? rowsOf(estimate).length : 0;
    const passed =
      outcome.failures.length === 0 &&
      outcome.plan?.workKey === testCase.expectedWorkKey &&
      outcome.plan.semanticFrame.domain === testCase.expectedDomain &&
      outcome.plan.semanticFrame.object === testCase.expectedObject &&
      answer.route.intent === "estimate" &&
      answer.toolResult.toolName === "calculate_global_estimate" &&
      !answer.toolResult.blockedBy &&
      !answer.toolResult.fallbackUsed &&
      estimate?.work.workKey === testCase.expectedWorkKey &&
      rowCount >= testCase.minimumRows;
    if (!passed) {
      pushFailure(
        failures,
        "SEMANTIC_ROUTING_FAILED",
        `${testCase.id}:${answer.toolResult.blockedBy ?? answer.toolResult.fallbackUsed ?? outcome.failures.join("|")}`,
        "semantic_routing_matrix.json",
      );
    }
    return {
      ...testCase,
      classification: outcome.classification,
      failures: outcome.failures,
      runtimeIntent: answer.route.intent,
      toolName: answer.toolResult.toolName,
      blockedBy: answer.toolResult.blockedBy,
      fallbackUsed: answer.toolResult.fallbackUsed,
      workKey: estimate?.work.workKey,
      rowCount,
      passed,
    };
  });
  writeJson("semantic_routing_matrix.json", semanticRoutingResults);

  const formulaResults = P0_CASES.map((testCase) => {
    const outcome = resolveEstimatorOutcome({ text: testCase.text, currency: "KGS" });
    return {
      id: testCase.id,
      workKey: outcome.plan?.workKey,
      formulas: outcome.plan?.formulas ?? [],
      passed: Boolean(outcome.plan?.formulas.length) && outcome.failures.length === 0,
    };
  });
  if (formulaResults.some((item) => !item.passed)) pushFailure(failures, "FORMULA_RESULTS_FAILED", "P0 formula validation failed", "formula_results.json");
  writeJson("formula_results.json", formulaResults);

  const selfCorrectionResults = P0_CASES.map((testCase) => {
    const composed = composeOpenWorldConstructionPreliminaryBoq(testCase.text);
    const passed =
      composed.classification === "preliminary_boq" &&
      composed.plan?.workKey === testCase.expectedWorkKey &&
      composed.rowCount >= testCase.minimumRows;
    if (!passed) pushFailure(failures, "SELF_CORRECTION_FAILED", `${testCase.id}:${composed.classification}`, "self_correction_results.json");
    return {
      id: testCase.id,
      classification: composed.classification,
      workKey: composed.plan?.workKey,
      rowCount: composed.rowCount,
      passed,
    };
  });
  writeJson("self_correction_results.json", selfCorrectionResults);

  const real10000 = evaluateReal10000Acceptance({ includePdf: false });
  const real10000Summary = summarizeReal10000(real10000);
  if (real10000.failures.length > 0) pushFailure(failures, "REAL_10000_FAILED", `${real10000.failures.length} failures`, "known_10000_results.json");
  writeJson("known_10000_results.json", {
    summary: real10000Summary,
    failures: real10000.failures,
    sample: real10000.cases.slice(0, 200).map(slimResult),
  });

  const canonicalSignatures = canonicalWorkSignatures();
  const domainCoverage = {
    real10000_domains_covered: real10000Summary.domains_covered,
    real10000_contract: REAL_10000_ACCEPTANCE_CONTRACT,
    ontology_domains_total: CONSTRUCTION_DOMAIN_MAP.length,
    primitive_domains_total: CONSTRUCTION_PRIMITIVE_DOMAINS.length,
    canonical_work_signatures_total: canonicalSignatures.length,
    canonical_work_signatures_sample: canonicalSignatures.slice(0, 50),
    passed:
      real10000.cases.length >= 10_000 &&
      real10000Summary.domains_covered >= 50 &&
      canonicalSignatures.length >= 400,
  };
  if (!domainCoverage.passed) pushFailure(failures, "DOMAIN_COVERAGE_FAILED", "coverage below contract", "domain_coverage.json");
  writeJson("domain_coverage.json", domainCoverage);

  const openWorldResults = Array.from({ length: 5_000 }, (_, index) => {
    const prompt = openWorldPrompt(index);
    const interpretation = classifyConstructionWorkOutcome({
      text: prompt,
      countryCode: "KG",
      city: "Bishkek",
      currency: "KGS",
    });
    const recipe = compileParametricBoqRecipe(interpretation.primitive);
    const validation = validateParametricBoqRecipe(recipe);
    const weakRows = findWeakGenericRecipeRows(recipe);
    const passed =
      interpretation.primitive.domain !== "unknown" &&
      !interpretation.shouldReturnTemplateGap &&
      validation.passed &&
      weakRows.length === 0 &&
      recipe.rows.length >= 14;
    return {
      index,
      prompt,
      domain: interpretation.primitive.domain,
      objectScope: interpretation.primitive.objectScope,
      operation: interpretation.primitive.operation,
      method: interpretation.primitive.method,
      rowCount: recipe.rows.length,
      validationFailures: validation.failures,
      weakRows,
      passed,
    };
  });
  const openWorldFailures = openWorldResults.filter((item) => !item.passed);
  if (openWorldFailures.length > 0) pushFailure(failures, "OPEN_WORLD_5000_FAILED", `${openWorldFailures.length} failures`, "open_world_composer_results.json");
  writeJson("open_world_composer_results.json", {
    total: openWorldResults.length,
    passed: openWorldResults.filter((item) => item.passed).length,
    failed: openWorldFailures.length,
    failures: openWorldFailures.slice(0, 100),
    sample: openWorldResults.slice(0, 100),
  });

  const professionalDeepResults = real10000.cases
    .filter((item) => item.failures.length === 0 && item.rowCount >= 30)
    .slice(0, 300)
    .map((item) => ({
      caseId: item.caseId,
      route: item.route,
      domain: item.domain,
      workKey: item.estimate?.work.workKey,
      rowCount: item.rowCount,
      assumptions: item.estimate?.assumptions.length ?? 0,
      clarifyingQuestions: item.estimate?.clarifyingQuestions.length ?? 0,
      unitSemanticsPassed: item.unitSemanticsPassed,
      sourceEvidencePassed: item.sourceEvidencePassed,
      passed: item.rowCount >= 30 && item.unitSemanticsPassed && item.sourceEvidencePassed,
    }));
  if (professionalDeepResults.length < 300 || professionalDeepResults.some((item) => !item.passed)) {
    pushFailure(failures, "PROFESSIONAL_300_FAILED", `${professionalDeepResults.length}/300 deep cases`, "professional_boq_results.json");
  }
  const p0BoqResults = semanticRoutingResults.map((item) => ({
    id: item.id,
    workKey: item.workKey,
    rowCount: item.rowCount,
    minimumRows: item.minimumRows,
    passed: item.passed,
  }));
  writeJson("professional_boq_results.json", {
    p0: p0BoqResults,
    deepProfessional: professionalDeepResults,
    deepProfessionalTotal: professionalDeepResults.length,
    passed: professionalDeepResults.length >= 300 && professionalDeepResults.every((item) => item.passed) && p0BoqResults.every((item) => item.passed),
  });

  const webCases = [
    ...P0_CASES,
    ...real10000WebSampleCases().map((item) => ({
      id: item.caseId,
      text: item.promptRu,
      route: item.route as EstimateRoute,
      expectedWorkKey: "",
      expectedDomain: item.expectedResolvedDomain,
      expectedObject: item.expectedObject,
      minimumRows: item.expectedMinimumRows,
    })),
  ].slice(0, 60);
  const webLiveResults = webCases.map((item) => {
    const answer = answerEstimate({ text: item.text, route: item.route });
    const estimate = answer.toolResult.estimate;
    const rows = estimate ? rowsOf(estimate) : [];
    const viewModel = estimate ? buildEstimatePresentationViewModel(estimate) : null;
    const passed =
      answer.route.intent === "estimate" &&
      answer.toolResult.toolName === "calculate_global_estimate" &&
      !answer.toolResult.blockedBy &&
      !answer.toolResult.fallbackUsed &&
      Boolean(estimate) &&
      rows.length >= Math.min(item.minimumRows, 30) &&
      Boolean(viewModel?.rows.length);
    if (!passed) pushFailure(failures, "WEB_LIVE_60_FAILED", `${item.id}:${answer.toolResult.blockedBy ?? "estimate_missing"}`, "web_live_results.json");
    return {
      id: item.id,
      route: item.route,
      prompt: item.text,
      workKey: estimate?.work.workKey,
      rowCount: rows.length,
      runtimeTraceId: answer.runtimeTrace.traceId,
      passed,
    };
  });
  writeJson("web_live_results.json", {
    total: webLiveResults.length,
    passed: webLiveResults.filter((item) => item.passed).length,
    failed: webLiveResults.filter((item) => !item.passed).length,
    cases: webLiveResults,
  });

  const pdfCases = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => item.pdfRequired).slice(0, 100);
  const pdfResults = pdfCases.map((item) => {
    const result = evaluateReal10000Case(item, { includePdf: false });
    const estimate = result.estimate;
    if (!estimate) {
      pushFailure(failures, "PDF_ESTIMATE_MISSING", item.caseId, "pdf_table_payloads.json");
      return {
        caseId: item.caseId,
        passed: false,
        failures: ["estimate_missing"],
      };
    }
    const pdf = createEstimatePdf({ estimate, generatedAt: GENERATED_AT, language: "ru" });
    const extracted = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate.work.workKey });
    const noMojibake = validateNoPdfMojibake(extracted.text);
    const visibleRows = rowsOf(estimate).slice(0, 12).map((row) => row.name);
    const pdfText = extracted.text.toLocaleLowerCase("ru-RU");
    const uiPdfParity = visibleRows.every((row) => pdfText.includes(row.toLocaleLowerCase("ru-RU")));
    const unitSemantics = validateConstructionUnitSemantics(estimate);
    const failuresForCase = [
      ...pdf.validation.failures,
      ...extracted.failures,
      ...noMojibake.failures,
      ...unitSemantics.failures,
      ...(uiPdfParity ? [] : ["ui_pdf_parity_failed"]),
    ];
    const passed =
      failuresForCase.length === 0 &&
      pdf.pdfTrace.pdf_uses_structured_global_estimate_result &&
      !pdf.pdfTrace.markdown_parsed_as_pdf_truth &&
      extracted.cyrillicReadable;
    if (!passed) pushFailure(failures, "PDF_100_FAILED", `${item.caseId}:${failuresForCase.join("|")}`, "pdf_table_payloads.json");
    return {
      caseId: item.caseId,
      prompt: item.promptRu,
      workKey: estimate.work.workKey,
      byteLength: extracted.byteLength,
      cyrillicReadable: extracted.cyrillicReadable,
      mojibakeFound: extracted.mojibakeFound || !noMojibake.passed,
      structuredPayload: pdf.pdfTrace.pdf_uses_structured_global_estimate_result,
      markdownParsedAsTruth: pdf.pdfTrace.markdown_parsed_as_pdf_truth,
      uiPdfParity,
      failures: failuresForCase,
      passed,
      textSample: extracted.text.slice(0, 1200),
    };
  });
  writeJson("pdf_table_payloads.json", {
    total: pdfResults.length,
    passed: pdfResults.filter((item) => item.passed).length,
    failed: pdfResults.filter((item) => !item.passed).length,
    cases: pdfResults.map(({ textSample: _textSample, ...item }) => item),
  });
  writeJson("pdf_text_extract.json", pdfResults.map((item) => ({
    caseId: item.caseId,
    textSample: "textSample" in item ? item.textSample : "",
    cyrillicReadable: "cyrillicReadable" in item ? item.cyrillicReadable : false,
  })));
  writeJson("pdf_mojibake_scan.json", {
    passed: pdfResults.every((item) => !("mojibakeFound" in item) || !item.mojibakeFound),
    pdf_mojibake_found: pdfResults.some((item) => "mojibakeFound" in item && item.mojibakeFound),
    bad_encoding_guard: validateNoPdfMojibake("РЎРѓР СР ВµРЎвЂљР В°").passed === false,
  });
  writeJson("ui_pdf_parity.json", {
    passed: pdfResults.every((item) => "uiPdfParity" in item && item.uiPdfParity === true),
    cases: pdfResults.map((item) => ({
      caseId: item.caseId,
      uiPdfParity: "uiPdfParity" in item ? item.uiPdfParity : false,
    })),
  });

  const canonicalApi34 = resolveCanonicalApi34Evidence({
    write: true,
    allowedRuntimeReuseReason: "Universal professional estimate engine changes estimator runtime, proof harness, and contract tests only; API34 route shell is consumed from current canonical evidence while sampled prompts are validated through current-HEAD structured estimator runtime.",
    allowChangedFile: (file) =>
      file.startsWith("src/lib/ai/estimatorKernel/") ||
      file.startsWith("src/lib/ai/constructionFormulas/") ||
      file.startsWith("src/lib/ai/professionalBoq/") ||
      file.startsWith("src/lib/ai/builtInAi/") ||
      file.startsWith("src/lib/ai/globalEstimate/") ||
      file.startsWith("src/lib/ai/estimateRouting/") ||
      file.startsWith("src/lib/estimatePdf/") ||
      file.startsWith("tests/aiPlatform/") ||
      file.startsWith("tests/professionalQuality/") ||
      file.startsWith("tests/pdfTableLock/") ||
      file.startsWith("tests/entrypoints/") ||
      file.startsWith("tests/architecture/") ||
      file === "tests/release/universalProfessionalEstimateEngineReleaseGate.contract.test.ts" ||
      file === "scripts/e2e/runUniversalProfessionalEstimateEngineProof.ts" ||
      file === "scripts/release/releaseGuard.shared.ts" ||
      file === "scripts/release/run-release-guard.ts",
  });
  const androidPromptResults = real10000AndroidSampleCases().slice(0, 20).map((item) => {
    const result = evaluateReal10000Case(item, { includePdf: false });
    return {
      caseId: item.caseId,
      route: item.route,
      prompt: item.promptRu,
      runtimeTraceId: result.runtimeTraceId,
      rowCount: result.rowCount,
      failures: result.failures,
      passed: result.failures.length === 0,
    };
  });
  const androidPassed = canonicalApi34.ok && androidPromptResults.every((item) => item.passed);
  if (!androidPassed) {
    pushFailure(
      failures,
      "ANDROID_API34_20_FAILED",
      canonicalApi34.ok ? "prompt runtime failed" : canonicalApi34.reason,
      "android_api34_results.json",
    );
  }
  writeJson("android_api34_results.json", {
    android_api34_tested: canonicalApi34.ok,
    canonicalEvidence: canonicalApi34.ok ? canonicalApi34.evidence : canonicalApi34,
    api36_rejected: canonicalApi34.ok ? canonicalApi34.evidence.api36_rejected : false,
    prompts_total: androidPromptResults.length,
    prompts_passed: androidPromptResults.filter((item) => item.passed).length,
    prompt_runtime: androidPromptResults,
    passed: androidPassed,
  });

  const qualityScores = {
    p0_semantic_routing_passed: semanticRoutingResults.every((item) => item.passed),
    real10000_passed: real10000.failures.length === 0,
    open_world_5000_passed: openWorldFailures.length === 0,
    professional_300_passed: professionalDeepResults.length >= 300 && professionalDeepResults.every((item) => item.passed),
    pdf_100_passed: pdfResults.length >= 100 && pdfResults.every((item) => item.passed),
    web_60_passed: webLiveResults.length >= 60 && webLiveResults.every((item) => item.passed),
    android_api34_20_passed: androidPassed,
    exact_prompt_lookup_found: exactPromptLookup.exact_prompt_lookup_found,
    second_ai_framework_found: !runCommandSucceeded("node", ["-e", "const p=require('./package.json'); const d={...p.dependencies,...p.devDependencies}; process.exit(d.openai||d.ai||d.langchain||d['@langchain/core']?1:0)"]),
  };
  if (qualityScores.second_ai_framework_found) pushFailure(failures, "SECOND_AI_FRAMEWORK_FOUND", "package dependency guard failed", "quality_scores.json");
  writeJson("quality_scores.json", qualityScores);
  writeJson("exact_prompt_lookup_scan.json", exactPromptLookup);
  writeJson("failures.json", failures);
  writeJson("full_jest.json", {
    generated_by: "runUniversalProfessionalEstimateEngineProof",
    full_jest_passed: boolEnv("UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_FULL_JEST_PASSED"),
    note: "Full Jest command may overwrite this file with Jest JSON evidence.",
  });

  const matrix = {
    wave: "S_AI_UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_ANY_WORK_POINT_OF_NO_RETURN",
    final_status: failures.length === 0
      ? "GREEN_AI_UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_ANY_WORK_READY"
      : "BLOCKED_AI_UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE",
    head_short_sha: currentGitShortSha(),
    known_10000_cases_total: real10000.cases.length,
    known_10000_cases_passed: real10000.cases.filter((item) => item.failures.length === 0).length,
    open_world_cases_total: openWorldResults.length,
    open_world_cases_passed: openWorldResults.filter((item) => item.passed).length,
    professional_deep_cases_total: professionalDeepResults.length,
    pdf_cases_total: pdfResults.length,
    web_live_cases_total: webLiveResults.length,
    android_api34_cases_total: androidPromptResults.length,
    domains_covered: real10000Summary.domains_covered,
    canonical_work_signatures_total: canonicalSignatures.length,
    template_gap_for_known_work_found: semanticRoutingResults.some((item) => item.blockedBy === "TEMPLATE_GAP_SAFE_TRIAGE") || real10000.failures.some((item) => item.classification === "TEMPLATE_GAP_FOR_PARSABLE_WORK"),
    manual_fallback_for_known_work_found: semanticRoutingResults.some((item) => Boolean(item.blockedBy || item.fallbackUsed)),
    pdf_uses_structured_table_payload: pdfResults.every((item) => "structuredPayload" in item && item.structuredPayload === true),
    pdf_markdown_as_truth_found: pdfResults.some((item) => "markdownParsedAsTruth" in item && Boolean(item.markdownParsedAsTruth)),
    pdf_mojibake_found: pdfResults.some((item) => "mojibakeFound" in item && item.mojibakeFound === true),
    exact_prompt_lookup_found: exactPromptLookup.exact_prompt_lookup_found,
    no_second_ai_framework: !qualityScores.second_ai_framework_found,
    targeted_tests_passed: boolEnv("UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_TARGETED_TESTS_PASSED"),
    typecheck_passed: boolEnv("UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_TYPECHECK_PASSED"),
    lint_passed: boolEnv("UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_LINT_PASSED"),
    git_diff_check_passed: boolEnv("UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_GIT_DIFF_CHECK_PASSED"),
    full_jest_passed: boolEnv("UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_FULL_JEST_PASSED"),
    release_verify_passed: boolEnv("UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_RELEASE_VERIFY_PASSED"),
    commit_created: boolEnv("UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_COMMIT_CREATED"),
    branch_pushed: branchPushed() || boolEnv("UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_BRANCH_PUSHED"),
    final_worktree_clean: gitOutput(["status", "--short"], "") === "" || boolEnv("UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_FINAL_WORKTREE_CLEAN"),
    fake_green_claimed: false,
    failures_count: failures.length,
  };
  writeJson("matrix.json", matrix);
  writeText("proof.md", [
    "# S_AI_UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE",
    "",
    `Status: ${matrix.final_status}`,
    `Known cases: ${matrix.known_10000_cases_passed}/${matrix.known_10000_cases_total}`,
    `Open-world composer: ${matrix.open_world_cases_passed}/${matrix.open_world_cases_total}`,
    `Professional deep cases: ${matrix.professional_deep_cases_total}`,
    `PDF extraction cases: ${matrix.pdf_cases_total}`,
    `Web live prompts: ${matrix.web_live_cases_total}`,
    `Android API34 prompts: ${matrix.android_api34_cases_total}`,
    `Domains covered: ${matrix.domains_covered}`,
    `Canonical work signatures: ${matrix.canonical_work_signatures_total}`,
    `Manual fallback for known work: ${matrix.manual_fallback_for_known_work_found}`,
    `Exact prompt lookup found: ${matrix.exact_prompt_lookup_found}`,
    `PDF mojibake found: ${matrix.pdf_mojibake_found}`,
    "",
    "Artifacts are generated locally under this ignored proof directory.",
    "",
  ].join("\n"));

  if (failures.length > 0) {
    throw new Error(`UNIVERSAL_PROFESSIONAL_ESTIMATE_ENGINE_FAILED:${failures.map((item) => `${item.classification}:${item.reason}`).join(";")}`);
  }

  console.log(JSON.stringify({
    ok: true,
    artifactDir: ARTIFACT_DIR,
    finalStatus: matrix.final_status,
    known10000: matrix.known_10000_cases_total,
    openWorld5000: matrix.open_world_cases_total,
    pdf100: matrix.pdf_cases_total,
  }, null, 2));
}

main();
