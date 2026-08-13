import { readJson } from "./batch00R3TestSupport";

test("promotes frame before align as an explicit hard dependency", () => {
  const value = readJson("02-selection/FIRST_BATCH_COMPOSITION_DECISION_R3.json");
  expect(value.dependencyPromotion).toMatchObject({ promotedGroupId: "wg:base:drywall_ceiling_interior_bulkhead_frame", promotedFromQueuePosition: 4, promotedBy: "wg:base:drywall_ceiling_interior_bulkhead_align" });
  expect(value.orderedGroupIds[0]).toBe(value.dependencyPromotion.promotedGroupId);
});
