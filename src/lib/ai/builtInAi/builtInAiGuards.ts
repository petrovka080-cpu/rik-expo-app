import type { BuiltInAiAnswer } from "./builtInAiTypes";

const FORBIDDEN_ESTIMATE_PHRASES = [
  "Осмотр и уточнение объёма работ",
  "Ремонтные работы после согласования",
  "За 2026 найдено работ",
  "Источник ответа: данные приложения",
  "Интернет не использовался",
  "Marketplace не использовался",
  "не найдено",
  "уточните всё, потом посчитаю",
];

export function assertBuiltInAiAnswer(answer: BuiltInAiAnswer): void {
  if (answer.route.intent === "estimate") {
    if (
      (answer.toolResult.blockedBy === "AMBIGUOUS_NEEDS_DISAMBIGUATION" ||
        answer.toolResult.blockedBy === "TEMPLATE_GAP_SAFE_TRIAGE") &&
      !answer.toolResult.estimate
    ) {
      return;
    }
    if (answer.toolResult.toolName !== "calculate_global_estimate" || !answer.toolResult.estimate) {
      throw new Error("BUILT_IN_AI_ESTIMATE_MUST_CALL_CALCULATE_GLOBAL_ESTIMATE");
    }
    if (!answer.actions.some((action) => action.id === "make_pdf" && action.visible)) {
      throw new Error("BUILT_IN_AI_ESTIMATE_REQUIRES_PDF_ACTION");
    }
    const lower = answer.answerTextRu.toLowerCase();
    const forbidden = FORBIDDEN_ESTIMATE_PHRASES.find((phrase) => lower.includes(phrase.toLowerCase()));
    if (forbidden) throw new Error(`BUILT_IN_AI_FORBIDDEN_ESTIMATE_FALLBACK:${forbidden}`);
    const pricedRows = answer.toolResult.estimate.sections.flatMap((section) => section.rows).filter((row) => row.unitPrice != null);
    if (pricedRows.some((row) => row.sourceEvidence.length === 0)) {
      throw new Error("BUILT_IN_AI_PRICED_ROWS_REQUIRE_SOURCE_EVIDENCE");
    }
  }
  if (answer.route.intent === "product_search" || answer.route.intent === "marketplace_lookup") {
    if (!answer.toolResult.productSearch) throw new Error("BUILT_IN_AI_PRODUCT_SEARCH_REQUIRES_PRODUCT_TOOL");
    if (answer.toolResult.productSearch.fakeStockOrAvailabilityFound) {
      throw new Error("BUILT_IN_AI_PRODUCT_SEARCH_MUST_NOT_FAKE_STOCK");
    }
  }
}
