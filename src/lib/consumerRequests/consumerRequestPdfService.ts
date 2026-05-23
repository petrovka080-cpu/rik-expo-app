import type {
  ConsumerRepairPdfSupplement,
  ConsumerRepairRequestDraft,
  ConsumerRepairRequestItem,
  ConsumerRepairRequestMedia,
  ConsumerRepairRequestPdf,
} from "./consumerRequestTypes";
import {
  consumerRepairPdfStorageObjectExists,
  createConsumerRepairPdfSignedUrl,
  uploadConsumerRepairPdfObject,
} from "./consumerRequestPdfStorage";
import { renderTextPdfDocument } from "../estimatePdf";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function safeSegment(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "consumer_request";
}

export function generateConsumerRepairRequestPdf(input: {
  draft: ConsumerRepairRequestDraft;
  items: ConsumerRepairRequestItem[];
  media: ConsumerRepairRequestMedia[];
  supplement?: ConsumerRepairPdfSupplement;
}): ConsumerRepairRequestPdf {
  const createdAt = new Date().toISOString();
  const title = input.draft.title || input.draft.aiSummaryRu || "Заявка на ремонт";
  const storageBucket = "private-media";
  const storageKey = `consumer-repair/${input.draft.consumerUserId}/${safeSegment(input.draft.id)}-${createdAt.slice(0, 10)}.pdf`;
  const pdfBody = buildConsumerRepairPdfBody(input);
  const uploaded = uploadConsumerRepairPdfObject({
    storageBucket,
    storageKey,
    body: pdfBody,
    contentType: "application/pdf",
  });
  if (!consumerRepairPdfStorageObjectExists(storageBucket, storageKey)) {
    throw new Error("Consumer repair PDF upload verification failed.");
  }
  return {
    id: id("consumer_pdf"),
    requestDraftId: input.draft.id,
    documentAssetId: id("consumer_pdf_asset"),
    storageBucket,
    storageKey,
    titleRu: title,
    pdfStatus: "generated",
    contentType: "application/pdf",
    uploadedAt: uploaded.uploadedAt,
    storageVerifiedAt: new Date().toISOString(),
    createdAt,
  };
}

function buildConsumerRepairPdfBody(input: {
  draft: ConsumerRepairRequestDraft;
  items: ConsumerRepairRequestItem[];
  media: ConsumerRepairRequestMedia[];
  supplement?: ConsumerRepairPdfSupplement;
}): string {
  return renderTextPdfDocument({
    pdfId: input.draft.id,
    title: input.draft.title || input.draft.aiSummaryRu || "Заявка на ремонт",
    fileName: `${safeSegment(input.draft.id)}.pdf`,
    lines: buildConsumerRepairPdfSummary(input).split("\n"),
  }).body;
}

export function buildConsumerRepairPdfSummary(input: {
  draft: ConsumerRepairRequestDraft;
  items: ConsumerRepairRequestItem[];
  media: ConsumerRepairRequestMedia[];
  supplement?: ConsumerRepairPdfSupplement;
}): string {
  const pricedRows = input.items.filter((item) => item.unitPrice != null && item.totalPrice != null);
  const estimatedTotal = pricedRows.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);
  const totalCurrency = pricedRows[0]?.currency ?? "KGS";
  const itemLines = input.items.map((item, index) =>
    [
      `${index + 1}. ${item.titleRu}`,
      `${item.quantity ?? "уточнить"} ${item.unit ?? ""}`.trim(),
      item.unitPrice != null ? `${item.unitPrice} ${item.currency} / ${item.unit ?? "unit"}` : null,
      item.totalPrice != null ? `${item.totalPrice} ${item.currency}` : null,
    ].filter(Boolean).join(" - "),
  );
  const supplement = input.supplement;
  const supplementLines = supplement
    ? [
        "",
        "Estimate PDF supplement:",
        `Tax status: ${supplement.taxStatus || "not calculated"}`,
        `Source confidence: ${supplement.sourceConfidence || "medium"}`,
        supplement.safetyMessage ? `Safety: ${supplement.safetyMessage}` : null,
        supplement.estimateAssumptions?.length ? `Assumptions: ${supplement.estimateAssumptions.join("; ")}` : null,
        supplement.costIncreaseFactors?.length ? `Cost increase factors: ${supplement.costIncreaseFactors.join("; ")}` : null,
        supplement.clarifyingQuestions?.length ? `Clarifying questions: ${supplement.clarifyingQuestions.join("; ")}` : null,
        supplement.sourceLabels?.length ? `Sources: ${supplement.sourceLabels.join("; ")}` : null,
      ].filter((line): line is string => typeof line === "string")
    : [];
  return [
    `Заявка: ${input.draft.title || "Ремонт дома"}`,
    `Дата: ${input.draft.approvedAt ?? input.draft.createdAt}`,
    `Контакт: ${input.draft.contactPhone || "не указан"}`,
    `Город/адрес: ${[input.draft.city, input.draft.addressText].filter(Boolean).join(", ") || "не указан"}`,
    `Тип ремонта: ${input.draft.repairType}`,
    `Описание: ${input.draft.problemText || "не указано"}`,
    `Estimate summary: ${input.draft.aiSummaryRu || "not provided"}`,
    "",
    "Позиции:",
    ...itemLines,
    "",
    `Estimate total from rows: ${estimatedTotal > 0 ? `${estimatedTotal} ${totalCurrency}` : "not available"}`,
    "Tax status: see estimate summary; tax is never calculated in PDF rendering.",
    "",
    `Вложения: фото/видео/документы - ${input.media.length}`,
    "",
    `Что уточнить: ${input.draft.missingData.join("; ") || "нет"}`,
    ...supplementLines,
  ].join("\n");
}

export function openConsumerRepairRequestPdf(input: {
  requestId: string;
  pdf: ConsumerRepairRequestPdf;
}) {
  if (input.pdf.pdfStatus !== "generated") {
    throw new Error("Consumer repair PDF is not ready.");
  }
  const signed = createConsumerRepairPdfSignedUrl({
    storageBucket: input.pdf.storageBucket,
    storageKey: input.pdf.storageKey,
  });
  return {
    requestId: input.requestId,
    pdfId: input.pdf.id,
    titleRu: input.pdf.titleRu,
    signedUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
    contentType: signed.contentType,
  };
}
