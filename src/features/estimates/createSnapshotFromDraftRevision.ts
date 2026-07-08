import type { EstimateDraftRevision, ProfessionalBoqRow } from "../../lib/estimate/estimateDraftRevisionContract";

export type DraftRevisionSnapshot = {
  snapshotId: string;
  revisionId: string;
  estimateDraftId: string;
  rowsHash: string;
  totalsHash: string;
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

function rowsHash(rows: ProfessionalBoqRow[]): string {
  return hashText(JSON.stringify(rows.map((row) => ({
    rowId: row.rowId,
    quantity: row.quantity,
    unit: row.unit,
    formulaId: row.formulaId,
    trace: row.calculationTrace,
    materialQuantity: row.materialQuantity
      ? {
        netQuantity: row.materialQuantity.netQuantity,
        grossQuantity: row.materialQuantity.grossQuantity,
        procurementQuantity: row.materialQuantity.procurementQuantity,
        procurementUnit: row.materialQuantity.procurementUnit,
        formula: row.materialQuantity.formula,
        trace: row.materialQuantity.calculationTrace,
      }
      : null,
  }))));
}

function totalsHash(rows: ProfessionalBoqRow[]): string {
  return hashText(JSON.stringify(rows.map((row) => ({
    rowId: row.rowId,
    unitPrice: row.unitPrice ?? null,
    quantity: row.quantity,
  }))));
}

export function createSnapshotFromDraftRevision(revision: EstimateDraftRevision): {
  revision: EstimateDraftRevision;
  snapshot: DraftRevisionSnapshot;
} {
  const snapshot: DraftRevisionSnapshot = {
    snapshotId: `snapshot_${revision.revisionId}`,
    revisionId: revision.revisionId,
    estimateDraftId: revision.estimateDraftId,
    rowsHash: rowsHash(revision.boq.rows),
    totalsHash: totalsHash(revision.boq.rows),
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
