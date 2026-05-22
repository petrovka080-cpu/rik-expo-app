import * as fs from "fs";
import * as path from "path";

describe("consumer estimate no Office leak contract", () => {
  it("keeps consumer estimate PDF flow out of Office/B2B data modules", () => {
    const screen = fs.readFileSync(path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"), "utf8");

    expect(screen).not.toContain("warehouse");
    expect(screen).not.toContain("finance");
    expect(screen).not.toContain("company");
    expect(screen).toContain("generateConsumerRepairRequestPdfForDraft");
  });
});
