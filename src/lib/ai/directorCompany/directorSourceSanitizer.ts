import type {
  DirectorCompanyContext,
  DirectorCompanySourceType,
  DirectorCompanyAnswer,
} from "./directorCompanyTypes";

const TECHNICAL_FORBIDDEN = new Set([
  "raw_runtime",
  "raw_security_event",
  "service_role",
  "provider_payload",
  "env_secret",
]);

export function directorHiddenTechnicalData(context: DirectorCompanyContext): DirectorCompanyAnswer["hiddenTechnicalData"] {
  return (context.unsafeTechnicalSources ?? []).map((source) => ({
    sourceType: source.type,
    reasonRu: "Сырые runtime/security/provider/env данные скрыты от директорского UI; доступен только безопасный summary.",
  }));
}

export function sanitizeDirectorContext(context: DirectorCompanyContext): DirectorCompanyContext {
  const allowedTypes = new Set<DirectorCompanySourceType>([
    "work",
    "object",
    "contractor",
    "procurement_request",
    "supplier_offer",
    "marketplace_offer",
    "warehouse_stock",
    "warehouse_incoming",
    "warehouse_issue",
    "payment",
    "invoice",
    "act",
    "cashflow",
    "document",
    "pdf_chunk",
    "report",
    "approval",
    "chat_message",
    "office_task",
    "security_summary",
  ]);
  return {
    ...context,
    sources: context.sources.filter((source) => allowedTypes.has(source.type)),
    unsafeTechnicalSources: (context.unsafeTechnicalSources ?? []).filter((source) => !TECHNICAL_FORBIDDEN.has(source.type)),
    securitySummaries: context.securitySummaries.map((summary) => ({
      ...summary,
      summaryRu: summary.summaryRu.replace(/service_role|token|secret|payload|runtime dump/gi, "redacted"),
    })),
  };
}
