import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate state machine no inline rows", () => {
  it("does not add BOQ rows inside request UI components", () => {
    const uiSource = [
      readFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
      readFile("src/features/consumerRepair/ConsumerRepairDraftPanel.tsx"),
      readFile("src/features/consumerRepair/RequestEstimateItemsEditor.tsx"),
    ].join("\n");
    expect(uiSource).not.toMatch(/strip_foundation|concrete volume|foundation rows|manualCatalogItems\s*=\s*\[/i);
  });
});
