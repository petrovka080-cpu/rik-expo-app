import { getConsumerRepairBundle } from "./consumerRequestRepository";
import { consumerRepairPdfStorageObjectExists } from "./consumerRequestPdfStorage";
import type {
  ConsumerRequestValidationErrorItem,
  ConsumerRequestValidationResult,
  ConsumerRepairDraftBundle,
} from "./consumerRequestTypes";
import { getRoadworksWaveAOperation } from "../estimate/v4/roadworks";
import { getAsphaltRelatedProfileByCatalogRecordIdV4 } from "../estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";

function hasUsefulDescription(bundle: ConsumerRepairDraftBundle): boolean {
  return (bundle.draft.problemText ?? "").trim().length >= 20;
}

function hasApprovalDescriptionOrExactCalculatedWork(
  bundle: ConsumerRepairDraftBundle,
): boolean {
  if (hasUsefulDescription(bundle)) return true;
  const selectedWorkKey = bundle.draft.selectedWorkKey?.trim();
  const revisionState = bundle.estimateDraftRevisionState;
  const currentRevision = revisionState?.revisions.find(
    (revision) => revision.revisionId === revisionState.currentRevisionId,
  );
  return Boolean(
    bundle.draft.selectedWorkSource === "user_selected" &&
    selectedWorkKey &&
    currentRevision?.professionalWorkId === selectedWorkKey &&
    currentRevision.boq.rows.length > 0 &&
    bundle.items.length > 0 &&
    revisionState?.currentRevisionId,
  );
}

function hasValidContactPhone(bundle: ConsumerRepairDraftBundle): boolean {
  const phone = (bundle.draft.contactPhone ?? "").trim();
  const digitCount = phone.replace(/\D/g, "").length;
  return digitCount >= 7;
}

function hasDeliveryAddress(bundle: ConsumerRepairDraftBundle): boolean {
  return (bundle.draft.addressText ?? "").trim().length >= 3;
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

export function consumerRepairExactAsphaltApprovalErrors(
  bundle: ConsumerRepairDraftBundle | null,
): ConsumerRequestValidationErrorItem[] {
  if (!bundle) return [];
  const selectedCatalogId = bundle.draft.selectedCatalogWorkId?.trim() || bundle.draft.selectedWorkKey?.trim() || "";
  const selectedWorkKey = bundle.draft.selectedWorkKey?.trim() || "";
  const exactProfile = getAsphaltRelatedProfileByCatalogRecordIdV4(selectedCatalogId || selectedWorkKey);
  const roadworksOperation = getRoadworksWaveAOperation(selectedWorkKey);
  if (!exactProfile && !roadworksOperation) return [];

  const errors: ConsumerRequestValidationErrorItem[] = [];
  const state = bundle.estimateDraftRevisionState;
  const current = state?.revisions.find((revision) => revision.revisionId === state.currentRevisionId) ?? null;
  const expectedWorkKey = exactProfile?.canonicalWorkKey ?? selectedWorkKey;
  const block = (code: ConsumerRequestValidationErrorItem["code"], messageRu: string, field: string) => {
    errors.push({ code, messageRu, field });
  };
  if (!state || !current) {
    block("ESTIMATE_REVISION_REQUIRED", "Сначала сформируйте текущую профессиональную ревизию сметы.", "estimateRevision");
    return errors;
  }
  if (state.revisions.at(-1)?.revisionId !== state.currentRevisionId) {
    block("ESTIMATE_LATEST_REVISION_REQUIRED", "Подтверждать можно только последнюю ревизию сметы.", "estimateRevision");
  }
  if (current.professionalWorkId !== expectedWorkKey || selectedWorkKey !== expectedWorkKey) {
    block("ESTIMATE_SELECTED_WORK_MISMATCH", "Текущая ревизия не принадлежит выбранной работе. Пересчитайте смету.", "selectedWorkKey");
  }
  if (current.status !== "draft_ready" || current.missingInputs.length > 0) {
    block("ESTIMATE_PARAMETERS_REQUIRED", "Заполните обязательные параметры и пересчитайте смету перед подтверждением.", "canonicalParameters");
  }
  if (current.boq.rows.length === 0) {
    block("ESTIMATE_PROFESSIONAL_COMPLETENESS_REQUIRED", "Смета пуста: профессиональная постадийная декомпозиция ещё не сформирована.", "boq");
  }
  if (current.boq.rows.some((row) => !Number.isFinite(row.quantity) || row.quantity <= 0)) {
    block("ESTIMATE_QUANTITY_INVALID", "В смете есть пустые или недопустимые количества. Пересчитайте смету.", "boq.quantity");
  }
  if (current.boq.rows.some((row) =>
    row.sourceParameters?.exactSelectionGenericFallbackUsed === true ||
    !row.sourceParameters?.professionalEstimatePassportId
  )) {
    block("ESTIMATE_EXACT_PROFESSIONAL_OWNER_REQUIRED", "Смета содержит общий шаблон вместо точного профессионального паспорта.", "boq.owner");
  }
  if (
    bundle.items.length !== current.boq.rows.length ||
    bundle.items.some((item) => item.sourceParameters?.estimateDraftRevisionId !== current.revisionId)
  ) {
    block("ESTIMATE_CURRENT_ITEMS_PARITY_REQUIRED", "Показанные позиции не совпадают с текущей ревизией. Пересчитайте смету.", "items");
  }
  if (
    bundle.canonicalParameterSession?.blockingMissingParameterIds.length ||
    bundle.canonicalParameterSession?.invalidParameterIds.length ||
    (bundle.canonicalParameterSession && bundle.canonicalParameterSession.revisionId !== current.revisionId)
  ) {
    block("ESTIMATE_CANONICAL_SESSION_STALE", "Параметры не подтверждены для текущей ревизии.", "canonicalParameters");
  }
  if (
    bundle.estimateDraftSession &&
    (bundle.estimateDraftSession.status !== "REVIEW" || bundle.estimateDraftSession.activeRevisionId !== current.revisionId)
  ) {
    block("ESTIMATE_DRAFT_SESSION_STALE", "Расчёт не завершён для текущей ревизии.", "estimateDraftSession");
  }
  return errors;
}

export function validateConsumerRepairRequestForApprove(
  requestId: string,
  userId: string,
): ConsumerRequestValidationResult {
  const bundle = getConsumerRepairBundle(requestId);
  const errors: ConsumerRequestValidationErrorItem[] = [];
  const ownerMismatch = ownerError(bundle, userId);
  if (ownerMismatch) errors.push(ownerMismatch);

  if (
    bundle.canonicalParameterSession?.status === "BLOCKING_REQUIRED" ||
    bundle.estimateDraftRevisionState?.revisions.find(
      (revision) =>
        revision.revisionId ===
        bundle.estimateDraftRevisionState?.currentRevisionId,
    )?.status === "blocking_required"
  ) {
    errors.push({
      code: "ESTIMATE_PARAMETERS_REQUIRED",
      messageRu: "Заполните обязательные параметры и рассчитайте смету перед подтверждением.",
      field: "canonicalParameters",
    });
  }

  errors.push(...consumerRepairExactAsphaltApprovalErrors(bundle));

  if (bundle.items.length < 1) {
    errors.push({
      code: "ITEMS_REQUIRED",
      messageRu: "Добавьте хотя бы одну позицию заявки.",
      field: "items",
    });
  }

  if (!hasApprovalDescriptionOrExactCalculatedWork(bundle) && bundle.media.length < 1) {
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

  if (!hasDeliveryAddress(bundle)) {
    errors.push({
      code: "DELIVERY_ADDRESS_REQUIRED",
      messageRu: "Укажите адрес доставки.",
      field: "addressText",
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
