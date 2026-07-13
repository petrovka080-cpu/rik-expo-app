import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("foreman AI estimate no second engine", () => {
  it("adapts the shared AI estimate view model and existing foreman mapper", () => {
    const adapter = read("src/lib/foreman/buildForemanAiEstimateViewModel.ts");
    const shared = read("src/lib/ai/estimatePresentation/buildSharedAiEstimateViewModel.ts");

    expect(adapter).toContain("buildSharedAiEstimateViewModel");
    expect(adapter).toContain("mapAiEstimateToForemanDraft");
    expect(adapter).toContain("mapApprovedForemanDraftToBuyerRows");
    expect(shared).toContain("buildStructuredEstimatePayload");
    expect(adapter).not.toContain("calculateGlobalConstructionEstimateSync");
    expect(adapter).not.toContain("hardcoded price");
    expect(adapter).not.toContain("local regex");
  });
});
