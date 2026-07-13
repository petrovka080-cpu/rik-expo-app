import type { DraftRevisionSnapshot } from "../../../features/estimates/createSnapshotFromDraftRevision";
import type { DraftRevisionBuyerHandoff } from "../../../features/procurement/createBuyerHandoffFromDraftRevision";
import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";

export type AiEstimateBuyerPackagePort = {
  readonly portKind: "estimate_buyer_package";
  buildBuyerPackage(input: {
    revision: EstimateDraftRevision;
    snapshot?: DraftRevisionSnapshot;
  }): {
    revision: EstimateDraftRevision;
    snapshot: DraftRevisionSnapshot;
    buyerPackage: DraftRevisionBuyerHandoff;
  };
};
