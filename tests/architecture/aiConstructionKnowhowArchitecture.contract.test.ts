import fs from "node:fs";
import path from "node:path";

import { evaluateAiConstructionKnowhowArchitectureGuardrail } from "../../scripts/architecture_anti_regression_suite";

const root = process.cwd();
const prefix = "S_AI_PRO_02_CONSTRUCTION_KNOWHOW_ENGINE";

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI construction know-how architecture", () => {
  it("has the required core, BFF, UI, and emulator runner files", () => {
    for (const file of [
      "src/features/ai/constructionKnowhow/constructionKnowhowTypes.ts",
      "src/features/ai/constructionKnowhow/constructionKnowhowRegistry.ts",
      "src/features/ai/constructionKnowhow/constructionDomainPlaybooks.ts",
      "src/features/ai/constructionKnowhow/constructionRoleAdvisor.ts",
      "src/features/ai/constructionKnowhow/constructionDecisionCardEngine.ts",
      "src/features/ai/constructionKnowhow/constructionEvidenceComposer.ts",
      "src/features/ai/constructionKnowhow/constructionRiskClassifier.ts",
      "src/features/ai/constructionKnowhow/constructionExternalIntelPolicy.ts",
      "src/features/ai/constructionKnowhow/constructionProfessionalSafetyBoundary.ts",
      "src/features/ai/agent/agentConstructionKnowhowRoutes.ts",
      "src/features/ai/agent/agentConstructionKnowhowContracts.ts",
      "scripts/e2e/runAiConstructionKnowhowEngineMaestro.ts",
    ]) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }

    const commandCenter = read("src/features/ai/commandCenter/AiCommandCenterScreen.tsx");
    for (const testId of [
      "ai.construction.knowhow.preview",
      "ai.construction.knowhow.role",
      "ai.construction.knowhow.domain",
      "ai.construction.knowhow.evidence",
      "ai.construction.knowhow.risk",
      "ai.construction.knowhow.safe_actions",
      "ai.construction.knowhow.draft_actions",
      "ai.construction.knowhow.approval_required",
      "ai.construction.knowhow.external_status",
    ]) {
      expect(commandCenter).toContain(testId);
    }
  });

  it("keeps the construction intelligence layer provider-free, mutation-free, and artifact-gated", () => {
    const matrix = JSON.stringify({
      final_status: "GREEN_AI_CONSTRUCTION_KNOWHOW_ENGINE_READY",
      direct_execution: false,
      domain_mutation: false,
      mobile_external_fetch: false,
      direct_supabase_from_ui: false,
      raw_rows_returned: false,
      raw_prompt_returned: false,
      model_provider_changed: false,
      gpt_enabled: false,
      gemini_removed: false,
      fake_ai_answer: false,
      fake_professional_advice: false,
      fake_suppliers: false,
      fake_documents: false,
    });
    const report = evaluateAiConstructionKnowhowArchitectureGuardrail({
      projectRoot: root,
      readFile: (relativePath) => {
        if (relativePath === `artifacts/${prefix}_matrix.json`) return matrix;
        if (relativePath === `artifacts/${prefix}_inventory.json`) return "{}";
        if (relativePath === `artifacts/${prefix}_emulator.json`) return "{}";
        if (relativePath === `artifacts/${prefix}_proof.md`) return "proof";
        return read(relativePath);
      },
    });

    expect(report.check.status).toBe("pass");
    expect(report.summary.professionalDecisionCardContract).toBe(true);
    expect(report.summary.internalFirstExternalSecond).toBe(true);
    expect(report.summary.externalPreviewOnly).toBe(true);
    expect(report.summary.highRiskRequiresApproval).toBe(true);
    expect(report.summary.noDirectExecution).toBe(true);
    expect(report.summary.noDomainMutation).toBe(true);
    expect(report.summary.noMobileExternalFetch).toBe(true);
    expect(report.summary.noProviderChange).toBe(true);
  });
});
