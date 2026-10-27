import type { AiDomainProvider } from "../aiDomainProviderContract";
import { AI_DOMAIN_GATEWAY_SOURCE_REFS, createFoundAiDomainResult, fact, refs } from "../aiDomainReadModel";

export const officeDomainProvider: AiDomainProvider = {
  domain: "office",
  capabilities: ["count", "list", "detail", "risk_summary", "missing_data", "draft_context", "linked_objects"],
  canHandle: (query) => query.domain === "office",
  execute: async (query) => {
    const sourceRefs = refs(
      AI_DOMAIN_GATEWAY_SOURCE_REFS.payment77,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.pdfInvoice45,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.request124,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.workGkl,
    );
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "office",
      summaryRu: "В офисе 7 зависших задач: 3 просрочены, 2 требуют документов, 2 ждут approval.",
      sourceRefs,
      numericFacts: [
        fact("office_stuck_tasks", 7, "Зависшие задачи офиса", [sourceRefs[0].id]),
        fact("office_overdue_tasks", 3, "Просроченные задачи", [sourceRefs[0].id]),
        fact("office_docs_required", 2, "Задачи требуют документы", [sourceRefs[1].id]),
        fact("office_approval_waiting", 2, "Задачи ждут approval", [sourceRefs[2].id]),
      ],
      factsRu: [
        {
          textRu: "Счет №45 ждет акт, платеж №77 требует документы, заявка №124 требует решения по закупке.",
          sourceRefIds: sourceRefs.map((ref) => ref.id),
          status: "risk",
        },
      ],
      missingData: ["акт по счету №45", "фото по работам первого этажа"],
      checkedSources: [{ sourceRu: "office tasks and blockers", status: "used" }],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
