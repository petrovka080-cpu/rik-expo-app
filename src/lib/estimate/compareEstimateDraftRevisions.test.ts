import { compareEstimateDraftRevisions } from "./compareEstimateDraftRevisions";
import type { EstimateDraftRevision } from "./estimateDraftRevisionContract";

function revision(revisionId: string, unitPrice: number): EstimateDraftRevision {
  return {
    revisionId,
    params: {},
    boq: {
      sections: [],
      rows: [{
        rowId: "material:compound",
        rowType: "material",
        titleRu: "Шпаклёвка",
        quantity: 10,
        unit: "kg",
        unitPrice,
        currency: "KGS",
        includedInProcurement: true,
      }],
    },
    artifacts: {
      snapshotId: null,
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: null,
    },
  } as unknown as EstimateDraftRevision;
}

describe("compareEstimateDraftRevisions price history", () => {
  it("records a unit-price-only row change without inventing a quantity change", () => {
    const diff = compareEstimateDraftRevisions(revision("r1", 125.5), revision("r2", 132.75));

    expect(diff.changedRows).toEqual([expect.objectContaining({
      rowId: "material:compound",
      beforeQuantity: 10,
      afterQuantity: 10,
      beforeUnitPrice: 125.5,
      afterUnitPrice: 132.75,
      currency: "KGS",
    })]);
    expect(diff.changedRowsCount).toBe(1);
  });
});
