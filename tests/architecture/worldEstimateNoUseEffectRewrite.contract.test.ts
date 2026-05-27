import { readRepoFile } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate architecture - no useEffect answer rewrite", () => {
  it("does not add screen-level useEffect rewriting for estimate answers", () => {
    const requestScreen = readRepoFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(requestScreen).not.toMatch(/useEffect[\s\S]{0,300}(estimate|смет|answer|rows)/i);
  });
});
