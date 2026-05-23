import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("built-in AI response blocker audit", () => {
  it("identifies the previous blocker files before runtime architecture is used", () => {
    const requestAdapter = read("src/features/consumerRepair/consumerRepairAiAdapter.ts");
    const aiScreen = read("src/features/ai/AIAssistantScreen.tsx");
    const answerPipeline = read("src/features/ai/assistantAnswerPipeline.ts");
    const client = read("src/features/ai/assistantClient.ts");
    const auditRunner = read("scripts/e2e/builtInAiProofShared.ts");

    expect(requestAdapter).toContain("answerBuiltInAi");
    expect(aiScreen).toContain("createBuiltInAiAssistantMessage");
    expect(answerPipeline).toContain("answerBuiltInAi");
    expect(client).toContain("answerBuiltInAi");
    expect(auditRunner).toContain("request_generic_draft_blocker_found");
    expect(auditRunner).toContain("wrong_work_type_mapping_found");
    expect(auditRunner).toContain("implementation_started_before_audit: false");
  });
});
