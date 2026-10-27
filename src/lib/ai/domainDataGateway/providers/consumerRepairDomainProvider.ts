import type { AiDomainProvider } from "../aiDomainProviderContract";
import { createFoundAiDomainResult, fact } from "../aiDomainReadModel";
import type { AiDomainSourceRef } from "../aiDomainContextBundle";

const consumerDraftRef: AiDomainSourceRef = {
  id: "domain:consumer_repair:own_draft",
  origin: "consumer_repair",
  entityType: "consumer_repair_request",
  entityId: "own_consumer_repair_draft",
  labelRu: "Черновик заявки",
  appLink: { route: "/request", params: {} },
  permission: { canOpen: true },
  canBePresentedAsFact: true,
  requiresReview: true,
};

const consumerPdfRef: AiDomainSourceRef = {
  id: "domain:consumer_repair:own_pdf_history",
  origin: "consumer_repair",
  entityType: "consumer_repair_pdf",
  entityId: "own_consumer_repair_pdf_history",
  labelRu: "История PDF",
  appLink: { route: "/request", params: {} },
  permission: { canOpen: true },
  canBePresentedAsFact: true,
  requiresReview: false,
};

export const consumerRepairDomainProvider: AiDomainProvider = {
  domain: "consumer_repair",
  capabilities: ["detail", "list", "draft_context", "linked_objects", "trace"],
  canHandle: (query) => query.domain === "consumer_repair" && query.role === "consumer",
  execute: async (query) => {
    const sourceRefs = [consumerDraftRef, consumerPdfRef];
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "consumer_repair",
      summaryRu:
        "Consumer scope возвращает только собственный черновик, позиции, вложения, PDF-историю и связь с marketplace.",
      sourceRefs,
      numericFacts: [
        fact("consumer_office_access", 0, "Доступ к Офису", [consumerDraftRef.id]),
        fact("consumer_marketplace_link_allowed", 1, "Связь с marketplace разрешена", [consumerDraftRef.id]),
      ],
      factsRu: [
        {
          textRu: "B2C заявка не попадает в офисные закупки, склад, финансы или approval inbox.",
          sourceRefIds: [consumerDraftRef.id],
        },
        {
          textRu: "PDF-история принадлежит только физлицу и открывается из /request.",
          sourceRefIds: [consumerPdfRef.id],
        },
      ],
      checkedSources: [{ sourceRu: "consumer_repair", status: "used" }],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
