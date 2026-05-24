import { readProjectFile } from "./catalogBindingArchitectureTestHelpers";

describe("catalog binding no inline rows in screens", () => {
  it("does not hardcode estimate material rows in UI components", () => {
    const screen = readProjectFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(screen).not.toMatch(/strip_foundation_concrete_m300|concrete_m300|бетон\s*[:=]|арматура\s*[:=]|песок\s*[:=]|щебень\s*[:=]/i);
  });
});
