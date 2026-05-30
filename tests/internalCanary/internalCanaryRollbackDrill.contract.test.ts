import { runInternalCanaryRollbackDrill } from "../../scripts/e2e/aiEstimateInternalCanaryCore";

test("internal canary rollback drill preserves manual request and catalog flows", () => {
  const drill = runInternalCanaryRollbackDrill();
  expect(drill.rollback_drill_passed).toBe(true);
  expect(drill.manual_flow_check).toBe(true);
  expect(drill.catalog_picker_check).toBe(true);
  expect(drill.after_state.catalog_items_mutated).toBe(false);
});
