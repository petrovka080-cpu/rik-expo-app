import { createSnapshotFromDraftRevision, type DraftRevisionSnapshot } from "../estimates/createSnapshotFromDraftRevision";
import type { EstimateDraftRevision } from "../../lib/estimate/estimateDraftRevisionContract";

export type DraftRevisionBuyerHandoff = {
  buyerHandoffId: string;
  revisionId: string;
  snapshotId: string;
  rowsHash: string;
  items: {
    rowId: string;
    titleRu: string;
    quantity: number;
    unit: string;
    materialKey: string | null;
    normId: string | null;
    normSourceId: string | null;
  }[];
  buyer_handoff_revision_binding_enforced: true;
  forbiddenWorkRowsPresent: false;
};

export function createBuyerHandoffFromDraftRevision(input: {
  revision: EstimateDraftRevision;
  snapshot?: DraftRevisionSnapshot;
}): {
  revision: EstimateDraftRevision;
  snapshot: DraftRevisionSnapshot;
  buyerHandoff: DraftRevisionBuyerHandoff;
} {
  const snapshotResult = input.snapshot
    ? { snapshot: input.snapshot, revision: input.revision }
    : createSnapshotFromDraftRevision(input.revision);
  if (snapshotResult.snapshot.revisionId !== snapshotResult.revision.revisionId) {
    throw new Error("BUYER_HANDOFF_DRAFT_REVISION_SNAPSHOT_MISMATCH");
  }
  const items = snapshotResult.snapshot.rows
    .filter((row) => row.includedInProcurement)
    .filter((row) => row.rowType !== "work" && row.rowType !== "labor")
    .map((row) => ({
      rowId: row.rowId,
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      materialKey: row.materialKey ?? null,
      normId: row.normId ?? null,
      normSourceId: row.normSourceId ?? null,
    }));
  const buyerHandoff: DraftRevisionBuyerHandoff = {
    buyerHandoffId: `buyer_${snapshotResult.revision.revisionId}`,
    revisionId: snapshotResult.revision.revisionId,
    snapshotId: snapshotResult.snapshot.snapshotId,
    rowsHash: snapshotResult.snapshot.rowsHash,
    items,
    buyer_handoff_revision_binding_enforced: true,
    forbiddenWorkRowsPresent: false,
  };
  return {
    snapshot: snapshotResult.snapshot,
    buyerHandoff,
    revision: {
      ...snapshotResult.revision,
      artifacts: {
        ...snapshotResult.revision.artifacts,
        snapshotId: snapshotResult.snapshot.snapshotId,
        buyerHandoffId: buyerHandoff.buyerHandoffId,
        artifactsValidForRevisionId: snapshotResult.revision.revisionId,
      },
    },
  };
}
