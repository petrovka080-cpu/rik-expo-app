import { getConsumerRepairBundle } from "./consumerRequestRepository";
import { consumerRepairPdfStorageObjectExists } from "./consumerRequestPdfStorage";
import type {
  ConsumerRequestValidationErrorItem,
  ConsumerRequestValidationResult,
  ConsumerRepairDraftBundle,
} from "./consumerRequestTypes";

function hasUsefulDescription(bundle: ConsumerRepairDraftBundle): boolean {
  return (bundle.draft.problemText ?? "").trim().length >= 20;
}

function hasValidContactPhone(bundle: ConsumerRepairDraftBundle): boolean {
  const phone = (bundle.draft.contactPhone ?? "").trim();
  const digitCount = phone.replace(/\D/g, "").length;
  return digitCount >= 7;
}

function hasRepairType(bundle: ConsumerRepairDraftBundle): boolean {
  const repairType = (bundle.draft.repairType ?? "").trim();
  return repairType.length > 0 && repairType !== "unknown";
}

function latestGeneratedPdf(bundle: ConsumerRepairDraftBundle) {
  return bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated");
}

function result(errors: ConsumerRequestValidationErrorItem[]): ConsumerRequestValidationResult {
  return { ok: errors.length === 0, errors };
}

function ownerError(bundle: ConsumerRepairDraftBundle, userId: string): ConsumerRequestValidationErrorItem | null {
  if (bundle.draft.consumerUserId === userId) return null;
  return {
    code: "OWNER_MISMATCH",
    messageRu: "Эта заявка принадлежит другому пользователю.",
    field: "consumerUserId",
  };
}

export function validateConsumerRepairRequestForApprove(
  requestId: string,
  userId: string,
): ConsumerRequestValidationResult {
  const bundle = getConsumerRepairBundle(requestId);
  const errors: ConsumerRequestValidationErrorItem[] = [];
  const ownerMismatch = ownerError(bundle, userId);
  if (ownerMismatch) errors.push(ownerMismatch);

  if (bundle.items.length < 1) {
    errors.push({
      code: "ITEMS_REQUIRED",
      messageRu: "Добавьте хотя бы одну позицию заявки.",
      field: "items",
    });
  }

  if (!hasUsefulDescription(bundle) && bundle.media.length < 1) {
    errors.push({
      code: "DESCRIPTION_REQUIRED",
      messageRu: "Добавьте описание проблемы.",
      field: "problemText",
    });
  }

  return result(errors);
}

export function validateConsumerRepairRequestForMarketplace(
  requestId: string,
  userId: string,
): ConsumerRequestValidationResult {
  const bundle = getConsumerRepairBundle(requestId);
  const errors: ConsumerRequestValidationErrorItem[] = [];
  const ownerMismatch = ownerError(bundle, userId);
  if (ownerMismatch) errors.push(ownerMismatch);

  const alreadySent = bundle.draft.status === "sent_to_marketplace"
    && bundle.marketplaceLink.status === "sent"
    && Boolean(bundle.marketplaceLink.marketplaceDemandId);

  if (bundle.draft.status !== "consumer_approved" && !alreadySent) {
    errors.push({
      code: "REQUEST_NOT_APPROVED",
      messageRu: "Сначала утвердите заявку.",
      field: "status",
    });
  }

  if (!hasValidContactPhone(bundle)) {
    errors.push({
      code: "CONTACT_REQUIRED",
      messageRu: "Укажите телефон, чтобы мастера могли связаться с вами.",
      field: "contactPhone",
    });
  }

  if (!hasUsefulDescription(bundle)) {
    errors.push({
      code: "DESCRIPTION_REQUIRED",
      messageRu: "Добавьте описание проблемы.",
      field: "problemText",
    });
  }

  if (bundle.media.length < 1) {
    errors.push({
      code: "MEDIA_REQUIRED",
      messageRu: "Добавьте хотя бы одно фото, видео или документ.",
      field: "media",
    });
  }

  if (bundle.items.length < 1) {
    errors.push({
      code: "ITEMS_REQUIRED",
      messageRu: "Добавьте хотя бы одну позицию заявки.",
      field: "items",
    });
  }

  if (!hasRepairType(bundle)) {
    errors.push({
      code: "REPAIR_TYPE_REQUIRED",
      messageRu: "Выберите тип ремонта.",
      field: "repairType",
    });
  }

  const pdf = latestGeneratedPdf(bundle);
  if (!pdf) {
    errors.push({
      code: "PDF_REQUIRED",
      messageRu: "Сначала создайте PDF заявки.",
      field: "pdf",
    });
  } else if (!consumerRepairPdfStorageObjectExists(pdf.storageBucket, pdf.storageKey)) {
    errors.push({
      code: "PDF_FILE_MISSING",
      messageRu: "PDF файл не найден в хранилище. Создайте PDF заявки ещё раз.",
      field: "pdf",
    });
  }

  return result(errors);
}

export { type ConsumerRequestValidationResult };
