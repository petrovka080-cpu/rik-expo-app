import type {
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
}): string {
  const summary = buildConsumerRepairPdfSummary(input)
    .replace(/[()\\]/g, " ")
    .split("\n")
    .map((line) => `(${line}) Tj`)
    .join("\n");

  return [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >> endobj",
    "4 0 obj << /Length 64 >> stream",
    "BT /F1 10 Tf 40 800 Td",
    summary,
    "ET",
    "endstream endobj",
    "xref",
    "0 5",
    "0000000000 65535 f ",
    "trailer << /Root 1 0 R /Size 5 >>",
    "startxref",
    "0",
    "%%EOF",
  ].join("\n");
}

export function buildConsumerRepairPdfSummary(input: {
  draft: ConsumerRepairRequestDraft;
  items: ConsumerRepairRequestItem[];
  media: ConsumerRepairRequestMedia[];
}): string {
  const itemLines = input.items.map((item, index) =>
    `${index + 1}. ${item.titleRu} — ${item.quantity ?? "уточнить"} ${item.unit ?? ""}`.trim(),
  );
  return [
    `Заявка: ${input.draft.title || "Ремонт дома"}`,
    `Дата: ${input.draft.approvedAt ?? input.draft.createdAt}`,
    `Контакт: ${input.draft.contactPhone || "не указан"}`,
    `Город/адрес: ${[input.draft.city, input.draft.addressText].filter(Boolean).join(", ") || "не указан"}`,
    `Тип ремонта: ${input.draft.repairType}`,
    `Описание: ${input.draft.problemText || "не указано"}`,
    "",
    "Позиции:",
    ...itemLines,
    "",
    `Вложения: фото/видео/документы — ${input.media.length}`,
    "",
    `Что уточнить: ${input.draft.missingData.join("; ") || "нет"}`,
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
