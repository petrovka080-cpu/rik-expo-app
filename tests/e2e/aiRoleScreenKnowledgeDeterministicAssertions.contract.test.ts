import fs from "fs";
import path from "path";

import { resolveAiScreenKnowledge } from "../../src/features/ai/knowledge/aiKnowledgeResolver";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const flowFiles = [
  "tests/e2e/ai-role-screen-knowledge/director-control-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/foreman-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/buyer-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/accountant-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/contractor-knowledge.yaml",
];

describe("AI role-screen deterministic knowledge assertions", () => {
  it("uses stable knowledge preview IDs instead of the system prompt marker", () => {
    for (const flowPath of flowFiles) {
      const flow = read(flowPath);

      expect(flow).toContain('id: "ai.knowledge.preview"');
      expect(flow).toContain('id: "ai.knowledge.role"');
      expect(flow).toContain('id: "ai.knowledge.screen"');
      expect(flow).toContain('id: "ai.knowledge.domain"');
      expect(flow).toContain('id: "ai.knowledge.allowed-intents"');
      expect(flow).toContain('id: "ai.knowledge.blocked-intents"');
      expect(flow).toContain('id: "ai.knowledge.approval-boundary"');
      expect(flow).not.toContain('visible: "AI APP KNOWLEDGE BLOCK"');
    }
  });

  it("keeps the LLM phase as response-element smoke only", () => {
    for (const flowPath of flowFiles) {
      const flow = read(flowPath);
      const responsePhaseIndex = flow.indexOf("scrollUntilVisible:");
      const responsePhase = flow.slice(responsePhaseIndex);

      expect(responsePhaseIndex).toBeGreaterThan(0);
      expect(responsePhase).toContain('id: "ai.assistant.response"');
      expect(responsePhase).not.toContain('visible: "');
      expect(responsePhase).not.toContain("assertNotVisible:");
    }
  });

  it("keeps credentials out of source-controlled Maestro flows", () => {
    for (const flowPath of flowFiles) {
      const flow = read(flowPath);

      expect(flow).toContain("${MAESTRO_E2E_");
      expect(flow).not.toMatch(/@example\.com|password\s*[:=]|service_role|SUPABASE_SERVICE_ROLE_KEY/i);
    }
  });

  it("proves role-specific metadata through the deterministic knowledge resolver", () => {
    const expectations = [
      {
        role: "director",
        screenId: "director.dashboard",
        entities: ["supplier", "warehouse_item"],
        documents: ["finance_documents"],
        intents: ["execute_approved", "submit_for_approval"],
        policy: "director_full",
      },
      {
        role: "foreman",
        screenId: "foreman.main",
        entities: ["project", "material", "report", "act"],
        documents: ["foreman_daily_reports"],
        intents: ["prepare_report", "prepare_request", "prepare_act", "submit_for_approval"],
        policy: "role_scoped",
      },
      {
        role: "buyer",
        screenId: "buyer.main",
        entities: ["supplier", "material", "request"],
        documents: ["request_documents"],
        intents: ["compare", "prepare_request", "submit_for_approval"],
        policy: "role_scoped",
      },
      {
        role: "accountant",
        screenId: "accountant.main",
        entities: ["company_debt", "payment", "pdf_document"],
        documents: ["finance_documents"],
        intents: ["find_risk", "submit_for_approval"],
        policy: "redacted_finance",
      },
      {
        role: "contractor",
        screenId: "contractor.main",
        entities: ["subcontract", "act", "pdf_document"],
        documents: ["subcontract_documents", "acts"],
        intents: ["prepare_act", "submit_for_approval"],
        policy: "own_records_only",
      },
    ] as const;

    for (const expected of expectations) {
      const knowledge = resolveAiScreenKnowledge({
        role: expected.role,
        screenId: expected.screenId,
      });
      const allowedIntents = knowledge.allowedIntents.map((entry) => entry.intent);

      expect(knowledge.contextPolicy).toBe(expected.policy);
      expect(knowledge.allowedEntities).toEqual(expect.arrayContaining([...expected.entities]));
      expect(knowledge.documentSourceIds).toEqual(expect.arrayContaining([...expected.documents]));
      expect(allowedIntents).toEqual(expect.arrayContaining([...expected.intents]));
      expect(knowledge.approvalBoundarySummary).toContain("requires aiApprovalGate");
    }
  });
});
