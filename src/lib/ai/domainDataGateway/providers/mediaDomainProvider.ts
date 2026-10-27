import type { AiDomainProvider } from "../aiDomainProviderContract";
import { AI_DOMAIN_GATEWAY_SOURCE_REFS, createFoundAiDomainResult, fact, refs } from "../aiDomainReadModel";

export const mediaDomainProvider: AiDomainProvider = {
  domain: "media",
  capabilities: ["count", "list", "detail", "trace", "linked_objects", "missing_data"],
  canHandle: (query) => query.domain === "media",
  execute: async (query) => {
    const sourceRefs = refs(AI_DOMAIN_GATEWAY_SOURCE_REFS.workGkl, AI_DOMAIN_GATEWAY_SOURCE_REFS.request124);
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "media",
      summaryRu: "По работе ГКЛ в gateway доступны media sourceRefs как доказательства-кандидаты; финальная связь требует human review.",
      sourceRefs,
      numericFacts: [
        fact("work_gkl_media_refs_available", 2, "Media refs по работе ГКЛ", [sourceRefs[0].id]),
      ],
      factsRu: [
        {
          textRu: "Media используется как evidence suggestion, а не финальный факт закрытия работы.",
          sourceRefIds: [sourceRefs[0].id],
          status: "draft",
        },
      ],
      missingData: ["финальное подтверждение связи media человеком"],
      checkedSources: [{ sourceRu: "media sourceRefs and visibility policy", status: "used" }],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
