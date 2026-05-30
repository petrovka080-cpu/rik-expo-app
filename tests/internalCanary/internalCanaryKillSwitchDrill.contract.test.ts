import { runInternalCanaryKillSwitchDrill } from "../../scripts/e2e/aiEstimateInternalCanaryCore";

test("internal canary kill switch drill covers estimate pdf catalog and fallback switches", () => {
  const drill = runInternalCanaryKillSwitchDrill();
  expect(drill.kill_switch_drill_passed).toBe(true);
  expect(drill.manual_request_flow_still_works).toBe(true);
  expect(drill.manual_catalog_material_picker_still_works).toBe(true);
});
