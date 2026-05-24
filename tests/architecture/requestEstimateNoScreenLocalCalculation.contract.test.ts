import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate no screen-local calculation", () => {
  it("keeps estimate calculation in backend/globalEstimate services, not request screen UI", () => {
    const screen = readFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(screen).not.toMatch(/calculateGlobalConstructionEstimateSync|concreteVolume|48\s*\*\s*0\.4|calculateEstimateInScreen/);
    expect(readFile("src/features/consumerRepair/consumerRepairAiAdapter.ts")).toContain("answerBuiltInAi");
  });
});
