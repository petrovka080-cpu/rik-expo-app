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
  it("retains a known quantity when a calculated row needs a model clarification", () => {
    const before = revision("r1", 125.5);
    const after = { ...revision("r2", 125.5), boq: { sections: [], rows: [] },
      preliminaryRows: [{ rowId: "material:compound", titleRu: "Шпаклёвка", quantity: 10,
        unit: "kg", unitPrice: 125.5 }] };
    const diff = compareEstimateDraftRevisions(before, after);
    expect(diff.changedRows).toEqual([expect.objectContaining({ beforeQuantity: 10, afterQuantity: 10,
      beforeState: "CALCULATED", afterState: "NEEDS_CLARIFICATION" })]);
    expect(diff.changedRows[0]?.afterUnitPrice).toBeUndefined();
  });

  it("distinguishes an unknown quantity from an absent row and preserves explicit zero", () => {
    const before = { ...revision("r1", 125.5), boq: { sections: [], rows: [] },
      preliminaryRows: [{ rowId: "material:compound", titleRu: "Шпаклёвка", quantity: null,
        unit: "kg", unitPrice: null }] };
    const missing = { ...revision("r2", 125.5), boq: { sections: [], rows: [] } };
    expect(compareEstimateDraftRevisions(before, missing).changedRows[0]).toMatchObject({
      beforeQuantity: null, afterQuantity: null, beforeState: "NEEDS_CLARIFICATION", afterState: "ABSENT" });
    const zero = revision("r2", 125.5);
    zero.boq.rows[0]!.quantity = 0;
    expect(compareEstimateDraftRevisions(before, zero).changedRows[0]).toMatchObject({
      beforeQuantity: null, afterQuantity: 0, afterState: "CALCULATED" });
  });

  it("records the selected model even when its quantity and price remain unchanged", () => {
    const before = revision("r1", 125.5);
    const after = revision("r2", 125.5);
    after.boq.rows[0]!.titleRu = "Шпаклёвка для влажных помещений";
    expect(compareEstimateDraftRevisions(before, after).changedRows[0]).toMatchObject({
      beforeQuantity: 10, afterQuantity: 10, beforeTitleRu: "Шпаклёвка",
      titleRu: "Шпаклёвка для влажных помещений" });
  });

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
