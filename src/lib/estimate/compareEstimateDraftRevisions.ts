import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionParamValue,
  ProfessionalBoqRow,
} from "./estimateDraftRevisionContract";

function valuesEqual(a: EstimateDraftRevisionParamValue | null, b: EstimateDraftRevisionParamValue | null): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 0.0001;
  return a === b;
}

function rowQuantity(row: ProfessionalBoqRow | undefined): number | null {
  return row && Number.isFinite(row.quantity) ? row.quantity : null;
}

export function compareEstimateDraftRevisions(
  previous: EstimateDraftRevision,
  next: EstimateDraftRevision,
): EstimateDraftRevisionDiff {
  const paramKeys = [...new Set([...Object.keys(previous.params), ...Object.keys(next.params)])].sort();
  const changedParams: EstimateDraftRevisionDiff["changedParams"] = [];
  for (const key of paramKeys) {
      const before = previous.params[key]?.value ?? null;
      const after = next.params[key]?.value ?? null;
    if (!valuesEqual(before, after)) changedParams.push({ key, before, after });
  }

  const previousRows = new Map(previous.boq.rows.map((row) => [row.rowId, row]));
  const nextRows = new Map(next.boq.rows.map((row) => [row.rowId, row]));
  const rowIds = [...new Set([...previousRows.keys(), ...nextRows.keys()])].sort();
  const changedRows = rowIds
    .map((rowId) => {
      const before = previousRows.get(rowId);
      const after = nextRows.get(rowId);
      const beforeQuantity = rowQuantity(before);
      const afterQuantity = rowQuantity(after);
      if (valuesEqual(beforeQuantity, afterQuantity)) return null;
      return {
        rowId,
        titleRu: after?.titleRu ?? before?.titleRu ?? rowId,
        beforeQuantity,
        afterQuantity,
        unit: after?.unit ?? before?.unit ?? "",
      };
    })
    .filter((row): row is EstimateDraftRevisionDiff["changedRows"][number] => Boolean(row));

  return {
    fromRevisionId: previous.revisionId,
    toRevisionId: next.revisionId,
    changedParams,
    changedRows,
    changedRowsCount: changedRows.length,
    staleArtifactsAfterEdit: {
      snapshotInvalidated: previous.artifacts.snapshotId != null && previous.artifacts.artifactsValidForRevisionId !== next.revisionId,
      pdfInvalidated: previous.artifacts.pdfArtifactId != null && previous.artifacts.artifactsValidForRevisionId !== next.revisionId,
      buyerHandoffInvalidated: previous.artifacts.buyerHandoffId != null && previous.artifacts.artifactsValidForRevisionId !== next.revisionId,
    },
  };
}
