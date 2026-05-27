import { readRepoFile } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate architecture - no inline screen rows", () => {
  it("does not hard-code world estimate rows inside request or AI screens", () => {
    const requestScreen = readRepoFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");

    expect(requestScreen).not.toMatch(/Праймер|Турбина|Асфальтобетон|Строительные работы/);
  });
});
