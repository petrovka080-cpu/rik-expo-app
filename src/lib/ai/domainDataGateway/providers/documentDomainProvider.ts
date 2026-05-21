import type { AiDomainProvider } from "../aiDomainProviderContract";
import { AI_DOMAIN_GATEWAY_SOURCE_REFS, createFoundAiDomainResult, fact, getAiDomainGatewayDataset, refs } from "../aiDomainReadModel";

export const documentDomainProvider: AiDomainProvider = {
  domain: "documents",
  capabilities: ["count", "list", "detail", "trace", "linked_objects", "missing_data", "risk_summary"],
  canHandle: (query) => query.domain === "documents",
  execute: async (query) => {
    const dataset = getAiDomainGatewayDataset();
    const sourceRefs = refs(
      AI_DOMAIN_GATEWAY_SOURCE_REFS.pdfInvoice45,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.invoice45,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.payment77,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.request124,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.workGkl,
    );
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "documents",
      summaryRu: "PDF счета №45 найден: сумма 125 000 KGS, компания ОсОО \"СтройМат\", связан с платежом №77 и заявкой №124. Акт отсутствует.",
      sourceRefs,
      numericFacts: [
        fact("invoice_45_amount", dataset.documents.pdfInvoice45.amountKgs, "Сумма PDF счета №45", [sourceRefs[0].id], "KGS"),
        fact("payment_77_amount", dataset.finance.payments[0].amountKgs, "Сумма платежа №77", [sourceRefs[2].id], "KGS"),
        fact("request_124_quantity", dataset.procurement.mainRequest.requiredSheets, "Количество ГКЛ в заявке №124", [sourceRefs[3].id], "листов"),
      ],
      factsRu: [
        {
          textRu: "В документе указана компания ОсОО \"СтройМат\".",
          sourceRefIds: [sourceRefs[0].id, sourceRefs[1].id],
        },
        {
          textRu: "PDF подтверждает счет, но не закрывает акт и приемку.",
          sourceRefIds: [sourceRefs[0].id, sourceRefs[2].id],
          status: "blocked",
        },
      ],
      missingData: ["акт по счету №45", "подтверждение приемки"],
      checkedSources: [{ sourceRu: "PDF, document chunks and evidence matrix", status: "used" }],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
