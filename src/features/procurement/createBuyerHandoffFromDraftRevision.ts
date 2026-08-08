import {
  assertSnapshotMatchesDraftRevision,
  createSnapshotFromDraftRevision,
  type DraftRevisionPresentationIdentity,
  type DraftRevisionSnapshot,
} from "../estimates/createSnapshotFromDraftRevision";
import type { EstimateDraftRevision } from "../../lib/estimate/estimateDraftRevisionContract";
import { calculateProfessionalCostForDraftRows } from "../../lib/estimate/professionalCostCalculator";
import { createBuyerHandoffCostPackage, type BuyerHandoffCostPackage } from "./createBuyerHandoffCostPackage";
import { createCompleteBuyerHandoffFromBoq } from "./createCompleteBuyerHandoffFromBoq";

export type DraftRevisionBuyerHandoff = {
  buyerHandoffId: string;
  revisionId: string;
  snapshotId: string;
  rowsHash: string;
  presentationIdentity: DraftRevisionPresentationIdentity;
  presentationIdentityHash: string;
  items: {
    rowId: string;
    titleRu: string;
    quantity: number;
    unit: string;
    materialKey: string | null;
    normId: string | null;
    normSourceId: string | null;
    netQuantity: number | null;
    grossQuantity: number | null;
    procurementQuantity: number | null;
    procurementUnit: string | null;
    procurementPackageSize: number | null;
  }[];
  costTrace: BuyerHandoffCostPackage;
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
  assertSnapshotMatchesDraftRevision(snapshotResult.snapshot, snapshotResult.revision);
  const items = createCompleteBuyerHandoffFromBoq(snapshotResult.snapshot.rows).map((row) => ({
    rowId: row.rowId,
    titleRu: row.titleRu,
    quantity: row.quantity,
    unit: row.unit,
    materialKey: row.materialKey,
    normId: row.normId,
    normSourceId: row.normSourceId,
    netQuantity: row.netQuantity,
    grossQuantity: row.grossQuantity,
    procurementQuantity: row.procurementQuantity,
    procurementUnit: row.procurementUnit,
    procurementPackageSize: row.procurementPackageSize,
  }));
  const cost = calculateProfessionalCostForDraftRows({
    templateId: snapshotResult.revision.selectedTemplateId,
    family: snapshotResult.revision.matchedFamily,
    rows: snapshotResult.snapshot.rows.filter((row) => row.rowType !== "document" && row.rowType !== "other"),
  });
  const buyerHandoff: DraftRevisionBuyerHandoff = {
    buyerHandoffId: `buyer_${snapshotResult.revision.revisionId}`,
    revisionId: snapshotResult.revision.revisionId,
    snapshotId: snapshotResult.snapshot.snapshotId,
    rowsHash: snapshotResult.snapshot.rowsHash,
    presentationIdentity: snapshotResult.snapshot.presentationIdentity,
    presentationIdentityHash: snapshotResult.snapshot.presentationIdentityHash,
    items,
    costTrace: createBuyerHandoffCostPackage({
      templateId: snapshotResult.revision.selectedTemplateId,
      summary: cost.summary,
      lines: cost.lines,
    }),
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
