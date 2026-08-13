import trackedState from "../../data/estimate-templates/master-11610-program-control-state-v3.json";
import { readJson } from "./postM1R2TestSupport";

test("rebases only ProgramControlStateV3 with exact member hashes", () => {
  const evidence = readJson<any>("07-program-rebase/MASTER_11610_PROGRAM_CONTROL_STATE_V3.json");
  expect(trackedState).toEqual(evidence);
  expect(trackedState.productionEstimateContentMutation).toBe(0);
  expect(trackedState.foundationIdentityGroupPassportMutation).toBe(0);
  expect(trackedState.counts).toMatchObject({ M5_POST_ASPHALT_QUEUE: 4005, M5_GLOBAL_CUMULATIVE: 4060, M6_GLOBAL_REMAINING: 7550 });
});
