import type { EditableEstimateRow } from "../../lib/ai/editableEstimate";
import type { ConsumerRepairDraftBundle, ConsumerRepairItemType } from "../../lib/consumerRequests";

export type ConsumerRepairProcurementHandoffItem = {
  sourceEstimateRowId: string;
  requestItemId: string | null;
  titleRu: string;
  quantity: number;
  unit: string;
  itemType: Exclude<ConsumerRepairItemType, "work">;
  materialKey: string | null;
  priceStatus: string;
  sourcePrompt: string;
  revisionId: string | null;
  snapshotId: string | null;
  rowsHash: string | null;
  normId: string | null;
  normSourceId: string | null;
  normVersion: string | null;
};

export type ConsumerRepairProcurementHandoff = {
  sourceRequestDraftId: string;
  sourcePrompt: string;
  revisionId: string | null;
  snapshotId: string | null;
  rowsHash: string | null;
  items: ConsumerRepairProcurementHandoffItem[];
  fakeGreenClaimed: false;
};

function currentRevision(bundle: ConsumerRepairDraftBundle) {
  return bundle.estimateRevisionState?.revisions.find(
    (revision) => revision.revision_id === bundle.estimateRevisionState?.current_revision_id,
  ) ?? null;
}

function isProcurementRow(row: EditableEstimateRow): boolean {
  const explicitFlag = row.sourceParameters?.includedInProcurement;
  if (explicitFlag === true) return true;
  if (explicitFlag === false) return false;
  return row.rowType === "material" || row.rowType === "service";
}

function isAllowedBuyerRowType(rowType: EditableEstimateRow["rowType"]): rowType is ConsumerRepairProcurementHandoffItem["itemType"] {
  return rowType === "material" || rowType === "service" || rowType === "document" || rowType === "other";
}

function isAllowedBuyerRow(row: EditableEstimateRow): row is EditableEstimateRow & {
  rowType: ConsumerRepairProcurementHandoffItem["itemType"];
} {
  return isAllowedBuyerRowType(row.rowType);
}

export function buildConsumerRepairProcurementHandoffFromSnapshot(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairProcurementHandoff {
  const revision = currentRevision(bundle);
  const snapshot = revision?.editable_estimate_snapshot ?? bundle.editableEstimateSnapshot ?? null;
  const rows = snapshot?.rows ?? [];
  const sourcePrompt = bundle.draft.problemText ?? "";
  const items = rows
    .filter((row) => !row.removed)
    .filter(isProcurementRow)
    .filter(isAllowedBuyerRow)
    .map((row): ConsumerRepairProcurementHandoffItem => ({
      sourceEstimateRowId: row.rowId,
      requestItemId: row.requestItemId ?? null,
      titleRu: row.titleRu,
      quantity: row.quantity ?? 0,
      unit: row.unit ?? "",
      itemType: row.rowType,
      materialKey: row.materialKey ?? null,
      priceStatus: row.priceStatus,
      sourcePrompt,
      revisionId: revision?.revision_id ?? null,
      snapshotId: revision?.snapshot_id ?? snapshot?.snapshotId ?? null,
      rowsHash: revision?.rows_hash ?? snapshot?.hash ?? null,
      normId: row.normId ?? null,
      normSourceId: row.normSourceId ?? null,
      normVersion: row.normVersion ?? null,
    }));

  return {
    sourceRequestDraftId: bundle.draft.id,
    sourcePrompt,
    revisionId: revision?.revision_id ?? null,
    snapshotId: revision?.snapshot_id ?? snapshot?.snapshotId ?? null,
    rowsHash: revision?.rows_hash ?? snapshot?.hash ?? null,
    items,
    fakeGreenClaimed: false,
  };
}
