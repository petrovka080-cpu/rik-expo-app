import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import { approveConsumerRepairRequestDraft } from "../../src/lib/consumerRequests";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("capital renovation 98 buyer handoff", () => {
  it("sends only procurement rows with professional material and delivery quantities", () => {
    const bundle = capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT);
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
    const revision = approved.estimateRevisionState?.revisions.find(
      (candidate) => candidate.revision_id === approved.estimateRevisionState?.current_revision_id,
    );
    const snapshotRows = revision?.editable_estimate_snapshot.rows.filter((row) => !row.removed) ?? [];
    const snapshotByRequestItemId = new Map(snapshotRows.map((row) => [row.requestItemId ?? row.rowId, row]));
    const codes = new Map(handoff.items.map((item) => [
      String(snapshotByRequestItemId.get(item.requestItemId ?? item.sourceEstimateRowId)?.sourceParameters?.rowCode ?? item.sourceEstimateRowId),
      item,
    ]));

    expect(handoff.revisionId).toBe(revision?.revision_id);
    expect(handoff.snapshotId).toBe(revision?.snapshot_id);
    expect(handoff.rowsHash).toBe(revision?.rows_hash);
    expect(handoff.items.length).toBeGreaterThan(30);
    expect(handoff.items.every((item) => String(item.itemType) !== "work")).toBe(true);
    expect(handoff.items.every((item) => item.sourcePrompt === CAPITAL_RENOVATION_98_PROMPT)).toBe(true);
    expect(handoff.items.every((item) => {
      const row = snapshotByRequestItemId.get(item.requestItemId ?? item.sourceEstimateRowId);
      return Boolean(row?.sourceParameters?.includedInProcurement === true)
        && row?.quantity === item.quantity
        && row?.unit === item.unit;
    })).toBe(true);
    expect(codes.get("capreno_screed_mix_kg")?.quantity).toBe(9702);
    expect(codes.get("capreno_plaster_mix_kg")?.quantity).toBe(5891);
    expect(codes.get("capreno_tile_adhesive_kg")?.quantity).toBe(357);
    expect(codes.get("capreno_electrical_cable_m")?.quantity).toBe(546);
    expect(codes.get("capreno_water_pipe_m")?.quantity).toBe(91);
    expect(codes.get("capreno_material_delivery_trips")?.quantity).toBe(4);
    expect(handoff.items.map((item) => item.titleRu).join("\n")).not.toMatch(/work|formula|debug|helper|PRICE_MISSING/i);
  });
});
