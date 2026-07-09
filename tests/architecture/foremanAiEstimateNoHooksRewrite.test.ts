import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("foreman AI estimate no hook rewrite", () => {
  it("keeps hooks as navigation/draft orchestration and leaves estimate mapping to shared libraries", () => {
    const materialsController = read("src/screens/foreman/useForemanScreenController.ts");
    const subcontractController = read("src/screens/foreman/hooks/useForemanSubcontractController.tsx");

    expect(materialsController).toContain("openAiEstimateComposer");
    expect(materialsController).toContain("handleAiEstimateAddToDraft");
    expect(subcontractController).toContain('setSubcontractFlowScreen("estimate")');
    for (const source of [materialsController, subcontractController]) {
      expect(source).not.toContain("calculateGlobalConstructionEstimateSync");
      expect(source).not.toContain("buildSharedAiEstimateViewModel");
      expect(source).not.toContain("mapAiEstimateToForemanDraft");
      expect(source).not.toContain("WorkTypePicker");
      expect(source).not.toContain("CalcModal");
    }
  });
});
