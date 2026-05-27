import { readRepoFile } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate architecture - no screen-local calculation", () => {
  it("keeps estimate calculation in shared AI modules, not screens", () => {
    const requestScreen = readRepoFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const adapter = readRepoFile("src/features/consumerRepair/consumerRepairAiAdapter.ts");

    expect(adapter).toContain("answerBuiltInAi");
    expect(requestScreen).not.toMatch(/calculateGlobalConstructionEstimateSync|compileProfessionalBoqFromPrimitives|runWorldConstructionEstimateEngine/);
  });
});
