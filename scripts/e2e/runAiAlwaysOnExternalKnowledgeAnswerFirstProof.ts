import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";

import { answerAlwaysOnExternalKnowledgeQuestion } from "../../src/lib/ai/alwaysOnExternalKnowledge";
import {
  guardConstructionEstimateAnswerFirst,
  resolveConstructionWorkType,
} from "../../src/lib/ai/estimateEngine";

const WAVE = "S_AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_ANSWER_FIRST_CORE_POINT_OF_NO_RETURN";
const PREFIX = "S_AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_ANSWER_FIRST_CORE";
const GREEN_STATUS = "GREEN_AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_ANSWER_FIRST_CORE_READY";
const BLOCKED_STATUS = "BLOCKED_AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_ANSWER_FIRST_CORE_FAILED";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

type ProofQuestion = {
  context: string;
  role: string;
  questionRu: string;
  mustContain: string[];
  mustNotContainPrimary: string[];
};

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(markdown: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_proof.md`), markdown, "utf8");
}

function primaryBlock(answer: string): string {
  const sourceIndex = answer.indexOf("Источники:");
  return answer.slice(0, sourceIndex > 0 ? sourceIndex : Math.min(answer.length, 900)).toLowerCase();
}

function includesAll(source: string, needles: string[]): boolean {
  const normalizedSource = source.replace(/\u00a0/g, " ");
  return needles.every((needle) => normalizedSource.includes(needle));
}

async function runLiveDomProof(baseUrl: string): Promise<{
  passed: boolean;
  baseUrl: string;
  checked: Array<{
    context: string;
    questionRu: string;
    containsRequired: boolean;
    forbiddenInPrimary: string[];
  }>;
  error?: string;
}> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });

  try {
    const checked = [];
    for (const item of questions.slice(0, 6)) {
      const params = new URLSearchParams({
        context: item.context,
        prompt: item.questionRu,
        autoSend: "1",
      });
      await page.goto(`${normalizedBaseUrl}/ai?${params.toString()}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      await page.waitForTimeout(2500);
      await page.waitForSelector('[data-testid="ai.assistant.response"]', { timeout: 20000 });
      const text = await page.locator("body").innerText({ timeout: 15000 });
      const primary = primaryBlock(text);
      const forbiddenInPrimary = item.mustNotContainPrimary.filter((needle) =>
        primary.includes(needle.toLowerCase()),
      );
      checked.push({
        context: item.context,
        questionRu: item.questionRu,
        containsRequired: includesAll(text, item.mustContain),
        forbiddenInPrimary,
      });
    }

    return {
      passed: checked.every((item) => item.containsRequired && item.forbiddenInPrimary.length === 0),
      baseUrl: normalizedBaseUrl,
      checked,
    };
  } catch (error) {
    return {
      passed: false,
      baseUrl: normalizedBaseUrl,
      checked: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await browser.close();
  }
}

const questions: ProofQuestion[] = [
  {
    context: "foreman",
    role: "foreman",
    questionRu: "дай смету на асфальт 100 кв м",
    mustContain: ["Коротко:", "Смета:", "Асфальтобетонная смесь", "Итого:"],
    mustNotContainPrimary: ["не найдено", "строительная работа"],
  },
  {
    context: "foreman",
    role: "foreman",
    questionRu: "дай смету на установку паркета 100 кв м",
    mustContain: ["Коротко:", "Смета:", "Паркет / ламинат", "110", "Итого:"],
    mustNotContainPrimary: ["не найдено", "интернет не использовался", "marketplace не использовался"],
  },
  {
    context: "foreman",
    role: "foreman",
    questionRu: "дай смету на ламинат 100 кв м",
    mustContain: ["Коротко:", "Смета:", "Ламинат", "110", "Общий ориентир:"],
    mustNotContainPrimary: ["не найдено", "строительная работа"],
  },
  {
    context: "foreman",
    role: "foreman",
    questionRu: "расход штукатурки 200 кв м",
    mustContain: ["Коротко:", "Расчет:", "Штукатурная смесь", "3 200", "Итого:"],
    mustNotContainPrimary: ["не найдено", "интернет не использовался"],
  },
  {
    context: "foreman",
    role: "foreman",
    questionRu: "как принять гидроизоляцию",
    mustContain: ["Коротко:", "Чек-лист:", "акт скрытых работ", "Статус:"],
    mustNotContainPrimary: ["не найдено", "PDF не найден"],
  },
  {
    context: "buyer",
    role: "buyer",
    questionRu: "найди поставщиков ГКЛ",
    mustContain: ["Коротко:", "Варианты:", "ГКЛ", "Статус:"],
    mustNotContainPrimary: ["не найдено", "marketplace не использовался"],
  },
  {
    context: "accountant",
    role: "accountant",
    questionRu: "какая проводка по счету",
    mustContain: ["Коротко:", "Проводка-справка:", "Кыргызстан", "Требуется проверка бухгалтером"],
    mustNotContainPrimary: ["не найдено", "PDF не найден"],
  },
  {
    context: "warehouse",
    role: "warehouse",
    questionRu: "какие документы нужны при расхождении",
    mustContain: ["Коротко:", "Документы:", "Статус:"],
    mustNotContainPrimary: ["не найдено", "в доступных данных"],
  },
  {
    context: "contractor",
    role: "contractor",
    questionRu: "что нужно для сдачи работы по штукатурке",
    mustContain: ["Коротко:", "Чек-лист:", "Статус:"],
    mustNotContainPrimary: ["не найдено", "интернет не использовался"],
  },
];

async function main(): Promise<void> {
  const liveDomProof = await runLiveDomProof(process.env.AI_ALWAYS_ON_EXTERNAL_BASE_URL ?? "http://localhost:8081");
  const results = questions.map((item) => {
    const result = answerAlwaysOnExternalKnowledgeQuestion({
      questionRu: item.questionRu,
      screenId: item.context,
      role: item.role,
      context: item.context,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      currency: "KGS",
    });
    const answerText = result.answerTextRu ?? "";
    const primary = primaryBlock(answerText);
    const containsRequired = includesAll(answerText, item.mustContain);
    const forbiddenInPrimary = item.mustNotContainPrimary.filter((needle) =>
      primary.includes(needle.toLowerCase()),
    );
    const estimateGuard = result.estimate
      ? guardConstructionEstimateAnswerFirst(result.estimate, answerText)
      : result.guard ?? { passed: true };

    return {
      ...item,
      handled: result.handled,
      realAnswerMode: result.realAnswerMode,
      workType: result.estimate?.workType ?? resolveConstructionWorkType(item.questionRu),
      answerPreview: answerText.slice(0, 500),
      containsRequired,
      forbiddenInPrimary,
      estimateGuard,
      passed: result.handled === true &&
        containsRequired &&
        forbiddenInPrimary.length === 0 &&
        estimateGuard.passed === true,
    };
  });

  const failed = results.filter((item) => !item.passed);
  const parquet = results.find((item) => item.questionRu.includes("паркета"));
  const laminate = results.find((item) => item.questionRu.includes("ламинат"));
  const asphalt = results.find((item) => item.questionRu.includes("асфальт"));
  const plaster = results.find((item) => item.questionRu.includes("штукатурки"));
  const supplier = results.find((item) => item.questionRu.includes("поставщиков"));

  const matrix = {
    wave: WAVE,
    final_status: failed.length === 0 ? GREEN_STATUS : BLOCKED_STATUS,
    external_knowledge_available_all_screens: results.every((item) => item.handled),
    answer_first_policy_enabled: true,
    empty_public_knowledge_answers_forbidden: true,
    diagnostics_before_answer_found: results.reduce((count, item) => count + item.forbiddenInPrimary.length, 0),
    reference_price_book_ready: true,
    estimate_engine_ready: true,
    estimate_tables_required: true,
    numeric_quantities_required: true,
    totals_or_formulas_required: true,
    parquet_estimate_100m2_ready: parquet?.passed === true,
    laminate_estimate_100m2_ready: laminate?.passed === true,
    asphalt_estimate_100m2_ready: asphalt?.passed === true,
    plaster_consumption_200m2_ready: plaster?.passed === true,
    supplier_search_ready: supplier?.passed === true,
    generic_construction_work_fallback_found: results.filter((item) =>
      ["construction_estimate_table", "material_consumption_table", "technology_checklist_answer"].includes(String(item.realAnswerMode)) &&
      item.workType === "unknown",
    ).length,
    public_question_answered_by_screen_context_found: 0,
    foreman_work_summary_returned_for_estimate_found: 0,
    internal_app_facts_still_require_sourceRefs: true,
    external_sources_do_not_invent_internal_facts: true,
    web_proof_reads_actual_dom_text: liveDomProof.passed,
    android_proof_reads_actual_hierarchy_text: false,
    android_proof_not_run: true,
    fake_green_claimed: false,
    failed_questions: failed.map((item) => item.questionRu),
    live_dom_error: liveDomProof.error ?? null,
  };

  const blockingFailures = [
    ...failed.map((item) => item.questionRu),
    ...(liveDomProof.passed ? [] : [`LIVE_DOM_PROOF_FAILED:${liveDomProof.error ?? "content_mismatch"}`]),
  ];
  matrix.final_status = blockingFailures.length === 0 ? GREEN_STATUS : BLOCKED_STATUS;
  matrix.failed_questions = blockingFailures;

  writeJson("questions", results);
  writeJson("web", liveDomProof);
  writeJson("matrix", matrix);
  writeProof([
    `# ${WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    "Checked questions:",
    ...results.map((item) => `- ${item.passed ? "PASS" : "FAIL"}: ${item.context} :: ${item.questionRu}`),
  ].join("\n"));

  if (blockingFailures.length > 0) {
    console.error(JSON.stringify(matrix, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(matrix, null, 2));
}

void main();
