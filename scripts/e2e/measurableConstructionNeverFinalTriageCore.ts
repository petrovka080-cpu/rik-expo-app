import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildEstimatePresentationViewModel, validateEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import { runWorldConstructionEstimateEngine } from "../../src/lib/ai/worldConstructionEstimateEngine";
import type { BuiltInAiAnswer } from "../../src/lib/ai/builtInAi";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";

export const MEASURABLE_CONSTRUCTION_WAVE =
  "S_MEASURABLE_CONSTRUCTION_WORK_NEVER_FINAL_TRIAGE_PRODUCTION_LOCK_POINT_OF_NO_RETURN";

export const MEASURABLE_CONSTRUCTION_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_MEASURABLE_CONSTRUCTION_WORK_NEVER_FINAL_TRIAGE",
);

type MeasurablePromptTemplate = {
  id: string;
  work: string;
  quantities: readonly string[];
};

export type MeasurableConstructionCase = {
  caseId: string;
  promptRu: string;
};

export type MeasurableConstructionCaseResult = {
  caseId: string;
  prompt: string;
  requestWorkKey: string | null;
  foremanWorkKey: string | null;
  requestRows: number;
  foremanRows: number;
  requestRequiresReview: boolean;
  foremanRequiresReview: boolean;
  requestQuestions: number;
  foremanQuestions: number;
  requestDraftRepairType: string | null;
  requestDraftItems: number;
  worldClassification: string | null;
  worldPrimitiveOutcome: string | null;
  failures: string[];
};

export type MeasurableConstructionRunResult = {
  matrix: Record<string, unknown>;
  results: MeasurableConstructionCaseResult[];
};

const BASE_PROMPTS: readonly MeasurablePromptTemplate[] = [
  { id: "waterproofing", work: "гидроизоляция", quantities: ["100 м²", "240 м²", "18 м²"] },
  { id: "bio-treatment", work: "биологическая станция очистки", quantities: ["10 м³/сут", "25 м³/сут", "1 комплект"] },
  { id: "uv-disinfection", work: "УФ обеззараживание", quantities: ["1 комплект", "2 комплекта", "6 модулей"] },
  { id: "fire-pnr", work: "ПНР пожаротушения", quantities: ["1 система", "3 зоны", "12 контуров"] },
  { id: "medical-gases", work: "медицинские газы", quantities: ["40 точек", "12 точек", "75 точек"] },
  { id: "structured-cabling", work: "СКС", quantities: ["120 точек", "48 точек", "240 точек"] },
  { id: "access-control", work: "контроль доступа", quantities: ["12 точек", "24 двери", "8 контроллеров"] },
  { id: "external-water", work: "наружный водопровод", quantities: ["120 м.п.", "45 пог м", "300 метров"] },
  { id: "elevator-shaft", work: "лифтовая шахта", quantities: ["12 этажей", "8 этажей", "16 остановок"] },
  { id: "itp-pnr", work: "ПНР ИТП", quantities: ["1 комплект", "2 контура", "4 узла"] },
  { id: "datacenter-temp", work: "мониторинг температуры ЦОД", quantities: ["24 датчика", "60 датчиков", "12 зон"] },
  { id: "dosing-station", work: "дозирующая станция", quantities: ["1 комплект", "2 комплекта", "4 насоса"] },
  { id: "thermal-facade", work: "тепловизионное обследование фасада", quantities: ["1200 м²", "400 м²", "2500 м²"] },
  { id: "passenger-elevator", work: "пассажирский лифт", quantities: ["1 комплект", "2 комплекта", "9 этажей"] },
  { id: "drainage-channels", work: "дренажные каналы", quantities: ["80 пог м", "140 м.п.", "45 метров"] },
  { id: "floor-screed", work: "бетонная стяжка пола", quantities: ["80 м²", "300 м²", "45 м²"] },
  { id: "concrete-slab", work: "бетонная плита", quantities: ["200 м²", "75 м²", "420 м²"] },
  { id: "concrete-pedestal", work: "заливка бетонных тумб", quantities: ["12 шт", "4 штуки", "30 шт"] },
  { id: "metal-canopy", work: "металлический навес", quantities: ["647 кв метров", "90 м²", "18 м²"] },
  { id: "paving", work: "укладка брусчатки", quantities: ["587 кв м", "120 м²", "950 м²"] },
  { id: "roof-waterproofing", work: "гидроизоляция крыши", quantities: ["100 м²", "320 м²", "55 м²"] },
  { id: "low-voltage", work: "слаботочные сети офиса", quantities: ["80 точек", "160 точек", "40 линий"] },
  { id: "video-surveillance", work: "видеонаблюдение", quantities: ["32 камеры", "12 камер", "80 камер"] },
  { id: "fire-alarm", work: "пожарная сигнализация", quantities: ["1 система", "50 датчиков", "8 зон"] },
  { id: "ventilation", work: "вентиляция", quantities: ["450 м²", "120 м²", "900 м²"] },
  { id: "air-conditioning", work: "кондиционирование", quantities: ["12 блоков", "4 комплекта", "30 кВт"] },
  { id: "heating", work: "отопление", quantities: ["24 радиатора", "400 м²", "6 контуров"] },
  { id: "water-supply", work: "водоснабжение", quantities: ["80 пог м", "12 узлов", "250 м.п."] },
  { id: "sewerage", work: "наружная канализация", quantities: ["120 м.п.", "6 колодцев", "80 пог м"] },
  { id: "well", work: "скважина", quantities: ["60 м", "90 метров", "1 комплект"] },
  { id: "solar", work: "солнечная станция", quantities: ["30 кВт", "12 панелей", "1 комплект"] },
  { id: "hydropower", work: "турбина ГЭС", quantities: ["100 кВт", "1 агрегат", "2 комплекта"] },
  { id: "industrial-floor", work: "промышленный бетонный пол", quantities: ["1000 м²", "350 м²", "2200 м²"] },
  { id: "drywall", work: "монтаж ГКЛ", quantities: ["352 м²", "100 м²", "40 м²"] },
  { id: "tile", work: "укладка плитки", quantities: ["74 м²", "180 м²", "28 м²"] },
  { id: "painting", work: "покраска стен", quantities: ["300 м²", "85 м²", "1200 м²"] },
  { id: "plastering", work: "штукатурка стен", quantities: ["250 м²", "60 м²", "900 м²"] },
  { id: "ceiling", work: "подвесной потолок", quantities: ["180 м²", "45 м²", "600 м²"] },
  { id: "doors", work: "установка дверей", quantities: ["12 шт", "3 двери", "45 шт"] },
  { id: "windows", work: "установка окон", quantities: ["18 шт", "6 окон", "50 шт"] },
  { id: "masonry", work: "кирпичная кладка", quantities: ["74 кв м", "250 м²", "30 м²"] },
  { id: "foundation", work: "ленточный фундамент", quantities: ["120 м", "45 пог м", "200 м.п."] },
  { id: "earthworks", work: "копка траншеи", quantities: ["80 м", "200 пог м", "35 м.п."] },
  { id: "asphalt", work: "асфальтирование", quantities: ["10000 кв м", "1200 м²", "300 м²"] },
  { id: "fence", work: "металлический забор", quantities: ["120 пог м", "45 м.п.", "300 метров"] },
  { id: "demolition", work: "демонтаж перегородок", quantities: ["90 м²", "20 м²", "250 м²"] },
  { id: "landscaping", work: "газон рулонный", quantities: ["500 м²", "80 м²", "1500 м²"] },
  { id: "irrigation", work: "полив газона", quantities: ["20 зон", "8 контуров", "600 м²"] },
  { id: "kitchen", work: "монтаж кухни", quantities: ["1 комплект", "6 пог м", "12 модулей"] },
  { id: "bathroom", work: "ремонт санузла", quantities: ["8 м²", "15 м²", "1 помещение"] },
  { id: "pool", work: "оборудование бассейна", quantities: ["1 комплект", "2 насоса", "60 м³"] },
  { id: "cold-room", work: "холодильная камера", quantities: ["1 комплект", "80 м²", "4 агрегата"] },
  { id: "cleanroom", work: "чистая комната", quantities: ["60 м²", "120 м²", "1 зона"] },
  { id: "site-facilities", work: "временная инфраструктура стройплощадки", quantities: ["1 комплект", "6 бытовок", "120 м²"] },
  { id: "survey", work: "техническое обследование", quantities: ["1 здание", "2500 м²", "4 этажа"] },
  { id: "warehouse", work: "разметка склада", quantities: ["1200 м²", "300 паллетомест", "80 зон"] },
  { id: "industrial-equipment", work: "подключение промышленного оборудования", quantities: ["4 станка", "1 линия", "12 агрегатов"] },
  { id: "commercial-fitout", work: "инженерная подготовка офиса", quantities: ["450 м²", "120 м²", "1 помещение"] },
  { id: "electrical", work: "электромонтаж", quantities: ["300 м²", "80 точек", "1200 м²"] },
  { id: "roofing", work: "монтаж кровли", quantities: ["220 м²", "60 м²", "800 м²"] },
  { id: "facade", work: "утепление фасада", quantities: ["450 м²", "120 м²", "1600 м²"] },
  { id: "insulation", work: "теплоизоляция труб", quantities: ["180 пог м", "45 м.п.", "600 метров"] },
  { id: "stairs", work: "лестничные ограждения", quantities: ["60 пог м", "12 маршей", "25 м.п."] },
  { id: "road-curb", work: "бордюр дорожный", quantities: ["300 пог м", "80 м.п.", "1200 метров"] },
  { id: "stormwater", work: "ливневая сеть", quantities: ["150 м.п.", "8 колодцев", "300 пог м"] },
  { id: "gas-pipeline", work: "газопровод", quantities: ["80 пог м", "12 клапанов", "1 система"] },
  { id: "boiler", work: "котельная", quantities: ["1 комплект", "2 котла", "300 кВт"] },
  { id: "smoke-control", work: "дымоудаление", quantities: ["1 система", "12 клапанов", "450 м²"] },
  { id: "bms", work: "BMS диспетчеризация", quantities: ["1 система", "60 датчиков", "12 шкафов"] },
  { id: "water-treatment", work: "водоподготовка", quantities: ["1 комплект", "10 м³/ч", "4 фильтра"] },
  { id: "pump-station", work: "насосная группа", quantities: ["1 комплект", "3 насоса", "120 м³/ч"] },
  { id: "rebar", work: "армирование фундамента", quantities: ["12 x 8 x 1 x 0.4 м", "120 пог м", "3 тонны"] },
  { id: "parking-marking", work: "разметка паркинга", quantities: ["900 м²", "120 машиномест", "2500 м²"] },
  { id: "anti-dust", work: "антипылевое покрытие склада", quantities: ["1000 м²", "300 м²", "2200 м²"] },
  { id: "generator", work: "дизель-генератор", quantities: ["1 комплект", "250 кВт", "2 агрегата"] },
  { id: "ups", work: "ИБП серверной", quantities: ["1 комплект", "80 кВт", "4 шкафа"] },
  { id: "cable-trays", work: "кабельные лотки", quantities: ["200 пог м", "80 м.п.", "450 метров"] },
  { id: "lighting", work: "освещение склада", quantities: ["120 светильников", "3000 м²", "12 зон"] },
  { id: "entry-group", work: "входная группа", quantities: ["1 комплект", "18 м²", "3 двери"] },
  { id: "terrace", work: "террасная доска", quantities: ["80 м²", "25 м²", "220 м²"] },
  { id: "ramp", work: "бетонный пандус", quantities: ["35 м²", "12 м²", "4 штуки"] },
  { id: "retaining-wall", work: "подпорная стена", quantities: ["40 пог м", "12 м.п.", "120 метров"] },
  { id: "water-meter", work: "водомерный узел", quantities: ["1 узел", "3 узла", "6 узлов"] },
  { id: "heat-meter", work: "узел учета тепла", quantities: ["1 узел", "4 узла", "2 комплекта"] },
  { id: "flooring-linoleum", work: "укладка линолеума", quantities: ["100 м²", "45 м²", "380 м²"] },
  { id: "parquet", work: "укладка паркета", quantities: ["80 м²", "35 м²", "260 м²"] },
  { id: "putty", work: "шпаклевка стен", quantities: ["280 м²", "70 м²", "900 м²"] },
  { id: "mosaic", work: "монтаж мозаики", quantities: ["25 м²", "8 м²", "120 м²"] },
  { id: "fire-door", work: "противопожарная дверь", quantities: ["6 шт", "2 двери", "18 шт"] },
  { id: "glass-partition", work: "стеклянные перегородки", quantities: ["80 м²", "25 м²", "180 м²"] },
  { id: "acoustic", work: "акустические панели", quantities: ["120 м²", "35 м²", "400 м²"] },
  { id: "sand-base", work: "песчаная подушка", quantities: ["180 м²", "45 м²", "600 м²"] },
  { id: "gravel-base", work: "щебеночная подушка", quantities: ["200 м²", "70 м²", "900 м²"] },
  { id: "storm-inlet", work: "дождеприемники", quantities: ["12 шт", "4 шт", "35 шт"] },
  { id: "cable-line", work: "кабельная линия", quantities: ["300 пог м", "80 м.п.", "1200 метров"] },
  { id: "grounding", work: "заземление", quantities: ["1 контур", "3 контура", "120 м"] },
  { id: "lightning", work: "молниезащита", quantities: ["1 здание", "4 контура", "2500 м²"] },
  { id: "manholes", work: "смотровые колодцы", quantities: ["8 шт", "3 штуки", "24 шт"] },
  { id: "septic", work: "септик", quantities: ["1 комплект", "10 м³", "2 комплекта"] },
  { id: "intercom", work: "домофонная система", quantities: ["1 система", "12 точек", "4 подъезда"] },
];

const FORBIDDEN_FINAL_TEXT = [
  "TEMPLATE_GAP_SAFE_TRIAGE",
  "other_construction_work",
  "Строительные работы",
  "нужен шаблон",
  "нужна ручная сметная проверка",
  "не могу рассчитать",
] as const;

function ensureArtifactDir(): void {
  fs.mkdirSync(MEASURABLE_CONSTRUCTION_ARTIFACT_DIR, { recursive: true });
}

function writeJson(name: string, value: unknown): void {
  ensureArtifactDir();
  fs.writeFileSync(path.join(MEASURABLE_CONSTRUCTION_ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function allEstimateRows(estimate: GlobalEstimateResult | null): number {
  return estimate?.sections.flatMap((section) => section.rows).length ?? 0;
}

function estimateText(estimate: GlobalEstimateResult | null): string {
  if (!estimate) return "";
  return [
    estimate.work.workKey,
    estimate.work.title,
    ...estimate.assumptions,
    ...estimate.clarifyingQuestions,
    ...estimate.sections.flatMap((section) => section.rows.map((row) => row.name)),
  ].join("\n");
}

function forbiddenTokensIn(value: string): string[] {
  const lower = value.toLocaleLowerCase("ru-RU");
  return FORBIDDEN_FINAL_TEXT.filter((token) => lower.includes(token.toLocaleLowerCase("ru-RU")));
}

function validateTopLevelAnswer(params: {
  label: "request" | "foreman";
  answer: BuiltInAiAnswer;
  failures: string[];
}): GlobalEstimateResult | null {
  const estimate = params.answer.toolResult.estimate ?? null;
  if (params.answer.route.intent !== "estimate") params.failures.push(`${params.label}:ESTIMATE_INTENT_LOST:${params.answer.route.intent}`);
  if (!estimate) params.failures.push(`${params.label}:${params.answer.toolResult.blockedBy ?? "ESTIMATE_MISSING"}`);
  if (params.answer.toolResult.blockedBy) params.failures.push(`${params.label}:BLOCKED_BY:${params.answer.toolResult.blockedBy}`);
  if (estimate?.work.workKey === "other_construction_work") params.failures.push(`${params.label}:OTHER_CONSTRUCTION_WORK_FINAL`);
  if (estimate && allEstimateRows(estimate) < 8) params.failures.push(`${params.label}:SHORT_ESTIMATE_ROWS:${allEstimateRows(estimate)}`);
  if (estimate && !estimate.requiresReview) params.failures.push(`${params.label}:REQUIRES_REVIEW_MISSING`);
  if (estimate && estimate.clarifyingQuestions.length === 0) params.failures.push(`${params.label}:CLARIFYING_QUESTIONS_MISSING`);
  if (estimate) {
    const presentation = buildEstimatePresentationViewModel(estimate);
    const validation = validateEstimatePresentationViewModel(presentation);
    if (!validation.passed) {
      params.failures.push(...validation.failures.map((failure) => `${params.label}:PRESENTATION_${failure}`));
    }
  }
  const forbidden = forbiddenTokensIn(`${params.answer.answerTextRu}\n${estimateText(estimate)}`);
  if (forbidden.length > 0) params.failures.push(`${params.label}:FORBIDDEN_FINAL_TEXT:${forbidden.join("|")}`);
  return estimate;
}

export function measurableConstructionCases(): MeasurableConstructionCase[] {
  return BASE_PROMPTS.flatMap((template) =>
    template.quantities.map((quantity, index) => ({
      caseId: `${template.id}-${index + 1}`,
      promptRu: `${template.work} ${quantity}`,
    })),
  ).slice(0, 300);
}

export function evaluateMeasurableConstructionCase(input: MeasurableConstructionCase): MeasurableConstructionCaseResult {
  const failures: string[] = [];
  const world = runWorldConstructionEstimateEngine({
    text: input.promptRu,
    countryCode: "KG",
    city: "Bishkek",
  });
  const requestAnswer = answerBuiltInAi({
    text: input.promptRu,
    route: "/request",
    screenContext: "request",
    role: "consumer",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const foremanAnswer = answerBuiltInAi({
    text: input.promptRu,
    route: "/ai?context=foreman",
    screenContext: "foreman",
    role: "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const requestEstimate = validateTopLevelAnswer({ label: "request", answer: requestAnswer, failures });
  const foremanEstimate = validateTopLevelAnswer({ label: "foreman", answer: foremanAnswer, failures });
  const requestDraft = buildConsumerRepairAiDraft(input.promptRu, { countryCode: "KG", city: "Bishkek" });
  if (requestDraft.repairType === "estimate_triage") failures.push("MANUAL_TRIAGE_FINAL");
  if (requestDraft.items.length === 0) failures.push("REQUEST_DRAFT_ITEMS_EMPTY");
  const draftForbidden = forbiddenTokensIn([
    requestDraft.titleRu,
    requestDraft.summaryRu,
    requestDraft.repairType,
    ...requestDraft.missingData,
    ...requestDraft.items.map((item) => item.titleRu),
  ].join("\n"));
  if (draftForbidden.length > 0) failures.push(`REQUEST_DRAFT_FORBIDDEN_FINAL_TEXT:${draftForbidden.join("|")}`);

  return {
    caseId: input.caseId,
    prompt: input.promptRu,
    requestWorkKey: requestEstimate?.work.workKey ?? null,
    foremanWorkKey: foremanEstimate?.work.workKey ?? null,
    requestRows: allEstimateRows(requestEstimate),
    foremanRows: allEstimateRows(foremanEstimate),
    requestRequiresReview: requestEstimate?.requiresReview ?? false,
    foremanRequiresReview: foremanEstimate?.requiresReview ?? false,
    requestQuestions: requestEstimate?.clarifyingQuestions.length ?? 0,
    foremanQuestions: foremanEstimate?.clarifyingQuestions.length ?? 0,
    requestDraftRepairType: requestDraft.repairType,
    requestDraftItems: requestDraft.items.length,
    worldClassification: world.interpretation.classification ?? null,
    worldPrimitiveOutcome: world.interpretation.primitive.outcome ?? null,
    failures: [...new Set(failures)],
  };
}

function hasFailure(results: MeasurableConstructionCaseResult[], token: string): boolean {
  return results.some((item) => item.failures.some((failure) => failure.includes(token)));
}

export function runMeasurableConstructionNeverFinalTriageProof(): MeasurableConstructionRunResult {
  const cases = measurableConstructionCases();
  const results = cases.map(evaluateMeasurableConstructionCase);
  const passed = results.filter((item) => item.failures.length === 0).length;
  const runtimePassed = cases.length === 300 && passed === 300;
  const matrix = {
    wave: MEASURABLE_CONSTRUCTION_WAVE,
    final_status: runtimePassed
      ? "GREEN_MEASURABLE_CONSTRUCTION_WORK_NEVER_FINAL_TRIAGE_READY"
      : "BLOCKED_MEASURABLE_CONSTRUCTION_WORK_FINAL_TRIAGE_FOUND",
    measurable_cases_total: cases.length,
    measurable_cases_passed: passed,
    measurable_cases_failed: cases.length - passed,
    manual_triage_final_found: hasFailure(results, "MANUAL_TRIAGE_FINAL"),
    template_gap_final_found: hasFailure(results, "TEMPLATE_GAP_SAFE_TRIAGE"),
    requires_review_warning_present: results.every((item) => item.requestRequiresReview && item.foremanRequiresReview),
    clarifying_questions_present: results.every((item) => item.requestQuestions > 0 && item.foremanQuestions > 0),
    fake_green_claimed: false,
  };

  writeJson("results.json", results);
  writeJson("matrix.json", matrix);

  if (!runtimePassed) {
    const failing = results
      .filter((item) => item.failures.length > 0)
      .slice(0, 30)
      .map((item) => `${item.caseId}:${item.failures.join(",")}`);
    throw new Error(`${matrix.final_status}:${failing.join(";")}`);
  }

  return { matrix, results };
}
