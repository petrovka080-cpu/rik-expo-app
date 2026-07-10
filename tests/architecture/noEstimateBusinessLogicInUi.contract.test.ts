import fs from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("no estimate business logic in consumer UI", () => {
  it("keeps progressive estimate changes in presentation components only", () => {
    const uiSource = [
      "src/features/consumerRepair/ConsumerRepairDraftPanel.tsx",
      "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
      "src/features/consumerRepair/RequestEstimateSummaryCard.tsx",
      "src/features/consumerRepair/RequestEstimateItemsEditor.tsx",
      "src/features/consumerRepair/ConsumerRepairRequestScreen.styles.ts",
    ].map(read).join("\n");

    expect(uiSource).toContain("request-estimate-parameters-toggle");
    expect(uiSource).toContain("request-estimate-positions-toggle");
    expect(uiSource).not.toMatch(/\buse(?:State|Effect|Memo|Callback|Reducer)\b/);
    expect(uiSource).not.toMatch(/buildEstimateFromInlineWorkPrompt|buildProfessionalBoqDraft|createEstimateDraftRevision/);
    expect(uiSource).not.toMatch(/applyConsumerRepairDraftRevisionParamPatch|applyAiEstimateParameterOverride|applyUserParamPatch/);
    expect(uiSource).not.toMatch(/calculateExpandedComplexEstimate|formulaDAG|formula DAG|quantity calculation/i);
    expect(uiSource).not.toMatch(/ledger|buyer package generation|PDF generation/i);
  });
});
