import type { DraftRevisionBuyerHandoff } from "../../../features/procurement/createBuyerHandoffFromDraftRevision";
import type { DraftRevisionSnapshot } from "../../../features/estimates/createSnapshotFromDraftRevision";

export function validateAiEstimateBuyerPackageParity(input: {
  snapshot: DraftRevisionSnapshot;
  buyerPackage: DraftRevisionBuyerHandoff;
}): boolean {
  const allowedIds = new Set(
    input.snapshot.rows
      .filter((row) => row.includedInProcurement && row.rowType !== "work" && row.rowType !== "labor")
      .map((row) => row.rowId),
  );
  return input.buyerPackage.snapshotId === input.snapshot.snapshotId &&
    input.buyerPackage.revisionId === input.snapshot.revisionId &&
    input.buyerPackage.rowsHash === input.snapshot.rowsHash &&
    input.buyerPackage.forbiddenWorkRowsPresent === false &&
    input.buyerPackage.items.every((item) => allowedIds.has(item.rowId));
}
