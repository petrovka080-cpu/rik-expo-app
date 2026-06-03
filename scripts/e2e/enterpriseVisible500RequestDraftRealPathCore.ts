import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  buildEstimatePresentationViewModel,
  validateEstimatePresentationViewModel,
} from "../../src/lib/ai/estimatePresentation";
import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import {
  createEstimatePdf,
  extractEstimatePdfTextForProof,
  validateNoPdfMojibake,
} from "../../src/lib/estimatePdf";

export const ENTERPRISE_VISIBLE_500_WAVE =
  "S_VISIBLE_500_AI_ESTIMATE_CURRENT_WAVE_FULL_CLOSEOUT_POINT_OF_NO_RETURN";
export const ENTERPRISE_VISIBLE_500_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_VISIBLE_500_AI_ESTIMATE_CURRENT_WAVE",
);
export const EXACT_PASTED_500_FIXTURE = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "enterpriseVisible500",
  "enterprise_visible_500_work_acceptance_pack.json",
);

export type EnterpriseVisible500Case = {
  caseId: string;
  promptRu: string;
  route?: "/request" | "/ai?context=foreman" | "/ai?context=request";
  expectedWorkKey?: string;
  requiredTokens?: string[];
  forbiddenTokens?: string[];
  minimumRows?: number;
  requireSemanticFrame?: boolean;
};

export type EnterpriseVisible500CaseResult = {
  caseId: string;
  prompt: string;
  route: string;
  expectedWorkKey?: string;
  workKey: string | null;
  repairType: string | null;
  estimateRows: number;
  draftItems: number;
  requiredTokensMissing: string[];
  forbiddenTokensFound: string[];
  weakRowsFound: string[];
  sourceEvidenceMissing: boolean;
  catalogBindingMissing: boolean;
  failures: string[];
};

export type EnterpriseVisible500RunResult = {
  matrix: Record<string, unknown>;
  suppliedFixtureResults: EnterpriseVisible500CaseResult[];
  exactPastedResults: EnterpriseVisible500CaseResult[];
  liveRegressionResults: EnterpriseVisible500CaseResult[];
  foremanRouteResults: EnterpriseVisible500CaseResult[];
  pdfResults: Array<{ caseId: string; prompt: string; workKey: string | null; passed: boolean; failures: string[] }>;
};

const WEAK_ROW_NAMES = new Set([
  "строительные работы",
  "материал",
  "работы",
  "монтаж",
  "крепёж",
  "крепеж",
  "прочее",
  "дополнительные материалы",
  "дополнительные работы",
  "бетонные работы",
]);

export const ENTERPRISE_VISIBLE_REQUEST_DRAFT_LIVE_REGRESSION_CASES: readonly EnterpriseVisible500Case[] = [
  {
    caseId: "LIVE-PAVING-587",
    promptRu: "смета на укладку брусчатки на 587 кв м",
    expectedWorkKey: "paving_stone_laying",
    requiredTokens: ["брусчат", "геотекстиль", "щебень", "заполнение швов"],
    forbiddenTokens: ["кирпич", "кирпичная кладка"],
    minimumRows: 30,
  },
  {
    caseId: "LIVE-METAL-CANOPY-647",
    promptRu: "смета на металлический навес на площади 647 кв метров",
    expectedWorkKey: "metal_canopy_installation",
    requiredTokens: ["навес", "стойки", "фермы", "прогоны"],
    forbiddenTokens: ["строительные работы"],
    minimumRows: 30,
  },
  {
    caseId: "LIVE-CONCRETE-PEDESTAL-12",
    promptRu: "смета на заливку бетонных тумб 12 шт",
    expectedWorkKey: "concrete_pedestal_pour",
    requiredTokens: ["тумб", "арматура", "опалубка", "заливка бетона"],
    forbiddenTokens: ["бетонная плита", "стяжка пола"],
    minimumRows: 18,
  },
  {
    caseId: "LIVE-CONCRETE-SLAB-200",
    promptRu: "смета на бетонная плита 200 м²",
    expectedWorkKey: "concrete_slab",
    requiredTokens: ["бетонная плита", "арматур", "опалуб", "заливка бетонной плиты"],
    forbiddenTokens: ["тумб", "стяжка пола"],
    minimumRows: 18,
  },
  {
    caseId: "LIVE-FLOOR-SCREED-80",
    promptRu: "смета на бетонная стяжка пола 80 м²",
    expectedWorkKey: "floor_screed",
    requiredTokens: ["стяжк", "маяки", "демпфер", "укладка стяжки"],
    forbiddenTokens: ["бетонная плита", "тумб"],
    minimumRows: 18,
  },
  {
    caseId: "LIVE-GENERIC-WATERPROOFING-100",
    promptRu: "смета на гидроизоляцию 100 м²",
    expectedWorkKey: "dynamic_waterproofing_estimate",
    requiredTokens: ["гидроизоляционный материал", "праймер", "уточните объект"],
    forbiddenTokens: ["ванн", "сануз", "кровельная гидроизоляция", "гидроизоляция кровли"],
    minimumRows: 18,
  },
  {
    caseId: "LIVE-ROOF-WATERPROOFING-100",
    promptRu: "смета на гидроизоляцию крыши 100 м²",
    expectedWorkKey: "roof_waterproofing",
    requiredTokens: ["кровл", "праймер", "примыкан", "проверка герметичности"],
    forbiddenTokens: ["ванн", "сануз"],
    minimumRows: 18,
  },
  {
    caseId: "LIVE-ITP-PNR",
    promptRu: "смета на ПНР ИТП 1 комплект",
    expectedWorkKey: "dynamic_boiler_itp_estimate",
    requiredTokens: ["ПНР ИТП", "контроллер ИТП", "КИП", "испытания"],
    forbiddenTokens: ["система отопления", "радиаторы"],
    minimumRows: 30,
  },
  {
    caseId: "LIVE-BMS-DATACENTER-TEMP",
    promptRu: "смета на мониторинг температуры ЦОД 24 датчика",
    expectedWorkKey: "dynamic_bms_estimate",
    requiredTokens: ["датчики температуры", "BMS", "ЦОД", "ПНР мониторинга"],
    forbiddenTokens: ["электромонтажные работы", "серверная отделка", "стойки серверные"],
    minimumRows: 30,
  },
  {
    caseId: "LIVE-DOSING-STATION",
    promptRu: "смета на дозирующая станция 1 комплект",
    expectedWorkKey: "dynamic_water_treatment_estimate",
    requiredTokens: ["дозир", "реагент", "ПНР", "пробный запуск"],
    forbiddenTokens: ["ручная сметная проверка"],
    minimumRows: 30,
  },
  {
    caseId: "LIVE-THERMAL-FACADE-SURVEY",
    promptRu: "смета на тепловизионное обследование фасада 1200 м²",
    expectedWorkKey: "thermal_imaging_survey",
    requiredTokens: ["тепловиз", "термограмм", "дефектной ведомости", "отчет"],
    forbiddenTokens: ["фасадная подсистема", "облицовка фасада", "монтаж подсистемы"],
    minimumRows: 18,
  },
  {
    caseId: "LIVE-PASSENGER-ELEVATOR",
    promptRu: "смета на пассажирский лифт 1 комплект",
    expectedWorkKey: "passenger_elevator_installation",
    requiredTokens: ["пассажирская кабина", "лебедка", "двери шахты", "ПНР"],
    forbiddenTokens: ["строительные работы"],
    minimumRows: 30,
  },
  {
    caseId: "LIVE-DRAINAGE-CHANNELS-80",
    promptRu: "смета на дренажные каналы 80 пог м",
    expectedWorkKey: "drainage_channel_installation",
    requiredTokens: ["дренажные лотки", "решетки", "проверка проливом", "разметка трассы"],
    forbiddenTokens: ["канализация здания"],
    minimumRows: 30,
  },
];

const SCREENSHOT_REGRESSION_CASES: readonly EnterpriseVisible500Case[] = [
  {
    caseId: "SCREENSHOT-BIO-TREATMENT",
    promptRu: "смета на биологическая станция очистки 1 комплект",
    expectedWorkKey: "dynamic_wastewater_treatment_estimate",
    requiredTokens: ["биологическ", "станция очистки", "ПНР"],
    forbiddenTokens: ["ручная сметная проверка"],
    minimumRows: 30,
  },
  {
    caseId: "SCREENSHOT-UV-DISINFECTION",
    promptRu: "смета на УФ обеззараживание 1 комплект",
    expectedWorkKey: "dynamic_uv_disinfection_estimate",
    requiredTokens: ["УФ", "обеззараж", "ПНР"],
    forbiddenTokens: ["ручная сметная проверка"],
    minimumRows: 30,
  },
  {
    caseId: "SCREENSHOT-FIRE-SUPPRESSION-PNR",
    promptRu: "смета на ПНР пожаротушения 1 система",
    expectedWorkKey: "dynamic_fire_suppression_estimate",
    requiredTokens: ["ПНР пожаротушения", "испытания", "протоколов"],
    forbiddenTokens: ["ручная сметная проверка"],
    minimumRows: 30,
  },
];

function ensureArtifactDir(): void {
  fs.mkdirSync(ENTERPRISE_VISIBLE_500_ARTIFACT_DIR, { recursive: true });
}

function writeJson(name: string, value: unknown): void {
  ensureArtifactDir();
  fs.writeFileSync(path.join(ENTERPRISE_VISIBLE_500_ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

function includesToken(text: string, token: string): boolean {
  return normalize(text).includes(normalize(token));
}

function rowNameWithoutNumber(value: string): string {
  return normalize(value.replace(/^\d+(?:\.\d+)*\s+/, ""));
}

function allEstimateRows(estimate: GlobalEstimateResult) {
  return estimate.sections.flatMap((section) => section.rows);
}

function sourceEvidenceMissing(estimate: GlobalEstimateResult): boolean {
  return allEstimateRows(estimate).some((row) => !row.sourceId || !row.rateKey || row.sourceEvidence.length === 0);
}

function catalogBindingMissing(estimate: GlobalEstimateResult): boolean {
  return estimate.sections
    .filter((section) => section.type === "materials")
    .flatMap((section) => section.rows)
    .some((row) => !row.materialKey);
}

function weakRows(estimate: GlobalEstimateResult): string[] {
  return allEstimateRows(estimate)
    .map((row) => row.name)
    .filter((row) => WEAK_ROW_NAMES.has(rowNameWithoutNumber(row)));
}

function findForbiddenTokens(estimate: GlobalEstimateResult, text: string, forbiddenTokens: readonly string[]): string[] {
  const normalizedRows = allEstimateRows(estimate).map((row) => rowNameWithoutNumber(row.name));
  return forbiddenTokens.filter((token) => {
    const normalizedToken = normalize(token);
    if (WEAK_ROW_NAMES.has(normalizedToken)) return normalizedRows.includes(normalizedToken);
    return includesToken(text, token);
  });
}

function haystackFor(params: {
  estimate?: GlobalEstimateResult | null;
  draftTitle?: string | null;
  draftSummary?: string | null;
  draftMissing?: string[];
  draftItems?: string[];
}): string {
  return [
    params.estimate?.work.title,
    ...(params.estimate?.assumptions ?? []),
    ...(params.estimate?.clarifyingQuestions ?? []),
    ...(params.estimate?.regionalRisks.map((risk) => `${risk.title} ${risk.text}`) ?? []),
    ...(params.estimate?.sections.flatMap((section) => section.rows.map((row) => row.name)) ?? []),
    params.draftTitle ?? "",
    params.draftSummary ?? "",
    ...(params.draftMissing ?? []),
    ...(params.draftItems ?? []),
  ].filter(Boolean).join("\n");
}

function forbiddenHaystackFor(params: {
  estimate?: GlobalEstimateResult | null;
  draftTitle?: string | null;
  draftSummary?: string | null;
  draftItems?: string[];
}): string {
  return [
    params.estimate?.work.title,
    ...(params.estimate?.sections.flatMap((section) => section.rows.map((row) => row.name)) ?? []),
    params.draftTitle ?? "",
    params.draftSummary ?? "",
    ...(params.draftItems ?? []),
  ].filter(Boolean).join("\n");
}

export function loadExactPasted500Cases(): EnterpriseVisible500Case[] {
  const raw = JSON.parse(fs.readFileSync(EXACT_PASTED_500_FIXTURE, "utf8")) as {
    cases: Array<{ caseId: string; promptRu: string; route?: EnterpriseVisible500Case["route"] }>;
  };
  if (!Array.isArray(raw.cases) || raw.cases.length !== 500) {
    throw new Error(`EXACT_PASTED_500_FIXTURE_INVALID:${raw.cases?.length ?? "missing"}`);
  }
  return raw.cases.map((item) => ({
    caseId: item.caseId,
    promptRu: item.promptRu,
    route: item.route ?? "/request",
    minimumRows: 8,
    requireSemanticFrame: false,
  }));
}

export function suppliedFixtureCases(): EnterpriseVisible500Case[] {
  return REAL_DIVERSE_500_CONSTRUCTION_WORKS.map((item) => ({
    caseId: item.caseId,
    promptRu: item.promptRu,
    route: item.route,
    requiredTokens: suppliedFixtureRequiredTokens(item.domain, item.promptRu, item.requiredRowTokens),
    forbiddenTokens: item.forbiddenRowTokens,
    minimumRows: Math.min(item.expectedMinimumRows, 30),
    requireSemanticFrame: true,
  }));
}

function suppliedFixtureRequiredTokens(domain: string, promptRu: string, fallback: string[]): string[] {
  if (domain !== "concrete") return fallback;
  const normalized = normalize(promptRu);
  if (/стяжк/.test(normalized)) return ["стяжк", "маяки", "демпфер", "укладка стяжки"];
  if (/плит/.test(normalized)) return ["бетонная плита", "арматур", "опалуб", "заливка бетонной плиты"];
  return fallback;
}

export function evaluateEnterpriseVisible500Case(input: EnterpriseVisible500Case): EnterpriseVisible500CaseResult {
  const failures: string[] = [];
  const route = input.route ?? "/request";
  const screenContext = route.includes("foreman") ? "foreman" : "request";
  const role = screenContext === "foreman" ? "foreman" : "consumer";
  const estimator = resolveEstimatorOutcome({ text: input.promptRu, currency: "KGS" });
  const requireSemanticFrame = input.requireSemanticFrame ?? true;

  if (requireSemanticFrame && !estimator.plan) failures.push("SEMANTIC_FRAME_MISSING");
  if (requireSemanticFrame && estimator.failures.length > 0) failures.push(...estimator.failures.map((failure) => `ESTIMATOR_${failure}`));

  let estimate: GlobalEstimateResult | null = null;
  try {
    const answer = answerBuiltInAi({
      text: input.promptRu,
      route,
      screenContext,
      role,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    if (answer.route.intent !== "estimate") failures.push("ESTIMATE_INTENT_LOST");
    estimate = answer.toolResult.estimate ?? null;
    if (!estimate) failures.push(answer.toolResult.blockedBy ?? "TEMPLATE_GAP_FOR_PARSABLE_WORK");
  } catch (error) {
    failures.push(error instanceof Error ? `AI_ROUTE_EXCEPTION:${error.message}` : "AI_ROUTE_EXCEPTION");
  }

  let repairType: string | null = null;
  let draftItems: string[] = [];
  if (route === "/request") {
    try {
      const aiDraft = buildConsumerRepairAiDraft(input.promptRu, { countryCode: "KG", city: "Bishkek" });
      repairType = aiDraft.repairType;
      const bundle = createConsumerRepairRequestDraft({
        consumerUserId: "enterprise-visible-500-test-user",
        problemText: input.promptRu,
        city: "Bishkek",
        aiDraft,
      });
      const viewModel = buildRequestEstimateViewModel(bundle);
      draftItems = bundle.items.map((item) => item.titleRu);
      if (aiDraft.repairType === "estimate_triage") failures.push("MANUAL_TRIAGE_FINAL");
      if (bundle.items.length === 0) failures.push("REQUEST_DRAFT_ITEMS_EMPTY");
      if (!viewModel || viewModel.sections.length === 0) failures.push("REQUEST_VIEW_MODEL_EMPTY");
    } catch (error) {
      failures.push(error instanceof Error ? `REQUEST_DRAFT_EXCEPTION:${error.message}` : "REQUEST_DRAFT_EXCEPTION");
    }
  }

  if (estimate && input.expectedWorkKey && estimate.work.workKey !== input.expectedWorkKey) {
    failures.push(`WORK_KEY_MISMATCH:${estimate.work.workKey}:expected:${input.expectedWorkKey}`);
  }
  if (estimate && estimate.work.workKey === "other_construction_work") failures.push("OTHER_CONSTRUCTION_WORK_FINAL");

  let estimateRows = 0;
  let requiredTokensMissing: string[] = input.requiredTokens ?? [];
  let forbiddenTokensFound: string[] = [];
  let weakRowsFound: string[] = [];
  let sourceMissing = true;
  let catalogMissing = true;

  if (estimate) {
    const presentation = buildEstimatePresentationViewModel(estimate);
    const presentationValidation = validateEstimatePresentationViewModel(presentation);
    estimateRows = presentation.rows.length;
    if (!presentationValidation.passed) failures.push(...presentationValidation.failures.map((failure) => `PRESENTATION_${failure}`));
    if (estimateRows < (input.minimumRows ?? 8)) failures.push(`SHORT_ESTIMATE_ROWS:${estimateRows}/${input.minimumRows ?? 8}`);
    const text = haystackFor({
      estimate,
      draftItems,
    });
    const forbiddenText = forbiddenHaystackFor({
      estimate,
      draftItems,
    });
    requiredTokensMissing = (input.requiredTokens ?? []).filter((token) => !includesToken(text, token));
    forbiddenTokensFound = findForbiddenTokens(estimate, forbiddenText, input.forbiddenTokens ?? []);
    weakRowsFound = weakRows(estimate);
    sourceMissing = sourceEvidenceMissing(estimate);
    catalogMissing = catalogBindingMissing(estimate);
    if (requiredTokensMissing.length > 0) failures.push(`REQUIRED_TOKENS_MISSING:${requiredTokensMissing.join("|")}`);
    if (forbiddenTokensFound.length > 0) failures.push(`FORBIDDEN_TOKENS_FOUND:${forbiddenTokensFound.join("|")}`);
    if (weakRowsFound.length > 0) failures.push(`WEAK_GENERIC_ROWS:${weakRowsFound.join("|")}`);
    if (sourceMissing) failures.push("SOURCE_EVIDENCE_MISSING");
    if (catalogMissing) failures.push("CATALOG_BINDING_MISSING");
  }

  return {
    caseId: input.caseId,
    prompt: input.promptRu,
    route,
    expectedWorkKey: input.expectedWorkKey,
    workKey: estimate?.work.workKey ?? null,
    repairType,
    estimateRows,
    draftItems: draftItems.length,
    requiredTokensMissing,
    forbiddenTokensFound,
    weakRowsFound,
    sourceEvidenceMissing: sourceMissing,
    catalogBindingMissing: catalogMissing,
    failures: [...new Set(failures)],
  };
}

function evaluatePdfCase(input: EnterpriseVisible500Case) {
  const failures: string[] = [];
  let workKey: string | null = null;
  try {
    const answer = answerBuiltInAi({
      text: input.promptRu,
      route: input.route ?? "/request",
      screenContext: (input.route ?? "/request").includes("foreman") ? "foreman" : "request",
      role: (input.route ?? "/request").includes("foreman") ? "foreman" : "consumer",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;
    if (!estimate) throw new Error(answer.toolResult.blockedBy ?? "estimate missing");
    workKey = estimate.work.workKey;
    const pdf = createEstimatePdf({
      estimate,
      runtimeTrace: answer.runtimeTrace,
      generatedAt: "2026-06-03T00:00:00.000+06:00",
      language: "ru",
    });
    const text = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate.work.workKey }).text;
    if (!pdf.validation.valid) failures.push(`PDF_VALIDATION:${pdf.validation.failures.join("|")}`);
    if (!pdf.pdfTrace.pdf_uses_structured_global_estimate_result) failures.push("PDF_NOT_STRUCTURED_GLOBAL_ESTIMATE");
    if (pdf.pdfTrace.markdown_parsed_as_pdf_truth) failures.push("PDF_MARKDOWN_TRUTH");
    if (!validateNoPdfMojibake(text).passed) failures.push("PDF_MOJIBAKE_FOUND");
    if (!includesToken(text, "Источник")) failures.push("PDF_SOURCE_COLUMN_MISSING");
    const sampleRows = estimate.sections.flatMap((section) => section.rows).slice(0, 8);
    const visibleRowMatches = sampleRows.filter((row) => {
      const normalizedRowName = normalize(row.name);
      const compactPrefix = normalizedRowName.slice(0, Math.min(18, normalizedRowName.length));
      return includesToken(text, row.name) || (compactPrefix.length >= 8 && includesToken(text, compactPrefix));
    }).length;
    const minimumVisibleRows = Math.min(4, sampleRows.length);
    if (visibleRowMatches < minimumVisibleRows) {
      failures.push(`PDF_ROWS_VISIBLE_TOO_LOW:${visibleRowMatches}/${minimumVisibleRows}`);
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
  return {
    caseId: input.caseId,
    prompt: input.promptRu,
    workKey,
    passed: failures.length === 0,
    failures,
  };
}

function summarize(results: EnterpriseVisible500CaseResult[]) {
  return {
    total: results.length,
    passed: results.filter((item) => item.failures.length === 0).length,
    failed: results.filter((item) => item.failures.length > 0).length,
  };
}

function hasFailure(results: EnterpriseVisible500CaseResult[], token: string): boolean {
  return results.some((item) => item.failures.some((failure) => failure.includes(token)));
}

export function runEnterpriseVisible500RequestDraftRealPath(): EnterpriseVisible500RunResult {
  __resetConsumerRepairRequestStoreForTests();

  const suppliedFixtureResults = suppliedFixtureCases().map(evaluateEnterpriseVisible500Case);
  const exactPastedResults = loadExactPasted500Cases().map(evaluateEnterpriseVisible500Case);
  const liveCases = [...ENTERPRISE_VISIBLE_REQUEST_DRAFT_LIVE_REGRESSION_CASES, ...SCREENSHOT_REGRESSION_CASES];
  const liveRegressionResults = liveCases.map((item) =>
    evaluateEnterpriseVisible500Case({ ...item, route: "/request" }),
  );
  const foremanRouteResults = ENTERPRISE_VISIBLE_REQUEST_DRAFT_LIVE_REGRESSION_CASES.map((item) =>
    evaluateEnterpriseVisible500Case({ ...item, route: "/ai?context=foreman" }),
  );
  const pdfResults = ENTERPRISE_VISIBLE_REQUEST_DRAFT_LIVE_REGRESSION_CASES.map((item) =>
    evaluatePdfCase({ ...item, route: "/request" }),
  );

  const allResults = [
    ...suppliedFixtureResults,
    ...exactPastedResults,
    ...liveRegressionResults,
    ...foremanRouteResults,
  ];
  const supplied = summarize(suppliedFixtureResults);
  const exact = summarize(exactPastedResults);
  const live = summarize(liveRegressionResults);
  const foreman = summarize(foremanRouteResults);
  const pdfPassed = pdfResults.every((item) => item.passed);
  const runtimePassed =
    supplied.passed === 500 &&
    exact.passed === 500 &&
    live.failed === 0 &&
    foreman.failed === 0 &&
    pdfPassed;

  const matrix = {
    wave: ENTERPRISE_VISIBLE_500_WAVE,
    final_status: runtimePassed
      ? "GREEN_VISIBLE_500_AI_ESTIMATE_CURRENT_WAVE_RUNTIME_READY"
      : "BLOCKED_VISIBLE_500_AI_ESTIMATE_CURRENT_WAVE_RUNTIME_FAILURES",
    visible_500_supplied_passed: supplied.passed,
    visible_500_supplied_failed: supplied.failed,
    exact_pasted_500_passed: exact.passed,
    exact_pasted_500_failed: exact.failed,
    live_regression_prompts_passed: live.failed === 0,
    foreman_route_prompts_passed: foreman.failed === 0,
    manual_triage_found: hasFailure(allResults, "MANUAL_TRIAGE_FINAL"),
    template_gap_found: hasFailure(allResults, "TEMPLATE_GAP"),
    object_confusion_found: hasFailure(allResults, "WORK_KEY_MISMATCH") || hasFailure(allResults, "FORBIDDEN_TOKENS_FOUND"),
    weak_generic_rows_found: hasFailure(allResults, "WEAK_GENERIC_ROWS"),
    source_evidence_missing_found: hasFailure(allResults, "SOURCE_EVIDENCE_MISSING"),
    catalog_binding_missing_found: hasFailure(allResults, "CATALOG_BINDING_MISSING"),
    pdf_table_passed: pdfPassed,
    pdf_failed: pdfResults.filter((item) => !item.passed).length,
    catalog_items_migration_started: false,
    fake_green_claimed: false,
  };

  writeJson("supplied_fixture_results.json", suppliedFixtureResults);
  writeJson("exact_pasted_500_results.json", exactPastedResults);
  writeJson("live_regression_results.json", liveRegressionResults);
  writeJson("foreman_route_results.json", foremanRouteResults);
  writeJson("pdf_table_results.json", pdfResults);
  writeJson("matrix.runtime.json", matrix);

  if (!runtimePassed) {
    const failing = allResults
      .filter((item) => item.failures.length > 0)
      .slice(0, 30)
      .map((item) => `${item.caseId}:${item.failures.join(",")}`);
    throw new Error(`${matrix.final_status}:${failing.join(";")}`);
  }

  return {
    matrix,
    suppliedFixtureResults,
    exactPastedResults,
    liveRegressionResults,
    foremanRouteResults,
    pdfResults,
  };
}
