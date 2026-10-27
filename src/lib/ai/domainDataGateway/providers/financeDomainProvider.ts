import type { AiDomainProvider } from "../aiDomainProviderContract";
import { AI_DOMAIN_GATEWAY_SOURCE_REFS, createFoundAiDomainResult, fact, getAiDomainGatewayDataset, refs } from "../aiDomainReadModel";

export const financeDomainProvider: AiDomainProvider = {
  domain: "finance",
  capabilities: ["count", "list", "detail", "trace", "breakdown", "missing_data", "risk_summary", "linked_objects"],
  canHandle: (query) => query.domain === "finance",
  execute: async (query) => {
    const dataset = getAiDomainGatewayDataset();
    const sourceRefs = refs(
      AI_DOMAIN_GATEWAY_SOURCE_REFS.payment77,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.pdfInvoice45,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.request124,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.workGkl,
    );
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "finance",
      summaryRu: "Найдено 3 платежа без полного пакета документов на сумму 245 000 KGS. Платеж №77 на 125 000 KGS связан с PDF счета №45 и заявкой №124, но акт отсутствует.",
      sourceRefs,
      numericFacts: [
        fact("payments_missing_docs_count", dataset.finance.paymentsMissingDocsCount, "Платежей без документов", [sourceRefs[0].id]),
        fact("payments_missing_docs_sum", dataset.finance.paymentsMissingDocsSumKgs, "Сумма платежей без документов", [sourceRefs[0].id], "KGS"),
        fact("payment_77_amount", 125000, "Платеж №77", [sourceRefs[0].id], "KGS"),
        fact("payment_78_amount", 80000, "Платеж №78", [sourceRefs[0].id], "KGS"),
        fact("payment_78_partial_paid", 30000, "Частично оплачено по платежу №78", [sourceRefs[0].id], "KGS"),
        fact("payment_79_amount", 40000, "Платеж №79", [sourceRefs[0].id], "KGS"),
      ],
      factsRu: [
        {
          textRu: "Платеж №77 требует акт: PDF счета есть, акт отсутствует.",
          sourceRefIds: [sourceRefs[0].id, sourceRefs[1].id],
          status: "blocked",
        },
        {
          textRu: "Платежи №78 и №79 также неполные: по №78 не хватает договора, по №79 подтверждающего PDF.",
          sourceRefIds: [sourceRefs[0].id],
          status: "risk",
        },
      ],
      missingData: ["акт по платежу №77", "договор по платежу №78", "подтверждающий PDF по платежу №79"],
      checkedSources: [{ sourceRu: "платежи, счета и документы", status: "used" }],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
