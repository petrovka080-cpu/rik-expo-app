import { AI_ESTIMATE_PLATFORM_CORE_REGISTRY } from "../../src/lib/estimate/platformCoreRegistry";
import { validateEstimateLineage } from "../../src/lib/estimate/validateEstimateLineage";

describe("platform core director and buyer flow", () => {
  it("binds director review, PDF package, and buyer handoff to the same snapshot contract", () => {
    const director = AI_ESTIMATE_PLATFORM_CORE_REGISTRY.find((item) => item.entryId === "director_review");
    const pdf = AI_ESTIMATE_PLATFORM_CORE_REGISTRY.find((item) => item.entryId === "pdf_package");
    const buyer = AI_ESTIMATE_PLATFORM_CORE_REGISTRY.find((item) => item.entryId === "buyer_handoff");
    const lineage = validateEstimateLineage();

    expect(director?.usesSharedSnapshotModel).toBe(true);
    expect(pdf?.usesSharedPdfRenderer).toBe(true);
    expect(buyer?.usesSharedBuyerHandoff).toBe(true);
    expect(lineage.pdf_snapshot_binding_passed).toBe(true);
    expect(lineage.buyer_snapshot_binding_passed).toBe(true);
  });
});
