import type { EstimateDraftRevision, ProfessionalBoqRow } from "../../lib/estimate/estimateDraftRevisionContract";
import { estimateDeterministicHash } from "../../lib/estimate/estimateDeterministicHash";

export type DraftRevisionProjectionState = "CURRENT" | "HISTORY";

export type DraftRevisionPresentationIdentity = {
  revisionId: string;
  workKey: string;
  scopeId: string | null;
  areaM2: number | null;
  lengthM: number | null;
  widthM: number | null;
  createdAt: string;
  currentOrHistory: DraftRevisionProjectionState;
  rowCount: number;
  pricingStatus: "PRICE_COMPLETE" | "PRICE_PARTIAL" | "QUANTITY_ONLY";
};

export type DraftRevisionSnapshot = {
  snapshotId: string;
  revisionId: string;
  estimateDraftId: string;
  rowsHash: string;
  totalsHash: string;
  presentationIdentity: DraftRevisionPresentationIdentity;
  presentationIdentityHash: string;
  rows: ProfessionalBoqRow[];
  snapshot_revision_binding_enforced: true;
};

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function draftRevisionRowsHash(rows: ProfessionalBoqRow[]): string {
  return estimateDeterministicHash(rows);
}

export function draftRevisionTotalsHash(rows: ProfessionalBoqRow[]): string {
  return hashText(JSON.stringify(rows.map((row) => ({
    rowId: row.rowId,
    unitPrice: row.unitPrice ?? null,
    quantity: row.quantity,
  }))));
}

function revisionCreatedAt(revision: EstimateDraftRevision): string {
  if (revision.createdAt?.trim()) return revision.createdAt;
  return Object.values(revision.params)
    .map((parameter) => parameter.lastChangedAt)
    .filter(Boolean)
    .sort()[0] ?? "1970-01-01T00:00:00.000Z";
}

function isCostEligible(row: ProfessionalBoqRow): boolean {
  if (row.payable === false) return false;
  if (row.costTreatment === "ANALYTICAL_ONLY" || row.costTreatment === "INFORMATIONAL_SUBTOTAL") return false;
  if (row.rowType === "document" || row.rowType === "other") return false;
  return row.payable === true || row.costTreatment === "RESOURCE_BASED" || row.costTreatment === "COMPOSITE_RATE" || !row.costTreatment;
}

function pricingStatus(rows: ProfessionalBoqRow[]): DraftRevisionPresentationIdentity["pricingStatus"] {
  const payableRows = rows.filter(isCostEligible);
  const pricedCount = payableRows.filter((row) => typeof row.unitPrice === "number" && Number.isFinite(row.unitPrice) && row.unitPrice > 0).length;
  if (payableRows.length > 0 && pricedCount === payableRows.length) return "PRICE_COMPLETE";
  if (pricedCount > 0) return "PRICE_PARTIAL";
  return "QUANTITY_ONLY";
}

export function buildDraftRevisionPresentationIdentity(
  revision: EstimateDraftRevision,
  currentOrHistory: DraftRevisionProjectionState = "CURRENT",
): DraftRevisionPresentationIdentity {
  return {
    revisionId: revision.revisionId,
    workKey:
      revision.resolvedIdentity?.requestedCatalogWorkId ??
      revision.professionalWorkId ??
      revision.selectedTemplateId,
    scopeId:
      revision.roadScopeBinding?.selectedRoadScope ??
      revision.resolvedIdentity?.selectedScope ??
      null,
    areaM2: revision.quantityBasis?.area_m2 ?? null,
    lengthM: revision.quantityBasis?.length_m ?? null,
    widthM: revision.quantityBasis?.width_m ?? null,
    createdAt: revisionCreatedAt(revision),
    currentOrHistory,
    rowCount: revision.boq.rows.length,
    pricingStatus: pricingStatus(revision.boq.rows),
  };
}

export function draftRevisionPresentationIdentityHash(
  identity: DraftRevisionPresentationIdentity,
): string {
  return estimateDeterministicHash(identity);
}

export function assertSnapshotMatchesDraftRevision(
  snapshot: DraftRevisionSnapshot,
  revision: EstimateDraftRevision,
): void {
  const expectedIdentity = buildDraftRevisionPresentationIdentity(
    revision,
    snapshot.presentationIdentity.currentOrHistory,
  );
  const expectedIdentityHash = draftRevisionPresentationIdentityHash(expectedIdentity);
  if (
    snapshot.revisionId !== revision.revisionId ||
    snapshot.estimateDraftId !== revision.estimateDraftId ||
    snapshot.presentationIdentityHash !== expectedIdentityHash ||
    draftRevisionPresentationIdentityHash(snapshot.presentationIdentity) !== expectedIdentityHash ||
    snapshot.rowsHash !== draftRevisionRowsHash(revision.boq.rows) ||
    snapshot.totalsHash !== draftRevisionTotalsHash(revision.boq.rows)
  ) {
    throw new Error("DRAFT_REVISION_SNAPSHOT_IDENTITY_MISMATCH");
  }
}

export function createSnapshotFromDraftRevision(
  revision: EstimateDraftRevision,
  currentOrHistory: DraftRevisionProjectionState = "CURRENT",
): {
  revision: EstimateDraftRevision;
  snapshot: DraftRevisionSnapshot;
} {
  const presentationIdentity = buildDraftRevisionPresentationIdentity(revision, currentOrHistory);
  const snapshot: DraftRevisionSnapshot = {
    snapshotId: `snapshot_${revision.revisionId}`,
    revisionId: revision.revisionId,
    estimateDraftId: revision.estimateDraftId,
    rowsHash: draftRevisionRowsHash(revision.boq.rows),
    totalsHash: draftRevisionTotalsHash(revision.boq.rows),
    presentationIdentity,
    presentationIdentityHash: draftRevisionPresentationIdentityHash(presentationIdentity),
    rows: revision.boq.rows,
    snapshot_revision_binding_enforced: true,
  };
  return {
    snapshot,
    revision: {
      ...revision,
      artifacts: {
        ...revision.artifacts,
        snapshotId: snapshot.snapshotId,
        artifactsValidForRevisionId: revision.revisionId,
      },
    },
  };
}
