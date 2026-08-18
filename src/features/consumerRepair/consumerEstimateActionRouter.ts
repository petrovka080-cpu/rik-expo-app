import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";
import { consumerRepairCanonicalBackendBinding } from "./consumerRepairBackendOwnership";

export type ConsumerEstimateActionName =
  | "openParameters"
  | "openLinePhoto"
  | "openLineCatalog"
  | "openProfessionalPdf"
  | "openProcurement"
  | "openHistoryRevision";

export type ConsumerEstimateActionContext = {
  action: ConsumerEstimateActionName;
  draftId: string;
  requestId: string;
  revisionId: string;
  releaseId: string;
  /** Resolved from the exact revision when a compact history snapshot no longer carries it. */
  definitionId: string | null;
  lineId: string | null;
  requestItemId: string | null;
  surface: "consumer_estimate";
  ownerId: string;
  companyId: string | null;
  returnRoute: string;
  returnScrollPosition: number;
};

export class ConsumerEstimateActionContextError extends Error {
  readonly code = "CONSUMER_ESTIMATE_ACTION_CONTEXT_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "ConsumerEstimateActionContextError";
  }
}

function required(value: string | null | undefined, field: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new ConsumerEstimateActionContextError(
      `Действие не выполнено: у выбранной сметы отсутствует ${field}.`,
    );
  }
  return normalized;
}

export function buildConsumerEstimateActionContext(input: {
  action: ConsumerEstimateActionName;
  bundle: ConsumerRepairDraftBundle;
  ownerId: string;
  requestItemId?: string | null;
  returnScrollPosition?: number;
}): ConsumerEstimateActionContext {
  const binding = consumerRepairCanonicalBackendBinding(input.bundle);
  if (!binding) {
    throw new ConsumerEstimateActionContextError(
      "Действие не выполнено: выбранная версия сметы не подтверждена backend.",
    );
  }
  const draftId = required(input.bundle.draft.id, "draftId");
  const definitionId = [
    input.bundle.draft.selectedCatalogWorkId,
    ...input.bundle.items.map((candidate) =>
      candidate.sourceParameters?.canonicalBackendCatalogId as string | null | undefined
    ),
  ].map((value) => String(value ?? "").trim()).find(Boolean) ?? null;
  const ownerId = required(input.ownerId, "ownerId");
  if (input.bundle.draft.consumerUserId !== ownerId) {
    throw new ConsumerEstimateActionContextError(
      "Действие не выполнено: выбранная смета принадлежит другому пользователю.",
    );
  }
  const requestItemId = input.requestItemId == null
    ? null
    : required(input.requestItemId, "requestItemId");
  const item = requestItemId == null
    ? null
    : input.bundle.items.find((candidate) => candidate.id === requestItemId) ?? null;
  if (requestItemId && !item) {
    throw new ConsumerEstimateActionContextError(
      "Действие не выполнено: выбранная строка отсутствует в этой версии сметы.",
    );
  }
  const lineId = item == null
    ? null
    : required(
        typeof item.sourceParameters?.rowCode === "string"
          ? item.sourceParameters.rowCode
          : item.id,
        "lineId",
      );
  if (item) {
    const itemRevisionId = String(
      item.sourceParameters?.canonicalBackendRevisionId ?? "",
    ).trim();
    const itemReleaseId = String(
      item.sourceParameters?.canonicalBackendReleaseId ?? "",
    ).trim();
    if (
      (itemRevisionId && itemRevisionId !== binding.revisionId) ||
      (itemReleaseId && itemReleaseId !== binding.releaseId)
    ) {
      throw new ConsumerEstimateActionContextError(
        "Действие не выполнено: строка не принадлежит выбранной версии сметы.",
      );
    }
  }
  const returnScrollPosition = Number.isFinite(input.returnScrollPosition)
    ? Math.max(0, Number(input.returnScrollPosition))
    : 0;
  return {
    action: input.action,
    draftId,
    requestId: draftId,
    revisionId: required(binding.revisionId, "revisionId"),
    releaseId: required(binding.releaseId, "releaseId"),
    definitionId,
    lineId,
    requestItemId,
    surface: "consumer_estimate",
    ownerId,
    companyId: input.bundle.draft.orgId?.trim() || null,
    returnRoute: `/request?draftId=${encodeURIComponent(draftId)}`,
    returnScrollPosition,
  };
}
