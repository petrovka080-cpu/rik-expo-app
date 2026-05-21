import type { AiDomainProvider } from "../aiDomainProviderContract";
import { AI_DOMAIN_GATEWAY_SOURCE_REFS, createFoundAiDomainResult, fact, refs } from "../aiDomainReadModel";

export const clientDomainProvider: AiDomainProvider = {
  domain: "client",
  capabilities: ["count", "list", "detail", "linked_objects", "risk_summary"],
  canHandle: (query) => query.domain === "client",
  execute: async (query) => {
    const sourceRefs = refs(AI_DOMAIN_GATEWAY_SOURCE_REFS.clientReport, AI_DOMAIN_GATEWAY_SOURCE_REFS.workGkl);
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "client",
      summaryRu: "Клиентский scope показывает 5 выполненных задач и 2 задержки без раскрытия внутренних финансов.",
      sourceRefs,
      numericFacts: [
        fact("client_completed_tasks", 5, "Выполнено задач для клиента", [sourceRefs[0].id]),
        fact("client_delayed_tasks", 2, "Задерживаются задачи", [sourceRefs[0].id]),
        fact("gkl_shortage_client_visible", 60, "Недостача ГКЛ как причина задержки", [sourceRefs[1].id], "листов"),
      ],
      factsRu: [
        {
          textRu: "Клиент видит только client-visible прогресс, без внутренних платежей и приватных документов.",
          sourceRefIds: [sourceRefs[0].id],
        },
      ],
      checkedSources: [{ sourceRu: "client visible progress", status: "used" }],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
