import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("entrypoint fix no screen-local calculation", () => {
  it("keeps estimate calculation out of /request and /ai screens", () => {
    const requestScreen = readRepoFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const aiScreen = readRepoFile("src/features/ai/AIAssistantScreen.tsx");
    expect(requestScreen).not.toMatch(/calculateGlobalConstructionEstimate|calculate_global_estimate|GLOBAL_RATE_/);
    expect(aiScreen).not.toMatch(/calculateGlobalConstructionEstimate|calculate_global_estimate|GLOBAL_RATE_/);
  });
});
