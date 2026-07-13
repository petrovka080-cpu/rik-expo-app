import { approveConsumerRepairRequestDraft } from "../../src/lib/consumerRequests";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("capital renovation 98 confirm snapshot", () => {
  it("freezes a revision snapshot with prompt lineage, parameters, rows, formulas and price state", () => {
    const bundle = capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT);
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-04T00:00:00.000Z",
    });

    const revision = approved.estimateRevisionState?.revisions.find(
      (candidate) => candidate.revision_id === approved.estimateRevisionState?.current_revision_id,
    );
    if (!revision) throw new Error("revision missing");

    const rows = revision.editable_estimate_snapshot.rows.filter((row) => !row.removed);
    const first = rows[0];

    expect(approved.draft.status).toBe("consumer_approved");
    expect(approved.draft.problemText).toBe(CAPITAL_RENOVATION_98_PROMPT);
    expect(revision.status).toBe("APPROVED");
    expect(revision.snapshot_id).toContain(approved.draft.id);
    expect(revision.editable_estimate_snapshot.snapshotId).toContain(approved.draft.id);
    expect(rows).toHaveLength(64);
    expect(rows.some((row) => row.rowType === "material")).toBe(true);
    expect(rows.some((row) => row.rowType === "work")).toBe(true);
    expect(first.sourceParameters).toMatchObject({
      area_m2: 98,
      ceiling_height_m: 3,
      bathrooms_count: 2,
      net_wall_area_m2: 297.5,
    });
    expect(rows.every((row) => row.formulaId || row.calculationTrace)).toBe(true);
    expect(rows.every((row) => row.priceStatus === "PRICE_MISSING")).toBe(true);
  });
});
