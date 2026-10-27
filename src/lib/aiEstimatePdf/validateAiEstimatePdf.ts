import type { AiEstimatePdfValidationResult } from "./aiEstimatePdfTypes";
import { estimatePdfInputToBytes, extractEstimatePdfText, validateEstimatePdf } from "../estimatePdf";

function bytesToAscii(bytes: Uint8Array): string {
  let result = "";
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    result += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return result;
}

const REQUIRED_COLUMNS = ["#", "Наименование", "Категория", "Кол-во", "Ед.", "Цена", "Сумма"];
const FORBIDDEN_PROCUREMENT_TERMS = [
  "Снабженец",
  "Поставщики",
  "Заявка на закупку",
  "Утверждена",
  "Supplier",
  "Director Proposal",
];

const BACKEND_DEBUG_PATTERNS = [
  /Backend global estimate/i,
  /GlobalEstimateResult/i,
  /PDF layer/i,
  /Work key/i,
  /Estimate ID/i,
  /Runtime trace ID/i,
  /Grand total/i,
  /Tax status/i,
  /Confidence/i,
  /Human confirmation/i,
  /\bbackend\b/i,
  /\bdebug\b/i,
  /LEGACY PDF path protected/i,
];

export function validateAiEstimatePdf(input: {
  pdf: Uint8Array | string;
  knownWorkKey?: string;
  requiredText?: string[];
}): AiEstimatePdfValidationResult {
  const bytes = estimatePdfInputToBytes(input.pdf);
  const body = bytesToAscii(bytes);
  const text = extractEstimatePdfText(bytes);
  const baseValidation = validateEstimatePdf({
    pdf: bytes,
    knownWorkKey: input.knownWorkKey,
    requiredText: [
      "Сметное предложение / Смета работ",
      "Документ №",
      "Статус",
      "Итоги",
      "Налог / источники / точность",
      "Подписание",
      ...(input.requiredText ?? []),
    ],
  });
  const textLines = text.split(/\r?\n/);
  const realBorderedTablePresent = /\sre\sS/.test(body) && REQUIRED_COLUMNS.every((column) => text.includes(column));
  const requiredColumnsPresent = REQUIRED_COLUMNS.every((column) => text.includes(column));
  const totalsPresent = text.includes("Итого") && /Материалы|Работы/.test(text);
  const taxSourcesFooterPresent =
    text.includes("Налог / источники / точность") &&
    text.includes("Точность расчёта:") &&
    text.includes("Источники") &&
    text.includes("Подпись заказчика");
  const plainTextDumpFound =
    !realBorderedTablePresent ||
    textLines.some((line) => line.split("|").length >= 4 && !line.includes("Смета |")) ||
    (text.includes("Позиции:") && !requiredColumnsPresent);
  const markdownTableFound = textLines.some((line) => /^\s*\|.+\|\s*$/.test(line) || /^\s*\|?\s*-{3,}/.test(line));
  const procurementCloneFound = FORBIDDEN_PROCUREMENT_TERMS.some((term) => text.includes(term));
  const genericConstructionRowFound = textLines.some((line) => /^Строительные работы$/i.test(line.trim()));
  const rawMaterialKeyVisible = /\bmaterialKey\b/i.test(text);
  const rawRateKeyVisible = /\brateKey\b/i.test(text);
  const rawSourceIdVisible = /\bsourceId\b/i.test(text) || /\brate_[a-z0-9_]+\b/i.test(text) || /\bcatalog_items\b/i.test(text);
  const backendDebugTextVisible = BACKEND_DEBUG_PATTERNS.some((pattern) => pattern.test(text));
  const rawUnitLabelsFound = /\b(linear_m|sq_m|cubic_m|pcs)\b/.test(text);

  const failures = [...baseValidation.failures];
  if (!realBorderedTablePresent) failures.push("AI_ESTIMATE_PDF_REAL_BORDERED_TABLE_MISSING");
  if (!requiredColumnsPresent) failures.push("AI_ESTIMATE_PDF_REQUIRED_COLUMNS_MISSING");
  if (!totalsPresent) failures.push("AI_ESTIMATE_PDF_TOTALS_MISSING");
  if (!taxSourcesFooterPresent) failures.push("AI_ESTIMATE_PDF_TAX_SOURCES_FOOTER_MISSING");
  if (plainTextDumpFound) failures.push("AI_ESTIMATE_PDF_PLAIN_TEXT_DUMP_FOUND");
  if (markdownTableFound) failures.push("AI_ESTIMATE_PDF_MARKDOWN_TABLE_FOUND");
  if (procurementCloneFound) failures.push("AI_ESTIMATE_PDF_PROCUREMENT_CLONE_FOUND");
  if (genericConstructionRowFound) failures.push("AI_ESTIMATE_PDF_GENERIC_CONSTRUCTION_ROW_FOUND");
  if (rawMaterialKeyVisible) failures.push("AI_ESTIMATE_PDF_RAW_MATERIAL_KEY_VISIBLE");
  if (rawRateKeyVisible) failures.push("AI_ESTIMATE_PDF_RAW_RATE_KEY_VISIBLE");
  if (rawSourceIdVisible) failures.push("AI_ESTIMATE_PDF_RAW_SOURCE_ID_VISIBLE");
  if (backendDebugTextVisible) failures.push("AI_ESTIMATE_PDF_BACKEND_DEBUG_TEXT_VISIBLE");
  if (rawUnitLabelsFound) failures.push("AI_ESTIMATE_PDF_RAW_UNIT_LABELS_VISIBLE");

  const uniqueFailures = [...new Set(failures)];
  return {
    valid: uniqueFailures.length === 0,
    failures: uniqueFailures,
    text,
    details: {
      binaryValid: baseValidation.details.binaryValid,
      cyrillicReadable: baseValidation.details.cyrillicReadable,
      mojibakeFound: baseValidation.details.mojibakeFound,
      realBorderedTablePresent,
      requiredColumnsPresent,
      totalsPresent,
      taxSourcesFooterPresent,
      plainTextDumpFound,
      markdownTableFound,
      procurementCloneFound,
      genericConstructionRowFound,
      rawMaterialKeyVisible,
      rawRateKeyVisible,
      rawSourceIdVisible,
      backendDebugTextVisible,
      rawUnitLabelsFound,
    },
  };
}
