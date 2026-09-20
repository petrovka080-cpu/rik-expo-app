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

function consumerHandoffItemType(
  rowType: string,
): ConsumerRepairProcurementHandoffItem["itemType"] | null {
  if (rowType === "material") return "material";
  if (rowType === "service" || rowType === "equipment" || rowType === "transport") return "service";
  if (rowType === "document") return "document";
  if (rowType === "other") return "other";
  return null;
}

export function buildConsumerRepairProcurementHandoffFromSnapshot(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairProcurementHandoff {
  const calculationState = bundle.estimateDraftRevisionState;
  const calculationRevision = calculationState?.revisions.find(
    (candidate) => candidate.revisionId === calculationState.currentRevisionId,
  );
  if (calculationRevision) {
    const requestItemByRowId = new Map(bundle.items.flatMap((item) => {
      const keys = [
        item.id,
        String(item.sourceParameters?.rowCode ?? "").trim(),
        String(item.sourceParameters?.canonicalBackendRowId ?? "").trim(),
      ].filter(Boolean);
      return keys.map((key) => [key, item] as const);
    }));
    const snapshotId = calculationRevision.artifacts.snapshotId
      ?? `canonical_backend_snapshot:${calculationRevision.revisionId}`;
    const rowsHash = calculationRevision.applicableBoqSignature
      ?? calculationRevision.resolvedIdentity?.checksum
      ?? calculationRevision.revisionId;
    const sourcePrompt = bundle.draft.problemText ?? calculationRevision.rawInput;
    const items = calculationRevision.boq.rows
      .filter((row) => row.includedInProcurement)
      .flatMap((row): ConsumerRepairProcurementHandoffItem[] => {
        const itemType = consumerHandoffItemType(row.rowType);
        if (!itemType) return [];
        const requestItem = requestItemByRowId.get(row.rowId);
        return [{
          sourceEstimateRowId: row.rowId,
          requestItemId: requestItem?.id ?? null,
          titleRu: row.titleRu,
          quantity: row.quantity,
          unit: row.unit,
          itemType,
          materialKey: row.materialKey ?? null,
          priceStatus: row.priceStatus ?? "PRICE_MISSING",
          sourcePrompt,
          revisionId: calculationRevision.revisionId,
          snapshotId,
          rowsHash,
          normId: row.normId ?? null,
          normSourceId: row.normSourceId ?? null,
          normVersion: row.normVersion ?? null,
        }];
      });
    return {
      sourceRequestDraftId: bundle.draft.id,
      sourcePrompt,
      revisionId: calculationRevision.revisionId,
      snapshotId,
      rowsHash,
      items,
      fakeGreenClaimed: false,
    };
  }
  const revision = currentRevision(bundle);
  const snapshot = revision?.editable_estimate_snapshot ?? bundle.editableEstimateSnapshot ?? null;
  const rows = snapshot?.rows ?? [];
  const sourcePrompt = bundle.draft.problemText ?? "";
  const canonicalRevisionIds = new Set(bundle.items.map((item) =>
    String(item.sourceParameters?.canonicalBackendRevisionId ?? "").trim()
  ));
  const canonicalRevisionId = canonicalRevisionIds.size === 1
    ? [...canonicalRevisionIds][0] || null
    : null;
  const canonicalPdf = canonicalRevisionId
    ? bundle.pdfs.find((pdf) =>
        pdf.pdfStatus === "generated" && pdf.revisionId === canonicalRevisionId
      ) ?? null
    : null;
  const revisionId = canonicalRevisionId ?? revision?.revision_id ?? null;
  const snapshotId = canonicalPdf?.snapshotId
    ?? revision?.snapshot_id
    ?? snapshot?.snapshotId
    ?? null;
  const rowsHash = canonicalPdf?.revisionRowsHash
    ?? revision?.rows_hash
    ?? snapshot?.hash
    ?? null;
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
      revisionId,
      snapshotId,
      rowsHash,
      normId: row.normId ?? null,
      normSourceId: row.normSourceId ?? null,
      normVersion: row.normVersion ?? null,
    }));

  return {
    sourceRequestDraftId: bundle.draft.id,
    sourcePrompt,
    revisionId,
    snapshotId,
    rowsHash,
    items,
    fakeGreenClaimed: false,
  };
}
