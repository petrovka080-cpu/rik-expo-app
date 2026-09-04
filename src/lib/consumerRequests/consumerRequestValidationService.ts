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

function hasCommittedCanonicalEstimatePhoto(bundle: ConsumerRepairDraftBundle): boolean {
  const revisionIds = new Set(bundle.items.map((item) =>
    String(item.sourceParameters?.canonicalBackendRevisionId ?? "").trim(),
  ).filter(Boolean));
  if (revisionIds.size !== 1) return false;
  const revisionId = [...revisionIds][0];
  return (bundle.estimateAttachments ?? []).some((attachment) =>
    attachment.ownerScope === "row" &&
    attachment.revisionId === revisionId &&
    attachment.serverCommitted === true &&
    attachment.deleted === false &&
    attachment.redacted === false &&
    attachment.authoritativeOwnerUserId === bundle.draft.consumerUserId &&
    attachment.authoritativeRequestId === bundle.draft.id &&
    attachment.authoritativeStorageBucket === "private-media" &&
    Boolean(attachment.authoritativeAttachmentEventId) &&
    /^image\/(?:jpeg|png)$/u.test(attachment.mimeType) &&
    /^[0-9a-f]{64}$/u.test(attachment.contentHash)
  );
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
  const revisionIds = new Set(
    bundle.items
      .map((item) => item.sourceParameters?.canonicalBackendRevisionId)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const releaseIds = new Set(
    bundle.items
      .map((item) => item.sourceParameters?.canonicalBackendReleaseId)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  if (revisionIds.size > 0 || releaseIds.size > 0) {
    if (
      revisionIds.size !== 1 ||
      releaseIds.size !== 1 ||
      bundle.items.some((item) =>
        item.sourceParameters?.canonicalBackendRevisionId == null ||
        item.sourceParameters?.canonicalBackendReleaseId == null
      )
    ) {
      return [{
        code: "ESTIMATE_CURRENT_ITEMS_PARITY_REQUIRED",
        messageRu: "Позиции должны принадлежать одной exact backend revision и одному release.",
        field: "items.canonicalBackendRevisionId",
      }];
    }
    return [];
  }

  const state = bundle.estimateDraftRevisionState;
  if (!state) return [];
  const current = state.revisions.find((revision) => revision.revisionId === state.currentRevisionId) ?? null;
  if (!current) {
    return [{
      code: "ESTIMATE_REVISION_REQUIRED",
      messageRu: "Legacy revision доступна только для чтения; для изменения выполните явную backend-миграцию.",
      field: "estimateRevision",
    }];
  }
  if (state.revisions.at(-1)?.revisionId !== state.currentRevisionId) {
    return [{
      code: "ESTIMATE_LATEST_REVISION_REQUIRED",
      messageRu: "Подтверждать можно только последнюю сохранённую revision.",
      field: "estimateRevision",
    }];
  }
  return [];
}

export function validateConsumerRepairRequestForApprove(
  requestId: string,
  userId: string,
): ConsumerRequestValidationResult {
  const bundle = getConsumerRepairBundle(requestId);
  const errors: ConsumerRequestValidationErrorItem[] = [];
  const ownerMismatch = ownerError(bundle, userId);
  if (ownerMismatch) errors.push(ownerMismatch);
  const currentRevision = bundle.estimateDraftRevisionState?.revisions.find(
    (revision) => revision.revisionId === bundle.estimateDraftRevisionState?.currentRevisionId,
  );
  const contractInputsMissing = currentRevision?.missingInputs.some((input) =>
    input.requiredFor === "contract_ready" || input.requiredFor === "safety_review"
  ) ?? false;

  if (
    bundle.canonicalParameterSession?.status === "BLOCKING_REQUIRED" ||
    currentRevision?.status === "blocking_required" ||
    contractInputsMissing
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
  canonicalArtifact?: {
    artifactId: string;
    kind: "procurement";
    revisionId: string;
    releaseId: string;
    status: "ready";
    sha256: string | null;
  } | null,
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

  if (bundle.media.length < 1 && !hasCommittedCanonicalEstimatePhoto(bundle)) {
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

  const canonicalRevisionIds = new Set(bundle.items.map((item) =>
    String(item.sourceParameters?.canonicalBackendRevisionId ?? "").trim(),
  ).filter(Boolean));
  const canonicalReleaseIds = new Set(bundle.items.map((item) =>
    String(item.sourceParameters?.canonicalBackendReleaseId ?? "").trim(),
  ).filter(Boolean));
  const canonicalRevisionId = canonicalRevisionIds.size === 1 ? [...canonicalRevisionIds][0] : null;
  const canonicalReleaseId = canonicalReleaseIds.size === 1 ? [...canonicalReleaseIds][0] : null;
  const canonicalPdfEvent = canonicalRevisionId && canonicalReleaseId
    ? bundle.events.find((event) =>
      event.eventType === "consumer_approved_canonical_backend_pdf" &&
      event.payload.revisionId === canonicalRevisionId &&
      event.payload.releaseId === canonicalReleaseId &&
      typeof event.payload.artifactId === "string" &&
      event.payload.artifactId.length > 0
    )
    : null;
  const canonicalArtifactValid = Boolean(
    canonicalRevisionId && canonicalReleaseId && canonicalPdfEvent && canonicalArtifact &&
    canonicalArtifact.kind === "procurement" &&
    canonicalArtifact.status === "ready" && canonicalArtifact.artifactId.trim() &&
    canonicalArtifact.revisionId === canonicalRevisionId &&
    canonicalArtifact.releaseId === canonicalReleaseId,
  );
  const pdf = latestGeneratedPdf(bundle);
  if (canonicalRevisionId || canonicalReleaseId) {
    if (!canonicalArtifactValid) {
      errors.push({
        code: "PDF_REQUIRED",
        messageRu: "Р”Р»СЏ marketplace РЅСѓР¶РЅС‹ РіРѕС‚РѕРІС‹Рµ backend PDF Рё procurement Р°СЂС‚РµС„Р°РєС‚С‹ С‚РѕР№ Р¶Рµ revision Рё release.",
        field: "canonicalArtifact",
      });
    }
  } else if (!pdf) {
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
