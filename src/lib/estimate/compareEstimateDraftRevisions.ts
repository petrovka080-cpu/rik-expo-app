import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionParamValue,
} from "./estimateDraftRevisionContract";

function valuesEqual(a: EstimateDraftRevisionParamValue | null, b: EstimateDraftRevisionParamValue | null): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 0.0001;
  return a === b;
}

type ComparedRow = NonNullable<EstimateDraftRevision["preliminaryRows"]>[number] & {
  state: "CALCULATED" | "NEEDS_CLARIFICATION";
};

function comparableRows(revision: EstimateDraftRevision): Map<string, ComparedRow> {
  const rows = new Map<string, ComparedRow>((revision.preliminaryRows ?? []).map(row =>
    [row.rowId, { ...row, state: "NEEDS_CLARIFICATION" }]));
  for (const row of revision.boq.rows) rows.set(row.rowId, { ...row,
    unitPrice: row.unitPrice ?? null, state: "CALCULATED" });
  return rows;
}

function rowQuantity(row: ComparedRow | undefined): number | null {
  return row?.quantity != null && Number.isFinite(row.quantity) ? row.quantity : null;
}

function rowUnitPrice(row: ComparedRow | undefined): number | null {
  return row && row.unitPrice != null && Number.isFinite(row.unitPrice) ? row.unitPrice : null;
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

  const previousRows = comparableRows(previous);
  const nextRows = comparableRows(next);
  const rowIds = [...new Set([...previousRows.keys(), ...nextRows.keys()])].sort();
  const changedRows = rowIds
    .map((rowId) => {
      const before = previousRows.get(rowId);
      const after = nextRows.get(rowId);
      const beforeQuantity = rowQuantity(before);
      const afterQuantity = rowQuantity(after);
      const beforeUnitPrice = rowUnitPrice(before);
      const afterUnitPrice = rowUnitPrice(after);
      const quantityChanged = !valuesEqual(beforeQuantity, afterQuantity);
      const unitPriceChanged = !valuesEqual(beforeUnitPrice, afterUnitPrice);
      const beforeState = before?.state ?? "ABSENT";
      const afterState = after?.state ?? "ABSENT";
      const titleChanged = before?.titleRu !== after?.titleRu;
      if (!quantityChanged && !unitPriceChanged && beforeState === afterState && !titleChanged) return null;
      return {
        rowId,
        titleRu: after?.titleRu ?? before?.titleRu ?? rowId,
        beforeQuantity,
        afterQuantity,
        unit: after?.unit ?? before?.unit ?? "",
        ...(titleChanged && before && after ? { beforeTitleRu: before.titleRu } : {}),
        ...(beforeState !== afterState ? { beforeState, afterState } : {}),
        ...(unitPriceChanged ? {
          beforeUnitPrice,
          afterUnitPrice,
          currency: after?.currency ?? before?.currency ?? "",
        } : {}),
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
