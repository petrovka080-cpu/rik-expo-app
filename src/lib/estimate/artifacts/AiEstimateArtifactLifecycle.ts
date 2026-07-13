import type { DraftRevisionSnapshot } from "../../../features/estimates/createSnapshotFromDraftRevision";
import type { DraftRevisionPdfArtifact } from "../../../features/pdf/renderPdfFromDraftRevision";
import type { DraftRevisionBuyerHandoff } from "../../../features/procurement/createBuyerHandoffFromDraftRevision";
import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";

export type AiEstimateArtifactLifecycleBundle = {
  revision: EstimateDraftRevision;
  snapshot: DraftRevisionSnapshot;
  pdf: DraftRevisionPdfArtifact;
  buyerPackage: DraftRevisionBuyerHandoff;
};

export type AiEstimateArtifactLifecycleValidation = {
  ok: boolean;
  artifactLifecycleCreated: boolean;
  snapshotBoundToRevisionId: boolean;
  pdfBoundToSnapshotId: boolean;
  buyerPackageBoundToSnapshotId: boolean;
  pdfRowsEqualSnapshotRows: boolean;
  buyerPackageIsProcurementSubset: boolean;
  pdfInvalidatedAfterParameterChange: boolean;
  buyerPackageInvalidatedAfterParameterChange: boolean;
  pdfRegenerationUsesLatestRevision: boolean;
  buyerRegenerationUsesLatestRevision: boolean;
  noDebugRowsInBuyerPackage: boolean;
  noFakeFinalTotal: boolean;
  missingPriceStatePreserved: boolean;
  blockingReasons: string[];
};
