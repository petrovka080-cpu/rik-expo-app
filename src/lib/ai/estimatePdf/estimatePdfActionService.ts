import {
  generateConsumerRepairRequestPdf,
  openConsumerRepairRequestPdf,
} from "../../consumerRequests/consumerRequestPdfService";
import { createAiEstimatePdf } from "../../aiEstimatePdf";
import { assertAiEstimatePdfSource } from "./estimatePdfGuard";
import { mapAiEstimatePdfSourceToExistingConsumerPdfModel } from "./estimatePdfModelMapper";
import type { AiEstimatePdfConfirmation, AiEstimatePdfResult, AiEstimatePdfSource } from "./estimatePdfTypes";

const history: AiEstimatePdfResult[] = [];

export function buildAiEstimatePdfConfirmation(source: AiEstimatePdfSource): AiEstimatePdfConfirmation {
  assertAiEstimatePdfSource(source);
  return {
    title: source.title,
    workTitle: source.estimate.workTitle,
    rowsPreview: source.estimate.sections.map((section) => ({
      sectionTitle: section.title,
      rowCount: section.rows.length,
    })),
    totals: source.estimate.totals,
    contactRequiredForMarketplace: true,
    copy: {
      title: "Создать PDF по этой смете?",
      body: [
        "В PDF войдут материалы и работы, количество и единицы, цены и итог, если они рассчитаны backend.",
        "Также будут добавлены налоговый статус, допущения, факторы удорожания и вопросы для уточнения.",
        "PDF можно создать без отправки в маркет.",
      ].join("\n"),
      cancelLabel: "Отмена",
      createLabel: "Создать PDF",
      createWithoutSendLabel: "Создать PDF без отправки",
      addContactLabel: "Добавить контакт",
    },
  };
}

export function generateAiEstimatePdf(input: {
  source: AiEstimatePdfSource;
  userConfirmed?: boolean;
}): AiEstimatePdfResult {
  if (input.userConfirmed === false) {
    throw new Error("AI estimate PDF generation requires explicit confirmation.");
  }
  assertAiEstimatePdfSource(input.source);
  if (input.source.structuredEstimate) {
    const runtimeTraceId = `ai_estimate_pdf:${input.source.sourceId ?? input.source.structuredEstimate.estimateId}`;
    const pdf = createAiEstimatePdf({
      estimate: input.source.structuredEstimate,
      runtimeTraceId,
      route: input.source.sourceType === "global_estimate_result" ? "/chat" : "/ai",
      generatedAt: new Date().toISOString(),
      documentMode: "estimate",
    });
    const result: AiEstimatePdfResult = {
      pdfId: pdf.pdfId,
      estimateId: input.source.sourceId,
      sourceType: input.source.sourceType,
      status: "openable",
      title: pdf.title,
      createdAt: input.source.createdAt,
      access: {
        kind: "signed-url",
        uri: pdf.dataUri,
      },
      openAction: {
        route: "/pdf-viewer",
        sourceKind: "signed-url",
      },
    };
    history.unshift(result);
    return { ...result, access: { ...result.access }, openAction: { ...result.openAction } };
  }
  const model = mapAiEstimatePdfSourceToExistingConsumerPdfModel(input.source);
  const pdf = generateConsumerRepairRequestPdf(model);
  const open = openConsumerRepairRequestPdf({ requestId: model.draft.id, pdf });
  const result: AiEstimatePdfResult = {
    pdfId: pdf.id,
    estimateId: input.source.sourceId,
    sourceType: input.source.sourceType,
    status: "openable",
    title: pdf.titleRu,
    createdAt: pdf.createdAt,
    access: {
      kind: "signed-url",
      uri: open.signedUrl,
      expiresAt: open.expiresAt,
    },
    openAction: {
      route: "/pdf-viewer",
      sourceKind: "signed-url",
    },
  };
  history.unshift(result);
  return { ...result, access: { ...result.access }, openAction: { ...result.openAction } };
}

export function createAiEstimatePdfDraft(source: AiEstimatePdfSource): AiEstimatePdfConfirmation {
  return buildAiEstimatePdfConfirmation(source);
}

export function getAiEstimatePdf(pdfId: string): AiEstimatePdfResult | null {
  const hit = history.find((item) => item.pdfId === pdfId);
  return hit ? { ...hit, access: { ...hit.access }, openAction: { ...hit.openAction } } : null;
}

export function listAiEstimatePdfHistory(): AiEstimatePdfResult[] {
  return history.map((item) => ({ ...item, access: { ...item.access }, openAction: { ...item.openAction } }));
}

export function __resetAiEstimatePdfHistoryForTests(): void {
  history.splice(0, history.length);
}
