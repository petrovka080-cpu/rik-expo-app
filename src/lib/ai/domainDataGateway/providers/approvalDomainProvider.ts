import type { AiDomainProvider } from "../aiDomainProviderContract";
import { AI_DOMAIN_GATEWAY_SOURCE_REFS, createFoundAiDomainResult, fact, refs } from "../aiDomainReadModel";

export const approvalDomainProvider: AiDomainProvider = {
  domain: "approvals",
  capabilities: ["count", "list", "detail", "risk_summary", "draft_context", "linked_objects"],
  canHandle: (query) => query.domain === "approvals",
  execute: async (query) => {
    const sourceRefs = refs(AI_DOMAIN_GATEWAY_SOURCE_REFS.approvalQueue, AI_DOMAIN_GATEWAY_SOURCE_REFS.request124, AI_DOMAIN_GATEWAY_SOURCE_REFS.payment77);
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "approvals",
      summaryRu: "У директора 6 решений: главное — заявка №124 и платеж №77, но AI не approve/reject и не меняет данные.",
      sourceRefs,
      numericFacts: [
        fact("director_decisions_count", 6, "Решения директора сегодня", [sourceRefs[0].id]),
        fact("gkl_shortage", 60, "Недостача ГКЛ для решения", [sourceRefs[1].id], "листов"),
        fact("payment_risk_sum", 125000, "Сумма платежа в риске", [sourceRefs[2].id], "KGS"),
      ],
      factsRu: [
        {
          textRu: "Approval provider возвращает контекст решения, а не выполняет approval.",
          sourceRefIds: sourceRefs.map((ref) => ref.id),
          status: "draft",
        },
      ],
      checkedSources: [{ sourceRu: "approval queue", status: "used" }],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
