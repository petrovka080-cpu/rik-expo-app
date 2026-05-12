import fs from "node:fs";
import path from "node:path";

import {
  submitAgentProcurementForApproval,
} from "../../src/features/ai/agent/agentBffRouteShell";
import { buildProcurementDraftPreview } from "../../src/features/ai/procurement/procurementDraftPlanBuilder";
import { previewProcurementSupplierMatch } from "../../src/features/ai/procurement/procurementSupplierMatchEngine";

const root = process.cwd();
const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("procurement no-mutation contract", () => {
  it("keeps supplier match, draft preview, and approval boundary non-mutating", async () => {
    const supplier = await previewProcurementSupplierMatch({
      auth: buyerAuth,
      input: { items: [{ materialLabel: "Cement", quantity: 1, unit: "bag" }] },
      searchCatalogItems: async () => [],
      listSuppliers: async () => [],
    });
    const draft = await buildProcurementDraftPreview({
      auth: buyerAuth,
      input: {
        requestIdHash: "request_hash",
        items: [{ materialLabel: "Cement", quantity: 1, unit: "bag" }],
        evidenceRefs: supplier.output.evidenceRefs,
      },
    });
    const approval = submitAgentProcurementForApproval({
      auth: buyerAuth,
      input: {
        draftId: "draft-1",
        requestIdHash: "request_hash",
        screenId: "buyer.main",
        summary: "Approval boundary",
        idempotencyKey: "procurement-approval-0001",
        evidenceRefs: draft.output.evidenceRefs,
      },
    });

    expect(supplier.proof.mutationCount).toBe(0);
    expect(draft.proof.mutationCount).toBe(0);
    expect(approval).toMatchObject({
      ok: true,
      data: {
        result: {
          status: "blocked",
          blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY",
          approvalRequired: true,
          idempotencyRequired: true,
          auditRequired: true,
          redactedPayloadOnly: true,
          persisted: false,
          mutationCount: 0,
          finalExecution: 0,
        },
      },
    });
  });

  it("has no direct database, provider, mobile fetch, or final mutation surface in procurement source", () => {
    const source = [
      "procurementRequestContextResolver.ts",
      "procurementInternalFirstEngine.ts",
      "procurementSupplierMatchEngine.ts",
      "procurementDraftPlanBuilder.ts",
      "procurementEvidenceBuilder.ts",
      "procurementRedaction.ts",
    ]
      .map((fileName) =>
        fs.readFileSync(path.join(root, "src/features/ai/procurement", fileName), "utf8"),
      )
      .join("\n");

    expect(source).not.toMatch(/@supabase|auth\.admin|listUsers|service_role/i);
    expect(source).not.toMatch(/\.(from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
    expect(source).not.toMatch(/rawPrompt|providerPayload|rawDbRows|raw_db_rows|dbRows\s*:/);
    expect(source).not.toMatch(/finalMutationAllowed:\s*true/);
    expect(source).not.toMatch(/supplierSelectionAllowed:\s*true/);
    expect(source).not.toMatch(/orderCreationAllowed:\s*true/);
    expect(source).not.toMatch(/warehouseMutationAllowed:\s*true/);
  });
});
