import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate no inline rows in screens", () => {
  it("does not hardcode BOQ rows inside React screens", () => {
    const screen = readFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(screen).not.toMatch(/Песчаная подушка|Щебёночная подготовка|Бетон для ленточного фундамента|Заливка бетона/);
  });
});
