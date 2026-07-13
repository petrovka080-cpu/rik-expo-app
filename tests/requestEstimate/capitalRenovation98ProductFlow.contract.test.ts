import fs from "node:fs";
import path from "node:path";

import { shouldAutoPrepareInitialConsumerRepairRequest } from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("capital renovation 98 product flow", () => {
  it("treats an initial prompt as a real estimate request, not only as input text", () => {
    const source = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
      "utf8",
    );

    expect(shouldAutoPrepareInitialConsumerRepairRequest({ initialProblemText: CAPITAL_RENOVATION_98_PROMPT })).toBe(true);
    expect(shouldAutoPrepareInitialConsumerRepairRequest({ initialProblemText: "   " })).toBe(false);
    expect(source).toContain("props.initialProblemText?.trim()");
    expect(source).not.toContain("!this.props.autoPrepare && !this.props.autoPdf");
  });

  it("creates a grouped professional draft with editable rows for the canonical prompt", () => {
    const bundle = capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT);
    const vm = buildRequestEstimateViewModel(bundle);
    if (!vm) throw new Error("view model missing");

    expect(bundle.draft.problemText).toBe(CAPITAL_RENOVATION_98_PROMPT);
    expect(bundle.items).toHaveLength(64);
    expect(vm.professionalPreview).toBe(true);
    expect(vm.previewSections.length).toBeGreaterThanOrEqual(8);
    expect(bundle.items.every((item) => item.editableByConsumer)).toBe(true);
    expect(bundle.items.some((item) => item.itemType === "material")).toBe(true);
    expect(bundle.items.some((item) => item.itemType === "work")).toBe(true);
  });
});
