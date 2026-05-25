import type { SourceGovernanceFailure, SourceGovernanceFailureCode } from "./rateSourceEvidenceTypes";

const RU_MESSAGES: Record<SourceGovernanceFailureCode, string> = {
  PRICE_WITHOUT_SOURCE: "Цена скрыта: нет подтвержденного источника.",
  SOURCE_EVIDENCE_INCOMPLETE: "Источник цены неполный: нужна ссылка на источник, дата проверки и тип источника.",
  HIGH_CONFIDENCE_STALE_SOURCE: "Высокая точность недоступна: источник устарел или не проверен.",
  AVAILABLE_WITHOUT_REAL_CATALOG_SOURCE: "Доступность не подтверждена реальным catalog/source.",
  IN_STOCK_WITHOUT_REAL_CATALOG_SOURCE: "Наличие на складе не подтверждено реальным catalog/source.",
  SUPPLIER_WITHOUT_EVIDENCE: "Поставщик не показан: нет подтверждающего источника.",
  FAKE_AVAILABILITY: "Найдена неподтвержденная availability-метка.",
  FAKE_STOCK: "Найдена неподтвержденная stock-метка.",
  FAKE_SUPPLIER: "Найдена неподтвержденная supplier-метка.",
};

export function formatSourceWarning(code: SourceGovernanceFailureCode): string {
  return RU_MESSAGES[code];
}

export function formatSourceWarnings(failures: readonly SourceGovernanceFailure[]): string[] {
  return [...new Set(failures.map((failure) => formatSourceWarning(failure.code)))];
}
