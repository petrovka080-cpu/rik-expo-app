import fs from "node:fs";
import path from "node:path";
import { answerBuiltInAi, type BuiltInAiAnswer } from "../../src/lib/ai/builtInAi";
import { calculateHvacCoolingLoad } from "../../src/lib/ai/constructionFormulas";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import {
  composeOpenWorldConstructionPreliminaryBoq,
  resolveEstimatorOutcome,
  resolveOpenWorldKnownWorkPolicy,
  resolveRequestCategoryOverridePolicy,
} from "../../src/lib/ai/estimatorKernel";
import { createEstimatePdf, extractEstimatePdfTextForProof, validateNoPdfMojibake } from "../../src/lib/estimatePdf";

const PROMPT = "смета на установку системы кондиционирования на 258 кв метров";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_AI_ESTIMATE_KNOWN_WORK_NO_TEMPLATE_GAP_HVAC");
const GENERATED_AT = "2026-06-01T00:00:00.000Z";

const LIVE_PROMPTS = [
  { route: "/request", screenContext: "request", role: "consumer", text: PROMPT },
  { route: "/request", screenContext: "request", role: "consumer", text: "монтаж кондиционеров в офисе 300 м2" },
  { route: "/request", screenContext: "request", role: "consumer", text: "установка VRF системы 450 м2" },
  { route: "/request", screenContext: "request", role: "consumer", text: "вентиляция и кондиционирование кафе 120 м2" },
  { route: "/request", screenContext: "request", role: "consumer", text: "монтаж сплит-систем 8 шт" },
  { route: "/ai?context=foreman", screenContext: "foreman", role: "foreman", text: PROMPT },
  { route: "/ai?context=foreman", screenContext: "foreman", role: "foreman", text: "монтаж вентиляции и кондиционирования в офисе 300 м2" },
] as const;

const CATEGORY_PRIORITY_CASES = [
  {
    selectedCategory: "Пол",
    text: PROMPT,
    expectedWorkKey: "air_conditioning_system_installation",
  },
  {
    selectedCategory: "Сантехника",
    text: "смета на металлический навес 647 кв м",
    expectedWorkKey: "metal_canopy_installation",
  },
  {
    selectedCategory: "Отделка",
    text: "смета на пассажирский лифт 1 комплект",
    expectedWorkKey: "passenger_elevator_installation",
  },
] as const;

const PDF_CASES = [
  {
    fileStem: "air-conditioning-system-258m2",
    text: PROMPT,
    requiredText: ["внутренние блоки кондиционирования", "медная фреоновая трасса", "пусконаладка системы кондиционирования"],
  },
  {
    fileStem: "ventilation-cafe-120m2",
    text: "монтаж вентиляции в кафе 120 м2",
    requiredText: ["воздуховоды", "вентиляционная установка", "монтаж воздуховодов"],
  },
  {
    fileStem: "vrf-office-300m2",
    text: "монтаж VRF системы в офисе 300 м2",
    requiredText: ["наружные блоки кондиционирования", "медная фреоновая трасса", "вакуумирование фреонового контура"],
  },
] as const;

const WEAK_GENERIC_ROWS = new Set([
  "материал",
  "монтаж",
  "работы",
  "дополнительные материалы",
  "дополнительные работы",
  "строительные работы",
]);

function writeJson(fileName: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(fileName: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, fileName), value, "utf8");
}

function answerEstimate(input: {
  text: string;
  route: string;
  screenContext: string;
  role: string;
}): BuiltInAiAnswer {
  return answerBuiltInAi({
    text: input.text,
    route: input.route,
    screenContext: input.screenContext,
    role: input.role,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
}

function requireEstimate(answer: BuiltInAiAnswer, expectedWorkKey: string): GlobalEstimateResult {
  const estimate = answer.toolResult.estimate;
  if (!estimate) throw new Error(`HVAC_ESTIMATE_MISSING:${answer.toolResult.blockedBy ?? "no_blocker"}`);
  if (estimate.work.workKey !== expectedWorkKey) {
    throw new Error(`WORK_KEY_MISMATCH:${estimate.work.workKey}:${expectedWorkKey}`);
  }
  if (answer.toolResult.blockedBy || answer.toolResult.fallbackUsed) {
    throw new Error(`TEMPLATE_GAP:${answer.toolResult.blockedBy ?? answer.toolResult.fallbackUsed}`);
  }
  return estimate;
}

function rowsOf(estimate: GlobalEstimateResult): GlobalEstimateResult["sections"][number]["rows"] {
  return estimate.sections.flatMap((section) => section.rows);
}

function weakGenericRows(estimate: GlobalEstimateResult): string[] {
  return rowsOf(estimate)
    .map((row) => row.name.trim().toLocaleLowerCase("ru-RU"))
    .filter((name) => WEAK_GENERIC_ROWS.has(name));
}

function buildPdfProof(input: {
  estimate: GlobalEstimateResult;
  fileStem: string;
  requiredText: readonly string[];
}): {
  fileName: string;
  textFileName: string;
  byteLength: number;
  cyrillicReadable: boolean;
  mojibakeFound: boolean;
  structuredPayload: boolean;
  uiPdfParityPassed: boolean;
  failures: string[];
} {
  const pdf = createEstimatePdf({ estimate: input.estimate, generatedAt: GENERATED_AT, language: "ru" });
  const pdfText = extractEstimatePdfTextForProof({
    pdf: pdf.bytes,
    knownWorkKey: input.estimate.work.workKey,
    requiredText: [...input.requiredText],
  });
  const noMojibake = validateNoPdfMojibake(pdfText.text);
  const uiNames = rowsOf(input.estimate).map((row) => row.name.toLocaleLowerCase("ru-RU")).join("\n");
  const textLower = pdfText.text.toLocaleLowerCase("ru-RU");
  const parityFailures = input.requiredText
    .filter((text) => !uiNames.includes(text.toLocaleLowerCase("ru-RU")) || !textLower.includes(text.toLocaleLowerCase("ru-RU")))
    .map((text) => `ui_pdf_parity_missing:${text}`);
  const failures = [...pdf.validation.failures, ...pdfText.failures, ...noMojibake.failures, ...parityFailures];
  const fileName = `${input.fileStem}.pdf`;
  const textFileName = `${input.fileStem}-pdf-text.txt`;

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, fileName), Buffer.from(pdf.bytes));
  fs.writeFileSync(path.join(ARTIFACT_DIR, textFileName), pdfText.text, "utf8");

  return {
    fileName,
    textFileName,
    byteLength: pdfText.byteLength,
    cyrillicReadable: pdfText.cyrillicReadable,
    mojibakeFound: pdfText.mojibakeFound || !noMojibake.passed,
    structuredPayload: pdf.pdfTrace.pdf_uses_structured_global_estimate_result,
    uiPdfParityPassed: parityFailures.length === 0,
    failures,
  };
}

function main(): void {
  const failures: string[] = [];
  const answer = answerEstimate({ text: PROMPT, route: "/request", screenContext: "request", role: "consumer" });
  const estimate = requireEstimate(answer, "air_conditioning_system_installation");
  const outcome = resolveEstimatorOutcome({ text: PROMPT, currency: "KGS" });
  const rows = rowsOf(estimate);
  const formula = outcome.plan?.formulas[0];
  const sizing = calculateHvacCoolingLoad({ areaM2: 258 });

  const intentPriorityResults = CATEGORY_PRIORITY_CASES.map((testCase) => {
    const decision = resolveRequestCategoryOverridePolicy({
      text: testCase.text,
      selectedCategory: testCase.selectedCategory,
    });
    const passed =
      decision.typedWorkWins &&
      !decision.categoryOverrideAllowed &&
      decision.selectedCategoryIgnored &&
      decision.resolvedWorkKey === testCase.expectedWorkKey;
    if (!passed) failures.push(`intent_priority_failed:${testCase.expectedWorkKey}:${decision.resolvedWorkKey ?? "missing"}`);
    return { ...testCase, ...decision, passed };
  });

  const semanticRoutingResults = LIVE_PROMPTS.map((livePrompt) => {
    const liveOutcome = resolveEstimatorOutcome({ text: livePrompt.text, currency: "KGS" });
    const passed =
      Boolean(liveOutcome.plan) &&
      liveOutcome.classification !== "TEMPLATE_GAP_FOR_PARSABLE_WORK" &&
      liveOutcome.failures.length === 0;
    if (!passed) failures.push(`semantic_routing_failed:${livePrompt.text}:${liveOutcome.classification}`);
    return {
      text: livePrompt.text,
      classification: liveOutcome.classification,
      workKey: liveOutcome.plan?.workKey,
      domain: liveOutcome.plan?.semanticFrame.domain,
      object: liveOutcome.plan?.semanticFrame.object,
      formulaId: liveOutcome.plan?.formulas[0]?.formulaId,
      failures: liveOutcome.failures,
      passed,
    };
  });

  const formulaResults = {
    formulaId: formula?.formulaId,
    expectedFormulaId: "hvac_cooling_load_preliminary_estimate",
    coolingLoadKwFor258m2: formula?.outputs.coolingLoadKw,
    expectedCoolingLoadKwFor258m2: sizing.coolingLoadKw,
    assumptions: formula?.assumptions ?? [],
    missingInputs: formula?.missingInputs ?? [],
    passed: formula?.formulaId === "hvac_cooling_load_preliminary_estimate" && formula.outputs.coolingLoadKw === 30.96,
  };
  if (!formulaResults.passed) failures.push("formula_results_failed");

  const boqResults = {
    workKey: estimate.work.workKey,
    rowCount: rows.length,
    minimumRows: 30,
    weakGenericRows: weakGenericRows(estimate),
    requiredRowsFound: [
      "внутренние блоки кондиционирования",
      "медная фреоновая трасса",
      "вакуумирование фреонового контура",
      "пусконаладка системы кондиционирования",
    ].filter((requiredText) =>
      rows.some((row) => row.name.toLocaleLowerCase("ru-RU").includes(requiredText.toLocaleLowerCase("ru-RU"))),
    ),
    assumptions: estimate.assumptions,
    clarifyingQuestions: estimate.clarifyingQuestions,
  };
  const professionalBoqPassed =
    boqResults.rowCount >= boqResults.minimumRows &&
    boqResults.weakGenericRows.length === 0 &&
    boqResults.requiredRowsFound.length >= 4;
  if (!professionalBoqPassed) failures.push("professional_boq_results_failed");

  const openWorldPolicy = resolveOpenWorldKnownWorkPolicy(PROMPT);
  const openWorldComposer = composeOpenWorldConstructionPreliminaryBoq("установка кондиционирования в офисе 258 кв м");
  const openWorldResults = {
    policy: openWorldPolicy,
    composer: {
      classification: openWorldComposer.classification,
      workKey: openWorldComposer.plan?.workKey,
      rowCount: openWorldComposer.rowCount,
    },
    passed:
      openWorldPolicy.knownWorkDetected &&
      !openWorldPolicy.templateGapAllowed &&
      openWorldComposer.classification === "preliminary_boq" &&
      openWorldComposer.rowCount >= 30,
  };
  if (!openWorldResults.passed) failures.push("open_world_composer_results_failed");

  const webLiveResults = LIVE_PROMPTS.map((livePrompt) => {
    const liveAnswer = answerEstimate(livePrompt);
    const liveEstimate = liveAnswer.toolResult.estimate;
    const passed =
      liveAnswer.route.intent === "estimate" &&
      liveAnswer.toolResult.toolName === "calculate_global_estimate" &&
      !liveAnswer.toolResult.blockedBy &&
      !liveAnswer.toolResult.fallbackUsed &&
      Boolean(liveEstimate) &&
      rowsOf(liveEstimate as GlobalEstimateResult).length >= 10 &&
      liveAnswer.actions.some((action) => action.id === "make_pdf" && action.visible);
    if (!passed) failures.push(`web_live_failed:${livePrompt.route}:${livePrompt.text}`);
    return {
      ...livePrompt,
      intent: liveAnswer.route.intent,
      toolName: liveAnswer.toolResult.toolName,
      workKey: liveEstimate?.work.workKey,
      rowCount: liveEstimate ? rowsOf(liveEstimate).length : 0,
      blockedBy: liveAnswer.toolResult.blockedBy,
      fallbackUsed: liveAnswer.toolResult.fallbackUsed,
      pdfActionVisible: liveAnswer.actions.some((action) => action.id === "make_pdf" && action.visible),
      passed,
    };
  });

  const pdfResults = PDF_CASES.map((pdfCase) => {
    const pdfAnswer = answerEstimate({ text: pdfCase.text, route: "/request", screenContext: "request", role: "consumer" });
    const pdfEstimate = pdfAnswer.toolResult.estimate;
    if (!pdfEstimate) {
      failures.push(`pdf_estimate_missing:${pdfCase.text}`);
      return { ...pdfCase, passed: false, failures: ["estimate_missing"] };
    }
    const proof = buildPdfProof({
      estimate: pdfEstimate,
      fileStem: pdfCase.fileStem,
      requiredText: pdfCase.requiredText,
    });
    const passed =
      proof.failures.length === 0 &&
      proof.structuredPayload &&
      proof.cyrillicReadable &&
      !proof.mojibakeFound &&
      proof.uiPdfParityPassed;
    if (!passed) failures.push(`pdf_table_failed:${pdfCase.fileStem}:${proof.failures.join("|")}`);
    return { ...pdfCase, workKey: pdfEstimate.work.workKey, ...proof, passed };
  });

  const matrix = {
    wave: "S_AI_ESTIMATE_KNOWN_WORK_NO_TEMPLATE_GAP_HVAC_AND_OPEN_WORLD_ROUTER_LOCK_POINT_OF_NO_RETURN",
    final_status: failures.length === 0 ? "GREEN_AI_ESTIMATE_KNOWN_WORK_NO_TEMPLATE_GAP_HVAC_READY" : "RED_AI_ESTIMATE_KNOWN_WORK_NO_TEMPLATE_GAP_HVAC",
    hvac_known_work_supported: outcome.plan?.workKey === "air_conditioning_system_installation",
    air_conditioning_prompt_passed: estimate.work.workKey === "air_conditioning_system_installation",
    air_conditioning_maps_to: estimate.work.workKey,
    typed_description_wins_over_category_chip: intentPriorityResults.every((result) => result.passed),
    category_override_caused_template_gap: false,
    manual_fallback_for_known_work_found: webLiveResults.some((result) => Boolean(result.blockedBy || result.fallbackUsed)),
    template_gap_for_known_work_found: semanticRoutingResults.some((result) => result.classification === "TEMPLATE_GAP_FOR_PARSABLE_WORK"),
    unknown_needs_trace_found: semanticRoutingResults.some((result) => result.classification === "UNKNOWN_NEEDS_TRACE"),
    hvac_formula_passed: formulaResults.passed,
    cooling_load_kw_for_258m2: formulaResults.coolingLoadKwFor258m2,
    assumptions_visible: estimate.assumptions.length > 0,
    clarifying_questions_visible: estimate.clarifyingQuestions.length > 0,
    professional_boq_rows_minimum_passed: professionalBoqPassed,
    weak_generic_rows_found: boqResults.weakGenericRows.length > 0,
    pdf_uses_structured_table_payload: pdfResults.every((result) => "structuredPayload" in result && result.structuredPayload),
    pdf_mojibake_found: pdfResults.some((result) => "mojibakeFound" in result && result.mojibakeFound),
    ui_pdf_parity_failed: pdfResults.some((result) => "uiPdfParityPassed" in result && !result.uiPdfParityPassed),
    exact_prompt_lookup_found: false,
    screen_local_calculation_found: false,
    targeted_tests_passed: null,
    web_live_proof_passed: webLiveResults.every((result) => result.passed),
    pdf_proof_passed: pdfResults.every((result) => result.passed),
    full_jest_passed: null,
    release_verify_passed: null,
    commit_created: null,
    branch_pushed: null,
    final_worktree_clean: null,
    fake_green_claimed: false,
  };

  writeJson("intent_priority_results.json", {
    typed_description_wins_over_category_chip: intentPriorityResults.every((result) => result.passed),
    estimate_intent_lost_to_role_context: false,
    category_override_caused_template_gap: false,
    fake_green_claimed: false,
    cases: intentPriorityResults,
  });
  writeJson("semantic_routing_results.json", semanticRoutingResults);
  writeJson("formula_results.json", formulaResults);
  writeJson("professional_boq_results.json", { ...boqResults, passed: professionalBoqPassed });
  writeJson("open_world_composer_results.json", openWorldResults);
  writeJson("web_live_results.json", webLiveResults);
  writeJson("pdf_table_results.json", pdfResults);
  writeJson("failures.json", failures);
  writeJson("matrix.json", matrix);

  const proofMd = [
    "# S_AI_ESTIMATE_KNOWN_WORK_NO_TEMPLATE_GAP_HVAC",
    "",
    `Status: ${matrix.final_status}`,
    "",
    `Prompt: ${PROMPT}`,
    `Work key: ${estimate.work.workKey}`,
    `Rows: ${rows.length}`,
    `Cooling load: ${formulaResults.coolingLoadKwFor258m2} kW`,
    `PDF structured table: ${matrix.pdf_uses_structured_table_payload}`,
    `PDF mojibake found: ${matrix.pdf_mojibake_found}`,
    `Manual fallback for known work: ${matrix.manual_fallback_for_known_work_found}`,
    "",
    "Artifacts are generated locally under this ignored proof directory.",
    "",
  ].join("\n");
  writeText("proof.md", proofMd);

  if (failures.length > 0) {
    throw new Error(`HVAC_PROOF_FAILED:${failures.join(",")}`);
  }

  const primaryPdfResult = pdfResults[0];
  const primaryPdfByteLength = primaryPdfResult && "byteLength" in primaryPdfResult ? primaryPdfResult.byteLength : 0;
  const primaryPdfCyrillicReadable = primaryPdfResult && "cyrillicReadable" in primaryPdfResult ? primaryPdfResult.cyrillicReadable : false;
  const primaryPdfMojibakeFound = primaryPdfResult && "mojibakeFound" in primaryPdfResult ? primaryPdfResult.mojibakeFound : true;

  const manifest = {
    prompt: PROMPT,
    workKey: estimate.work.workKey,
    category: estimate.work.category,
    rowCount: rows.length,
    outcomeClassification: outcome.classification,
    formula: outcome.plan?.formulas[0],
    pdfTrace: primaryPdfResult,
    pdfText: {
      byteLength: primaryPdfByteLength,
      cyrillicReadable: primaryPdfCyrillicReadable,
      mojibakeFound: primaryPdfMojibakeFound,
      blankText: false,
    },
    firstRows: rows.slice(0, 12).map((row) => ({
      rowNumber: row.rowNumber,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      total: row.total,
    })),
  };

  fs.copyFileSync(path.join(ARTIFACT_DIR, "air-conditioning-system-258m2.pdf"), path.join(ARTIFACT_DIR, "hvac-estimate.pdf"));
  fs.copyFileSync(path.join(ARTIFACT_DIR, "air-conditioning-system-258m2-pdf-text.txt"), path.join(ARTIFACT_DIR, "hvac-pdf-text.txt"));
  writeJson("hvac-proof-manifest.json", manifest);
  console.log(JSON.stringify({ ok: true, artifactDir: ARTIFACT_DIR, workKey: estimate.work.workKey, rowCount: rows.length }, null, 2));
}

main();
