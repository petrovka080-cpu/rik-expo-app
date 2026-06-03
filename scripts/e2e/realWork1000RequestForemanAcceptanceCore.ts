import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { validateEstimateIntentPriority } from "../../src/lib/ai/builtInAi/builtInAiIntentRouter";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas/validateConstructionUnitSemantics";
import {
  buildEstimatePresentationViewModel,
  validateEstimatePresentationViewModel,
  validateNoMojibakeInEstimateViewModel,
} from "../../src/lib/ai/estimatePresentation";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";
import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS, type Real10000ConstructionWorkCase } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { exactPromptLookupScanReal10000, gitOutput } from "./real10000AcceptanceCore";

export const REAL_WORK_1000_WAVE = "S_REAL_WORK_1000_REQUEST_FOREMAN_ACCEPTANCE_POINT_OF_NO_RETURN";
export const REAL_WORK_1000_ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_REAL_WORK_1000_REQUEST_FOREMAN_ACCEPTANCE");
export const VISIBLE_500_FIXTURE = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "enterpriseVisible500",
  "enterprise_visible_500_work_acceptance_pack.json",
);

type RealWork1000Route = "/request" | "/ai?context=foreman";

export type RealWork1000Case = {
  caseId: string;
  promptRu: string;
  route: RealWork1000Route;
  corpus: "visible_500_supplied_pack" | "real10000_user_like_prompt";
  domain: string;
  macroDomain: string;
  expectedResolvedDomain?: string;
  expectedObject?: string;
  expectedOperation?: string;
  expectedMethod?: string;
  expectedMinimumRows: number;
  requiredRowTokens: string[];
  forbiddenRowTokens: string[];
};

export type RealWork1000CaseResult = {
  caseId: string;
  corpus: RealWork1000Case["corpus"];
  route: RealWork1000Route;
  prompt: string;
  domain: string;
  macroDomain: string;
  workKey: string | null;
  object: string | null;
  operation: string | null;
  method: string | null;
  estimateIntentPriorityPassed: boolean;
  semanticFramePresent: boolean;
  constructionWorkPlanPresent: boolean;
  quantityFormulaResolverPassed: boolean;
  professionalBoqCompilerPassed: boolean;
  globalEstimateResultPresent: boolean;
  estimatePresentationViewModelPassed: boolean;
  uiTableVisible: boolean;
  rowCount: number;
  requiredRowsMissing: string[];
  weakRowsFound: string[];
  forbiddenTokensFound: string[];
  unitSemanticsPassed: boolean;
  requestDraftItems: number | null;
  requestViewModelSections: number | null;
  runtimeTraceId: string | null;
  failures: string[];
};

export type RealWork1000RunResult = {
  matrix: Record<string, unknown>;
  results: RealWork1000CaseResult[];
  cases: RealWork1000Case[];
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

const FINAL_TRIAGE_TEXT = [
  "TEMPLATE_GAP_SAFE_TRIAGE",
  "other_construction_work",
  "Строительные работы",
  "нужен шаблон",
  "нужна ручная сметная проверка",
  "не могу рассчитать",
  "не буду подставлять fake",
];

const FALLBACK_FORBIDDEN_ROWS = [
  ...WEAK_ROW_NAMES,
].map((item) => String(item));

const REQUIRED_DOMAIN_CHECKS: readonly { label: string; pattern: RegExp }[] = [
  { label: "flooring", pattern: /flooring|пол|линолеум|ламинат|паркет|ковролин/i },
  { label: "tiling", pattern: /tiling|плитк|кафел|мозаик/i },
  { label: "drywall", pattern: /drywall|гкл|гипсокартон|перегород/i },
  { label: "painting", pattern: /painting|покраск|окраск/i },
  { label: "plastering", pattern: /plaster|штукатур/i },
  { label: "ceilings", pattern: /ceiling|потол/i },
  { label: "doors/windows", pattern: /doors|windows|двер|окон/i },
  { label: "roofing", pattern: /roof|кровл|крыш/i },
  { label: "waterproofing", pattern: /waterproof|гидроизоляц/i },
  { label: "facade", pattern: /facade|фасад/i },
  { label: "masonry", pattern: /masonry|кладк|кирпич/i },
  { label: "concrete", pattern: /concrete|бетон|стяжк|тумб|плит/i },
  { label: "foundation", pattern: /foundation|фундамент/i },
  { label: "earthworks", pattern: /earthworks|транше|котлован|землян/i },
  { label: "asphalt", pattern: /asphalt|асфальт/i },
  { label: "paving", pattern: /paving|брусчат|тротуар/i },
  { label: "metal structures", pattern: /metal_structures|металл|ферм|каркас|ангар/i },
  { label: "canopies", pattern: /canop|навес/i },
  { label: "fencing", pattern: /fencing|забор|огражд/i },
  { label: "demolition", pattern: /demolition|демонтаж/i },
  { label: "plumbing", pattern: /plumbing|сантех|водоснабж|водомер/i },
  { label: "heating", pattern: /heating|отоплен|радиатор|тепла/i },
  { label: "ventilation", pattern: /ventilation|вентиляц/i },
  { label: "air conditioning", pattern: /air_conditioning|кондицион/i },
  { label: "electrical", pattern: /electrical|электро|кабель|освещен|освещение/i },
  { label: "low-voltage", pattern: /low_voltage|слаботоч|скс|bms|домофон/i },
  { label: "fire alarm", pattern: /fire_alarm|пожар/i },
  { label: "security", pattern: /security|видеонаблюд|контроль доступа|охран/i },
  { label: "solar", pattern: /solar|солнеч/i },
  { label: "hydropower", pattern: /hydropower|гэс|турбин/i },
  { label: "industrial equipment", pattern: /industrial_equipment|оборудован|станк|агрегат|линия/i },
  { label: "well drilling", pattern: /well_drilling|скважин/i },
  { label: "sewerage", pattern: /sewerage|канализац|септик/i },
  { label: "drainage", pattern: /drainage|дренаж|ливнев/i },
  { label: "commercial fit-out", pattern: /commercial_fit_out|офис|магазин|кафе|fit.?out/i },
  { label: "apartment renovation", pattern: /apartment_renovation|квартир|сануз|ремонт/i },
  { label: "server rooms", pattern: /server|сервер|цод|ибп/i },
  { label: "water treatment", pattern: /water_treatment|водоподготов|очистк|обеззараж|дозир/i },
  { label: "medical/labs", pattern: /medical|laboratory|медицин|лаборатор|чистая комнат|clinic/i },
];

function ensureArtifactDir(): void {
  fs.mkdirSync(REAL_WORK_1000_ARTIFACT_DIR, { recursive: true });
}

function writeJson(name: string, value: unknown): void {
  ensureArtifactDir();
  fs.writeFileSync(path.join(REAL_WORK_1000_ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

function rowNameWithoutNumber(value: string): string {
  return normalize(value.replace(/^\d+(?:\.\d+)*\s+/, ""));
}

function hasToken(text: string, token: string): boolean {
  return normalize(text).includes(normalize(token));
}

function allRows(estimate: GlobalEstimateResult) {
  return estimate.sections.flatMap((section) => section.rows);
}

function weakRows(estimate: GlobalEstimateResult): string[] {
  return allRows(estimate)
    .map((row) => row.name)
    .filter((name) => WEAK_ROW_NAMES.has(rowNameWithoutNumber(name)));
}

function forbiddenTokensIn(text: string, tokens: readonly string[]): string[] {
  const normalizedRows = new Set(text.split("\n").map(rowNameWithoutNumber));
  return tokens.filter((token) => {
    const normalized = normalize(token);
    if (WEAK_ROW_NAMES.has(normalized)) return normalizedRows.has(normalized);
    return hasToken(text, token);
  });
}

function visible500Cases(): RealWork1000Case[] {
  const raw = JSON.parse(fs.readFileSync(VISIBLE_500_FIXTURE, "utf8")) as {
    cases?: Array<{ caseId: string; promptRu: string; route?: string }>;
  };
  if (!Array.isArray(raw.cases) || raw.cases.length !== 500) {
    throw new Error(`VISIBLE_500_FIXTURE_INVALID:${raw.cases?.length ?? "missing"}`);
  }
  return raw.cases.map((item) => ({
    caseId: `rw1000-visible-${item.caseId}`,
    promptRu: item.promptRu,
    route: "/request",
    corpus: "visible_500_supplied_pack",
    domain: "visible_500_supplied_pack",
    macroDomain: "visible_500_supplied_pack",
    expectedMinimumRows: 8,
    requiredRowTokens: [],
    forbiddenRowTokens: FALLBACK_FORBIDDEN_ROWS,
  }));
}

function userLike500Cases(): RealWork1000Case[] {
  const byDomain = new Map<string, Real10000ConstructionWorkCase[]>();
  for (const item of REAL_DIVERSE_10000_CONSTRUCTION_WORKS) {
    const bucket = byDomain.get(item.domain) ?? [];
    bucket.push(item);
    byDomain.set(item.domain, bucket);
  }

  return [...byDomain.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([_domain, cases]) => cases.slice(0, 5))
    .slice(0, 500)
    .map((item) => {
      const prompt = normalize(item.promptRu);
      const demolitionPrompt = /демонтаж|снос|разборк|structural demolition/.test(prompt);
      const concreteSlabPrompt = /бетонн[а-яё]*\s+плит/.test(prompt);
      const floorScreedPrompt = !demolitionPrompt && /стяжк/.test(prompt);
      const industrialFloorPrompt = /промышленн[а-яё]*\s+пол|топпинг|бетонн[а-яё]*\s+пол/.test(prompt);
      const requiredRowTokens = floorScreedPrompt
        ? ["стяжк", "маяки", "демпфер", "укладка стяжки"]
        : concreteSlabPrompt
          ? ["бетонная плита", "арматур", "опалуб", "заливка бетонной плиты"]
          : industrialFloorPrompt
            ? ["промышленн", "арматур", "бетон", "топпинг"]
            : item.requiredRowTokens;
      return {
        caseId: `rw1000-userlike-${item.caseId}`,
        promptRu: item.promptRu,
        route: "/ai?context=foreman" as const,
        corpus: "real10000_user_like_prompt" as const,
        domain: item.domain,
        macroDomain: item.macroDomain,
        expectedResolvedDomain: floorScreedPrompt ? "floor_screed" : concreteSlabPrompt ? "concrete" : industrialFloorPrompt ? "industrial_flooring" : item.expectedResolvedDomain,
        expectedObject: floorScreedPrompt ? "floor_screed" : concreteSlabPrompt ? "concrete_slab" : industrialFloorPrompt ? "industrial_floor" : item.expectedObject,
        expectedOperation: floorScreedPrompt ? "screed_installation" : concreteSlabPrompt ? "concrete_pour" : industrialFloorPrompt ? "concrete_floor_installation" : item.expectedOperation,
        expectedMethod: floorScreedPrompt ? "cement_sand_screed" : concreteSlabPrompt ? "reinforced_concrete_slab" : industrialFloorPrompt ? "industrial_concrete_floor_system" : item.expectedMethod,
        expectedMinimumRows: item.expectedMinimumRows,
        requiredRowTokens,
        forbiddenRowTokens: item.forbiddenRowTokens,
      };
    });
}

export function realWork1000Cases(): RealWork1000Case[] {
  const cases = [...visible500Cases(), ...userLike500Cases()];
  if (cases.length !== 1000) throw new Error(`REAL_WORK_1000_CASE_COUNT_INVALID:${cases.length}`);
  return cases;
}

function textForDomainCoverage(cases: readonly RealWork1000Case[]): string {
  return cases.map((item) => `${item.domain} ${item.macroDomain} ${item.promptRu}`).join("\n");
}

function requiredDomainCoverage(cases: readonly RealWork1000Case[]) {
  const haystack = textForDomainCoverage(cases);
  const covered = REQUIRED_DOMAIN_CHECKS.filter((item) => item.pattern.test(haystack)).map((item) => item.label);
  const missing = REQUIRED_DOMAIN_CHECKS.filter((item) => !item.pattern.test(haystack)).map((item) => item.label);
  return { covered, missing };
}

function sourceFilesForFingerprint(): string[] {
  const roots = [
    "src/lib/ai/builtInAi",
    "src/lib/ai/constructionFormulas",
    "src/lib/ai/estimatePresentation",
    "src/lib/ai/estimatorKernel",
    "src/lib/ai/globalEstimate",
    "src/lib/ai/professionalBoq",
    "src/features/consumerRepair",
  ];
  const files = [
    "scripts/e2e/realWork1000RequestForemanAcceptanceCore.ts",
    "scripts/e2e/runRealWork1000RequestForemanAcceptanceProof.ts",
    "tests/fixtures/enterpriseVisible500/enterprise_visible_500_work_acceptance_pack.json",
  ];
  const walk = (root: string): void => {
    if (!fs.existsSync(root)) return;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const relative = path.join(root, entry.name).replace(/\\/g, "/");
      if (entry.isDirectory()) walk(relative);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(relative);
    }
  };
  roots.forEach(walk);
  return [...new Set(files)].filter((file) => fs.existsSync(path.join(process.cwd(), file))).sort();
}

export function buildRealWork1000SourceFingerprint() {
  const files = sourceFilesForFingerprint();
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(process.cwd(), file)));
    hash.update("\0");
  }
  return { algorithm: "sha256:v1", fingerprint: hash.digest("hex"), files };
}

function estimateText(estimate: GlobalEstimateResult): string {
  return [
    estimate.work.workKey,
    estimate.work.title,
    ...estimate.assumptions,
    ...estimate.clarifyingQuestions,
    ...estimate.regionalRisks.map((risk) => `${risk.title} ${risk.text}`),
    ...allRows(estimate).map((row) => row.name),
  ].join("\n");
}

export function evaluateRealWork1000Case(input: RealWork1000Case): RealWork1000CaseResult {
  const failures: string[] = [];
  const screenContext = input.route.includes("foreman") ? "foreman" : "request";
  const role = screenContext === "foreman" ? "foreman" : "consumer";
  const estimator = resolveEstimatorOutcome({ text: input.promptRu, currency: "KGS" });
  const plan = estimator.plan;
  if (!plan) failures.push("TEMPLATE_GAP_FOR_KNOWN_WORK");
  if (!estimator.dynamicBoqUsed) failures.push("PROFESSIONAL_BOQ_COMPILER_NOT_USED");
  if (input.expectedResolvedDomain && plan?.semanticFrame.domain !== input.expectedResolvedDomain) {
    failures.push(`OBJECT_CONFUSION_FOUND:domain:${plan?.semanticFrame.domain ?? "missing"}:expected:${input.expectedResolvedDomain}`);
  }
  if (input.expectedObject && plan?.semanticFrame.object !== input.expectedObject) {
    failures.push(`OBJECT_CONFUSION_FOUND:object:${plan?.semanticFrame.object ?? "missing"}:expected:${input.expectedObject}`);
  }
  if (input.expectedOperation && plan?.semanticFrame.operation !== input.expectedOperation) {
    failures.push(`OPERATION_CONFUSION_FOUND:${plan?.semanticFrame.operation ?? "missing"}:expected:${input.expectedOperation}`);
  }
  if (input.expectedMethod && plan?.semanticFrame.method !== input.expectedMethod) {
    failures.push(`METHOD_CONFUSION_FOUND:${plan?.semanticFrame.method ?? "missing"}:expected:${input.expectedMethod}`);
  }

  let estimate: GlobalEstimateResult | null = null;
  let runtimeTraceId: string | null = null;
  try {
    const answer = answerBuiltInAi({
      text: input.promptRu,
      route: input.route,
      screenContext,
      role,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    runtimeTraceId = answer.runtimeTrace.traceId;
    const priority = validateEstimateIntentPriority(answer);
    if (!priority.passed) failures.push(...priority.failures.map((failure) => `ESTIMATE_INTENT_PRIORITY_${failure}`));
    if (answer.route.intent !== "estimate") failures.push(`ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT:${answer.route.intent}`);
    if (answer.toolResult.blockedBy) failures.push(`MANUAL_TRIAGE_FOUND:${answer.toolResult.blockedBy}`);
    estimate = answer.toolResult.estimate ?? null;
    if (!estimate) failures.push("TEMPLATE_GAP_FOR_KNOWN_WORK");
    if (answer.answerTextRu) {
      const forbidden = forbiddenTokensIn(answer.answerTextRu, FINAL_TRIAGE_TEXT);
      if (forbidden.length > 0) failures.push(`MANUAL_TRIAGE_FOUND:${forbidden.join("|")}`);
    }
  } catch (error) {
    failures.push(error instanceof Error ? `ENTRYPOINT_EXCEPTION:${error.message}` : "ENTRYPOINT_EXCEPTION");
  }

  let estimateIntentPriorityPassed = !failures.some((item) => item.startsWith("ESTIMATE_INTENT_PRIORITY_") || item.startsWith("ESTIMATE_INTENT_LOST"));
  let presentationPassed = false;
  let uiTableVisible = false;
  let rowCount = 0;
  let requiredRowsMissing = [...input.requiredRowTokens];
  let weakRowsFound: string[] = [];
  let forbiddenTokensFound: string[] = [];
  let unitSemanticsPassed = false;

  if (estimate) {
    if (estimate.work.workKey === "other_construction_work") failures.push("TEMPLATE_GAP_FOR_KNOWN_WORK:other_construction_work");
    const presentation = buildEstimatePresentationViewModel(estimate);
    const validation = validateEstimatePresentationViewModel(presentation);
    const mojibake = validateNoMojibakeInEstimateViewModel(presentation);
    presentationPassed = validation.passed && mojibake.passed;
    rowCount = presentation.rows.length;
    uiTableVisible = rowCount >= input.expectedMinimumRows;
    if (!validation.passed) failures.push(...validation.failures.map((failure) => `PRESENTATION_${failure}`));
    if (!mojibake.passed) failures.push(...mojibake.failures.map((failure) => `UI_MOJIBAKE_FOUND:${failure}`));
    if (!uiTableVisible) failures.push(`WEAK_GENERIC_BOQ_ROWS:short_table:${rowCount}/${input.expectedMinimumRows}`);
    const fullText = estimateText(estimate);
    requiredRowsMissing = input.requiredRowTokens.filter((token) => !hasToken(fullText, token));
    weakRowsFound = weakRows(estimate);
    forbiddenTokensFound = forbiddenTokensIn(fullText, [...input.forbiddenRowTokens, ...FINAL_TRIAGE_TEXT]);
    if (requiredRowsMissing.length > 0) failures.push(`WEAK_GENERIC_BOQ_ROWS:missing_required:${requiredRowsMissing.join("|")}`);
    if (weakRowsFound.length > 0) failures.push(`WEAK_GENERIC_BOQ_ROWS:${weakRowsFound.join("|")}`);
    if (forbiddenTokensFound.length > 0) failures.push(`WEAK_GENERIC_BOQ_ROWS:forbidden:${forbiddenTokensFound.join("|")}`);
    const unitSemantics = validateConstructionUnitSemantics(estimate);
    unitSemanticsPassed = unitSemantics.passed;
    if (!unitSemanticsPassed) failures.push(...unitSemantics.failures.map((failure) => `UNIT_SEMANTICS_FAILED:${failure}`));
  }

  let requestDraftItems: number | null = null;
  let requestViewModelSections: number | null = null;
  if (input.route === "/request") {
    try {
      const aiDraft = buildConsumerRepairAiDraft(input.promptRu, { countryCode: "KG", city: "Bishkek" });
      if (aiDraft.repairType === "estimate_triage") failures.push("MANUAL_TRIAGE_FOUND:estimate_triage");
      const bundle = createConsumerRepairRequestDraft({
        consumerUserId: "real-work-1000-test-user",
        problemText: input.promptRu,
        city: "Bishkek",
        aiDraft,
      });
      const requestViewModel = buildRequestEstimateViewModel(bundle);
      requestDraftItems = bundle.items.length;
      requestViewModelSections = requestViewModel?.sections.length ?? 0;
      if (bundle.items.length === 0) failures.push("WEAK_GENERIC_BOQ_ROWS:request_draft_items_empty");
      if (!requestViewModel || requestViewModel.sections.length === 0) failures.push("WEAK_GENERIC_BOQ_ROWS:request_ui_table_empty");
    } catch (error) {
      failures.push(error instanceof Error ? `REQUEST_REAL_PATH_EXCEPTION:${error.message}` : "REQUEST_REAL_PATH_EXCEPTION");
    }
  }
  estimateIntentPriorityPassed = !failures.some((item) => item.startsWith("ESTIMATE_INTENT_PRIORITY_") || item.startsWith("ESTIMATE_INTENT_LOST"));

  return {
    caseId: input.caseId,
    corpus: input.corpus,
    route: input.route,
    prompt: input.promptRu,
    domain: input.domain,
    macroDomain: input.macroDomain,
    workKey: estimate?.work.workKey ?? null,
    object: plan?.semanticFrame.object ?? null,
    operation: plan?.semanticFrame.operation ?? null,
    method: plan?.semanticFrame.method ?? null,
    estimateIntentPriorityPassed,
    semanticFramePresent: Boolean(plan?.semanticFrame),
    constructionWorkPlanPresent: Boolean(plan),
    quantityFormulaResolverPassed: Boolean(plan && plan.formulas.length > 0),
    professionalBoqCompilerPassed: estimator.dynamicBoqUsed,
    globalEstimateResultPresent: Boolean(estimate),
    estimatePresentationViewModelPassed: presentationPassed,
    uiTableVisible,
    rowCount,
    requiredRowsMissing,
    weakRowsFound,
    forbiddenTokensFound,
    unitSemanticsPassed,
    requestDraftItems,
    requestViewModelSections,
    runtimeTraceId,
    failures: [...new Set(failures)],
  };
}

function hasFailure(results: readonly RealWork1000CaseResult[], token: string): boolean {
  return results.some((item) => item.failures.some((failure) => failure.includes(token)));
}

function summarizeRoute(results: readonly RealWork1000CaseResult[], route: RealWork1000Route) {
  const routeResults = results.filter((item) => item.route === route);
  return {
    total: routeResults.length,
    passed: routeResults.filter((item) => item.failures.length === 0).length,
    failed: routeResults.filter((item) => item.failures.length > 0).length,
  };
}

export function runRealWork1000RequestForemanAcceptanceProof(): RealWork1000RunResult {
  __resetConsumerRepairRequestStoreForTests();
  const cases = realWork1000Cases();
  const results = cases.map(evaluateRealWork1000Case);
  const request = summarizeRoute(results, "/request");
  const foreman = summarizeRoute(results, "/ai?context=foreman");
  const domains = [...new Set(cases.map((item) => item.domain))].sort();
  const requiredDomains = requiredDomainCoverage(cases);
  const exactPromptLookup = exactPromptLookupScanReal10000();
  const fingerprint = buildRealWork1000SourceFingerprint();
  const blockers = {
    object_confusion_found: hasFailure(results, "OBJECT_CONFUSION_FOUND"),
    operation_confusion_found: hasFailure(results, "OPERATION_CONFUSION_FOUND"),
    method_confusion_found: hasFailure(results, "METHOD_CONFUSION_FOUND"),
    template_gap_found: hasFailure(results, "TEMPLATE_GAP_FOR_KNOWN_WORK"),
    manual_triage_found: hasFailure(results, "MANUAL_TRIAGE_FOUND"),
    weak_rows_found: hasFailure(results, "WEAK_GENERIC_BOQ_ROWS"),
    unit_semantics_failed: hasFailure(results, "UNIT_SEMANTICS_FAILED"),
    exact_prompt_lookup_found: exactPromptLookup.exact_prompt_lookup_found,
    estimate_intent_lost_to_role_context: hasFailure(results, "ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT"),
  };
  const runtimePassed =
    cases.length === 1000 &&
    request.passed === 500 &&
    foreman.passed === 500 &&
    domains.length >= 35 &&
    requiredDomains.missing.length === 0 &&
    Object.values(blockers).every((value) => value === false);
  const matrix = {
    wave: REAL_WORK_1000_WAVE,
    final_status: runtimePassed
      ? "GREEN_REAL_WORK_1000_REQUEST_FOREMAN_ACCEPTANCE_READY"
      : "BLOCKED_REAL_WORK_1000_REQUEST_FOREMAN_ACCEPTANCE_FAILURES",
    real_work_cases_total: cases.length,
    request_cases_passed: request.passed,
    request_cases_failed: request.failed,
    foreman_cases_passed: foreman.passed,
    foreman_cases_failed: foreman.failed,
    domains_covered_min: domains.length,
    domains,
    required_domains_covered: requiredDomains.covered,
    required_domains_missing: requiredDomains.missing,
    acceptance_path: {
      estimate_intent_priority_passed: results.every((item) => item.estimateIntentPriorityPassed),
      construction_semantic_frame_passed: results.every((item) => item.semanticFramePresent),
      construction_work_plan_passed: results.every((item) => item.constructionWorkPlanPresent),
      quantity_formula_resolver_passed: results.every((item) => item.quantityFormulaResolverPassed),
      professional_boq_compiler_passed: results.every((item) => item.professionalBoqCompilerPassed),
      global_estimate_result_passed: results.every((item) => item.globalEstimateResultPresent),
      estimate_presentation_view_model_passed: results.every((item) => item.estimatePresentationViewModelPassed),
      ui_table_passed: results.every((item) => item.uiTableVisible),
    },
    ...blockers,
    exact_prompt_lookup_findings: exactPromptLookup.findings,
    git_head: gitOutput(["rev-parse", "HEAD"], "unknown"),
    source_fingerprint_algorithm: fingerprint.algorithm,
    source_fingerprint: fingerprint.fingerprint,
    fake_green_claimed: false,
  };

  writeJson("cases.json", cases);
  writeJson("results.json", results);
  writeJson("matrix.json", matrix);
  writeJson("source_fingerprint.json", fingerprint);

  if (!runtimePassed) {
    const failing = results
      .filter((item) => item.failures.length > 0)
      .slice(0, 40)
      .map((item) => `${item.caseId}:${item.failures.join(",")}`);
    throw new Error(`${matrix.final_status}:${failing.join(";")}`);
  }

  return { matrix, results, cases };
}
